// ============================================================
// PAT-286 Serial Upload — HEX upload, C command, probes, LED tests
// ============================================================

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

// === METHOD 1: Intel HEX upload via L + /t1 ===
async function uploadHexAndRun(machineCode, label) {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }

  let hexData = ihexLine(0x0100, machineCode);
  let hexEnd = ':00000001FF';

  serialRxLog += '\n=== ' + (label || 'HEX UPLOAD') + ' ===\n';
  updateSerialTerminal();

  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] No PAT: prompt, continuing...\n';
  updateSerialTerminal();

  serialRxLog += 'TX: L\n';
  updateSerialTerminal();
  await serialSendRaw('L\r\n');
  await sleep(700);

  serialRxLog += 'TX: /t1\n';
  updateSerialTerminal();
  await serialSendRaw('/t1\r\n');
  await sleep(700);

  serialRxLog += 'TX: ' + hexData + '\n';
  updateSerialTerminal();
  await serialSendRaw(hexData + '\r\n');
  await sleep(10);

  serialRxLog += 'TX: ' + hexEnd + '\n';
  updateSerialTerminal();
  await serialSendRaw(hexEnd + '\r\n');
  await sleep(1000);

  serialRxLog += 'TX: G 0100\n';
  updateSerialTerminal();
  let gotG = await sendAndWait('G 0100\r\n', PAT_PROMPT, 5000);
  serialRxLog += gotG ? '=== SUCCESS ===\n' : '--- G TIMEOUT (check LEDs) ---\n';
  updateSerialTerminal();
}

// === METHOD 2: C command + ESC exit ===
async function uploadCmdAndRun(machineCode, label, startAddr) {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  let addr = (startAddr || 0x0100);
  let addrStr = addr.toString(16).toUpperCase().padStart(4, '0');

  serialRxLog += '\n=== ' + (label || 'C CMD') + ' (C + ESC exit) ===\n';
  updateSerialTerminal();

  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] No PAT: prompt\n';
  updateSerialTerminal();
  if (!gotP) return;

  serialRxLog += 'TX: C ' + addrStr + '\n';
  updateSerialTerminal();
  let gotC = await sendAndWait('C ' + addrStr + '\r\n', addrStr, 3000);
  if (!gotC) {
    serialRxLog += '[WARN] No response to C command\n';
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

  serialRxLog += '\n[OK] ' + machineCode.length + ' bytes written.\n';
  updateSerialTerminal();

  serialRxLog += '[...] Exiting C mode (ESC+CR)...\n';
  updateSerialTerminal();
  await serialSendBytes([0x1B, 0x0D]);

  let gotExit = await sendAndWait('', PAT_PROMPT, 3000);
  if (!gotExit) {
    gotExit = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  }
  serialRxLog += gotExit ? '[OK] PAT: prompt received\n' : '[WARN] No PAT: prompt received\n';
  updateSerialTerminal();
  if (!gotExit) return;

  await sleep(200);
  serialRxLog += 'TX: G ' + addrStr + '\n';
  updateSerialTerminal();
  let gotG = await sendAndWait('G ' + addrStr + '\r\n', PAT_PROMPT, 8000);
  serialRxLog += gotG ? '=== SUCCESS ===\n' : '--- G TIMEOUT ---\n';
  updateSerialTerminal();
}

// === Upload + G without waiting (for infinite-loop programs) ===
async function uploadCmdAndRunNoWait(machineCode, label) {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  let addr = 0x0100;
  let addrStr = addr.toString(16).toUpperCase().padStart(4, '0');

  serialRxLog += '\n=== ' + (label || 'C CMD') + ' (C + ESC exit) ===\n';
  updateSerialTerminal();

  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] No PAT: prompt\n';
  updateSerialTerminal();
  if (!gotP) return;

  serialRxLog += 'TX: C ' + addrStr + '\n';
  updateSerialTerminal();
  let gotC = await sendAndWait('C ' + addrStr + '\r\n', addrStr, 3000);
  if (!gotC) {
    serialRxLog += '[WARN] No response to C command\n';
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

  serialRxLog += '\n[OK] ' + machineCode.length + ' bytes written.\n';
  updateSerialTerminal();

  serialRxLog += '[...] Exiting C mode (ESC+CR)...\n';
  updateSerialTerminal();
  await serialSendBytes([0x1B, 0x0D]);

  let gotExit = await sendAndWait('', PAT_PROMPT, 3000);
  if (!gotExit) {
    gotExit = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  }
  serialRxLog += gotExit ? '[OK] PAT:\n' : '[WARN] No PAT: prompt received\n';
  updateSerialTerminal();
  if (!gotExit) return;

  await sleep(200);
  serialRxLog += 'TX: G ' + addrStr + '\n';
  updateSerialTerminal();
  await serialSendRaw('G ' + addrStr + '\r\n');
  serialRxLog += '=== RUNNING (press RESET to stop) ===\n';
  updateSerialTerminal();
}

// === LED test programs ===
function makeLedProgram(ledVal) {
  return [
    0xB0, 0xFF, 0xE6, 0x80, 0xE6, 0x82, 0xE6, 0x84,
    0xE6, 0x86, 0xE6, 0x88,
    0xB0, ledVal & 0xFF, 0xE6, 0x92,
    0xEB, 0xFE,
  ];
}

const MC_EXIT = [0xBB, 0x00, 0x00, 0xB4, 0x04, 0xCD, 0x28];
const MC_ALLON = makeLedProgram(0xFF);
const MC_OFF = makeLedProgram(0x00);

async function testExit()   { await uploadCmdAndRun(MC_EXIT, 'EXIT TEST'); }
async function testLedAll() { await uploadCmdAndRunNoWait(MC_ALLON, 'ALL ON'); }
async function testLedOff() { await uploadCmdAndRunNoWait(MC_OFF, 'LED OFF'); }

async function directLedTest(portVal, label) {
  let mc = makeLedProgram(portVal);
  await uploadCmdAndRunNoWait(mc, label || ('LED ' + portVal.toString(16).toUpperCase()));
}

// === Upload assembled program from editor ===
async function uploadProgram() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  if (!pLen) { sLog('Assemble a program first!', 1); return; }

  let org = progOrg;
  let startPhys = 0x80 * 16 + org;
  let endPhys = startPhys;
  for (let item of asmOutput) {
    let len = item.bytes ? item.bytes.length : (item.words ? item.words.length * 2 : 0);
    let itemEnd = 0x80 * 16 + item.addr + len;
    if (itemEnd > endPhys) endPhys = itemEnd;
  }

  let progBytes = [];
  for (let a = startPhys; a < endPhys; a++) progBytes.push(mem[a]);

  if (!progBytes.length) { sLog('Program is empty!', 1); return; }

  sLog(`Uploading ${progBytes.length} bytes to device...`, 0);
  await uploadCmdAndRun(progBytes, 'UPLOAD: ' + progBytes.length + 'B @ ' + org.toString(16).toUpperCase() + 'H');
}

// === Display probes ===
async function probeDisplay() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  serialRxLog += '\n=== DISPLAY PROBE ===\n';
  serialRxLog += 'Testing keyboard display addresses...\n';
  updateSerialTerminal();
  serialRxLog += '\n[TEST 1] KYDBUF 0000:047D \u2014 all segments ON\n';
  updateSerialTerminal();
  let mc1 = [
    0x1E, 0xB8, 0x00, 0x00, 0x8E, 0xD8,
    0xC6, 0x06, 0x7D, 0x04, 0xFF, 0xC6, 0x06, 0x7E, 0x04, 0xFF,
    0xC6, 0x06, 0x7F, 0x04, 0xFF, 0xC6, 0x06, 0x80, 0x04, 0xFF,
    0xC6, 0x06, 0x81, 0x04, 0xFF, 0xC6, 0x06, 0x82, 0x04, 0xFF,
    0xC6, 0x06, 0x83, 0x04, 0xFF, 0xC6, 0x06, 0x84, 0x04, 0xFF,
    0x1F, 0xEB, 0xFE
  ];
  await uploadCmdAndRunNoWait(mc1, 'PROBE: KYDBUF 047D');
  serialRxLog += '>>> Check display now! If all 8s appear, KYDBUF=047D is correct.\n';
  serialRxLog += '>>> Press PAT RESET, then click next test.\n';
  updateSerialTerminal();
}

async function probeDisplay2() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  serialRxLog += '\n[TEST 2] 8279 display controller \u2014 port 20H/21H\n';
  updateSerialTerminal();
  let mc2 = [
    0xB0, 0xD1, 0xE6, 0x21, 0xB9, 0xFF, 0x00, 0xE2, 0xFE,
    0xB0, 0x80, 0xE6, 0x21,
    0xB0, 0xFF, 0xE6, 0x20, 0xE6, 0x20, 0xE6, 0x20, 0xE6, 0x20,
    0xE6, 0x20, 0xE6, 0x20, 0xE6, 0x20, 0xE6, 0x20,
    0xEB, 0xFE
  ];
  await uploadCmdAndRunNoWait(mc2, 'PROBE: 8279 @20H/21H');
  serialRxLog += '>>> Check display! If 8s appear, 8279 is at 20H/21H.\n';
  serialRxLog += '>>> Press PAT RESET, then try next test.\n';
  updateSerialTerminal();
}

async function probeDisplay3() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  serialRxLog += '\n[TEST 3] 8279 @40H/41H\n';
  updateSerialTerminal();
  let mc3 = [
    0xB0, 0xD1, 0xE6, 0x41, 0xB9, 0xFF, 0x00, 0xE2, 0xFE,
    0xB0, 0x80, 0xE6, 0x41,
    0xB0, 0xFF, 0xE6, 0x40, 0xE6, 0x40, 0xE6, 0x40, 0xE6, 0x40,
    0xE6, 0x40, 0xE6, 0x40, 0xE6, 0x40, 0xE6, 0x40,
    0xEB, 0xFE
  ];
  await uploadCmdAndRunNoWait(mc3, 'PROBE: 8279 @40H/41H');
  serialRxLog += '>>> Check display! If 8s appear, 8279 is at 40H/41H.\n';
  serialRxLog += '>>> Press PAT RESET, then try next test.\n';
  updateSerialTerminal();
}

async function probeDisplay4() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  serialRxLog += '\n[TEST 4] 8279 @60H/61H\n';
  updateSerialTerminal();
  let mc4 = [
    0xB0, 0xD1, 0xE6, 0x61, 0xB9, 0xFF, 0x00, 0xE2, 0xFE,
    0xB0, 0x80, 0xE6, 0x61,
    0xB0, 0xFF, 0xE6, 0x60, 0xE6, 0x60, 0xE6, 0x60, 0xE6, 0x60,
    0xE6, 0x60, 0xE6, 0x60, 0xE6, 0x60, 0xE6, 0x60,
    0xEB, 0xFE
  ];
  await uploadCmdAndRunNoWait(mc4, 'PROBE: 8279 @60H/61H');
  serialRxLog += '>>> Check display! If 8s, 8279 is at 60H/61H.\n';
  serialRxLog += '>>> Press PAT RESET to continue.\n';
  updateSerialTerminal();
}

// Forwarding stubs
const HW_PORTS = new Set([0x80,0x82,0x84,0x86,0x88,0x8A,0x8C,0x8E,0x90,0x92,0x94,0x96,0x98,0x9A,0x9C,0x9E]);
async function serialWritePort(port, val) {}
function serialReadPort(port) {
  return Promise.resolve(ioPorts ? ioPorts[port & 0xFF] : 0);
}
