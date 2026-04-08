// ============================================================
// PAT-286 WebSerial Bridge
// PAT monitor V1.1: 9600 baud, 8N2, DTR+RTS required
// Prompt is "PAT: " (not ">")
// Monitor commands: M, C, G, T, L, H+
// C mode exit: ESC (0x1B) + CR (0x0D)
// MUART 8256: init regs 80-88H. D0-D7 LEDs = UPORT2 (92H), not UPORT1 (90H)
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
    sLog('WebSerial sadece Chrome ve Edge destekler. Firefox/Safari desteklemiyor.', 1);
    alert('WebSerial API bu tarayicide desteklenmiyor.\n\nChrome veya Edge kullanin.');
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
    // Briefly deassert DTR/RTS, then gently raise to avoid board reset
    await serialPort.setSignals({ dataTerminalReady: false, requestToSend: false });
    await new Promise(r => setTimeout(r, 100));
    await serialPort.setSignals({ dataTerminalReady: true, requestToSend: true });
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
// METHOD 2: C command + ESC exit — write bytes, ESC+CR to exit C mode,
// then G 0100 to execute. RAM is preserved (no reset needed).
// ===================================================================
async function uploadCmdAndRun(machineCode, label, startAddr) {
  if (!serialConnected) { sLog('Once Connect basin!', 1); return; }
  let addr = (startAddr || 0x0100);
  let addrStr = addr.toString(16).toUpperCase().padStart(4, '0');

  serialRxLog += '\n=== ' + (label || 'C CMD') + ' (C + ESC exit) ===\n';
  updateSerialTerminal();

  // 1. Check prompt
  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] PAT: yok\n';
  updateSerialTerminal();
  if (!gotP) return;

  // 2. Enter C interactive mode at address
  serialRxLog += 'TX: C ' + addrStr + '\n';
  updateSerialTerminal();
  let gotC = await sendAndWait('C ' + addrStr + '\r\n', addrStr, 3000);
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

  // 4. ESC + CR to exit C interactive mode (RAM preserved)
  serialRxLog += '[...] ESC+CR ile C modundan cikiliyor...\n';
  updateSerialTerminal();
  await serialSendBytes([0x1B, 0x0D]);  // ESC + CR

  // 5. Wait for PAT prompt
  let gotExit = await sendAndWait('', PAT_PROMPT, 3000);
  if (!gotExit) {
    // Try Enter to nudge
    gotExit = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  }
  serialRxLog += gotExit ? '[OK] PAT: prompt alindi\n' : '[WARN] PAT: prompt gelmedi\n';
  updateSerialTerminal();
  if (!gotExit) return;

  // 6. G [addr] — execute
  await sleep(200);
  serialRxLog += 'TX: G ' + addrStr + '\n';
  updateSerialTerminal();
  let gotG = await sendAndWait('G ' + addrStr + '\r\n', PAT_PROMPT, 8000);
  serialRxLog += gotG ? '=== BASARILI ===\n' : '--- G TIMEOUT ---\n';
  updateSerialTerminal();
}

// ===================================================================
// METHOD 3: Direct port write — no program upload, use C to write
// directly to I/O ports via OUT-like machine code at 0100, then G.
// Uses HEX upload (Method 1) which is the official IDE way.
// ===================================================================
async function directLedTest(portVal, label) {
  let mc = makeLedProgram(portVal);
  await uploadCmdAndRunNoWait(mc, label || ('LED ' + portVal.toString(16).toUpperCase()));
}

// ===================================================================
// Test functions — try HEX method first
// ===================================================================

// MUART init: configure command regs + direction, then write LED value
// D0-D7 LEDs are on PORT 2 (92H), not PORT 1 (90H).
// PORT 1 (90H) controls status signals (EN,WR,BSY,RD,DSC,PZO,UTX,URX).
// UMODEREG (86H) must be 03H+ for Port 2 output mode.
// LED programs use JMP $ (infinite loop) to keep port values active.
function makeLedProgram(ledVal) {
  return [
    0xB0, 0xFF,       // MOV AL, FFh
    0xE6, 0x80,       // OUT 80h, AL  (UCRREG1)
    0xE6, 0x82,       // OUT 82h, AL  (UCRREG2)
    0xE6, 0x84,       // OUT 84h, AL  (UCRREG3)
    0xE6, 0x86,       // OUT 86h, AL  (UMODEREG — FFh sets Port 2 output)
    0xE6, 0x88,       // OUT 88h, AL  (UPORT1CTL — all output)
    0xB0, ledVal & 0xFF, // MOV AL, ledVal
    0xE6, 0x92,       // OUT 92h, AL  (UPORT2 — D0-D7 LEDs)
    0xEB, 0xFE,       // JMP $ (infinite loop — LEDs stay on)
  ];
}

// EXIT: INT 28H AH=04H
const MC_EXIT = [0xBB, 0x00, 0x00, 0xB4, 0x04, 0xCD, 0x28];
// LED programs (loop — press RESET on PAT to stop)
const MC_ALLON = makeLedProgram(0xFF);
const MC_OFF = makeLedProgram(0x00);

// C command method (confirmed working: C + ESC exit + G)
async function testExit()   { await uploadCmdAndRun(MC_EXIT, 'EXIT TEST'); }
async function testLedAll() { await uploadCmdAndRunNoWait(MC_ALLON, 'ALL ON'); }
async function testLedOff() { await uploadCmdAndRunNoWait(MC_OFF, 'LED OFF'); }

// Upload + G without waiting for PAT prompt (for infinite-loop programs)
async function uploadCmdAndRunNoWait(machineCode, label) {
  if (!serialConnected) { sLog('Once Connect basin!', 1); return; }
  let addr = 0x0100;
  let addrStr = addr.toString(16).toUpperCase().padStart(4, '0');

  serialRxLog += '\n=== ' + (label || 'C CMD') + ' (C + ESC exit) ===\n';
  updateSerialTerminal();

  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] PAT: yok\n';
  updateSerialTerminal();
  if (!gotP) return;

  serialRxLog += 'TX: C ' + addrStr + '\n';
  updateSerialTerminal();
  let gotC = await sendAndWait('C ' + addrStr + '\r\n', addrStr, 3000);
  if (!gotC) {
    serialRxLog += '[WARN] C komutu cevap yok\n';
    updateSerialTerminal();
    return;
  }
  await sleep(200);

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

  serialRxLog += '[...] ESC+CR ile C modundan cikiliyor...\n';
  updateSerialTerminal();
  await serialSendBytes([0x1B, 0x0D]);

  let gotExit = await sendAndWait('', PAT_PROMPT, 3000);
  if (!gotExit) {
    gotExit = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  }
  serialRxLog += gotExit ? '[OK] PAT:\n' : '[WARN] PAT: prompt gelmedi\n';
  updateSerialTerminal();
  if (!gotExit) return;

  await sleep(200);
  serialRxLog += 'TX: G ' + addrStr + '\n';
  updateSerialTerminal();
  await serialSendRaw('G ' + addrStr + '\r\n');
  // Don't wait for PAT prompt — program runs forever (JMP $)
  serialRxLog += '=== CALISIYOR (RESET ile durdurun) ===\n';
  updateSerialTerminal();
}

// ===================================================================
// Upload assembled program from editor to real hardware
// Reads bytes from mem[] (set by doAssemble), sends via C method
// ===================================================================
async function uploadProgram() {
  if (!serialConnected) { sLog('Once Device ile baglanin!', 1); return; }
  if (!pLen) { sLog('Once Assemble basin!', 1); return; }

  // Find program byte range from assembled output in mem[]
  let org = progOrg; // stable ORG from last assembly (not mutable IP)
  let startPhys = 0x80 * 16 + org;
  let endPhys = startPhys;
  // Find extent from all assembled items (instructions + data)
  for (let item of asmOutput) {
    let len = item.bytes ? item.bytes.length : (item.words ? item.words.length * 2 : 0);
    let itemEnd = 0x80 * 16 + item.addr + len;
    if (itemEnd > endPhys) endPhys = itemEnd;
  }

  let progBytes = [];
  for (let a = startPhys; a < endPhys; a++) progBytes.push(mem[a]);

  if (!progBytes.length) { sLog('Program bos!', 1); return; }

  sLog(`Uploading ${progBytes.length} bytes to device...`, 0);
  await uploadCmdAndRun(progBytes, 'UPLOAD: ' + progBytes.length + 'B @ ' + org.toString(16).toUpperCase() + 'H');
}

// --- Run / Trace commands (fast send) ---
async function sendGo() {
  let addr = progOrg ? progOrg.toString(16).toUpperCase().padStart(4, '0') : '0100';
  serialRxLog += '\nTX: G ' + addr + '\n';
  updateSerialTerminal();
  let got = await sendAndWait('G ' + addr + '\r\n', PAT_PROMPT, 8000);
  serialRxLog += got ? '=== BASARILI ===\n' : '--- G TIMEOUT ---\n';
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
  let dot2 = document.getElementById('serialDot2');
  if (btn) {
    btn.textContent = serialConnected ? 'Disconnect' : 'Device';
    btn.classList.toggle('connected', serialConnected);
  }
  if (dot) dot.classList.toggle('connected', serialConnected);
  if (dot2) dot2.classList.toggle('connected', serialConnected);
  // Update connect button in Device panel
  let btn2 = document.getElementById('serialBtn2');
  if (btn2) {
    btn2.textContent = serialConnected ? 'Disconnect' : 'Connect';
    btn2.classList.toggle('connected', serialConnected);
  }
  // Toggle upload button active state
  let upBtn = document.getElementById('uploadBtn');
  if (upBtn) upBtn.classList.toggle('active', serialConnected);
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

// Disable hardware buttons if WebSerial not supported
if (!('serial' in navigator)) {
  let devBtn = document.getElementById('serialBtn');
  let upBtn = document.getElementById('uploadBtn');
  if (devBtn) { devBtn.disabled = true; devBtn.title = 'WebSerial: sadece Chrome/Edge'; }
  if (upBtn) { upBtn.disabled = true; upBtn.title = 'WebSerial: sadece Chrome/Edge'; }
}

// Forwarding stubs
const HW_PORTS = new Set([0x80,0x82,0x84,0x86,0x88,0x8A,0x8C,0x8E,0x90,0x92,0x94,0x96,0x98,0x9A,0x9C,0x9E]);
async function serialWritePort(port, val) {}
function serialReadPort(port) {
  return Promise.resolve(ioPorts ? ioPorts[port & 0xFF] : 0);
}
