// ============================================================
// PAT-286 ↔ DigiAC WebSerial Bridge
// USB-to-9pin (DB-9) serial connection to real PAT-286 board
// PAT monitor V1.1: 9600 baud, 8 data bits, NO parity, 2 stop bits (8N2)
// Monitor commands: M (memory), C (change), G (go), T (trace), L (load), H+ (help)
// LED port: UPORT1 = 90H, direction: UPORT1CTL = 88H
// ============================================================

let serialPort = null;
let serialReader = null;
let serialWriter = null;
let serialConnected = false;
let serialRxBuf = '';  // rolling buffer for response detection
let serialRxLog = '';  // display log

const SERIAL_BAUD = 9600;
const SERIAL_STOP_BITS = 2; // PAT uses 8N2

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
    sLog('PAT-286 baglandi (' + SERIAL_BAUD + ' baud, 8N2)', 0);
    serialRxLog = 'Baglandi. PAT RESET basin, > gorunce test butonlarina basin.\n';
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
  sLog('PAT-286 baglantisi kesildi.', 0);
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
        if (serialRxLog.length > 6000) serialRxLog = serialRxLog.slice(-4000);
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Send command and wait for pattern in response ---
// Captures buffer position BEFORE sending, then checks new data
async function sendAndWait(cmd, pattern, timeoutMs) {
  let mark = serialRxBuf.length; // mark BEFORE send
  await serialSendRaw(cmd);
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

// --- Upload and run via PAT monitor ---
async function uploadAndRun(machineCode) {
  if (!serialConnected) {
    sLog('Once Connect basin!', 1);
    return;
  }

  let hexData = ihexLine(0x0100, machineCode);
  let hexEnd = ':00000001FF';

  serialRxLog += '\n--- UPLOAD ---\n';
  updateSerialTerminal();

  // 1. Check > prompt
  let gotP = await sendAndWait('\r\n', '>', 1500);
  serialRxLog += gotP ? '[OK] > alindi\n' : '[WARN] > yok\n';
  updateSerialTerminal();

  // 2. L command
  serialRxLog += 'TX: L\n';
  updateSerialTerminal();
  let gotL = await sendAndWait('L\r\n', 'evice', 3000);
  serialRxLog += gotL ? '[OK] Device prompt\n' : '[WARN] L cevap yok\n';
  updateSerialTerminal();

  // 3. /t1 device select
  serialRxLog += 'TX: /t1\n';
  updateSerialTerminal();
  let gotT = await sendAndWait('/t1\r\n', 'oading', 3000);
  serialRxLog += gotT ? '[OK] Loading...\n' : '[WARN] Loading yok\n';
  updateSerialTerminal();

  // 4. HEX data
  serialRxLog += 'TX: ' + hexData + '\n';
  updateSerialTerminal();
  await serialSendRaw(hexData + '\r\n');
  await sleep(100);

  // 5. End record
  serialRxLog += 'TX: ' + hexEnd + '\n';
  updateSerialTerminal();
  await serialSendRaw(hexEnd + '\r\n');
  await sleep(1000);

  // 6. Verify upload — dump memory at 0100
  serialRxLog += 'TX: M 0100 010F (dogrulama)\n';
  updateSerialTerminal();
  await sendAndWait('M 0100 010F\r\n', '>', 3000);
  await sleep(300);

  // 7. Execute
  serialRxLog += '--- G 0100 ---\n';
  updateSerialTerminal();
  let gotExit = await sendAndWait('G 0100\r\n', '>', 5000);
  serialRxLog += gotExit ? '--- DONE ---\n' : '--- TIMEOUT ---\n';
  updateSerialTerminal();
}

// --- Test: D2 ON (bit 2 = 04H on Port 1) ---
async function testLedOn() {
  sLog('D2 LED ON...', 0);
  await uploadAndRun([
    0xB0, 0xFF,             // MOV AL, FFH
    0xE6, 0x88,             // OUT 88H, AL (port1 = output)
    0xB0, 0x04,             // MOV AL, 04H (D2)
    0xE6, 0x90,             // OUT 90H, AL (write port1)
    0xBB, 0x00, 0x00,       // MOV BX, 0000H
    0xB4, 0x04,             // MOV AH, 04H (EXIT)
    0xCD, 0x28              // INT 28H
  ]);
}

// --- Test: LEDs OFF ---
async function testLedOff() {
  sLog('LED OFF...', 0);
  await uploadAndRun([
    0xB0, 0xFF, 0xE6, 0x88,
    0xB0, 0x00, 0xE6, 0x90,
    0xBB, 0x00, 0x00, 0xB4, 0x04, 0xCD, 0x28
  ]);
}

// --- Test: ALL LEDs ON (FFH) ---
async function testLedAll() {
  sLog('ALL LEDs ON...', 0);
  await uploadAndRun([
    0xB0, 0xFF, 0xE6, 0x88,
    0xB0, 0xFF, 0xE6, 0x90,
    0xBB, 0x00, 0x00, 0xB4, 0x04, 0xCD, 0x28
  ]);
}

// --- Test: Just EXIT (minimal — does program run at all?) ---
async function testExit() {
  sLog('EXIT test...', 0);
  await uploadAndRun([
    0xBB, 0x00, 0x00,       // MOV BX, 0000H
    0xB4, 0x04,             // MOV AH, 04H
    0xCD, 0x28              // INT 28H
  ]);
}

// --- Send command from terminal input ---
async function serialTermSend() {
  let input = document.getElementById('serialInput');
  if (!input || !input.value.trim()) return;
  let cmd = input.value;
  serialRxLog += '> ' + cmd + '\n';
  updateSerialTerminal();
  await serialSendRaw(cmd + '\r\n');
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

// Forwarding stubs
const DIGIAC_PORTS = new Set([0x80,0x82,0x84,0x86,0x88,0x8A,0x8C,0x8E,0x90,0x92,0x94,0x96,0x98,0x9A,0x9C,0x9E]);
async function serialWritePort(port, val) {}
function serialReadPort(port) {
  return Promise.resolve(ioPorts ? ioPorts[port & 0xFF] : 0);
}
