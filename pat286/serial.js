// ============================================================
// PAT-286 ↔ DigiAC WebSerial Bridge
// USB-to-9pin (DB-9) serial connection to real PAT-286 board
// The DigiAC (DT35 Applications Module) is physically on the board;
// we talk to the PAT monitor over serial and it drives the hardware.
// ============================================================

let serialPort = null;
let serialReader = null;
let serialWriter = null;
let serialConnected = false;
let serialRxLog = ''; // raw text received from PAT monitor

const SERIAL_BAUD = 9600;

// --- Connect / Disconnect ---
async function serialConnect() {
  if (serialConnected) { await serialDisconnect(); return; }
  if (!('serial' in navigator)) {
    sLog('WebSerial desteklenmiyor. Chrome/Edge kullanin.', 1);
    return;
  }
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: SERIAL_BAUD, dataBits: 8, stopBits: 1, parity: 'none' });
    serialWriter = serialPort.writable.getWriter();
    serialConnected = true;
    updateSerialUI();
    sLog('PAT-286 baglandi (' + SERIAL_BAUD + ' baud)', 0);
    startSerialRead();
    // Send CR to wake up monitor and see prompt
    await serialSendText('\r');
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
        // Keep log manageable
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

// --- Test: Light up all Port 1 LEDs ---
// Sends PAT monitor commands to:
//   1. Set Port 1 direction = all output (write FFH to port 88H)
//   2. Set Port 1 data = all on (write FFH to port 90H)
// The exact monitor command syntax may vary. We try common formats.
async function testLedOn() {
  if (!serialConnected) {
    await serialConnect();
    if (!serialConnected) return;
    // Wait a moment for monitor to respond
    await new Promise(r => setTimeout(r, 500));
  }
  serialRxLog += '\n--- TEST LED ON ---\n';
  updateSerialTerminal();

  // Try PAT monitor "O port,value" command format
  // First configure Port 1 as all outputs
  await serialSendText('O 88,FF\r');
  await new Promise(r => setTimeout(r, 200));
  // Then light all LEDs on Port 1
  await serialSendText('O 90,FF\r');
  await new Promise(r => setTimeout(r, 200));

  sLog('Test: Port 1 LED ON komutu gonderildi', 0);
}

async function testLedOff() {
  if (!serialConnected) return;
  serialRxLog += '\n--- TEST LED OFF ---\n';
  updateSerialTerminal();

  await serialSendText('O 90,00\r');
  await new Promise(r => setTimeout(r, 200));

  sLog('Test: Port 1 LED OFF komutu gonderildi', 0);
}

// --- Send command from terminal input ---
async function serialTermSend() {
  let input = document.getElementById('serialInput');
  if (!input || !input.value.trim()) return;
  let cmd = input.value;
  serialRxLog += '> ' + cmd + '\n';
  updateSerialTerminal();
  await serialSendText(cmd + '\r');
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

// Forwarding stubs for ioWrite/ioRead integration (no-op for now until protocol confirmed)
const DIGIAC_PORTS = new Set([0x80,0x82,0x84,0x86,0x88,0x8A,0x8C,0x8E,0x90,0x92,0x94,0x96,0x98,0x9A,0x9C,0x9E]);

async function serialWritePort(port, val) {
  // Will be implemented once PAT monitor protocol is confirmed
}

function serialReadPort(port) {
  return Promise.resolve(ioPorts ? ioPorts[port & 0xFF] : 0);
}
