// ============================================================
// PAT-286 WebSerial Bridge
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
// Uses FAST raw send (like IDE). For terminal input use serialSendSlow.
async function sendAndWait(cmd, pattern, timeoutMs) {
  let mark = serialRxBuf.length;
  if (cmd) await serialSendRaw(cmd);
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
// METHOD 1: Intel HEX upload via L + /t1 (IDE protocol)
// IDE sends commands as FAST whole writes, 10ms between HEX lines.
// We replicate exact same timing.
// ===================================================================
async function uploadHexAndRun(machineCode, label) {
  if (!serialConnected) { sLog('Once Connect basin!', 1); return; }

  let hexData = ihexLine(0x0100, machineCode);
  let hexEnd = ':00000001FF';

  serialRxLog += '\n=== ' + (label || 'HEX UPLOAD') + ' ===\n';
  updateSerialTerminal();

  // 1. Send Enter to check prompt
  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] PAT: yok, devam ediliyor...\n';
  updateSerialTerminal();

  // 2. L — send FAST (not slow), wait 700ms like IDE
  serialRxLog += 'TX: L\n';
  updateSerialTerminal();
  await serialSendRaw('L\r\n');
  await sleep(700);

  // 3. /t1 — send FAST, wait 700ms
  serialRxLog += 'TX: /t1\n';
  updateSerialTerminal();
  await serialSendRaw('/t1\r\n');
  await sleep(700);

  // 4. HEX data line — send FAST as one write, 10ms delay
  serialRxLog += 'TX: ' + hexData + '\n';
  updateSerialTerminal();
  await serialSendRaw(hexData + '\r\n');
  await sleep(10);

  // 5. End record — send FAST, 10ms delay
  serialRxLog += 'TX: ' + hexEnd + '\n';
  updateSerialTerminal();
  await serialSendRaw(hexEnd + '\r\n');
  await sleep(1000);

  // 6. G 0100 — send FAST
  serialRxLog += 'TX: G 0100\n';
  updateSerialTerminal();
  let gotG = await sendAndWait('G 0100\r\n', PAT_PROMPT, 5000);
  serialRxLog += gotG ? '=== BASARILI ===\n' : '--- G TIMEOUT (LED\'leri kontrol edin) ---\n';
  updateSerialTerminal();
}

// ===================================================================
// METHOD 2: C command + DTR reset — write bytes, reset board, G 0100
// C mode has no reliable exit char, so we toggle DTR to reset the PAT.
// RAM survives reset, so written bytes at 0080:0100 persist.
// ===================================================================
async function uploadCmdAndRun(machineCode, label) {
  if (!serialConnected) { sLog('Once Connect basin!', 1); return; }

  serialRxLog += '\n=== ' + (label || 'C CMD') + ' (C + DTR reset) ===\n';
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
    serialRxLog += val + ' ';
    updateSerialTerminal();
    let gotNext = await sendAndWait(val + '\r\n', ':', 2000);
    if (!gotNext && i < machineCode.length - 1) {
      serialRxLog += '[!] ';
      updateSerialTerminal();
    }
    await sleep(50);
  }

  serialRxLog += '\n[OK] ' + machineCode.length + ' byte yazildi.\n';
  updateSerialTerminal();

  // 4. DTR toggle to reset the PAT board (exits C mode, RAM preserved)
  serialRxLog += '[...] DTR reset ile PAT yeniden baslatiliyor...\n';
  updateSerialTerminal();
  try {
    await serialPort.setSignals({ dataTerminalReady: false });
    await sleep(100);
    await serialPort.setSignals({ dataTerminalReady: true });
    await sleep(100);
    await serialPort.setSignals({ dataTerminalReady: false });
  } catch (e) {
    serialRxLog += '[WARN] DTR sinyal hatasi: ' + e.message + '\n';
    updateSerialTerminal();
  }

  // 5. Wait for PAT boot message
  let gotBoot = await sendAndWait('', PAT_PROMPT, 5000);
  if (!gotBoot) {
    // Try sending Enter to wake it
    gotBoot = await sendAndWait('\r\n', PAT_PROMPT, 3000);
  }
  serialRxLog += gotBoot ? '[OK] PAT: prompt alindi\n' : '[WARN] PAT: prompt gelmedi — RESET basin\n';
  updateSerialTerminal();
  if (!gotBoot) return;

  // 6. G 0100 — execute
  await sleep(200);
  serialRxLog += 'TX: G 0100\n';
  updateSerialTerminal();
  let gotG = await sendAndWait('G 0100\r\n', PAT_PROMPT, 8000);
  serialRxLog += gotG ? '=== BASARILI ===\n' : '--- G TIMEOUT (LED\'leri kontrol edin) ---\n';
  updateSerialTerminal();
}

// ===================================================================
// METHOD 3: Direct port write — no program upload, use C to write
// directly to I/O ports via OUT-like machine code at 0100, then G.
// Uses HEX upload (Method 1) which is the official IDE way.
// ===================================================================
async function directLedTest(portVal, label) {
  // Simple program: OUT 88h,FFh; OUT 90h,val; EXIT
  let mc = [0xB0, 0xFF, 0xE6, 0x88, 0xB0, portVal & 0xFF, 0xE6, 0x90,
            0xBB, 0x00, 0x00, 0xB4, 0x04, 0xCD, 0x28];
  await uploadHexAndRun(mc, label || ('LED ' + portVal.toString(16).toUpperCase()));
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
async function testAllC()   { await uploadCmdAndRun(MC_ALLON, 'ALL ON'); }
async function testOffC()   { await uploadCmdAndRun(MC_OFF, 'LED OFF'); }

// --- Run / Trace commands (fast send) ---
async function sendGo() {
  serialRxLog += '\nTX: G 0100\n';
  updateSerialTerminal();
  let got = await sendAndWait('G 0100\r\n', PAT_PROMPT, 8000);
  serialRxLog += got ? '=== BASARILI ===\n' : '--- G TIMEOUT (LED\'leri kontrol edin) ---\n';
  updateSerialTerminal();
}
async function sendTrace() {
  serialRxLog += '\nTX: T 0100\n';
  updateSerialTerminal();
  let got = await sendAndWait('T 0100\r\n', PAT_PROMPT, 5000);
  serialRxLog += got ? '[OK] Trace tamamlandi\n' : '--- TIMEOUT ---\n';
  updateSerialTerminal();
}

// --- DTR Reset (manual button) ---
async function sendDtrReset() {
  if (!serialConnected || !serialPort) { sLog('Once Connect basin!', 1); return; }
  serialRxLog += '\n[...] DTR reset...\n';
  updateSerialTerminal();
  try {
    await serialPort.setSignals({ dataTerminalReady: false });
    await sleep(100);
    await serialPort.setSignals({ dataTerminalReady: true });
    await sleep(100);
    await serialPort.setSignals({ dataTerminalReady: false });
    serialRxLog += '[OK] DTR toggle yapildi. PAT: bekleniyor...\n';
  } catch (e) {
    serialRxLog += '[WARN] DTR hatasi: ' + e.message + '\n';
  }
  updateSerialTerminal();
}

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
    btn.textContent = serialConnected ? 'Disconnect' : 'Device';
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
const HW_PORTS = new Set([0x80,0x82,0x84,0x86,0x88,0x8A,0x8C,0x8E,0x90,0x92,0x94,0x96,0x98,0x9A,0x9C,0x9E]);
async function serialWritePort(port, val) {}
function serialReadPort(port) {
  return Promise.resolve(ioPorts ? ioPorts[port & 0xFF] : 0);
}
