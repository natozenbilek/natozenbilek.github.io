// ============================================================
// PAT-286 ↔ DigiAC WebSerial Bridge
// USB-to-9pin (DB-9) serial connection to real PAT-286 board
// PAT monitor: 9600 baud, 8 data bits, NO parity, 2 stop bits (8N2)
// Monitor commands: D (dump), R (regs), S (patch), L (load), G (go)
// LED port: UPORT1 = 90H, direction: UPORT1CTL = 88H
// ============================================================

let serialPort = null;
let serialReader = null;
let serialWriter = null;
let serialConnected = false;
let serialRxLog = ''; // raw text received from PAT monitor

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
    startSerialRead();
    // Send CR to wake up monitor and see > prompt
    await serialSendText('\r\n');
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
          else if (ch === 10) {} // skip LF after CR
          else text += '[' + ch.toString(16).toUpperCase().padStart(2,'0') + ']';
        }
        serialRxLog += text;
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

// --- Send text to PAT monitor ---
async function serialSendText(text) {
  if (!serialConnected || !serialWriter) return;
  try {
    let enc = new TextEncoder();
    await serialWriter.write(enc.encode(text));
  } catch (e) {
    sLog('Seri yazma hatasi: ' + e.message, 1);
  }
}

// --- Send raw bytes ---
async function serialSendBytes(bytes) {
  if (!serialConnected || !serialWriter) return;
  try {
    await serialWriter.write(new Uint8Array(bytes));
  } catch (e) {
    sLog('Seri yazma hatasi: ' + e.message, 1);
  }
}

// --- Intel HEX helpers ---
function ihexChecksum(bytes) {
  let sum = 0;
  for (let b of bytes) sum += b;
  return (~sum + 1) & 0xFF;
}

function ihexLine(addr, data) {
  let len = data.length;
  let bytes = [len, (addr >> 8) & 0xFF, addr & 0xFF, 0x00, ...data];
  let cs = ihexChecksum(bytes);
  let hex = ':';
  for (let b of bytes) hex += b.toString(16).toUpperCase().padStart(2, '0');
  hex += cs.toString(16).toUpperCase().padStart(2, '0');
  return hex;
}

// --- Upload and run a tiny program via PAT monitor ---
// Flow: L\r\n -> /t1\r\n -> Intel HEX lines -> EOF record -> G 0100\r\n
async function uploadAndRun(machineCode) {
  if (!serialConnected) {
    await serialConnect();
    if (!serialConnected) return;
    await new Promise(r => setTimeout(r, 800));
  }

  let hexLine = ihexLine(0x0100, machineCode);
  let endLine = ':00000001FF';

  serialRxLog += '\n--- UPLOAD ---\n';
  updateSerialTerminal();

  // Enter load mode
  await serialSendText('L\r\n');
  await new Promise(r => setTimeout(r, 300));

  // Select transfer type 1
  await serialSendText('/t1\r\n');
  await new Promise(r => setTimeout(r, 300));

  // Send hex data
  serialRxLog += 'HEX: ' + hexLine + '\n';
  updateSerialTerminal();
  await serialSendText(hexLine + '\r\n');
  await new Promise(r => setTimeout(r, 200));

  // Send end record
  await serialSendText(endLine + '\r\n');
  await new Promise(r => setTimeout(r, 500));

  // Execute
  serialRxLog += '--- G 0100 ---\n';
  updateSerialTerminal();
  await serialSendText('G 0100\r\n');
}

// --- Test: Light up D2 on port monitor ---
// Port 1 (UPORT1 = 90H) has the LEDs
// Port 1 Control (UPORT1CTL = 88H) sets direction
// D2 = bit 2 = 04H
//
// Machine code at ORG 0100H:
//   MOV AL, FFH     -> B0 FF     ; all bits output
//   OUT 88H, AL     -> E6 88     ; set Port 1 direction
//   MOV AL, 04H     -> B0 04     ; D2 = bit 2
//   OUT 90H, AL     -> E6 90     ; write to Port 1
//   MOV AH, 04H     -> B4 04     ; EXIT
//   INT 28H         -> CD 28     ; return to monitor
async function testLedOn() {
  sLog('Test: D2 LED ON yukleniyor...', 0);
  await uploadAndRun([
    0xB0, 0xFF,       // MOV AL, FFH
    0xE6, 0x88,       // OUT 88H, AL  (Port 1 = all output)
    0xB0, 0x04,       // MOV AL, 04H  (D2 = bit 2)
    0xE6, 0x90,       // OUT 90H, AL  (write to Port 1)
    0xB4, 0x04,       // MOV AH, 04H  (EXIT)
    0xCD, 0x28        // INT 28H
  ]);
  sLog('Test: D2 LED ON gonderildi (UPORT1=90H, bit2=04H)', 0);
}

// --- Test: Turn off all LEDs ---
async function testLedOff() {
  sLog('Test: LED OFF yukleniyor...', 0);
  await uploadAndRun([
    0xB0, 0xFF,       // MOV AL, FFH
    0xE6, 0x88,       // OUT 88H, AL  (Port 1 = all output)
    0xB0, 0x00,       // MOV AL, 00H  (all off)
    0xE6, 0x90,       // OUT 90H, AL
    0xB4, 0x04,       // MOV AH, 04H  (EXIT)
    0xCD, 0x28        // INT 28H
  ]);
  sLog('Test: LED OFF gonderildi', 0);
}

// --- Send command from terminal input ---
async function serialTermSend() {
  let input = document.getElementById('serialInput');
  if (!input || !input.value.trim()) return;
  let cmd = input.value;
  serialRxLog += '> ' + cmd + '\n';
  updateSerialTerminal();
  await serialSendText(cmd + '\r\n');
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
  if (dot) {
    dot.classList.toggle('connected', serialConnected);
    dot.classList.toggle('error', false);
  }
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

// Forwarding stubs for ioWrite/ioRead integration
const DIGIAC_PORTS = new Set([0x80,0x82,0x84,0x86,0x88,0x8A,0x8C,0x8E,0x90,0x92,0x94,0x96,0x98,0x9A,0x9C,0x9E]);

async function serialWritePort(port, val) {
  // Will be implemented once PAT monitor protocol is confirmed
}

function serialReadPort(port) {
  return Promise.resolve(ioPorts ? ioPorts[port & 0xFF] : 0);
}
