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
let serialRxBuf = '';  // rolling buffer of received text
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
    serialRxLog += 'Baglandi. PAT uzerinden RESET basin ve > bekleyin.\n';
    updateSerialTerminal();
    startSerialRead();
    // Send a few CRs to try waking up monitor
    await sleep(500);
    await serialSendRaw('\r');
    await sleep(200);
    await serialSendRaw('\r');
    await sleep(200);
    await serialSendRaw('\r');
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
          else if (ch === 0x0C) text += '[FF]'; // form feed from PAT reset
          else text += '[' + ch.toString(16).toUpperCase().padStart(2,'0') + ']';
        }
        serialRxBuf += text;
        serialRxLog += text;
        if (serialRxBuf.length > 2000) serialRxBuf = serialRxBuf.slice(-1000);
        if (serialRxLog.length > 4000) serialRxLog = serialRxLog.slice(-3000);
        updateSerialTerminal();
      }
    }
  } catch (e) {
    if (serialConnected) sLog('Seri okuma hatasi: ' + e.message, 1);
  } finally {
    if (serialReader) { try { serialReader.releaseLock(); } catch(e){} serialReader = null; }
  }
}

// --- Low-level send (raw string to bytes) ---
async function serialSendRaw(text) {
  if (!serialConnected || !serialWriter) return;
  try {
    await serialWriter.write(new TextEncoder().encode(text));
  } catch (e) {
    sLog('Seri yazma hatasi: ' + e.message, 1);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Wait for a string pattern in receive buffer, with timeout ---
function waitForResponse(pattern, timeoutMs) {
  return new Promise(resolve => {
    let start = Date.now();
    let idx = serialRxBuf.length; // only check new data
    let check = () => {
      let tail = serialRxBuf.slice(idx);
      if (tail.includes(pattern)) { resolve(true); return; }
      if (Date.now() - start > timeoutMs) { resolve(false); return; }
      setTimeout(check, 50);
    };
    check();
  });
}

// Clear receive buffer (to track new responses)
function clearRxBuf() { serialRxBuf = ''; }

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

// --- Upload and run via PAT monitor (matches DigiACIDE timing) ---
// Protocol: L\r\n → (wait) → /t1\r\n → (wait) → HEX lines → EOF → G 0100\r\n
async function uploadAndRun(machineCode) {
  if (!serialConnected) {
    await serialConnect();
    if (!serialConnected) return;
    await sleep(1000);
  }

  let hexData = ihexLine(0x0100, machineCode);
  let hexEnd = ':00000001FF';

  serialRxLog += '\n=== UPLOAD START ===\n';
  updateSerialTerminal();

  // 1. Make sure we're at > prompt — send CR
  clearRxBuf();
  await serialSendRaw('\r\n');
  let gotPrompt = await waitForResponse('>', 1500);
  if (!gotPrompt) {
    serialRxLog += '[WARN] > prompt yok — PAT reset gerekebilir\n';
    updateSerialTerminal();
  } else {
    serialRxLog += '[OK] > prompt alindi\n';
    updateSerialTerminal();
  }

  // 2. Send L command (enter load mode)
  clearRxBuf();
  serialRxLog += 'TX: L\n';
  updateSerialTerminal();
  await serialSendRaw('L\r\n');
  await sleep(200);
  // Wait up to 2s for "Device" or "Load" response
  let gotL = await waitForResponse('evice', 2000);
  if (!gotL) {
    serialRxLog += '[WARN] L cevabi gelmedi\n';
    updateSerialTerminal();
    await sleep(500);
  } else {
    serialRxLog += '[OK] L cevabi alindi\n';
    updateSerialTerminal();
  }

  // 3. Send /t1 (select device 0 = /t1)
  clearRxBuf();
  serialRxLog += 'TX: /t1\n';
  updateSerialTerminal();
  await serialSendRaw('/t1\r\n');
  await sleep(200);
  // Wait up to 2s for "Loading" response
  let gotLoad = await waitForResponse('oading', 2000);
  if (!gotLoad) {
    serialRxLog += '[WARN] Loading cevabi gelmedi\n';
    updateSerialTerminal();
  } else {
    serialRxLog += '[OK] Loading cevabi alindi\n';
    updateSerialTerminal();
  }

  // 4. Send Intel HEX data record
  serialRxLog += 'TX: ' + hexData + '\n';
  updateSerialTerminal();
  await serialSendRaw(hexData + '\r\n');
  await sleep(50);

  // 5. Send end record
  serialRxLog += 'TX: ' + hexEnd + '\n';
  updateSerialTerminal();
  await serialSendRaw(hexEnd + '\r\n');

  // 6. Wait for loading to complete (PAT processes HEX)
  await sleep(1000);

  // 7. Execute program
  serialRxLog += '=== G 0100 ===\n';
  updateSerialTerminal();
  clearRxBuf();
  await serialSendRaw('G 0100\r\n');

  // 8. Wait for > prompt (program should EXIT back to monitor)
  let gotPrompt = await waitForResponse('>', 3000);
  if (gotPrompt) {
    serialRxLog += '=== DONE (> prompt received) ===\n';
  } else {
    serialRxLog += '=== TIMEOUT (no > prompt) ===\n';
  }
  updateSerialTerminal();
}

// --- Test: Light up LEDs on port monitor ---
// UPORT1CTL (88H) = direction, UPORT1 (90H) = data
// D2 = bit 2 = 04H
//
// ORG 0100H:
//   B0 FF    MOV AL, FFH       ; all bits output
//   E6 88    OUT 88H, AL       ; set Port 1 direction
//   B0 04    MOV AL, 04H       ; D2 = bit 2
//   E6 90    OUT 90H, AL       ; write to Port 1
//   BB 00 00 MOV BX, 0000H     ; clear BX (PA14 convention)
//   B4 04    MOV AH, 04H       ; EXIT function
//   CD 28    INT 28H           ; return to monitor
async function testLedOn() {
  sLog('Test: D2 LED ON yukleniyor...', 0);
  await uploadAndRun([
    0xB0, 0xFF,             // MOV AL, FFH
    0xE6, 0x88,             // OUT 88H, AL
    0xB0, 0x04,             // MOV AL, 04H (D2)
    0xE6, 0x90,             // OUT 90H, AL
    0xBB, 0x00, 0x00,       // MOV BX, 0000H
    0xB4, 0x04,             // MOV AH, 04H
    0xCD, 0x28              // INT 28H
  ]);
}

// --- Test: Turn off all LEDs ---
async function testLedOff() {
  sLog('Test: LED OFF yukleniyor...', 0);
  await uploadAndRun([
    0xB0, 0xFF,             // MOV AL, FFH
    0xE6, 0x88,             // OUT 88H, AL
    0xB0, 0x00,             // MOV AL, 00H
    0xE6, 0x90,             // OUT 90H, AL
    0xBB, 0x00, 0x00,       // MOV BX, 0000H
    0xB4, 0x04,             // MOV AH, 04H
    0xCD, 0x28              // INT 28H
  ]);
}

// --- Test: Light ALL LEDs (FFH) for maximum visibility ---
async function testLedAll() {
  sLog('Test: ALL LEDs ON yukleniyor...', 0);
  await uploadAndRun([
    0xB0, 0xFF,             // MOV AL, FFH
    0xE6, 0x88,             // OUT 88H, AL
    0xB0, 0xFF,             // MOV AL, FFH (all LEDs)
    0xE6, 0x90,             // OUT 90H, AL
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

// --- UI updates ---
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
