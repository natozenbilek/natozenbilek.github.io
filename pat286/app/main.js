// ============================================================
// PAT-286 Main — simulation control, editor, UI, init
// ============================================================
// Transpiler: see transpiler.js
// Highlighter: see highlighter.js
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

// === UI INTERACTIONS ===
function potChanged() { potValue = +document.getElementById('potSlider').value; }
function toggleObject() { objectNear = !objectNear; renderAppModule(); }
function toggleOptical() { opticalBlocked = !opticalBlocked; renderAppModule(); }

// === EDITOR ===
const ed = document.getElementById('ed'), lns = document.getElementById('lns');
const edHL = document.getElementById('edHL');

// Syntax highlighting
ed.addEventListener('input', () => { updLn(); updateHighlight(); });
ed.addEventListener('scroll', syncScroll);
ed.addEventListener('keydown', function(e) {
  if (e.key === 'Tab') { e.preventDefault(); if (window._acceptGhost && window._acceptGhost()) { updLn(); updateHighlight(); return; } let s=this.selectionStart; this.value=this.value.substring(0,s)+'        '+this.value.substring(this.selectionEnd); this.selectionStart=this.selectionEnd=s+8; updLn(); updateHighlight(); }
  else if ((e.ctrlKey||e.metaKey) && e.key === 'Enter') { e.preventDefault(); compileIfC()||doAssemble(); }
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

// === OPEN LOCAL FILE ===
function openLocalFile(input) {
  let file = input.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = function(e) {
    let content = e.target.result;
    let name = file.name;
    // Save current tab
    if (activeTabKey) {
      let cur = openTabs.find(t => t.key === activeTabKey);
      if (cur) cur.content = document.getElementById('ed').value;
    }
    // Add to dynamic files and tree
    addDynamicFile(name, content, 'local');
    // Add as new tab
    let existing = openTabs.find(t => t.key === name);
    if (existing) { existing.content = content; }
    else { openTabs.push({key: name, content: content}); }
    activeTabKey = name;
    document.getElementById('ed').value = content;
    updLn(); updateHighlight();
    renderTabs();
    highlightFileInTree(name);
    sLog('Opened: ' + name, 0);
  };
  reader.readAsText(file);
  input.value = '';
}

// === CLOSE ALL TABS ===
function closeAllTabs() {
  openTabs = [];
  activeTabKey = null;
  document.getElementById('ed').value = '';
  document.getElementById('edHL').innerHTML = '';
  document.getElementById('lns').innerHTML = '';
  if (activeFileEl) { activeFileEl.classList.remove('active'); activeFileEl = null; }
  renderTabs();
  if (typeof showWelcome === 'function') showWelcome();
  sLog('Ready.', 0);
}

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
    let portsOv = document.getElementById('portsOv');
    if (portsOv && !portsOv.hidden) { closePorts(); return; }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); compileIfC()||doAssemble(); }
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
buildRightPanel();
enhanceMemoryView();
initAppModule();
buildExDropdown();
// Welcome screen shown by editor.js init (loaded after main.js)
renderAll();
motorAnimLoop();
document.body.addEventListener('click', initAudio, {once: true});
