// I/O ports (256 ports)
let ioPorts = new Uint8Array(256);
let ioLog = [];
const IO_LOG_MAX = 200;

// Applications module state
let motorAngle=0, motorSpeed=0, motorDacVal=0;
let piezoOn=false, piezoLastToggle=0, piezoFreq=0, piezoToggleCount=0;
let potValue=128;
let objectNear=false, opticalBlocked=false;
let diskPulses=0, diskPhase=0;
let adcBusy=false, adcValue=0;

// Timer system
let timerValue=0, timerReload=0, timerClockSel=0;
let timerEnabled=0, timerCount=0;
const TIMER_CYCLES_PER_TICK = 50;

// Interrupt system
let irqPending=0, irqMask=0xFF;
let intFlag=false;

// Keyboard input queue
let keyQueue = [];
document.addEventListener('keypress', function(e) {
  if (document.activeElement && document.activeElement.id === 'ed') return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  keyQueue.push(e.key.charCodeAt(0) & 0xFF);
});
document.addEventListener('keydown', function(e) {
  if (document.activeElement && document.activeElement.id === 'ed') return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (e.key === 'Escape' || e.key === 'F1' || e.key === 'F2') return;
  if (e.key === 'Enter') keyQueue.push(0x0D);
});

// Audio context for piezo
let audioCtx=null, piezoOsc=null;
function initAudio(){
  if(audioCtx)return;
  try{audioCtx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}
}
function startPiezo(){
  if(!audioCtx)initAudio();
  if(!audioCtx||piezoOsc)return;
  try{piezoOsc=audioCtx.createOscillator();piezoOsc.type='square';piezoOsc.frequency.value=1000;
  let g=audioCtx.createGain();g.gain.value=0.05;piezoOsc.connect(g);g.connect(audioCtx.destination);piezoOsc.start()}catch(e){}
}
function stopPiezo(){
  if(piezoOsc){try{piezoOsc.stop()}catch(e){}piezoOsc=null}
}

// === TIMER TICK ===
function timerTick() {
  if (!(timerEnabled & 1)) return;
  timerCount++;
  if (timerCount < TIMER_CYCLES_PER_TICK) return;
  timerCount = 0;
  if (timerValue > 0) {
    timerValue--;
    if (timerValue === 0) {
      irqPending |= 0x04; // IR2 (timer interrupt)
    }
  }
}

// === CHECK PENDING INTERRUPTS ===
function checkInterrupts() {
  if (!gf(IF_)) return;
  if (!irqPending) return;
  for (let i = 0; i < 8; i++) {
    if ((irqPending >> i) & 1) {
      irqPending &= ~(1 << i);
      pushW(FLAGS); pushW(CS); pushW(IP);
      sf(IF_, 0); sf(TF, 0);
      let intNum;
      if (i === 0) intNum = 0x20;
      else if (i === 1) intNum = 0x21;
      else if (i === 2) intNum = 0x25;
      else intNum = 0x20 + i;
      let vecAddr = intNum * 4;
      let newIP = rw(vecAddr);
      let newCS = rw(vecAddr + 2);
      if (newIP || newCS) {
        CS = newCS; IP = newIP;
        curDesc = `IRQ${i} → INT ${intNum.toString(16).toUpperCase()}H → ${hex16(newCS)}:${hex16(newIP)}`;
      }
      return;
    }
  }
}

// === I/O PORT HANDLING ===
// HW_PORTS defined in serial.js

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
    if (piezoOn) startPiezo(); else stopPiezo();
    // Track frequency from toggle rate
    let now = performance.now();
    if (piezoLastToggle > 0) {
      let dt = now - piezoLastToggle;
      if (dt > 0 && dt < 500) piezoFreq = Math.round(500 / dt); // half-period → freq
      piezoToggleCount++;
    }
    piezoLastToggle = now;
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
