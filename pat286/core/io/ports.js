// ============================================================
// PAT-286 I/O Ports — Read/write handlers, port logic
// ============================================================

function ioWrite(port, val) {
  port &= 0xFF; val &= 0xFF;
  ioPorts[port] = val;
  ioLog.push({dir:'OUT', port, val, ic});
  if(ioLog.length > IO_LOG_MAX) ioLog.shift();

  // Forward to real hardware if connected
  if (serialConnected && HW_PORTS.has(port)) {
    serialWritePort(port, val);
  }

  if (port === 0x90) handlePort1Write(val);
  else if (port === 0x92) handlePort2Write(val);
  else if (port === 0x40) { if (val === 0x20) irqPending = 0; }
  else if (port === 0x42) irqMask = val;
  else if (port === 0x80) timerClockSel = val;
  else if (port === 0x94) { timerValue = val; timerReload = val; timerCount = 0; }
  else if (port === 0x8A) timerEnabled = val;
}

function ioRead(port) {
  port &= 0xFF;
  let val = ioPorts[port];

  // If connected to real hardware, queue an async read (result arrives next cycle)
  if (serialConnected && HW_PORTS.has(port)) {
    serialReadPort(port).then(v => { ioPorts[port] = v; });
  }

  if (port === 0x90) val = readPort1();
  else if (port === 0x92) val = readPort2();
  else if (port === 0x8C) { irqPending = 0; val = 0; }
  ioLog.push({dir:'IN', port, val, ic});
  if(ioLog.length > IO_LOG_MAX) ioLog.shift();
  return val & 0xFF;
}

function handlePort1Write(val) {
  let prev = ioPorts[0x90];
  let pzo = (val >> 5) & 1;
  if (pzo !== (piezoOn ? 1 : 0)) {
    piezoOn = !!pzo;
    let now = performance.now();
    if (piezoLastToggle > 0) {
      let dt = now - piezoLastToggle;
      if (dt > 0 && dt < 500) {
        piezoFreq = Math.round(500 / dt);
        if (piezoOsc) try{piezoOsc.frequency.value=piezoFreq}catch(e){}
      }
      piezoToggleCount++;
    }
    piezoLastToggle = now;
    if (piezoOn) startPiezo(piezoFreq||1000); else stopPiezo();
  }
  let wrPrev = (prev >> 1) & 1, wrNow = (val >> 1) & 1;
  if (wrPrev && !wrNow) {
    adcBusy = true;
    adcConvCount = 3;
  }
}

let adcConvCount = 0;

function handlePort2Write(val) {
  let modeReg = ioPorts[0x86];
  if (modeReg === 0x03) motorDacVal = val;
}

function readPort1() {
  let dir = ioPorts[0x88];
  let out = ioPorts[0x90];
  let inp = 0;

  if (adcBusy) {
    adcConvCount--;
    if (adcConvCount <= 0) adcBusy = false;
    inp |= 0;
  } else {
    inp |= (1 << 2);
  }

  if (motorDacVal > 10) {
    diskPhase += motorDacVal / 50;
    if (diskPhase > 10) { diskPhase = 0; diskPulses++; }
    inp |= ((diskPulses & 1) << 4);
  }

  let utxOn = (out >> 6) & 1;
  if (utxOn && objectNear) {
    inp |= 0;
  } else {
    inp |= (1 << 7);
  }

  let result = 0;
  for (let i = 0; i < 8; i++) {
    if ((dir >> i) & 1) result |= (out & (1 << i));
    else result |= (inp & (1 << i));
  }
  return result;
}

function readPort2() {
  let modeReg = ioPorts[0x86];
  if (modeReg === 0x00) {
    let p1 = ioPorts[0x90];
    if (!((p1 >> 3) & 1)) {
      if (opticalBlocked) return Math.max(0, Math.min(15, potValue >> 4));
      return potValue & 0xFF;
    }
    return 0;
  }
  return ioPorts[0x92];
}
