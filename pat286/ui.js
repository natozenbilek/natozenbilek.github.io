// === STEP / RUN / RESET ===
function doStep() {
  if (!pLen) { sLog('No program assembled.', 1); return; }
  if (halt) return;
  let prevState = {AX,BX,CX,DX,SI,DI,SP,BP,CS,DS,SS,ES,IP,FLAGS};
  stepPast.push(captureSnap());
  if (stepPast.length > 500) stepPast.shift();
  stepFuture = [];
  execOne();
  let diffs = [];
  if(AX!==prevState.AX) diffs.push(`AX:${hex16(prevState.AX)}→${hex16(AX)}`);
  if(BX!==prevState.BX) diffs.push(`BX:${hex16(prevState.BX)}→${hex16(BX)}`);
  if(CX!==prevState.CX) diffs.push(`CX:${hex16(prevState.CX)}→${hex16(CX)}`);
  if(DX!==prevState.DX) diffs.push(`DX:${hex16(prevState.DX)}→${hex16(DX)}`);
  if(SP!==prevState.SP) diffs.push(`SP:${hex16(prevState.SP)}→${hex16(SP)}`);
  if(IP!==prevState.IP) diffs.push(`IP:${hex16(prevState.IP)}→${hex16(IP)}`);
  if(FLAGS!==prevState.FLAGS) diffs.push(`FL:${hex16(prevState.FLAGS)}→${hex16(FLAGS)}`);
  lastDiff = diffs.length ? diffs.join(' | ') : 'No change';
  execTrace.push({ip: prevState.IP, op: curInstr, diff: diffs.length ? diffs.join(', ') : ''});
  if (execTrace.length > TRACE_MAX) execTrace.shift();
  renderAll();
  if (halt) { stopRun(); sLog(`HALT. ${ic} instructions executed.`, 0); }
}

function doStepBack() {
  if (!stepPast.length) return;
  stopRun();
  stepFuture.push(captureSnap());
  restoreSnap(stepPast.pop());
  renderAll();
}
function doStepForward() {
  if (!stepFuture.length) return;
  stopRun();
  stepPast.push(captureSnap());
  restoreSnap(stepFuture.pop());
  renderAll();
}

let spd = 20;
function updSpd() { spd = +document.getElementById('spd').value; if(running){stopRun();startRun()} }
function doToggleRun() { if(running) stopRun(); else startRun(); }
function startRun() {
  if(!pLen){sLog('No program.',1);return} if(halt)return;
  running=true;
  document.getElementById('runBtn').textContent='Pause';
  document.getElementById('runBtn').className='b';
  setSt('RUNNING');
  let batch = spd >= 9999 ? 500 : 1;
  let delay = spd >= 9999 ? 1 : Math.max(1, Math.floor(1000/spd));
  tmr = setInterval(()=>{
    for(let i=0;i<batch&&!halt&&running;i++){
      if(breakpoints.size>0&&asmLines.length){
        for(let al of asmLines){
          if(al.addr===IP&&breakpoints.has(al.ln)){
            stopRun();sLog('Breakpoint: line '+al.ln,0);renderAll();return;
          }
        }
      }
      execOne();
    }
    renderAll();
    if(halt){stopRun();sLog(`HALT. ${ic} instr.`,0)}
  }, delay);
}
function stopRun() {
  running=false;if(tmr){clearInterval(tmr);tmr=null}
  document.getElementById('runBtn').textContent='Run';
  document.getElementById('runBtn').className='b bg';
  if(!halt) setSt('READY');
}
function doReset() {
  stopRun(); stopPiezo();
  keyQueue = [];
  timerValue = 0; timerReload = 0; timerCount = 0; timerEnabled = 0;
  irqPending = 0;
  doAssemble();
}

// === RENDER ===
function setSt(s) {
  let e=document.getElementById('st');e.textContent=s;
  e.className='pill p-'+{READY:'rdy',RUNNING:'run',HALTED:'hlt',ERROR:'err'}[s];
}
function sLog(m,err) {
  let e=document.getElementById('log');
  if(!e) return;
  e.className='lb'+(err?' le':' ls');
  e.textContent=String(m||'');
}
function showTermTab(tab) {
  let panel = document.getElementById('termPanel');
  if (!panel) return;
  let wasOpen = panel.classList.contains('open');
  let curTab = panel.dataset.tab || 'ports';
  if (wasOpen && curTab === tab) { panel.classList.remove('open'); return; }
  panel.classList.add('open');
  panel.dataset.tab = tab;
  document.getElementById('termPorts').style.display = tab==='ports' ? '' : 'none';
  document.getElementById('termSerial').style.display = tab==='serial' ? '' : 'none';
  document.getElementById('termTabPorts').className = 'term-tab'+(tab==='ports'?' active':'');
  document.getElementById('termTabSerial').className = 'term-tab'+(tab==='serial'?' active':'');
  if (tab === 'ports') renderPortMonitor();
}

function renderAll() {
  let gpHtml = '';
  let gpRegs = [[AX,'AX',`${hex8(getAH())}:${hex8(getAL())}`],[BX,'BX',`${hex8(getBH())}:${hex8(getBL())}`],
                [CX,'CX',`${hex8(getCH())}:${hex8(getCL())}`],[DX,'DX',`${hex8(getDH())}:${hex8(getDL())}`],
                [SI,'SI',''],[DI,'DI',''],[SP,'SP',''],[BP,'BP','']];
  for(let[v,n,split] of gpRegs) {
    gpHtml+=`<div class="rc"><span class="rn">${n}</span><span class="rv">${hex16(v)}</span>${split?`<span class="rv-split">${split}</span>`:''}</div>`;
  }
  document.getElementById('rgGP').innerHTML=gpHtml;

  let segHtml='';
  for(let[v,n] of [[CS,'CS'],[DS,'DS'],[SS,'SS'],[ES,'ES']]) segHtml+=`<div class="rc"><span class="rn">${n}</span><span class="rv">${hex16(v)}</span></div>`;
  document.getElementById('rgSeg').innerHTML=segHtml;

  let ctlHtml='';
  for(let[v,n] of [[IP,'IP'],[FLAGS,'FLAGS'],[pa(CS,IP),'PhysAddr']]) ctlHtml+=`<div class="rc"><span class="rn">${n}</span><span class="rv">${n==='PhysAddr'?'0x'+(v).toString(16).toUpperCase().padStart(5,'0'):hex16(v)}</span></div>`;
  document.getElementById('rgCtl').innerHTML=ctlHtml;

  let fhtml='';
  for(let[b,n] of [[OF,'OF'],[DF,'DF'],[IF_,'IF'],[TF,'TF'],[SF,'SF'],[ZF,'ZF'],[AF,'AF'],[PF,'PF'],[CF,'CF']]) {
    fhtml+=`<span class="flb${gf(b)?' fs':''}">${n}</span>`;
  }
  document.getElementById('flG').innerHTML=fhtml;

  document.getElementById('irD').textContent=curInstr;
  document.getElementById('desc').textContent=curDesc;
  document.getElementById('diffBox').textContent=lastDiff;
  document.getElementById('cyN').textContent=cy;
  document.getElementById('inN').textContent=ic;

  let disp = patDisplay.slice(-32) || '\u00A0';
  document.getElementById('patDisp').textContent=disp;

  document.getElementById('stkInfo').textContent=`${hex16(SS)}:${hex16(SP)}`;
  let shtml='';
  let sBase = SP;
  for(let i=0;i<8;i++){
    let a=(sBase+i*2)&0xFFFF;
    let v=rw(pa(SS,a));
    shtml+=`<div class="stk-row"><span class="stk-addr">${hex16(a)}</span><span class="stk-val${i===0?' stk-cur':''}">${hex16(v)}</span></div>`;
  }
  document.getElementById('stkView').innerHTML=shtml;

  renderMem();
  renderAppModule();
  renderIOLog();
  if(document.getElementById('termPanel')?.dataset.tab==='ports') renderPortMonitor();
  renderTrace();

  let bb=document.getElementById('stepBackBtn'),bf=document.getElementById('stepFwdBtn');
  if(bb){bb.disabled=running||!stepPast.length;bb.textContent='\u2190 Back'+(stepPast.length?' ('+stepPast.length+')':'');}
  if(bf){bf.disabled=running||!stepFuture.length;bf.textContent='Fwd'+(stepFuture.length?' ('+stepFuture.length+')':'')+' \u2192';}

  updateMotor();
  updLn();
}

function toggleFollow(mode) {
  memFollowMode = memFollowMode === mode ? null : mode;
  document.getElementById('followIP').classList.toggle('active', memFollowMode === 'IP');
  document.getElementById('followSP').classList.toggle('active', memFollowMode === 'SP');
  renderMem();
}

function renderMem() {
  let seg, off;
  if (memFollowMode === 'IP') {
    seg = CS; off = IP;
    document.getElementById('memAddr').value = hex16(seg) + ':' + hex16(off);
  } else if (memFollowMode === 'SP') {
    seg = SS; off = SP;
    document.getElementById('memAddr').value = hex16(seg) + ':' + hex16(off);
  } else {
    let input = document.getElementById('memAddr').value.trim();
    seg = 0x80; off = 0x100;
    let m = input.match(/^([0-9A-Fa-f]+):([0-9A-Fa-f]+)$/);
    if (m) { seg = parseInt(m[1], 16); off = parseInt(m[2], 16); }
    else { off = parseInt(input, 16) || 0x100; }
  }

  let html = '';
  let base = off & ~7;
  let newSnapshot = new Uint8Array(64);
  let sameRegion = (base === prevMemBase && seg === prevMemSeg);

  for (let r = 0; r < 8; r++) {
    let rowAddr = base + r * 8;
    html += `<span class="ma">${hex16(rowAddr)}</span>`;
    for (let c = 0; c < 8; c++) {
      let idx = r * 8 + c;
      let a = rowAddr + c;
      let physA = pa(seg, a);
      let v = rb(physA);
      newSnapshot[idx] = v;
      let cl = 'mv';
      if (v) cl += ' nz';
      if (a === IP) cl += ' pc-m';
      if (a === SP) cl += ' sp-m';
      if (sameRegion && prevMemSnapshot[idx] !== v) cl += ' chg';
      html += `<span class="${cl}">${hex8(v)}</span>`;
    }
  }
  prevMemSnapshot = newSnapshot;
  prevMemBase = base;
  prevMemSeg = seg;
  document.getElementById('memGrid').innerHTML = html;
}

function renderAppModule() {
  let p1 = ioPorts[0x90], p2 = ioPorts[0x92];
  let p1dir = ioPorts[0x88];
  let p2mode = ioPorts[0x86];

  for (let [gid, val, dir] of [['ledP1svg', p1, p1dir], ['ledP2svg', p2, p2mode === 0x03 ? 0xFF : 0]]) {
    let g = document.getElementById(gid);
    if (!g) continue;
    let html = '';
    for (let i = 7; i >= 0; i--) {
      let on = ((val >> i) & 1) && ((dir >> i) & 1);
      let x = (7 - i) * 22;
      html += `<circle cx="${x + 8}" cy="8" r="7" fill="${on ? '#ff6b6b' : 'var(--bg)'}" stroke="${on ? '#ff6b6b' : 'var(--brd)'}" stroke-width="1" ${on ? 'filter="url(#glow)"' : ''}/>`;
    }
    g.innerHTML = html;
  }

  let rpm = Math.round(motorDacVal / 255 * 3000);
  let mRpmEl = document.getElementById('mRpm');
  let mDacEl = document.getElementById('mDac');
  let mDscEl = document.getElementById('mDsc');
  if (mRpmEl) mRpmEl.textContent = rpm + ' RPM';
  if (mDacEl) mDacEl.textContent = hex8(motorDacVal);
  if (mDscEl) mDscEl.textContent = diskPulses;

  let pzCirc = document.getElementById('pzCirc');
  let pzSt = document.getElementById('pzSt');
  if (pzCirc) { pzCirc.setAttribute('fill', piezoOn ? 'var(--amb)' : 'var(--bg)'); pzCirc.setAttribute('stroke', piezoOn ? 'var(--amb)' : 'var(--brd)'); }
  if (pzSt) { pzSt.textContent = piezoOn ? 'ON' : 'OFF'; pzSt.setAttribute('fill', piezoOn ? 'var(--amb)' : 'var(--text3)'); }

  let utxOn = (p1 >> 6) & 1;
  let utxCirc = document.getElementById('utxCirc');
  let urxCirc = document.getElementById('urxCirc');
  if (utxCirc) utxCirc.setAttribute('fill', utxOn ? 'var(--pur)' : 'var(--bg)');
  if (urxCirc) urxCirc.setAttribute('fill', (utxOn && objectNear) ? 'var(--pur)' : 'var(--bg)');

  let optSnd = document.getElementById('optSnd');
  let optRcv = document.getElementById('optRcv');
  let optLvlTxt = document.getElementById('optLvlTxt');
  if (optSnd) optSnd.setAttribute('fill', opticalBlocked ? 'var(--bg)' : 'var(--grn)');
  if (optRcv) optRcv.setAttribute('fill', opticalBlocked ? 'var(--red)' : 'var(--grn)');
  if (optLvlTxt) optLvlTxt.textContent = opticalBlocked ? '0'+Math.floor(Math.random()*16).toString(16).toUpperCase() : 'FF';

  let potFill = document.getElementById('potFill');
  let potKnob = document.getElementById('potKnob');
  let potTxt = document.getElementById('potTxt');
  let potCtlTxt = document.getElementById('potCtlTxt');
  let pRatio = potValue / 255;
  if (potFill) potFill.setAttribute('width', Math.round(pRatio * 80));
  if (potKnob) potKnob.setAttribute('cx', 335 + Math.round(pRatio * 80));
  if (potTxt) potTxt.textContent = hex8(potValue) + 'H';
  if (potCtlTxt) potCtlTxt.textContent = potValue;

  let btnObjTxt = document.getElementById('btnObjTxt');
  let btnOptTxt = document.getElementById('btnOptTxt');
  let btnObj = document.getElementById('btnObj');
  let btnOpt = document.getElementById('btnOpt');
  if (btnObjTxt) btnObjTxt.textContent = 'Object: ' + (objectNear ? 'ON' : 'OFF');
  if (btnOptTxt) btnOptTxt.textContent = 'Blocked: ' + (opticalBlocked ? 'YES' : 'NO');
  if (btnObj) btnObj.setAttribute('fill', objectNear ? 'var(--pur-l)' : 'var(--bg3)');
  if (btnOpt) btnOpt.setAttribute('fill', opticalBlocked ? 'var(--red-l)' : 'var(--bg3)');

  let seg7 = document.getElementById('seg7');
  if (seg7) {
    let disp = patDisplay.slice(-8) || '\u00A0';
    seg7.textContent = disp;
  }

  let adcBsyEl = document.getElementById('adcBsy');
  let adcRdEl = document.getElementById('adcRd');
  if (adcBsyEl) adcBsyEl.textContent = 'RDY';
  if (adcRdEl) adcRdEl.textContent = (p1 >> 3) & 1 ? '1' : '0';

  let tmrInfo = document.getElementById('tmrInfo');
  let tmrClk = document.getElementById('tmrClk');
  if (tmrInfo) tmrInfo.textContent = (timerEnabled & 1 ? 'ON' : 'OFF') + ' · Val: ' + hex8(timerValue) + ' · IRQ: ' + (irqPending ? 'PENDING' : '—');
  if (tmrClk) tmrClk.textContent = 'Clock: ' + hex8(timerClockSel) + ' · IRQEN: ' + hex8(timerEnabled);

  let irqInfoEl = document.getElementById('irqInfo');
  let irqVecEl = document.getElementById('irqVec');
  if (irqInfoEl) irqInfoEl.textContent = 'IF=' + gf(IF_) + ' · Pending: ' + (irqPending ? hex8(irqPending) : '—');
  if (irqVecEl) {
    let v0 = rw(0x80) ? hex16(rw(0x82)) + ':' + hex16(rw(0x80)) : '—';
    let v1 = rw(0x84) ? hex16(rw(0x86)) + ':' + hex16(rw(0x84)) : '—';
    let v2 = rw(0x94) ? hex16(rw(0x96)) + ':' + hex16(rw(0x94)) : '—';
    irqVecEl.textContent = 'IR0:' + v0 + ' IR1:' + v1 + ' IR2:' + v2;
  }

  let portState = document.getElementById('portState');
  let portData = document.getElementById('portData');
  if (portState) portState.textContent = 'P1CTL:' + hex8(ioPorts[0x88]) + ' MODE:' + hex8(ioPorts[0x86]) + ' CREG1:' + hex8(ioPorts[0x80]) + ' IRQEN:' + hex8(ioPorts[0x8A]);
  if (portData) portData.textContent = 'PORT1:' + hex8(p1) + ' PORT2:' + hex8(p2) + ' TIMER:' + hex8(timerValue) + ' STATUS:' + hex8(ioPorts[0x9E]);
}

function updateMotor() {
  if (motorDacVal > 0) motorAngle = (motorAngle + motorDacVal / 30) % 360;
  let rad = motorAngle * Math.PI / 180;
  let x2 = 90 + 35 * Math.sin(rad);
  let y2 = 170 - 35 * Math.cos(rad);
  let arm = document.getElementById('mArm');
  if (arm) { arm.setAttribute('x2', x2); arm.setAttribute('y2', y2); }
  let encSlots = document.getElementById('encSlots');
  if (encSlots) encSlots.setAttribute('transform', 'rotate(' + motorAngle + ',90,170)');
}

function renderPortMonitor() {
  let el = document.getElementById('portMon');
  if (!el) return;
  const ports = [
    ['PORT1', 0x90], ['PORT2', 0x92], ['P1CTL', 0x88], ['MODE', 0x86],
    ['CREG1', 0x80], ['IRQEN', 0x8A], ['TMR1', 0x94], ['STATUS', 0x9E]
  ];
  let html = '<table class="pm-tbl"><tr><th>Port</th><th>Addr</th><th>Hex</th><th>Dec</th><th>Binary</th></tr>';
  for (let [name, addr] of ports) {
    let v = ioPorts[addr] || 0;
    let bin = v.toString(2).padStart(8, '0').replace(/(.{4})/g, '$1 ').trim();
    html += `<tr><td>${name}</td><td>${hex8(addr)}</td><td class="pm-val">${hex8(v)}</td><td>${v}</td><td class="pm-bin">${bin}</td></tr>`;
  }
  html += '</table>';
  el.innerHTML = html;
}

function renderIOLog() {
  let el = document.getElementById('ioLog');
  if (!el) return;
  if (!ioLog.length) { el.textContent = '—'; return; }
  const pn = {0x80:'CREG1',0x82:'CREG2',0x84:'CREG3',0x86:'MODE',0x88:'P1CTL',0x8A:'IRQEN',0x8C:'IRQADR',0x90:'PORT1',0x92:'PORT2',0x94:'TMR1',0x40:'PIC'};
  let html = ioLog.slice(-30).map(e => {
    let name = pn[e.port] || hex8(e.port);
    return `<span class="io-${e.dir.toLowerCase()}">${e.dir} ${name}=${hex8(e.val)}</span>`;
  }).join('<br>');
  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}

function renderTrace() {
  let el = document.getElementById('traceView');
  if (!el) return;
  document.getElementById('traceCount').textContent = execTrace.length;
  if (!execTrace.length) { el.innerHTML = '<span style="color:var(--text3);font-size:9px">Run program to see trace</span>'; return; }
  let last = execTrace.slice(-80);
  let html = last.map(t =>
    `<div class="trace-row"><span class="trace-addr">${hex16(t.ip)}</span><span class="trace-op">${t.op}</span>${t.diff?`<span class="trace-diff">${t.diff}</span>`:''}</div>`
  ).join('');
  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}

// === UI INTERACTIONS ===
function potChanged() { potValue = +document.getElementById('potSlider').value; }
function toggleObject() { objectNear = !objectNear; renderAppModule(); }
function toggleOptical() { opticalBlocked = !opticalBlocked; renderAppModule(); }

// === EDITOR ===
const ed = document.getElementById('ed'), lns = document.getElementById('lns');
const edHL = document.getElementById('edHL');

// Syntax highlighting
const HL_KEYWORDS = new Set(['MOV','ADD','SUB','MUL','DIV','IMUL','IDIV','INC','DEC','NEG','NOT','AND','OR','XOR','TEST','CMP','SHL','SHR','SAR','SAL','ROL','ROR','RCL','RCR','PUSH','POP','PUSHF','POPF','CALL','RET','JMP','JE','JNE','JZ','JNZ','JG','JGE','JL','JLE','JA','JAE','JB','JBE','JC','JNC','JS','JNS','JO','JNO','JP','JNP','JCXZ','LOOP','LOOPE','LOOPNE','INT','IRET','HLT','NOP','CLC','STC','CMC','CLD','STD','CLI','STI','XCHG','LEA','CBW','CWD','IN','OUT','MOVS','MOVSB','MOVSW','STOS','STOSB','STOSW','LODS','LODSB','LODSW','CMPS','CMPSB','CMPSW','SCAS','SCASB','SCASW','REP','REPE','REPZ','REPNE','REPNZ','DAA','DAS','AAA','AAS','AAM','AAD','XLAT']);
const HL_REGS = new Set(['AX','BX','CX','DX','AH','AL','BH','BL','CH','CL','DH','DL','SI','DI','SP','BP','CS','DS','SS','ES','IP']);
const HL_DIRS = new Set(['ORG','DB','DW','EQU','END','INCLUDE','BYTE','WORD','PTR','OFFSET','SEG']);
const PY_KEYWORDS = new Set(['import','from','def','class','return','if','elif','else','for','while','in','not','and','or','is','with','as','try','except','finally','raise','pass','break','continue','True','False','None','print','open','self','lambda','yield','global','nonlocal','assert','del']);
const PY_BUILTINS = new Set(['serial','sys','os','int','str','float','list','dict','tuple','set','len','range','enumerate','zip','map','filter','type','isinstance','hasattr','getattr','setattr','super','property','staticmethod','classmethod','input','format']);

function currentFileType() {
  return (activeTabKey && activeTabKey.endsWith('.py')) ? 'py' : 'asm';
}

function highlightLinePy(line) {
  let ci = line.indexOf('#');
  let code = ci >= 0 ? line.substring(0, ci) : line;
  let comment = ci >= 0 ? line.substring(ci) : '';

  let result = code.replace(/('[^']*'|"[^"]*")|(\b[0-9]+\.?[0-9]*\b)|(\b[A-Za-z_]\w*\b)/g,
    function(m, str, num, word) {
      if (str) return `<span class="hl-s">${esc(str)}</span>`;
      if (num) return `<span class="hl-n">${esc(num)}</span>`;
      if (word) {
        if (PY_KEYWORDS.has(word)) return `<span class="hl-k">${esc(word)}</span>`;
        if (PY_BUILTINS.has(word)) return `<span class="hl-d">${esc(word)}</span>`;
        return esc(word);
      }
      return esc(m);
    }
  );
  if (comment) result += `<span class="hl-c">${esc(comment)}</span>`;
  return result;
}

function highlightLine(line) {
  if (currentFileType() === 'py') return highlightLinePy(line);

  // Find comment start, skip semicolons inside string literals
  let ci = -1;
  let inStr = false, strCh = '';
  for (let i = 0; i < line.length; i++) {
    let c = line[i];
    if (inStr) { if (c === strCh) inStr = false; }
    else if (c === "'" || c === '"') { inStr = true; strCh = c; }
    else if (c === ';') { ci = i; break; }
  }
  let code = ci >= 0 ? line.substring(0, ci) : line;
  let comment = ci >= 0 ? line.substring(ci) : '';

  let result = code.replace(/('[^']*'|"[^"]*")|(\$)|(\b[0-9][0-9A-Fa-f]*[Hh]\b|\b0[Xx][0-9A-Fa-f]+\b|\b[0-9]+[Bb]\b|\b[0-9]+\b)|(\.[A-Za-z_]\w*)|(\b[A-Za-z_]\w*\b)/g,
    function(m, str, dollar, num, dotword, word) {
      if (str) return `<span class="hl-s">${esc(str)}</span>`;
      if (dollar) return `<span class="hl-n">$</span>`;
      if (num) return `<span class="hl-n">${esc(num)}</span>`;
      if (dotword) return `<span class="hl-l">${esc(dotword)}</span>`;
      if (word) {
        let u = word.toUpperCase();
        if (HL_KEYWORDS.has(u)) return `<span class="hl-k">${esc(word)}</span>`;
        if (HL_REGS.has(u)) return `<span class="hl-r">${esc(word)}</span>`;
        if (HL_DIRS.has(u)) return `<span class="hl-d">${esc(word)}</span>`;
        return `<span class="hl-l">${esc(word)}</span>`;
      }
      return esc(m);
    }
  );

  if (comment) result += `<span class="hl-c">${esc(comment)}</span>`;
  return result;
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function updateHighlight() {
  let lines = ed.value.split('\n');
  edHL.innerHTML = lines.map(l => highlightLine(l)).join('\n') + '\n';
}

function syncScroll() {
  lns.scrollTop = ed.scrollTop;
  edHL.scrollTop = ed.scrollTop;
  edHL.scrollLeft = ed.scrollLeft;
}

ed.addEventListener('input', () => { updLn(); updateHighlight(); });
ed.addEventListener('scroll', syncScroll);
ed.addEventListener('keydown', function(e) {
  if (e.key === 'Tab') { e.preventDefault(); let s=this.selectionStart; this.value=this.value.substring(0,s)+'        '+this.value.substring(this.selectionEnd); this.selectionStart=this.selectionEnd=s+8; updLn(); updateHighlight(); }
  else if ((e.ctrlKey||e.metaKey) && e.key === 'Enter') { e.preventDefault(); doAssemble(); }
});

function scrollToLine(lineNum) {
  let lineH = 19; // line-height in px
  let target = (lineNum - 1) * lineH;
  ed.scrollTop = Math.max(0, target - ed.clientHeight / 3);
  syncScroll();
}

function updLn() {
  let n = ed.value.split('\n').length, h = '';
  let curLine = -1;
  if (asmLines.length && !halt) {
    for (let al of asmLines) { if (al.addr === IP) { curLine = al.ln; break; } }
  }
  let firstErr = -1;
  for (let i = 1; i <= n; i++) {
    let cl = 'ln-row';
    if (breakpoints.has(i)) cl += ' ln-bp';
    if (asmErrLines.has(i)) { cl += ' ln-err'; if (firstErr < 0) firstErr = i; }
    if (i === curLine) cl += ' ln-cur';
    h += `<span class="${cl}" data-line="${i}">${i}</span>`;
  }
  lns.innerHTML = h;
  syncScroll();
  return firstErr;
}

// === THEME TOGGLE ===
let currentTheme = localStorage.getItem('pat286_theme') || 'dark';
function applyTheme(t) {
  currentTheme = t;
  if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  let btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = t === 'light' ? 'Light' : 'Dark';
  localStorage.setItem('pat286_theme', t);
}
function toggleTheme() { applyTheme(currentTheme === 'dark' ? 'light' : 'dark'); }

// === EXPORT / IMPORT ===
function openExport() { document.getElementById('expOv').hidden = false; genExportHex(); }
function closeExport() { document.getElementById('expOv').hidden = true; }
function genExportHex() {
  let el = document.getElementById('expOut');
  if (!el) return;
  if (!asmLines.length) { el.textContent = 'No program assembled.'; return; }
  let out = '; PAT-286 Hex dump\n';
  let addrs = asmLines.map(a => a.addr);
  let minA = Math.min(...addrs), maxA = Math.max(...addrs);
  let seg = 0x80;
  for (let row = (minA & ~7); row <= maxA + 8; row += 8) {
    let hasData = false;
    for (let c = 0; c < 8; c++) if (rb(pa(seg, row + c)) !== 0) hasData = true;
    if (!hasData) continue;
    out += hex16(row) + ': ';
    for (let c = 0; c < 8; c++) out += hex8(rb(pa(seg, row + c))) + ' ';
    out += '\n';
  }
  el.textContent = out;
}
function copyExport() {
  let txt = document.getElementById('expOut')?.textContent || '';
  navigator.clipboard.writeText(txt).then(() => sLog('Copied to clipboard.', 0)).catch(() => sLog('Copy failed.', 1));
}
function dlExport() {
  let txt = document.getElementById('expOut')?.textContent || '';
  let blob = new Blob([txt], {type: 'text/plain'});
  let a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'pat286_program.hex'; a.click(); URL.revokeObjectURL(a.href);
}
function loadHexImport() {
  let ta = document.getElementById('hexIn');
  if (!ta || !ta.value.trim()) { sLog('No hex data to import.', 1); return; }
  let lines = ta.value.split('\n');
  let count = 0;
  mem.fill(0);
  for (let line of lines) {
    let s = line.replace(/;.*$/, '').replace(/\/\/.*$/, '').trim();
    if (!s) continue;
    let ci = s.indexOf(':');
    let baseAddr = 0;
    if (ci >= 0) { baseAddr = parseInt(s.slice(0, ci), 16) || 0; s = s.slice(ci + 1); }
    let toks = s.match(/[0-9a-fA-F]{2}/g) || [];
    for (let i = 0; i < toks.length; i++) {
      wb(pa(0x80, baseAddr + i), parseInt(toks[i], 16));
      count++;
    }
  }
  AX = BX = CX = DX = SI = DI = BP = 0;
  CS = DS = SS = ES = 0x80; SP = 0xFFF0;
  IP = 0x100; FLAGS = 0x0002;
  halt = false; cy = 0; ic = 0;
  sLog('Imported ' + count + ' bytes.', 0);
  setSt('READY');
  closeExport();
  renderAll();
}
function loadHexFile(input) {
  let file = input.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = function(e) {
    let ta = document.getElementById('hexIn');
    if (ta) ta.value = e.target.result;
    loadHexImport();
  };
  reader.readAsText(file);
  input.value = '';
}
document.getElementById('expOv')?.addEventListener('click', function(e) { if (e.target === this) closeExport(); });

// === KEYBOARD SHORTCUTS ===
document.addEventListener('keydown', function(e) {
  let guideOv = document.getElementById('guideOv');
  let expOv = document.getElementById('expOv');
  if (e.key === 'F1') {
    e.preventDefault();
    if (guideOv && guideOv.hidden) openGuide(); else closeGuide();
    return;
  }
  if (e.key === 'Escape') {
    if (guideOv && !guideOv.hidden) { closeGuide(); return; }
    if (expOv && !expOv.hidden) { closeExport(); return; }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doAssemble(); }
});

// === BREAKPOINT SUPPORT ===
document.getElementById('lns')?.addEventListener('click', function(e) {
  let row = e.target.closest('.ln-row');
  if (!row) return;
  let line = +row.dataset.line;
  if (!line) return;
  if (breakpoints.has(line)) breakpoints.delete(line);
  else breakpoints.add(line);
  updLn();
});

// === CONTINUOUS MOTOR ANIMATION ===
let motorAnimFrame = null;
function motorAnimLoop() {
  if (running && motorDacVal > 0) {
    motorAngle = (motorAngle + motorDacVal / 80) % 360;
    updateMotor();
  }
  motorAnimFrame = requestAnimationFrame(motorAnimLoop);
}

// === INIT ===
applyTheme(currentTheme);
initAppModule();
buildExDropdown();
// Select first file in tree
let firstFile = document.querySelector('.fb-file');
if (firstFile) { firstFile.click(); }
else { ed.value = EX['PA02: Add bytes']; updLn(); updateHighlight(); doAssemble(); }
renderAll();
motorAnimLoop();
document.body.addEventListener('click', initAudio, {once: true});
