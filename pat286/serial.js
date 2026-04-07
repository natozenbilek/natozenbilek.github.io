// ============================================================
// PAT-286 ↔ DigiAC WebSerial Bridge
// PAT monitor V1.1: 9600 baud, 8N2
// Prompt is "PAT: " (not ">")
// Monitor commands: M, C, G, T, L, H+
// LED port: UPORT1=90H, direction: UPORT1CTL=88H
// ============================================================

let serialPort = null;
let serialReader = null;
let serialWriter = null;
let serialConnected = false;
let serialRxBuf = '';
let serialRxLog = '';

const SERIAL_BAUD = 9600;
const SERIAL_STOP_BITS = 2;
const PAT_PROMPT = 'PAT:';

// --- Connect / Disconnect ---
async function serialConnect() {
  if (serialConnected) { await serialDisconnect(); return; }
  if (!('serial' in navigator)) {
    sLog('WebSerial desteklenmiyor. Chrome/Edge kullanin.', 1);
    return;
  }
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({
      baudRate: SERIAL_BAUD,
      dataBits: 8,
      stopBits: SERIAL_STOP_BITS,
      parity: 'none'
    });
    serialWriter = serialPort.writable.getWriter();
    serialConnected = true;
    updateSerialUI();
    sLog('PAT-286 baglandi (8N2)', 0);
    serialRxLog = 'Baglandi. PAT RESET basin, "PAT:" gorunce test butonlarina basin.\n';
    updateSerialTerminal();
    startSerialRead();
  } catch (e) {
    if (e.name !== 'NotFoundError') sLog('Seri port hatasi: ' + e.message, 1);
    serialConnected = false;
    updateSerialUI();
  }
}

async function serialDisconnect() {
  serialConnected = false;
  try {
    if (serialReader) { await serialReader.cancel(); serialReader.releaseLock(); serialReader = null; }
    if (serialWriter) { serialWriter.releaseLock(); serialWriter = null; }
    if (serialPort) { await serialPort.close(); serialPort = null; }
  } catch (e) {}
  updateSerialUI();
  sLog('Baglanti kesildi.', 0);
}

// --- Serial read loop ---
async function startSerialRead() {
  if (!serialPort || !serialPort.readable) return;
  try {
    serialReader = serialPort.readable.getReader();
    while (serialConnected) {
      const { value, done } = await serialReader.read();
      if (done) break;
      if (value) {
        let text = '';
        for (let i = 0; i < value.length; i++) {
          let ch = value[i];
          if (ch >= 32 && ch <= 126) text += String.fromCharCode(ch);
          else if (ch === 13) text += '\n';
          else if (ch === 10) {} // skip LF
          else if (ch === 0x0C) text += '[FF]';
          else text += '[' + ch.toString(16).toUpperCase().padStart(2,'0') + ']';
        }
        serialRxBuf += text;
        serialRxLog += text;
        if (serialRxBuf.length > 2000) serialRxBuf = serialRxBuf.slice(-1000);
        if (serialRxLog.length > 8000) serialRxLog = serialRxLog.slice(-6000);
        updateSerialTerminal();
      }
    }
  } catch (e) {
    if (serialConnected) sLog('Seri okuma hatasi: ' + e.message, 1);
  } finally {
    if (serialReader) { try { serialReader.releaseLock(); } catch(e){} serialReader = null; }
  }
}

// --- Low-level send ---
async function serialSendRaw(text) {
  if (!serialConnected || !serialWriter) return;
  try {
    await serialWriter.write(new TextEncoder().encode(text));
  } catch (e) {
    sLog('Seri yazma hatasi: ' + e.message, 1);
  }
}

// --- Send raw bytes (Uint8Array) ---
async function serialSendBytes(bytes) {
  if (!serialConnected || !serialWriter) return;
  try {
    await serialWriter.write(new Uint8Array(bytes));
  } catch (e) {
    sLog('Seri yazma hatasi: ' + e.message, 1);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Slow send: char by char at baud rate ---
async function serialSendSlow(text) {
  if (!serialConnected || !serialWriter) return;
  let enc = new TextEncoder();
  try {
    for (let i = 0; i < text.length; i++) {
      await serialWriter.write(enc.encode(text[i]));
      await sleep(2);
    }
  } catch (e) {
    sLog('Seri yazma hatasi: ' + e.message, 1);
  }
}

// --- Slow send bytes ---
async function serialSendBytesSlow(bytes) {
  if (!serialConnected || !serialWriter) return;
  try {
    for (let i = 0; i < bytes.length; i++) {
      await serialWriter.write(new Uint8Array([bytes[i]]));
      await sleep(2);
    }
  } catch (e) {
    sLog('Seri yazma hatasi: ' + e.message, 1);
  }
}

// --- Send and wait for response pattern ---
async function sendAndWait(cmd, pattern, timeoutMs) {
  let mark = serialRxBuf.length;
  await serialSendSlow(cmd); // ALL sends are slow now
  return new Promise(resolve => {
    let start = Date.now();
    let check = () => {
      let newData = serialRxBuf.slice(mark);
      if (newData.includes(pattern)) { resolve(true); return; }
      if (Date.now() - start > timeoutMs) { resolve(false); return; }
      setTimeout(check, 30);
    };
    check();
  });
}

// --- Intel HEX helpers ---
function ihexChecksum(bytes) {
  let sum = 0;
  for (let b of bytes) sum += b;
  return (~sum + 1) & 0xFF;
}

function ihexLine(addr, data) {
  let bytes = [data.length, (addr >> 8) & 0xFF, addr & 0xFF, 0x00, ...data];
  let cs = ihexChecksum(bytes);
  let hex = ':';
  for (let b of bytes) hex += b.toString(16).toUpperCase().padStart(2, '0');
  hex += cs.toString(16).toUpperCase().padStart(2, '0');
  return hex;
}

// ===================================================================
// METHOD 1: Intel HEX upload via L + /t1 (DigiACIDE protocol)
// ===================================================================
async function uploadHexAndRun(machineCode, label) {
  if (!serialConnected) { sLog('Once Connect basin!', 1); return; }

  let hexData = ihexLine(0x0100, machineCode);
  let hexEnd = ':00000001FF';

  serialRxLog += '\n=== ' + (label || 'HEX UPLOAD') + ' ===\n';
  updateSerialTerminal();

  // 1. Check prompt
  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] PAT: yok\n';
  updateSerialTerminal();
  if (!gotP) return;

  // 2. L
  serialRxLog += 'TX: L\n';
  updateSerialTerminal();
  let gotL = await sendAndWait('L\r\n', 'evice', 3000);
  serialRxLog += gotL ? '[OK] Device\n' : '[WARN] L yok\n';
  updateSerialTerminal();
  if (!gotL) return;

  // 3. /t1
  serialRxLog += 'TX: /t1\n';
  updateSerialTerminal();
  let gotT = await sendAndWait('/t1\r\n', 'oading', 3000);
  serialRxLog += gotT ? '[OK] Loading\n' : '[WARN] Loading yok\n';
  updateSerialTerminal();
  if (!gotT) return;

  await sleep(1000);

  // 4. HEX data (slow)
  serialRxLog += 'TX(slow): ' + hexData + '\\r\\n\n';
  updateSerialTerminal();
  await serialSendSlow(hexData + '\r\n');
  await sleep(500);

  // 5. End record (slow)
  serialRxLog += 'TX(slow): ' + hexEnd + '\\r\\n\n';
  updateSerialTerminal();
  await serialSendSlow(hexEnd + '\r\n');
  await sleep(2000);

  // 6. G 0100 (slow)
  serialRxLog += 'TX: G 0100\n';
  updateSerialTerminal();
  let gotG = await sendAndWait('G 0100\r\n', PAT_PROMPT, 5000);
  serialRxLog += gotG ? '=== BASARILI ===\n' : '--- TIMEOUT ---\n';
  updateSerialTerminal();
}

// ===================================================================
// METHOD 2: C command — interactive byte entry, then G
// C 0100 → enter bytes one by one → . to exit → G 0100
// ===================================================================
async function uploadCmdAndRun(machineCode, label) {
  if (!serialConnected) { sLog('Once Connect basin!', 1); return; }

  serialRxLog += '\n=== ' + (label || 'C CMD') + ' (C komutu) ===\n';
  updateSerialTerminal();

  // 1. Check prompt
  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] PAT: yok\n';
  updateSerialTerminal();
  if (!gotP) return;

  // 2. Enter C interactive mode at address 0100
  serialRxLog += 'TX: C 0100\n';
  updateSerialTerminal();
  let gotC = await sendAndWait('C 0100\r\n', '0100', 3000);
  if (!gotC) {
    serialRxLog += '[WARN] C komutu cevap yok\n';
    updateSerialTerminal();
    return;
  }
  await sleep(200);

  // 3. Send each byte value, wait for next address prompt
  for (let i = 0; i < machineCode.length; i++) {
    let val = machineCode[i].toString(16).toUpperCase().padStart(2, '0');
    let nextAddr = (0x0101 + i).toString(16).toUpperCase().padStart(4, '0');
    serialRxLog += val + ' ';
    updateSerialTerminal();
    // Send just the hex value + CR
    let gotNext = await sendAndWait(val + '\r\n', ':', 2000);
    if (!gotNext && i < machineCode.length - 1) {
      serialRxLog += '\n[WARN] ' + nextAddr + ' bekleniyor ama cevap yok\n';
      updateSerialTerminal();
    }
    await sleep(50);
  }

  // 4. Exit C interactive mode — send just Enter or period
  serialRxLog += '\nTX: . (cikis)\n';
  updateSerialTerminal();
  await sendAndWait('.\r\n', PAT_PROMPT, 2000);
  await sleep(300);

  serialRxLog += '[OK] ' + machineCode.length + ' byte yazildi\n';
  updateSerialTerminal();

  // 5. Verify memory
  serialRxLog += 'TX: M 0100\n';
  updateSerialTerminal();
  await sendAndWait('M 0100\r\n', PAT_PROMPT, 3000);
  await sleep(500);

  // 6. Execute
  serialRxLog += 'TX: G 0100\n';
  updateSerialTerminal();
  let gotG = await sendAndWait('G 0100\r\n', PAT_PROMPT, 5000);
  serialRxLog += gotG ? '=== BASARILI ===\n' : '--- TIMEOUT ---\n';
  updateSerialTerminal();
}

// ===================================================================
// Test functions — try HEX method first
// ===================================================================

// EXIT test machine code
const MC_EXIT = [0xBB, 0x00, 0x00, 0xB4, 0x04, 0xCD, 0x28];
// D2 ON
const MC_D2ON = [0xB0, 0xFF, 0xE6, 0x88, 0xB0, 0x04, 0xE6, 0x90, 0xBB, 0x00, 0x00, 0xB4, 0x04, 0xCD, 0x28];
// ALL ON
const MC_ALLON = [0xB0, 0xFF, 0xE6, 0x88, 0xB0, 0xFF, 0xE6, 0x90, 0xBB, 0x00, 0x00, 0xB4, 0x04, 0xCD, 0x28];
// OFF
const MC_OFF = [0xB0, 0xFF, 0xE6, 0x88, 0xB0, 0x00, 0xE6, 0x90, 0xBB, 0x00, 0x00, 0xB4, 0x04, 0xCD, 0x28];

async function testExit()   { await uploadHexAndRun(MC_EXIT, 'EXIT TEST'); }
async function testLedOn()  { await uploadHexAndRun(MC_D2ON, 'D2 ON'); }
async function testLedAll()  { await uploadHexAndRun(MC_ALLON, 'ALL ON'); }
async function testLedOff() { await uploadHexAndRun(MC_OFF, 'LED OFF'); }

// C command versions (bypass HEX upload)
async function testExitC()  { await uploadCmdAndRun(MC_EXIT, 'EXIT TEST'); }
async function testLedOnC() { await uploadCmdAndRun(MC_D2ON, 'D2 ON'); }

// --- Send from terminal input (slow) ---
async function serialTermSend() {
  let input = document.getElementById('serialInput');
  if (!input || !input.value.trim()) return;
  let cmd = input.value;
  serialRxLog += '> ' + cmd + '\n';
  updateSerialTerminal();
  await serialSendSlow(cmd + '\r\n');
  input.value = '';
}

// --- UI ---
function updateSerialUI() {
  let btn = document.getElementById('serialBtn');
  let dot = document.getElementById('serialDot');
  let lbl = document.getElementById('serialLbl');
  if (btn) {
    btn.textContent = serialConnected ? 'Disconnect' : 'DigiAC';
    btn.classList.toggle('connected', serialConnected);
  }
  if (dot) dot.classList.toggle('connected', serialConnected);
  if (lbl) {
    lbl.textContent = serialConnected ? 'CONNECTED' : 'OFFLINE';
    lbl.style.color = serialConnected ? 'var(--grn)' : 'var(--text3)';
  }
}

function updateSerialTerminal() {
  let el = document.getElementById('serialLog');
  if (!el) return;
  el.textContent = serialRxLog;
  el.scrollTop = el.scrollHeight;
}

function copySerialLog() {
  navigator.clipboard.writeText(serialRxLog).then(() => {
    sLog('Log kopyalandi', 0);
  }).catch(() => {
    let el = document.getElementById('serialLog');
    if (el) {
      let r = document.createRange(); r.selectNodeContents(el);
      let s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  });
}

// Forwarding stubs
const DIGIAC_PORTS = new Set([0x80,0x82,0x84,0x86,0x88,0x8A,0x8C,0x8E,0x90,0x92,0x94,0x96,0x98,0x9A,0x9C,0x9E]);
async function serialWritePort(port, val) {}
function serialReadPort(port) {
  return Promise.resolve(ioPorts ? ioPorts[port & 0xFF] : 0);
}
