// ============================================================
// PAT-286 CPU Core — Memory, Registers, Flags, State, Snapshot
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
  LEDON:19, LEDOFF:20,
  TONE:21, NOTOFF:22
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
let halt=false, running=false, tmr=null, waitUntil=0;
let cy=0, ic=0;
let curInstr='\u2014', curDesc='\u2014', lastDiff='\u2014';
let stepPast=[], stepFuture=[];
let pLen=0, labels={}, asmLines=[], asmOutput=[], instrLines=new Set();
let progOrg=0x100;
let breakpoints=new Set(), asmErrLines=new Set();
let patDisplay='', patDisplayBuf='';
let memFollowMode = null;
let prevMemSnapshot = new Uint8Array(64);
let prevMemBase = 0, prevMemSeg = 0;
let execTrace = [];
const TRACE_MAX = 500;

// REP prefix state
let repPrefix = 0;

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

// === STACK ===
function pushW(v) { SP = (SP - 2) & 0xFFFF; ww(pa(SS, SP), v & 0xFFFF); }
function popW() { let v = rw(pa(SS, SP)); SP = (SP + 2) & 0xFFFF; return v; }

// === HELPERS ===
function hex8(v) { return (v & 0xFF).toString(16).toUpperCase().padStart(2, '0'); }
function hex16(v) { return (v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'); }
function rn16(r) { return ['AX','CX','DX','BX','SP','BP','SI','DI'][r]; }
function rn8(r) { return ['AL','CL','DL','BL','AH','CH','DH','BH'][r]; }

// === SNAPSHOT (dirty page tracking) ===
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
