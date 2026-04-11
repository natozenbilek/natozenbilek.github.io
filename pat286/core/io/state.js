// ============================================================
// PAT-286 I/O State — Port array, peripheral state, audio, timer
// ============================================================

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
function startPiezo(freq){
  if(!audioCtx)initAudio();
  if(!audioCtx)return;
  if(piezoOsc){try{piezoOsc.frequency.value=freq||1000}catch(e){}return;}
  try{piezoOsc=audioCtx.createOscillator();piezoOsc.type='square';piezoOsc.frequency.value=freq||1000;
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
