// ============================================================
// PAT-286 Virtual Lab — CPU Core (8086 Real Mode Subset)
// v2.0 — Dead code cleanup + REP prefix + CMPSB/SCASB + CBW/CWD
// v3.0 — Syntax highlighting, memory follow/change highlight, execution trace, scroll-to-error
// ============================================================

// === PATCALLS.INC (built-in) ===
const PATCALLS = {
  USER:40, USRBSE:0x100, USRSEG:0x80, SYSSEG:0,
  KYDBUF:0x47D,
  DT1:0, DT2:1, DP:2, DKD:3, DCAS:4,
  PIC0:0x40, PIC1:0x42,
  UCRREG1:0x80, UCRREG2:0x82, UCRREG3:0x84,
  UMODEREG:0x86, UPORT1CTL:0x88, UIRQEN:0x8A, UIRQADR:0x8C,
  URCVBUF:0x8E, UPORT1:0x90, UPORT2:0x92,
  UTIMER1:0x94, UTIMER2:0x96, UTIMER3:0x98, UTIMER4:0x9A, UTIMER5:0x9C,
  USTATUS:0x9E,
  READ:0, READLN:1, WRITE:2, WRITLN:3, EXIT:4, PERR:5,
  AHEXTO:6, ADECTO:7, TOAHEX:8, TOADEC:9,
  RDCHAR:10, RDBYTE:11, WRCHAR:12, WRBYTE:13,
  GETIN:14, WT1MS:15, WTNMS:16, CRLF:17, CLRSCR:18,
  LEDON:19, LEDOFF:20
};

// === MEMORY ===
const MEM_SIZE = 1048576; // 1MB
let mem = new Uint8Array(MEM_SIZE);

function rb(addr) { return mem[addr & 0xFFFFF]; }
function rw(addr) { addr &= 0xFFFFF; return mem[addr] | (mem[(addr+1) & 0xFFFFF] << 8); }
function wb(addr, v) { mem[addr & 0xFFFFF] = v & 0xFF; }
function ww(addr, v) { addr &= 0xFFFFF; mem[addr] = v & 0xFF; mem[(addr+1) & 0xFFFFF] = (v >> 8) & 0xFF; }
function pa(seg, off) { return ((seg << 4) + off) & 0xFFFFF; }

// === REGISTERS ===
let AX=0,BX=0,CX=0,DX=0,SI=0,DI=0,SP=0,BP=0;
let CS=0,DS=0x80,SS=0x80,ES=0;
let IP=0x100;
let FLAGS=0x0002;

const CF=0,PF=2,AF=4,ZF=6,SF=7,TF=8,IF_=9,DF=10,OF=11;
function gf(b){return(FLAGS>>b)&1}
function sf(b,v){if(v)FLAGS|=(1<<b);else FLAGS&=~(1<<b)}

function getAH(){return(AX>>8)&0xFF} function getAL(){return AX&0xFF}
function getBH(){return(BX>>8)&0xFF} function getBL(){return BX&0xFF}
function getCH(){return(CX>>8)&0xFF} function getCL(){return CX&0xFF}
function getDH(){return(DX>>8)&0xFF} function getDL(){return DX&0xFF}
function setAH(v){AX=(AX&0xFF)|((v&0xFF)<<8)} function setAL(v){AX=(AX&0xFF00)|(v&0xFF)}
function setBH(v){BX=(BX&0xFF)|((v&0xFF)<<8)} function setBL(v){BX=(BX&0xFF00)|(v&0xFF)}
function setCH(v){CX=(CX&0xFF)|((v&0xFF)<<8)} function setCL(v){CX=(CX&0xFF00)|(v&0xFF)}
function setDH(v){DX=(DX&0xFF)|((v&0xFF)<<8)} function setDL(v){DX=(DX&0xFF00)|(v&0xFF)}

function getReg16(r){return[AX,CX,DX,BX,SP,BP,SI,DI][r]}
function setReg16(r,v){v&=0xFFFF;switch(r){case 0:AX=v;break;case 1:CX=v;break;case 2:DX=v;break;case 3:BX=v;break;case 4:SP=v;break;case 5:BP=v;break;case 6:SI=v;break;case 7:DI=v;break}}
function getReg8(r){return[getAL,getCL,getDL,getBL,getAH,getCH,getDH,getBH][r]()}
function setReg8(r,v){[setAL,setCL,setDL,setBL,setAH,setCH,setDH,setBH][r](v)}
function getSeg(r){return[ES,CS,SS,DS][r]}
function setSeg(r,v){v&=0xFFFF;switch(r){case 0:ES=v;break;case 1:CS=v;break;case 2:SS=v;break;case 3:DS=v;break}}

// === EXECUTION STATE ===
let halt=false, running=false, tmr=null;
let cy=0, ic=0;
let curInstr='—', curDesc='—', lastDiff='—';
let stepPast=[], stepFuture=[];
let pLen=0, labels={}, asmLines=[], instrLines=new Set();
let breakpoints=new Set(), asmErrLines=new Set();
let patDisplay='', patDisplayBuf='';
let memFollowMode = null; // null, 'IP', or 'SP'
let prevMemSnapshot = new Uint8Array(64); // for change detection in 8x8 grid
let prevMemBase = 0, prevMemSeg = 0;
let execTrace = []; // execution trace log
const TRACE_MAX = 500;

// I/O ports (256 ports)
let ioPorts = new Uint8Array(256);
let ioLog = [];
const IO_LOG_MAX = 200;

// Applications module state
let motorAngle=0, motorSpeed=0, motorDacVal=0;
let piezoOn=false, piezoLastToggle=0;
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

// REP prefix state — tracked across prefix parse and instruction execute
let repPrefix = 0; // 0=none, 0xF3=REP/REPE, 0xF2=REPNE

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

// === FLAG HELPERS ===
function parity8(v) { v &= 0xFF; let p = 0; for (let i = 0; i < 8; i++) p ^= (v >> i) & 1; return p === 0 ? 1 : 0; }
function setFlagsArith8(res, a, b, isSub) {
  let r = res & 0xFF;
  sf(ZF, r === 0); sf(SF, (r >> 7) & 1); sf(PF, parity8(r));
  if (isSub) {
    sf(CF, a < (b & 0xFF) ? 1 : 0);
    sf(AF, (a & 0xF) < (b & 0xF) ? 1 : 0);
    sf(OF, ((a ^ b) & (a ^ r) & 0x80) ? 1 : 0);
  } else {
    sf(CF, res > 0xFF ? 1 : 0);
    sf(AF, ((a & 0xF) + (b & 0xF)) > 0xF ? 1 : 0);
    sf(OF, ((~(a ^ b)) & (a ^ r) & 0x80) ? 1 : 0);
  }
}
function setFlagsArith16(res, a, b, isSub) {
  let r = res & 0xFFFF;
  sf(ZF, r === 0); sf(SF, (r >> 15) & 1); sf(PF, parity8(r));
  if (isSub) {
    sf(CF, a < (b & 0xFFFF) ? 1 : 0);
    sf(AF, (a & 0xF) < (b & 0xF) ? 1 : 0);
    sf(OF, ((a ^ b) & (a ^ r) & 0x8000) ? 1 : 0);
  } else {
    sf(CF, res > 0xFFFF ? 1 : 0);
    sf(AF, ((a & 0xF) + (b & 0xF)) > 0xF ? 1 : 0);
    sf(OF, ((~(a ^ b)) & (a ^ r) & 0x8000) ? 1 : 0);
  }
}
function setFlagsLogic8(r) {
  r &= 0xFF; sf(ZF, r === 0); sf(SF, (r >> 7) & 1); sf(PF, parity8(r)); sf(CF, 0); sf(OF, 0);
}
function setFlagsLogic16(r) {
  r &= 0xFFFF; sf(ZF, r === 0); sf(SF, (r >> 15) & 1); sf(PF, parity8(r)); sf(CF, 0); sf(OF, 0);
}

// === INT 28H HANDLER (PAT Monitor) ===
function handleInt28() {
  let fn = getAH();
  switch(fn) {
    case PATCALLS.EXIT:
      halt = true;
      curDesc = 'EXIT — returned to PAT monitor';
      setSt('HALTED');
      break;
    case PATCALLS.WRCHAR: {
      let ch = getAL();
      if (ch >= 32 && ch <= 126) patDisplay += String.fromCharCode(ch);
      else if (ch === 13 || ch === 10) patDisplay += '\n';
      curDesc = `WRCHAR: '${String.fromCharCode(ch >= 32 ? ch : 46)}'`;
      break;
    }
    case PATCALLS.WRBYTE: {
      let bv = getAL();
      patDisplay += bv.toString(16).toUpperCase().padStart(2, '0');
      curDesc = `WRBYTE: ${hex8(bv)}`;
      break;
    }
    case PATCALLS.CLRSCR:
      patDisplay = '';
      curDesc = 'CLRSCR';
      break;
    case PATCALLS.CRLF:
      patDisplay += '\n';
      curDesc = 'CRLF';
      break;
    case PATCALLS.GETIN:
      if (keyQueue.length > 0) {
        setAL(keyQueue.shift());
        curDesc = 'GETIN: key=' + hex8(getAL());
      } else {
        setAL(0xFF);
        curDesc = 'GETIN: no key (0xFF)';
      }
      break;
    case PATCALLS.WT1MS:
      curDesc = 'WT1MS: 1ms delay (skipped)';
      break;
    case PATCALLS.WTNMS:
      curDesc = `WTNMS: ${BX}ms delay (skipped)`;
      break;
    case PATCALLS.LEDON:
      curDesc = 'LEDON';
      break;
    case PATCALLS.LEDOFF:
      curDesc = 'LEDOFF';
      break;
    case PATCALLS.READ:
    case PATCALLS.READLN:
      curDesc = `READ/READLN (stub)`;
      break;
    case PATCALLS.WRITE:
    case PATCALLS.WRITLN: {
      let cnt = CX, addr = pa(DS, DI);
      let s = '';
      for (let i = 0; i < cnt && i < 256; i++) {
        let c = rb(addr + i);
        s += (c >= 32 && c <= 126) ? String.fromCharCode(c) : '.';
      }
      patDisplay += s;
      curDesc = `WRITE: "${s.slice(0,20)}"`;
      break;
    }
    default:
      curDesc = `INT 28H AH=${hex8(fn)} (unhandled)`;
  }
}

// === INSTRUCTION FETCH & DECODE ===
function fetchByte() { let v = rb(pa(CS, IP)); IP = (IP + 1) & 0xFFFF; return v; }
function fetchWord() { let lo = fetchByte(), hi = fetchByte(); return lo | (hi << 8); }
function signExt8(v) { return (v & 0x80) ? (v | 0xFF00) : v; }
function signExt16(v) { return (v & 0x8000) ? (v | 0xFFFF0000) : v; }

// ModR/M decoding
function decodeModRM(modrm, wide) {
  let mod = (modrm >> 6) & 3;
  let reg = (modrm >> 3) & 7;
  let rm = modrm & 7;
  return { mod, reg, rm, wide };
}

function calcEA(mod, rm, segOverride) {
  let seg = segOverride !== undefined ? segOverride : DS;
  let off = 0;
  if (mod === 0) {
    switch(rm) {
      case 0: off = (BX + SI) & 0xFFFF; break;
      case 1: off = (BX + DI) & 0xFFFF; break;
      case 2: off = (BP + SI) & 0xFFFF; seg = segOverride !== undefined ? segOverride : SS; break;
      case 3: off = (BP + DI) & 0xFFFF; seg = segOverride !== undefined ? segOverride : SS; break;
      case 4: off = SI; break;
      case 5: off = DI; break;
      case 6: off = fetchWord(); break;
      case 7: off = BX; break;
    }
  } else {
    let disp = (mod === 1) ? signExt8(fetchByte()) : fetchWord();
    switch(rm) {
      case 0: off = (BX + SI + disp) & 0xFFFF; break;
      case 1: off = (BX + DI + disp) & 0xFFFF; break;
      case 2: off = (BP + SI + disp) & 0xFFFF; seg = segOverride !== undefined ? segOverride : SS; break;
      case 3: off = (BP + DI + disp) & 0xFFFF; seg = segOverride !== undefined ? segOverride : SS; break;
      case 4: off = (SI + disp) & 0xFFFF; break;
      case 5: off = (DI + disp) & 0xFFFF; break;
      case 6: off = (BP + disp) & 0xFFFF; seg = segOverride !== undefined ? segOverride : SS; break;
      case 7: off = (BX + disp) & 0xFFFF; break;
    }
  }
  return pa(seg, off);
}

function readRM(mrm, segOvr) {
  if (mrm.mod === 3) return mrm.wide ? getReg16(mrm.rm) : getReg8(mrm.rm);
  if (mrm._ea === undefined) mrm._ea = calcEA(mrm.mod, mrm.rm, segOvr);
  return mrm.wide ? rw(mrm._ea) : rb(mrm._ea);
}

function writeRM(mrm, val, segOvr) {
  if (mrm.mod === 3) { mrm.wide ? setReg16(mrm.rm, val) : setReg8(mrm.rm, val); return; }
  if (mrm._ea === undefined) mrm._ea = calcEA(mrm.mod, mrm.rm, segOvr);
  mrm.wide ? ww(mrm._ea, val) : wb(mrm._ea, val);
}

// === STRING OPERATIONS (used by REP prefix and standalone) ===
function execStringOp(op, wide, segOvr) {
  let srcSeg = segOvr !== undefined ? segOvr : DS;
  let inc = wide ? 2 : 1;
  let dir = gf(DF) ? -inc : inc;

  switch (op) {
    case 'MOVS': {
      let src = pa(srcSeg, SI), dst = pa(ES, DI);
      if (wide) ww(dst, rw(src)); else wb(dst, rb(src));
      SI = (SI + dir) & 0xFFFF; DI = (DI + dir) & 0xFFFF;
      break;
    }
    case 'STOS': {
      let dst = pa(ES, DI);
      if (wide) ww(dst, AX); else wb(dst, getAL());
      DI = (DI + dir) & 0xFFFF;
      break;
    }
    case 'LODS': {
      let src = pa(srcSeg, SI);
      if (wide) AX = rw(src); else setAL(rb(src));
      SI = (SI + dir) & 0xFFFF;
      break;
    }
    case 'CMPS': {
      let s = pa(srcSeg, SI), d = pa(ES, DI);
      let a = wide ? rw(s) : rb(s);
      let b = wide ? rw(d) : rb(d);
      let res = a - b;
      wide ? setFlagsArith16(res, a, b, true) : setFlagsArith8(res, a, b, true);
      SI = (SI + dir) & 0xFFFF; DI = (DI + dir) & 0xFFFF;
      break;
    }
    case 'SCAS': {
      let d = pa(ES, DI);
      let a = wide ? AX : getAL();
      let b = wide ? rw(d) : rb(d);
      let res = a - b;
      wide ? setFlagsArith16(res, a, b, true) : setFlagsArith8(res, a, b, true);
      DI = (DI + dir) & 0xFFFF;
      break;
    }
  }
}

// === MAIN EXECUTION ===
function execOne() {
  if (halt) return;

  checkInterrupts();
  timerTick();

  let startIP = IP, startCS = CS;
  let segOvr = undefined;
  let prefix = true;
  repPrefix = 0; // reset REP state

  // Handle prefixes
  while (prefix) {
    let pb = rb(pa(CS, IP));
    if (pb === 0x26) { segOvr = ES; IP = (IP+1) & 0xFFFF; }
    else if (pb === 0x2E) { segOvr = CS; IP = (IP+1) & 0xFFFF; }
    else if (pb === 0x36) { segOvr = SS; IP = (IP+1) & 0xFFFF; }
    else if (pb === 0x3E) { segOvr = DS; IP = (IP+1) & 0xFFFF; }
    else if (pb === 0xF3) { repPrefix = 0xF3; IP = (IP+1) & 0xFFFF; } // REP/REPE/REPZ
    else if (pb === 0xF2) { repPrefix = 0xF2; IP = (IP+1) & 0xFFFF; } // REPNE/REPNZ
    else prefix = false;
  }

  let op = fetchByte();
  let wide = op & 1;

  // === STRING OPS with REP support (A4-AF, AE) ===
  // Check if this is a string operation that can use REP
  let stringOps = {
    0xA4: 'MOVS', 0xA5: 'MOVS',  // MOVSB/MOVSW
    0xAA: 'STOS', 0xAB: 'STOS',  // STOSB/STOSW
    0xAC: 'LODS', 0xAD: 'LODS',  // LODSB/LODSW
    0xA6: 'CMPS', 0xA7: 'CMPS',  // CMPSB/CMPSW
    0xAE: 'SCAS', 0xAF: 'SCAS',  // SCASB/SCASW
  };

  if (stringOps[op] !== undefined) {
    let sop = stringOps[op];
    wide = op & 1;
    let suffix = wide ? 'W' : 'B';

    if (repPrefix) {
      let repName = repPrefix === 0xF3 ? 'REP' : 'REPNE';
      // For CMPS/SCAS with REPE (F3): repeat while ZF=1 and CX!=0
      // For CMPS/SCAS with REPNE (F2): repeat while ZF=0 and CX!=0
      let isConditional = (sop === 'CMPS' || sop === 'SCAS');
      if (repPrefix === 0xF3 && isConditional) repName = 'REPE';

      let count = 0;
      while (CX !== 0) {
        execStringOp(sop, wide, segOvr);
        CX = (CX - 1) & 0xFFFF;
        count++;
        if (isConditional) {
          if (repPrefix === 0xF3 && gf(ZF) === 0) break; // REPE: stop when ZF=0 (not equal)
          if (repPrefix === 0xF2 && gf(ZF) === 1) break; // REPNE: stop when ZF=1 (equal)
        }
        // Safety: prevent infinite loops in simulator
        if (count > 65536) break;
      }
      curInstr = `${repName} ${sop}${suffix}`;
      curDesc = `${repName} ${sop}${suffix}: ${count} iterations, CX=${CX}`;
    } else {
      // Single execution (no REP)
      execStringOp(sop, wide, segOvr);
      curInstr = `${sop}${suffix}`;
      curDesc = `${sop}${suffix}: SI=${hex16(SI)} DI=${hex16(DI)}`;
      if (sop === 'LODS') curDesc = `LODS → ${wide?hex16(AX):hex8(getAL())}`;
    }
  }
  // ALU ops: ADD, OR, ADC, SBB, AND, SUB, XOR, CMP
  else if ((op & 0xC0) === 0 && (op & 0x04) === 0 && op < 0x40) {
    let grp = (op >> 3) & 7;
    let d = (op >> 1) & 1;
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    let dst, src;
    if (d) { dst = wide ? getReg16(modrm.reg) : getReg8(modrm.reg); src = readRM(modrm, segOvr); }
    else { dst = readRM(modrm, segOvr); src = wide ? getReg16(modrm.reg) : getReg8(modrm.reg); }
    let res = doALU(grp, dst, src, wide);
    if (grp !== 7) {
      if (d) { wide ? setReg16(modrm.reg, res) : setReg8(modrm.reg, res); }
      else { writeRM(modrm, res, segOvr); }
    }
    let names = ['ADD','OR','ADC','SBB','AND','SUB','XOR','CMP'];
    curInstr = `${names[grp]} ${wide?'word':'byte'}`;
    curDesc = `${names[grp]}: ${hex16(dst)} op ${hex16(src)} = ${hex16(res & (wide?0xFFFF:0xFF))}`;
  }
  // ALU imm to AL/AX (04,05,0C,0D,14,15,1C,1D,24,25,2C,2D,34,35,3C,3D)
  else if ((op & 0xC6) === 0x04) {
    let grp = (op >> 3) & 7;
    wide = (op & 1);
    let imm = wide ? fetchWord() : fetchByte();
    let dst = wide ? AX : getAL();
    let res = doALU(grp, dst, imm, wide);
    if (grp !== 7) { wide ? (AX = res & 0xFFFF) : setAL(res); }
    let names = ['ADD','OR','ADC','SBB','AND','SUB','XOR','CMP'];
    curInstr = `${names[grp]} ${wide?'AX':'AL'},${wide?hex16(imm):hex8(imm)}`;
    curDesc = `${names[grp]}: ${hex16(dst)} op ${hex16(imm)} = ${hex16(res & (wide?0xFFFF:0xFF))}`;
  }
  // ALU immediate group (80-83)
  else if (op >= 0x80 && op <= 0x83) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    let dst = readRM(modrm, segOvr);
    let imm;
    if (op === 0x81) imm = fetchWord();
    else if (op === 0x83) imm = signExt8(fetchByte()) & 0xFFFF;
    else imm = fetchByte();
    let grp = modrm.reg;
    let res = doALU(grp, dst, imm, wide);
    if (grp !== 7) writeRM(modrm, res, segOvr);
    let names = ['ADD','OR','ADC','SBB','AND','SUB','XOR','CMP'];
    curInstr = `${names[grp]} rm,${hex16(imm)}`;
    curDesc = `${names[grp]}: ${hex16(dst)} op ${hex16(imm)} = ${hex16(res & (wide?0xFFFF:0xFF))}`;
  }
  // INC reg16 (40-47)
  else if (op >= 0x40 && op <= 0x47) {
    let r = op & 7, v = getReg16(r), res = (v + 1) & 0xFFFF;
    let cf = gf(CF); setFlagsArith16(v + 1, v, 1, false); sf(CF, cf);
    setReg16(r, res);
    curInstr = `INC ${rn16(r)}`; curDesc = `INC: ${hex16(v)}→${hex16(res)}`;
  }
  // DEC reg16 (48-4F)
  else if (op >= 0x48 && op <= 0x4F) {
    let r = op & 7, v = getReg16(r), res = (v - 1) & 0xFFFF;
    let cf = gf(CF); setFlagsArith16(v - 1, v, 1, true); sf(CF, cf);
    setReg16(r, res);
    curInstr = `DEC ${rn16(r)}`; curDesc = `DEC: ${hex16(v)}→${hex16(res)}`;
  }
  // PUSH reg16 (50-57)
  else if (op >= 0x50 && op <= 0x57) {
    let r = op & 7, v = getReg16(r);
    pushW(v);
    curInstr = `PUSH ${rn16(r)}`; curDesc = `PUSH ${hex16(v)}`;
  }
  // POP reg16 (58-5F)
  else if (op >= 0x58 && op <= 0x5F) {
    let r = op & 7, v = popW();
    setReg16(r, v);
    curInstr = `POP ${rn16(r)}`; curDesc = `POP → ${hex16(v)}`;
  }
  // PUSHA (60)
  else if (op === 0x60) {
    let sp0 = SP; pushW(AX); pushW(CX); pushW(DX); pushW(BX); pushW(sp0); pushW(BP); pushW(SI); pushW(DI);
    curInstr = 'PUSHA'; curDesc = 'Push all GPRs';
  }
  // POPA (61)
  else if (op === 0x61) {
    DI = popW(); SI = popW(); BP = popW(); popW(); BX = popW(); DX = popW(); CX = popW(); AX = popW();
    curInstr = 'POPA'; curDesc = 'Pop all GPRs';
  }
  // Jcc short (70-7F)
  else if (op >= 0x70 && op <= 0x7F) {
    let disp = signExt8(fetchByte());
    let cc = op & 0xF, taken = testCC(cc);
    if (taken) IP = (IP + disp) & 0xFFFF;
    let ccn = ['JO','JNO','JB','JNB','JZ','JNZ','JBE','JA','JS','JNS','JP','JNP','JL','JGE','JLE','JG'][cc];
    curInstr = ccn; curDesc = `${ccn}: ${taken ? 'TAKEN → '+hex16(IP) : 'not taken'}`;
  }
  // MOV reg,rm / rm,reg (88-8B)
  else if (op >= 0x88 && op <= 0x8B) {
    let d = (op >> 1) & 1; wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    if (d) {
      let v = readRM(modrm, segOvr);
      wide ? setReg16(modrm.reg, v) : setReg8(modrm.reg, v);
      curInstr = `MOV ${wide?rn16(modrm.reg):rn8(modrm.reg)},rm`; curDesc = `MOV: ${hex16(v)}`;
    } else {
      let v = wide ? getReg16(modrm.reg) : getReg8(modrm.reg);
      writeRM(modrm, v, segOvr);
      curInstr = `MOV rm,${wide?rn16(modrm.reg):rn8(modrm.reg)}`; curDesc = `MOV: ${hex16(v)}`;
    }
  }
  // MOV seg,rm (8E) / MOV rm,seg (8C)
  else if (op === 0x8E || op === 0x8C) {
    let modrm = decodeModRM(fetchByte(), true);
    if (op === 0x8E) {
      let v = readRM(modrm, segOvr);
      setSeg(modrm.reg, v);
      curInstr = `MOV ${['ES','CS','SS','DS'][modrm.reg]},rm`; curDesc = `MOV seg: ${hex16(v)}`;
    } else {
      let v = getSeg(modrm.reg);
      writeRM(modrm, v, segOvr);
      curInstr = `MOV rm,${['ES','CS','SS','DS'][modrm.reg]}`; curDesc = `MOV seg: ${hex16(v)}`;
    }
  }
  // LEA (8D)
  else if (op === 0x8D) {
    let modrm = decodeModRM(fetchByte(), true);
    let addr = calcEA(modrm.mod, modrm.rm, segOvr);
    let off = addr - ((segOvr !== undefined ? segOvr : DS) << 4);
    setReg16(modrm.reg, off & 0xFFFF);
    curInstr = `LEA ${rn16(modrm.reg)}`; curDesc = `LEA: offset=${hex16(off & 0xFFFF)}`;
  }
  // NOP (90)
  else if (op === 0x90) {
    curInstr = 'NOP'; curDesc = 'No operation';
  }
  // XCHG AX,reg (91-97)
  else if (op >= 0x91 && op <= 0x97) {
    let r = op & 7, t = AX; AX = getReg16(r); setReg16(r, t);
    curInstr = `XCHG AX,${rn16(r)}`; curDesc = `XCHG: AX↔${rn16(r)}`;
  }
  // CBW (98) — NEW
  else if (op === 0x98) {
    AX = signExt8(getAL()) & 0xFFFF;
    curInstr = 'CBW'; curDesc = `CBW: AL=${hex8(getAL())} → AX=${hex16(AX)}`;
  }
  // CWD (99) — NEW
  else if (op === 0x99) {
    DX = (AX & 0x8000) ? 0xFFFF : 0x0000;
    curInstr = 'CWD'; curDesc = `CWD: AX=${hex16(AX)} → DX:AX=${hex16(DX)}:${hex16(AX)}`;
  }
  // PUSHF (9C)
  else if (op === 0x9C) {
    pushW(FLAGS);
    curInstr = 'PUSHF'; curDesc = `PUSHF: ${hex16(FLAGS)}`;
  }
  // POPF (9D)
  else if (op === 0x9D) {
    FLAGS = popW() | 0x0002;
    curInstr = 'POPF'; curDesc = `POPF: ${hex16(FLAGS)}`;
  }
  // MOV AL/AX, moffs (A0,A1)
  else if (op === 0xA0 || op === 0xA1) {
    wide = op & 1;
    let off = fetchWord(), seg = segOvr !== undefined ? segOvr : DS;
    let addr = pa(seg, off);
    let v = wide ? rw(addr) : rb(addr);
    wide ? (AX = v) : setAL(v);
    curInstr = `MOV ${wide?'AX':'AL'},[${hex16(off)}]`; curDesc = `MOV: mem[${hex16(off)}]=${hex16(v)}`;
  }
  // MOV moffs, AL/AX (A2,A3)
  else if (op === 0xA2 || op === 0xA3) {
    wide = op & 1;
    let off = fetchWord(), seg = segOvr !== undefined ? segOvr : DS;
    let addr = pa(seg, off);
    let v = wide ? AX : getAL();
    wide ? ww(addr, v) : wb(addr, v);
    curInstr = `MOV [${hex16(off)}],${wide?'AX':'AL'}`; curDesc = `MOV: ${hex16(v)}→mem[${hex16(off)}]`;
  }
  // TEST AL/AX, imm (A8,A9)
  else if (op === 0xA8 || op === 0xA9) {
    wide = op & 1;
    let imm = wide ? fetchWord() : fetchByte();
    let v = wide ? AX : getAL();
    let r = v & imm;
    wide ? setFlagsLogic16(r) : setFlagsLogic8(r);
    curInstr = `TEST ${wide?'AX':'AL'},${hex16(imm)}`; curDesc = `TEST: ${hex16(v)} & ${hex16(imm)} = ${hex16(r)}`;
  }
  // MOV reg8, imm8 (B0-B7)
  else if (op >= 0xB0 && op <= 0xB7) {
    let r = op & 7, v = fetchByte();
    setReg8(r, v);
    curInstr = `MOV ${rn8(r)},${hex8(v)}`; curDesc = `MOV: ${hex8(v)}→${rn8(r)}`;
  }
  // MOV reg16, imm16 (B8-BF)
  else if (op >= 0xB8 && op <= 0xBF) {
    let r = op & 7, v = fetchWord();
    setReg16(r, v);
    curInstr = `MOV ${rn16(r)},${hex16(v)}`; curDesc = `MOV: ${hex16(v)}→${rn16(r)}`;
  }
  // RET near (C3)
  else if (op === 0xC3) {
    IP = popW();
    curInstr = 'RET'; curDesc = `RET → ${hex16(IP)}`;
  }
  // MOV rm, imm (C6/C7)
  else if (op === 0xC6 || op === 0xC7) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    if (modrm.mod !== 3) modrm._ea = calcEA(modrm.mod, modrm.rm, segOvr);
    let imm = wide ? fetchWord() : fetchByte();
    writeRM(modrm, imm, segOvr);
    curInstr = `MOV rm,${hex16(imm)}`; curDesc = `MOV: imm ${hex16(imm)} → memory`;
  }
  // INT imm8 (CD)
  else if (op === 0xCD) {
    let intNum = fetchByte();
    if (intNum === 0x28 || intNum === PATCALLS.USER) {
      handleInt28();
    } else {
      let vecAddr = intNum * 4;
      let newIP = rw(vecAddr);
      let newCS = rw(vecAddr + 2);
      if (newIP || newCS) {
        pushW(FLAGS); pushW(CS); pushW(IP);
        sf(IF_, 0); sf(TF, 0);
        CS = newCS; IP = newIP;
        curDesc = `INT ${hex8(intNum)} → ${hex16(newCS)}:${hex16(newIP)}`;
      } else {
        curDesc = `INT ${hex8(intNum)} (no handler)`;
      }
    }
    curInstr = `INT ${hex8(intNum)}`;
  }
  // IRET (CF)
  else if (op === 0xCF) {
    IP = popW(); CS = popW(); FLAGS = popW() | 0x0002;
    curInstr = 'IRET'; curDesc = `IRET → ${hex16(CS)}:${hex16(IP)}`;
  }
  // Shift/rotate group (D0-D3)
  else if (op >= 0xD0 && op <= 0xD3) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    let cnt = (op >= 0xD2) ? (getCL() & 0x1F) : 1;
    let val = readRM(modrm, segOvr);
    let mask = wide ? 0xFFFF : 0xFF;
    let bits = wide ? 16 : 8;
    let res = val;
    for (let i = 0; i < cnt; i++) {
      let c;
      switch(modrm.reg) {
        case 0: // ROL
          c = (res >> (bits-1)) & 1; res = ((res << 1) | c) & mask; sf(CF, c); break;
        case 1: // ROR
          c = res & 1; res = ((res >> 1) | (c << (bits-1))) & mask; sf(CF, c); break;
        case 2: // RCL
          c = (res >> (bits-1)) & 1; res = ((res << 1) | gf(CF)) & mask; sf(CF, c); break;
        case 3: // RCR
          c = res & 1; res = ((res >> 1) | (gf(CF) << (bits-1))) & mask; sf(CF, c); break;
        case 4: case 6: // SHL/SAL
          c = (res >> (bits-1)) & 1; res = (res << 1) & mask; sf(CF, c);
          sf(ZF, res===0); sf(SF, (res>>(bits-1))&1); sf(PF, parity8(res)); break;
        case 5: // SHR
          c = res & 1; res = (res >> 1) & mask; sf(CF, c);
          sf(ZF, res===0); sf(SF, 0); sf(PF, parity8(res)); break;
        case 7: // SAR
          c = res & 1; let sgn = res & (1 << (bits-1)); res = ((res >> 1) | sgn) & mask; sf(CF, c);
          sf(ZF, res===0); sf(SF, (res>>(bits-1))&1); sf(PF, parity8(res)); break;
      }
    }
    writeRM(modrm, res, segOvr);
    let sn = ['ROL','ROR','RCL','RCR','SHL','SHR','?','SAR'][modrm.reg];
    curInstr = `${sn} ${wide?'word':'byte'},${cnt}`; curDesc = `${sn}: ${hex16(val)}→${hex16(res)}`;
  }
  // LOOP/LOOPZ/LOOPNZ/JCXZ (E0-E3)
  else if (op >= 0xE0 && op <= 0xE3) {
    let disp = signExt8(fetchByte());
    if (op === 0xE2) {
      CX = (CX - 1) & 0xFFFF;
      if (CX !== 0) IP = (IP + disp) & 0xFFFF;
      curInstr = 'LOOP'; curDesc = `LOOP: CX=${CX}${CX?', taken':''}`;
    } else if (op === 0xE3) {
      if (CX === 0) IP = (IP + disp) & 0xFFFF;
      curInstr = 'JCXZ'; curDesc = `JCXZ: CX=${CX}`;
    } else {
      CX = (CX - 1) & 0xFFFF;
      let zc = gf(ZF);
      let tk = (op === 0xE1) ? (CX !== 0 && zc) : (CX !== 0 && !zc);
      if (tk) IP = (IP + disp) & 0xFFFF;
      curInstr = op === 0xE1 ? 'LOOPZ' : 'LOOPNZ'; curDesc = `${curInstr}: CX=${CX}`;
    }
  }
  // IN AL/AX, imm8 (E4/E5)
  else if (op === 0xE4 || op === 0xE5) {
    wide = op & 1;
    let port = fetchByte();
    let v = ioRead(port);
    wide ? (AX = v) : setAL(v);
    curInstr = `IN ${wide?'AX':'AL'},${hex8(port)}`; curDesc = `IN: port ${hex8(port)}=${hex8(v)}`;
  }
  // OUT imm8, AL/AX (E6/E7)
  else if (op === 0xE6 || op === 0xE7) {
    wide = op & 1;
    let port = fetchByte();
    let v = wide ? AX : getAL();
    ioWrite(port, v);
    curInstr = `OUT ${hex8(port)},${wide?'AX':'AL'}`; curDesc = `OUT: ${hex8(v)}→port ${hex8(port)}`;
  }
  // CALL rel16 (E8)
  else if (op === 0xE8) {
    let disp = fetchWord();
    if (disp & 0x8000) disp -= 0x10000;
    pushW(IP);
    IP = (IP + disp) & 0xFFFF;
    curInstr = 'CALL'; curDesc = `CALL → ${hex16(IP)}`;
  }
  // JMP rel16 (E9)
  else if (op === 0xE9) {
    let disp = fetchWord();
    if (disp & 0x8000) disp -= 0x10000;
    IP = (IP + disp) & 0xFFFF;
    curInstr = 'JMP near'; curDesc = `JMP → ${hex16(IP)}`;
  }
  // JMP rel8 (EB)
  else if (op === 0xEB) {
    let disp = signExt8(fetchByte());
    IP = (IP + disp) & 0xFFFF;
    curInstr = 'JMP short'; curDesc = `JMP → ${hex16(IP)}`;
  }
  // IN AL/AX, DX (EC/ED)
  else if (op === 0xEC || op === 0xED) {
    wide = op & 1;
    let v = ioRead(DX & 0xFF);
    wide ? (AX = v) : setAL(v);
    curInstr = `IN ${wide?'AX':'AL'},DX`; curDesc = `IN: port ${hex16(DX)}=${hex8(v)}`;
  }
  // OUT DX, AL/AX (EE/EF)
  else if (op === 0xEE || op === 0xEF) {
    wide = op & 1;
    let v = wide ? AX : getAL();
    ioWrite(DX & 0xFF, v);
    curInstr = `OUT DX,${wide?'AX':'AL'}`; curDesc = `OUT: ${hex8(v)}→port ${hex16(DX)}`;
  }
  // HLT (F4)
  else if (op === 0xF4) {
    if (gf(IF_) && (timerEnabled & 1)) {
      for (let t = 0; t < 5000 && !irqPending; t++) { timerCount++; if(timerCount>=TIMER_CYCLES_PER_TICK){timerCount=0;if(timerValue>0){timerValue--;if(timerValue===0)irqPending|=0x04;}} }
      if (irqPending) { curInstr = 'HLT'; curDesc = 'HLT → woke by interrupt'; cy++; ic++; return; }
    }
    halt = true; curInstr = 'HLT'; curDesc = 'HALT'; setSt('HALTED');
  }
  // CLI (FA)
  else if (op === 0xFA) { sf(IF_, 0); curInstr = 'CLI'; curDesc = 'Interrupts disabled'; }
  // STI (FB)
  else if (op === 0xFB) { sf(IF_, 1); curInstr = 'STI'; curDesc = 'Interrupts enabled'; }
  // CLC/STC/CMC/CLD/STD (F8-FD)
  else if (op === 0xF8) { sf(CF, 0); curInstr = 'CLC'; curDesc = 'CF=0'; }
  else if (op === 0xF9) { sf(CF, 1); curInstr = 'STC'; curDesc = 'CF=1'; }
  else if (op === 0xF5) { sf(CF, gf(CF)^1); curInstr = 'CMC'; curDesc = 'CF complemented'; }
  else if (op === 0xFC) { sf(DF, 0); curInstr = 'CLD'; curDesc = 'DF=0'; }
  else if (op === 0xFD) { sf(DF, 1); curInstr = 'STD'; curDesc = 'DF=1'; }
  // NOT/NEG/MUL/DIV/TEST (F6/F7 group)
  else if (op === 0xF6 || op === 0xF7) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    let val = readRM(modrm, segOvr);
    let mask = wide ? 0xFFFF : 0xFF;
    if (modrm.reg === 2) { // NOT
      let res = (~val) & mask;
      writeRM(modrm, res, segOvr);
      curInstr = 'NOT'; curDesc = `NOT: ${hex16(val)}→${hex16(res)}`;
    } else if (modrm.reg === 3) { // NEG
      let res = (-val) & mask;
      wide ? setFlagsArith16(-val, 0, val, true) : setFlagsArith8(-val, 0, val, true);
      sf(CF, val !== 0 ? 1 : 0);
      writeRM(modrm, res, segOvr);
      curInstr = 'NEG'; curDesc = `NEG: ${hex16(val)}→${hex16(res)}`;
    } else if (modrm.reg === 4) { // MUL
      if (wide) {
        let res = AX * val;
        AX = res & 0xFFFF; DX = (res >> 16) & 0xFFFF;
        sf(CF, DX !== 0 ? 1 : 0); sf(OF, DX !== 0 ? 1 : 0);
      } else {
        let res = getAL() * val;
        AX = res & 0xFFFF;
        sf(CF, getAH() !== 0 ? 1 : 0); sf(OF, getAH() !== 0 ? 1 : 0);
      }
      curInstr = 'MUL'; curDesc = `MUL: result=${wide?hex16(DX)+':'+hex16(AX):hex16(AX)}`;
    } else if (modrm.reg === 5) { // IMUL — NEW
      if (wide) {
        let a = (AX & 0x8000) ? AX - 0x10000 : AX;
        let b = (val & 0x8000) ? val - 0x10000 : val;
        let res = a * b;
        AX = res & 0xFFFF; DX = (res >> 16) & 0xFFFF;
        let signExt = (AX & 0x8000) ? 0xFFFF : 0;
        sf(CF, DX !== signExt ? 1 : 0); sf(OF, DX !== signExt ? 1 : 0);
      } else {
        let a = (getAL() & 0x80) ? getAL() - 0x100 : getAL();
        let b = (val & 0x80) ? val - 0x100 : val;
        let res = a * b;
        AX = res & 0xFFFF;
        let signExt = (getAL() & 0x80) ? 0xFF : 0;
        sf(CF, getAH() !== signExt ? 1 : 0); sf(OF, getAH() !== signExt ? 1 : 0);
      }
      curInstr = 'IMUL'; curDesc = `IMUL: result=${wide?hex16(DX)+':'+hex16(AX):hex16(AX)}`;
    } else if (modrm.reg === 6) { // DIV
      if (val === 0) { halt = true; curInstr = 'DIV'; curDesc = 'Division by zero!'; setSt('ERROR'); return; }
      if (wide) {
        let dividend = (DX & 0xFFFF) * 0x10000 + (AX & 0xFFFF);
        AX = Math.floor(dividend / val) & 0xFFFF;
        DX = (dividend % val) & 0xFFFF;
      } else {
        let dividend = AX;
        setAL(Math.floor(dividend / val) & 0xFF);
        setAH(dividend % val);
      }
      curInstr = 'DIV'; curDesc = `DIV: quotient=${wide?hex16(AX):hex8(getAL())}, rem=${wide?hex16(DX):hex8(getAH())}`;
    } else if (modrm.reg === 7) { // IDIV — NEW
      if (val === 0) { halt = true; curInstr = 'IDIV'; curDesc = 'Division by zero!'; setSt('ERROR'); return; }
      if (wide) {
        let dividend = ((DX & 0xFFFF) * 0x10000 + (AX & 0xFFFF));
        if (DX & 0x8000) dividend -= 0x100000000;
        let divisor = (val & 0x8000) ? val - 0x10000 : val;
        let quot = Math.trunc(dividend / divisor);
        let rem = dividend - quot * divisor;
        AX = quot & 0xFFFF; DX = rem & 0xFFFF;
      } else {
        let dividend = AX;
        if (dividend & 0x8000) dividend -= 0x10000;
        let divisor = (val & 0x80) ? val - 0x100 : val;
        let quot = Math.trunc(dividend / divisor);
        let rem = dividend - quot * divisor;
        setAL(quot & 0xFF); setAH(rem & 0xFF);
      }
      curInstr = 'IDIV'; curDesc = `IDIV: quotient=${wide?hex16(AX):hex8(getAL())}, rem=${wide?hex16(DX):hex8(getAH())}`;
    } else if (modrm.reg === 0) { // TEST rm, imm
      let imm = wide ? fetchWord() : fetchByte();
      let r = val & imm;
      wide ? setFlagsLogic16(r) : setFlagsLogic8(r);
      curInstr = `TEST rm,${hex16(imm)}`; curDesc = `TEST: ${hex16(val)}&${hex16(imm)}=${hex16(r)}`;
    } else {
      curInstr = `F6/F7 grp ${modrm.reg}`; curDesc = 'Unimplemented';
    }
  }
  // INC/DEC rm (FE/FF)
  else if (op === 0xFE || op === 0xFF) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    if (modrm.reg === 0) { // INC
      let v = readRM(modrm, segOvr), res = (v + 1) & (wide ? 0xFFFF : 0xFF);
      let cf = gf(CF);
      wide ? setFlagsArith16(v+1, v, 1, false) : setFlagsArith8(v+1, v, 1, false);
      sf(CF, cf);
      writeRM(modrm, res, segOvr);
      curInstr = `INC ${wide?'word':'byte'}`; curDesc = `INC: ${hex16(v)}→${hex16(res)}`;
    } else if (modrm.reg === 1) { // DEC
      let v = readRM(modrm, segOvr), res = (v - 1) & (wide ? 0xFFFF : 0xFF);
      let cf = gf(CF);
      wide ? setFlagsArith16(v-1, v, 1, true) : setFlagsArith8(v-1, v, 1, true);
      sf(CF, cf);
      writeRM(modrm, res, segOvr);
      curInstr = `DEC ${wide?'word':'byte'}`; curDesc = `DEC: ${hex16(v)}→${hex16(res)}`;
    } else if (modrm.reg === 2 && wide) { // CALL rm16
      let target = readRM(modrm, segOvr);
      pushW(IP);
      IP = target;
      curInstr = 'CALL rm16'; curDesc = `CALL → ${hex16(IP)}`;
    } else if (modrm.reg === 4 && wide) { // JMP rm16
      let target = readRM(modrm, segOvr);
      IP = target;
      curInstr = 'JMP rm16'; curDesc = `JMP → ${hex16(IP)}`;
    } else if (modrm.reg === 6 && wide) { // PUSH rm16
      let v = readRM(modrm, segOvr);
      pushW(v);
      curInstr = 'PUSH rm16'; curDesc = `PUSH ${hex16(v)}`;
    } else {
      curInstr = `FE/FF grp ${modrm.reg}`; curDesc = 'Unimplemented';
    }
  }
  // XCHG (86/87)
  else if (op === 0x86 || op === 0x87) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    let a = wide ? getReg16(modrm.reg) : getReg8(modrm.reg);
    let b = readRM(modrm, segOvr);
    writeRM(modrm, a, segOvr);
    wide ? setReg16(modrm.reg, b) : setReg8(modrm.reg, b);
    curInstr = 'XCHG'; curDesc = `XCHG: ${hex16(a)}↔${hex16(b)}`;
  }
  else {
    curInstr = `??? (${hex8(op)})`; curDesc = `Unknown opcode ${hex8(op)} at ${hex16(startCS)}:${hex16(startIP)}`;
    halt = true; setSt('ERROR');
  }

  cy++; ic++;
}

function doALU(grp, a, b, wide) {
  let mask = wide ? 0xFFFF : 0xFF;
  let res;
  switch(grp) {
    case 0: res = a + b; wide ? setFlagsArith16(res, a, b, false) : setFlagsArith8(res, a, b, false); break;
    case 1: res = a | b; wide ? setFlagsLogic16(res) : setFlagsLogic8(res); break;
    case 2: res = a + b + gf(CF); wide ? setFlagsArith16(res, a, b+gf(CF), false) : setFlagsArith8(res, a, b+gf(CF), false); break;
    case 3: res = a - b - gf(CF); wide ? setFlagsArith16(res, a, b+gf(CF), true) : setFlagsArith8(res, a, b+gf(CF), true); break;
    case 4: res = a & b; wide ? setFlagsLogic16(res) : setFlagsLogic8(res); break;
    case 5: res = a - b; wide ? setFlagsArith16(res, a, b, true) : setFlagsArith8(res, a, b, true); break;
    case 6: res = a ^ b; wide ? setFlagsLogic16(res) : setFlagsLogic8(res); break;
    case 7: res = a - b; wide ? setFlagsArith16(res, a, b, true) : setFlagsArith8(res, a, b, true); break;
    default: res = a;
  }
  return res & mask;
}

function testCC(cc) {
  switch(cc) {
    case 0: return gf(OF)===1;
    case 1: return gf(OF)===0;
    case 2: return gf(CF)===1;
    case 3: return gf(CF)===0;
    case 4: return gf(ZF)===1;
    case 5: return gf(ZF)===0;
    case 6: return gf(CF)===1||gf(ZF)===1;
    case 7: return gf(CF)===0&&gf(ZF)===0;
    case 8: return gf(SF)===1;
    case 9: return gf(SF)===0;
    case 10: return gf(PF)===1;
    case 11: return gf(PF)===0;
    case 12: return gf(SF)!==gf(OF);
    case 13: return gf(SF)===gf(OF);
    case 14: return gf(ZF)===1||(gf(SF)!==gf(OF));
    case 15: return gf(ZF)===0&&(gf(SF)===gf(OF));
  }
  return false;
}

function pushW(v) { SP = (SP - 2) & 0xFFFF; ww(pa(SS, SP), v & 0xFFFF); }
function popW() { let v = rw(pa(SS, SP)); SP = (SP + 2) & 0xFFFF; return v; }

// === HELPERS ===
function hex8(v) { return (v & 0xFF).toString(16).toUpperCase().padStart(2, '0'); }
function hex16(v) { return (v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'); }
function rn16(r) { return ['AX','CX','DX','BX','SP','BP','SI','DI'][r]; }
function rn8(r) { return ['AL','CL','DL','BL','AH','CH','DH','BH'][r]; }

// === SNAPSHOT ===
let dirtyPages = new Set();
const PAGE_SIZE = 256;
function markDirty(addr) { dirtyPages.add((addr >> 8) & 0xFFF); }
const _wb = wb, _ww = ww;
wb = function(addr, v) { markDirty(addr); _wb(addr, v); };
ww = function(addr, v) { markDirty(addr); markDirty(addr+1); _ww(addr, v); };

function captureSnap() {
  let pages = {};
  for (let p = 0; p < 16; p++) dirtyPages.add((0x800 >> 8) + p);
  dirtyPages.forEach(p => {
    let base = p * PAGE_SIZE;
    pages[p] = new Uint8Array(mem.buffer.slice(base, base + PAGE_SIZE));
  });
  return {
    pages, dirtySet: new Set(dirtyPages),
    AX,BX,CX,DX,SI,DI,SP,BP,CS,DS,SS,ES,IP,FLAGS,
    halt, cy, ic, curInstr, curDesc, lastDiff,
    patDisplay, ioPorts: ioPorts.slice(),
    ioLog: ioLog.slice(-50),
    motorDacVal, piezoOn, diskPulses, motorAngle,
    timerValue, timerReload, timerEnabled, timerCount, irqPending,
    adcBusy, adcConvCount
  };
}
function restoreSnap(s) {
  for (let p in s.pages) {
    let base = (+p) * PAGE_SIZE;
    mem.set(s.pages[p], base);
  }
  dirtyPages = new Set(s.dirtySet || []);
  AX=s.AX;BX=s.BX;CX=s.CX;DX=s.DX;SI=s.SI;DI=s.DI;SP=s.SP;BP=s.BP;
  CS=s.CS;DS=s.DS;SS=s.SS;ES=s.ES;IP=s.IP;FLAGS=s.FLAGS;
  halt=s.halt;cy=s.cy;ic=s.ic;curInstr=s.curInstr;curDesc=s.curDesc;lastDiff=s.lastDiff;
  patDisplay=s.patDisplay;ioPorts.set(s.ioPorts);
  ioLog=(s.ioLog||[]).slice();
  motorDacVal=s.motorDacVal||0;piezoOn=!!s.piezoOn;diskPulses=s.diskPulses||0;
  motorAngle=s.motorAngle||0;
  timerValue=s.timerValue||0;timerReload=s.timerReload||0;
  timerEnabled=s.timerEnabled||0;timerCount=s.timerCount||0;irqPending=s.irqPending||0;
  adcBusy=!!s.adcBusy;adcConvCount=s.adcConvCount||0;
  if(piezoOn)startPiezo();else stopPiezo();
  setSt(halt?'HALTED':'READY');
}

