// ============================================================
// PAT-286 Main Editor — Editor setup, theme, export/import,
// shortcuts, breakpoints, motor animation, init
// ============================================================

const ed = document.getElementById('ed'), lns = document.getElementById('lns');
const edHL = document.getElementById('edHL');

// === OVERFLOW MENU ===
function toggleOverflowMenu() {
  let menu = document.getElementById('overflowMenu');
  if (menu) menu.classList.toggle('open');
}
document.addEventListener('click', function(e) {
  let menu = document.getElementById('overflowMenu');
  if (menu && menu.classList.contains('open') && !e.target.closest('.hd-overflow')) {
    menu.classList.remove('open');
  }
});

// === ASSEMBLE WITH LOADING ===
function assembleWithLoading() {
  let btn = document.getElementById('asmBtn');
  btn.classList.add('loading');
  btn.disabled = true;
  setTimeout(function() {
    compileIfC() || doAssemble();
    btn.classList.remove('loading');
    btn.disabled = false;
  }, 10);
}

// === BREADCRUMB ===
function updateBreadcrumb(fileKey) {
  let bc = document.getElementById('breadcrumb');
  if (!bc) return;
  if (!fileKey) { bc.hidden = true; return; }
  bc.hidden = false;
  let parts = fileKey.split('/');
  if (parts.length === 1) {
    // Check if file belongs to a folder
    let folder = '';
    if (EX && EX[fileKey]) {
      if (fileKey.startsWith('PA')) folder = 'pratikler';
      else if (fileKey.startsWith('HW:')) folder = 'hardware';
      else folder = 'demos';
    }
    if (folder) parts = [folder, fileKey];
  }
  bc.innerHTML = parts.map((p, i) =>
    (i > 0 ? '<span class="bc-sep">›</span>' : '') +
    '<span class="bc-item">' + p + '</span>'
  ).join('');
}

// === STATUS BAR POSITION ===
function updateStatusBarPos() {
  let sbPos = document.getElementById('sbPos');
  if (!sbPos) return;
  let pos = ed.selectionStart;
  let text = ed.value.substring(0, pos);
  let line = text.split('\n').length;
  let col = pos - text.lastIndexOf('\n');
  sbPos.textContent = 'Ln ' + line + ', Col ' + col;
}
function updateStatusBarFileType() {
  let el = document.getElementById('sbFileType');
  if (!el || !activeTabKey) return;
  let ext = activeTabKey.includes('.') ? activeTabKey.split('.').pop().toUpperCase() : 'ASM';
  el.textContent = ext;
}

// Syntax highlighting + status bar
ed.addEventListener('input', () => { updLn(); updateHighlight(); updateStatusBarPos(); });
ed.addEventListener('scroll', syncScroll);
ed.addEventListener('click', updateStatusBarPos);
ed.addEventListener('keyup', updateStatusBarPos);
ed.addEventListener('keydown', function(e) {
  if (e.key === 'Tab') { e.preventDefault(); if (window._acceptGhost && window._acceptGhost()) { updLn(); updateHighlight(); return; } let s=this.selectionStart; this.value=this.value.substring(0,s)+'        '+this.value.substring(this.selectionEnd); this.selectionStart=this.selectionEnd=s+8; updLn(); updateHighlight(); }
  else if ((e.ctrlKey||e.metaKey) && e.key === 'Enter') { e.preventDefault(); assembleWithLoading(); }
});

function scrollToLine(lineNum) {
  let lineH = 19;
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
    if (activeTabKey) {
      let cur = openTabs.find(t => t.key === activeTabKey);
      if (cur) cur.content = document.getElementById('ed').value;
    }
    addDynamicFile(name, content, 'local');
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
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); assembleWithLoading(); }
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
initCollapsibleCards();
enhanceMemoryView();
loadExamples().then(() => { buildExDropdown(); renderAll(); });
document.body.addEventListener('click', initAudio, {once: true});
