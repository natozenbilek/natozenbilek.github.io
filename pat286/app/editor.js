// ============================================================
// PAT-286 Editor Features — IDE-like enhancements
// Tooltips, ghost autocomplete, occurrence highlight,
// current-line bar, watch panel, empty state
// ============================================================

// === INSTRUCTION TOOLTIPS ===
const INSTR_TOOLTIPS = {
  // Data transfer
  MOV:'Copy source to destination. MOV dst, src',
  XCHG:'Exchange two operands. XCHG dst, src',
  PUSH:'Push value onto stack (SP-=2). PUSH src',
  POP:'Pop value from stack (SP+=2). POP dst',
  PUSHF:'Push FLAGS register onto stack',
  POPF:'Pop FLAGS register from stack',
  LEA:'Load effective address. LEA reg, mem',
  IN:'Read from I/O port. IN AL/AX, port',
  OUT:'Write to I/O port. OUT port, AL/AX',
  XLAT:'Table lookup: AL = DS:[BX+AL]',
  // Arithmetic
  ADD:'Add src to dst, set flags. ADD dst, src',
  SUB:'Subtract src from dst. SUB dst, src',
  MUL:'Unsigned multiply. DX:AX = AX * src',
  IMUL:'Signed multiply. DX:AX = AX * src',
  DIV:'Unsigned divide. AX=DX:AX/src, DX=remainder',
  IDIV:'Signed divide. AX=DX:AX/src, DX=remainder',
  INC:'Increment by 1. INC dst',
  DEC:'Decrement by 1. DEC dst',
  NEG:'Two\'s complement negate. NEG dst',
  CMP:'Compare (SUB without storing). Sets flags',
  CBW:'Convert byte to word: AH = sign-extend AL',
  CWD:'Convert word to double: DX = sign-extend AX',
  DAA:'Decimal adjust after BCD addition',
  DAS:'Decimal adjust after BCD subtraction',
  AAA:'ASCII adjust after addition',
  AAS:'ASCII adjust after subtraction',
  AAM:'ASCII adjust after multiplication',
  AAD:'ASCII adjust before division',
  // Logic
  AND:'Bitwise AND. AND dst, src',
  OR:'Bitwise OR. OR dst, src',
  XOR:'Bitwise XOR. XOR dst, src',
  NOT:'Bitwise NOT (complement). NOT dst',
  TEST:'Bitwise AND without storing. Sets flags',
  SHL:'Shift left (multiply by 2). SHL dst, count',
  SHR:'Shift right unsigned. SHR dst, count',
  SAR:'Shift right arithmetic (preserve sign). SAR dst, count',
  SAL:'Shift left arithmetic (= SHL). SAL dst, count',
  ROL:'Rotate left. ROL dst, count',
  ROR:'Rotate right. ROR dst, count',
  RCL:'Rotate left through carry. RCL dst, count',
  RCR:'Rotate right through carry. RCR dst, count',
  // Control flow
  JMP:'Unconditional jump. JMP label',
  JE:'Jump if equal (ZF=1). JE label',
  JNE:'Jump if not equal (ZF=0). JNE label',
  JZ:'Jump if zero (ZF=1). JZ label',
  JNZ:'Jump if not zero (ZF=0). JNZ label',
  JG:'Jump if greater (signed). ZF=0 & SF=OF',
  JGE:'Jump if greater or equal (signed). SF=OF',
  JL:'Jump if less (signed). SF!=OF',
  JLE:'Jump if less or equal (signed). ZF=1 | SF!=OF',
  JA:'Jump if above (unsigned). CF=0 & ZF=0',
  JAE:'Jump if above or equal (unsigned). CF=0',
  JB:'Jump if below (unsigned). CF=1',
  JBE:'Jump if below or equal (unsigned). CF=1 | ZF=1',
  JC:'Jump if carry (CF=1). JC label',
  JNC:'Jump if no carry (CF=0). JNC label',
  JS:'Jump if sign (SF=1). JS label',
  JNS:'Jump if no sign (SF=0). JNS label',
  JO:'Jump if overflow (OF=1). JO label',
  JNO:'Jump if no overflow (OF=0). JNO label',
  JP:'Jump if parity (PF=1). JP label',
  JNP:'Jump if no parity (PF=0). JNP label',
  JCXZ:'Jump if CX=0. JCXZ label',
  LOOP:'Decrement CX, jump if CX!=0. LOOP label',
  LOOPE:'Dec CX, jump if CX!=0 AND ZF=1',
  LOOPNE:'Dec CX, jump if CX!=0 AND ZF=0',
  CALL:'Call subroutine (push IP, jump). CALL label',
  RET:'Return from subroutine (pop IP)',
  INT:'Software interrupt. INT number',
  IRET:'Return from interrupt (pop IP, CS, FLAGS)',
  HLT:'Halt processor until interrupt',
  NOP:'No operation (1 cycle)',
  // Flags
  CLC:'Clear carry flag (CF=0)',
  STC:'Set carry flag (CF=1)',
  CMC:'Complement carry flag',
  CLD:'Clear direction flag (DF=0, forward)',
  STD:'Set direction flag (DF=1, backward)',
  CLI:'Clear interrupt flag (disable interrupts)',
  STI:'Set interrupt flag (enable interrupts)',
  // String ops
  MOVSB:'Move byte DS:[SI] to ES:[DI], update SI,DI',
  MOVSW:'Move word DS:[SI] to ES:[DI], update SI,DI',
  STOSB:'Store AL to ES:[DI], update DI',
  STOSW:'Store AX to ES:[DI], update DI',
  LODSB:'Load DS:[SI] into AL, update SI',
  LODSW:'Load DS:[SI] into AX, update SI',
  CMPSB:'Compare DS:[SI] with ES:[DI], update SI,DI',
  CMPSW:'Compare word DS:[SI] with ES:[DI]',
  SCASB:'Compare AL with ES:[DI], update DI',
  SCASW:'Compare AX with ES:[DI], update DI',
  REP:'Repeat string op CX times',
  REPE:'Repeat while equal (CX!=0 AND ZF=1)',
  REPZ:'Repeat while zero (= REPE)',
  REPNE:'Repeat while not equal (CX!=0 AND ZF=0)',
  REPNZ:'Repeat while not zero (= REPNE)',
  // Directives
  ORG:'Set origin address. ORG 0100H',
  DB:'Define byte(s). DB 0FFH, "text", 0',
  DW:'Define word(s). DW 1234H',
  EQU:'Define constant. name EQU value',
  INCLUDE:'Include file. INCLUDE PATCALLS.INC',
  END:'End of source',
  BYTE:'Size override: byte operand',
  WORD:'Size override: word operand',
  PTR:'Pointer type. BYTE PTR [addr]',
  OFFSET:'Address of label. OFFSET label',
  SEG:'Segment of label. SEG label'
};

const REG_TOOLTIPS = {
  AX:'Accumulator (16-bit). Split: AH (high), AL (low)',
  BX:'Base register (16-bit). Split: BH, BL. Used for addressing',
  CX:'Counter (16-bit). Split: CH, CL. Used by LOOP, shifts',
  DX:'Data register (16-bit). Split: DH, DL. MUL/DIV, I/O',
  AH:'Accumulator high byte. INT function number',
  AL:'Accumulator low byte. I/O data, arithmetic',
  BH:'Base register high byte',BL:'Base register low byte',
  CH:'Counter high byte',CL:'Counter low byte (shift count)',
  DH:'Data high byte',DL:'Data low byte',
  SI:'Source index. String ops source pointer',
  DI:'Destination index. String ops dest pointer',
  SP:'Stack pointer. Points to top of stack',
  BP:'Base pointer. Stack frame access',
  CS:'Code segment (0080H). CS:IP = instruction address',
  DS:'Data segment (0080H). Default for data access',
  SS:'Stack segment (0080H). SS:SP = stack address',
  ES:'Extra segment (0000H). String ops destination',
  IP:'Instruction pointer. Next instruction offset'
};

// === CHARACTER WIDTH MEASUREMENT ===
let _charWidth = 0;
let _lineHeight = 19;
let _padTop = 8, _padLeft = 10;

function measureCharWidth() {
  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  ctx.font = '11px "IBM Plex Mono", monospace';
  _charWidth = ctx.measureText('M').width;
  if (_charWidth < 4) _charWidth = 6.6; // fallback
}

function getWordAtPos(text, lineNum, charIdx) {
  let lines = text.split('\n');
  if (lineNum < 0 || lineNum >= lines.length) return null;
  let line = lines[lineNum];
  if (charIdx < 0 || charIdx >= line.length) return null;
  // Find word boundaries
  let start = charIdx, end = charIdx;
  while (start > 0 && /[A-Za-z0-9_]/.test(line[start - 1])) start--;
  while (end < line.length && /[A-Za-z0-9_]/.test(line[end])) end++;
  if (start === end) return null;
  return { word: line.substring(start, end), start, end, line: lineNum };
}

function posFromMouse(e) {
  let rect = ed.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  let lineNum = Math.floor((y + ed.scrollTop - _padTop) / _lineHeight);
  let charIdx = Math.floor((x + ed.scrollLeft - _padLeft) / _charWidth);
  return { lineNum, charIdx };
}

// === TOOLTIP DOM ===
let tooltipEl = null;
function initTooltip() {
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'ed-tooltip';
  tooltipEl.hidden = true;
  document.querySelector('.ed-wrap').appendChild(tooltipEl);
}

let _tooltipThrottle = 0;
function onEditorMouseMove(e) {
  let now = Date.now();
  if (now - _tooltipThrottle < 50) return;
  _tooltipThrottle = now;

  let pos = posFromMouse(e);
  let info = getWordAtPos(ed.value, pos.lineNum, pos.charIdx);
  if (!info) { hideTooltip(); updateOccHighlight(null); return; }

  let upper = info.word.toUpperCase();
  let tip = INSTR_TOOLTIPS[upper] || REG_TOOLTIPS[upper] || null;

  if (tip) {
    showTooltip(e, tip);
  } else {
    hideTooltip();
  }

  // Occurrence highlight for labels/variables
  if (!HL_KEYWORDS.has(upper) && !HL_REGS.has(upper) && !HL_DIRS.has(upper) && info.word.length > 1) {
    updateOccHighlight(upper);
  } else {
    updateOccHighlight(null);
  }
}

function showTooltip(e, text) {
  if (!tooltipEl) return;
  tooltipEl.textContent = text;
  tooltipEl.hidden = false;
  let rect = ed.getBoundingClientRect();
  let x = e.clientX - rect.left + 12;
  let y = e.clientY - rect.top - 28;
  if (y < 0) y = e.clientY - rect.top + 16;
  tooltipEl.style.left = x + 'px';
  tooltipEl.style.top = y + 'px';
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.hidden = true;
}

// === OCCURRENCE HIGHLIGHTING ===
let _highlightedSymbol = null;
window._highlightedSymbol = null;

function updateOccHighlight(symbol) {
  if (symbol === _highlightedSymbol) return;
  _highlightedSymbol = symbol;
  window._highlightedSymbol = symbol;
  updateHighlight();
}

// === GHOST TEXT AUTOCOMPLETE ===
let ghostEl = null;
let _ghostText = '';
let _ghostLine = -1;
let _ghostCol = -1;

function initGhost() {
  ghostEl = document.getElementById('edGhost');
}

function updateGhostText() {
  if (!ghostEl) return;
  if (currentFileType() !== 'asm') { clearGhost(); return; }

  let cursorPos = ed.selectionStart;
  let text = ed.value;
  let before = text.substring(0, cursorPos);
  let lineStart = before.lastIndexOf('\n') + 1;
  let lineText = before.substring(lineStart);
  let col = lineText.length;
  let lineNum = before.split('\n').length - 1;

  // Check after cursor - only suggest at end of meaningful content
  let afterCursor = text.substring(cursorPos);
  let restOfLine = afterCursor.split('\n')[0];
  if (restOfLine.trim().length > 0) { clearGhost(); return; }

  // Extract current token
  let tokenMatch = lineText.match(/([A-Za-z_]\w*)$/);
  if (!tokenMatch || tokenMatch[1].length < 1) { clearGhost(); return; }
  let prefix = tokenMatch[1].toUpperCase();
  let tokenStart = tokenMatch.index;

  // Determine context
  let beforeToken = lineText.substring(0, tokenStart).trim();
  let candidates = [];

  if (!beforeToken || /:\s*$/.test(beforeToken)) {
    // First token on line (or after label:) - suggest instructions and directives
    for (let k of HL_KEYWORDS) { if (k.startsWith(prefix) && k !== prefix) candidates.push(k); }
    for (let d of HL_DIRS) { if (d.startsWith(prefix) && d !== prefix) candidates.push(d); }
  } else {
    // After an instruction - suggest registers and labels
    for (let r of HL_REGS) { if (r.startsWith(prefix) && r !== prefix) candidates.push(r); }
    // Also suggest labels from current code
    let labels = extractLabels(text);
    for (let lbl of labels) {
      let u = lbl.toUpperCase();
      if (u.startsWith(prefix) && u !== prefix) candidates.push(lbl);
    }
    // PATCALLS constants
    for (let pc of Object.keys(PATCALLS)) {
      if (pc.toUpperCase().startsWith(prefix) && pc.toUpperCase() !== prefix) candidates.push(pc);
    }
  }

  if (candidates.length === 0) { clearGhost(); return; }
  candidates.sort();
  let best = candidates[0];
  let completion = best.substring(prefix.length);

  _ghostText = completion;
  _ghostLine = lineNum;
  _ghostCol = col;

  // Render ghost
  renderGhost(lineNum, col, completion);
}

function extractLabels(text) {
  let labels = new Set();
  let lines = text.split('\n');
  for (let line of lines) {
    let m = line.match(/^([A-Za-z_]\w*)\s*:/);
    if (m) labels.add(m[1]);
    let equ = line.match(/^([A-Za-z_]\w*)\s+EQU\b/i);
    if (equ) labels.add(equ[1]);
  }
  return labels;
}

function renderGhost(lineNum, col, text) {
  if (!ghostEl) return;
  // Build content: empty lines before, then spaces + ghost text
  let html = '';
  for (let i = 0; i < lineNum; i++) html += '\n';
  html += ' '.repeat(col) + text;
  ghostEl.textContent = html;
  ghostEl.hidden = false;
  ghostEl.scrollTop = ed.scrollTop;
  ghostEl.scrollLeft = ed.scrollLeft;
}

function clearGhost() {
  _ghostText = '';
  _ghostLine = -1;
  _ghostCol = -1;
  if (ghostEl) { ghostEl.textContent = ''; ghostEl.hidden = true; }
}

// Tab acceptance
window._acceptGhost = function() {
  if (!_ghostText) return false;
  let pos = ed.selectionStart;
  ed.value = ed.value.substring(0, pos) + _ghostText + ed.value.substring(pos);
  ed.selectionStart = ed.selectionEnd = pos + _ghostText.length;
  clearGhost();
  return true;
};

// === CURRENT EXECUTION LINE BAR ===
let curLineBar = null;
function initCurLineBar() {
  curLineBar = document.getElementById('edCurLine');
}

function updateCurLineBar() {
  if (!curLineBar) return;
  if (!asmLines || !asmLines.length || halt) {
    curLineBar.hidden = true;
    return;
  }
  let curLine = -1;
  for (let al of asmLines) {
    if (al.addr === IP) { curLine = al.ln; break; }
  }
  if (curLine < 0) { curLineBar.hidden = true; return; }
  let top = (curLine - 1) * _lineHeight + _padTop;
  curLineBar.style.top = (top - ed.scrollTop) + 'px';
  curLineBar.hidden = false;
}

// === WATCH PANEL ===
let watches = [];

function addWatch() {
  let input = document.getElementById('watchInput');
  if (!input) return;
  let expr = input.value.trim();
  if (!expr) return;
  if (watches.length >= 16) return;
  watches.push(expr);
  input.value = '';
  renderWatches();
}

function removeWatch(idx) {
  watches.splice(idx, 1);
  renderWatches();
}

function evalWatch(expr) {
  let u = expr.toUpperCase().trim();
  // Register?
  let regMap = {AX:()=>AX,BX:()=>BX,CX:()=>CX,DX:()=>DX,SI:()=>SI,DI:()=>DI,SP:()=>SP,BP:()=>BP,
    CS:()=>CS,DS:()=>DS,SS:()=>SS,ES:()=>ES,IP:()=>IP,FLAGS:()=>FLAGS,
    AH:()=>getAH(),AL:()=>getAL(),BH:()=>getBH(),BL:()=>getBL(),
    CH:()=>getCH(),CL:()=>getCL(),DH:()=>getDH(),DL:()=>getDL()};
  if (regMap[u]) return hex16(regMap[u]());

  // SEG:OFF address - read byte
  let segOff = u.match(/^([0-9A-F]+):([0-9A-F]+)$/);
  if (segOff) {
    let seg = parseInt(segOff[1], 16);
    let off = parseInt(segOff[2], 16);
    let b = rb(pa(seg, off));
    let w = rw(pa(seg, off));
    return hex8(b) + ' (' + hex16(w) + ')';
  }

  // DS:offset shorthand
  let dsOff = u.match(/^\[?([0-9A-F]+)H?\]?$/);
  if (dsOff) {
    let off = parseInt(dsOff[1], 16);
    let b = rb(pa(DS, off));
    let w = rw(pa(DS, off));
    return hex8(b) + ' (' + hex16(w) + ')';
  }

  // [REG] indirect
  let indirect = u.match(/^\[(\w+)\]$/);
  if (indirect && regMap[indirect[1]]) {
    let addr = regMap[indirect[1]]();
    let b = rb(pa(DS, addr));
    return hex8(b) + ' @' + hex16(addr);
  }

  // Label lookup
  if (typeof labels !== 'undefined' && labels) {
    let lbl = labels[u] || labels[expr];
    if (lbl !== undefined) {
      let b = rb(pa(CS, lbl));
      return hex16(lbl) + ' -> ' + hex8(b);
    }
  }

  return '?';
}

function renderWatches() {
  let el = document.getElementById('watchList');
  if (!el) return;
  if (!watches.length) {
    el.innerHTML = '<span class="watch-empty">Add expressions above (registers, addresses, labels)</span>';
    return;
  }
  let html = '';
  for (let i = 0; i < watches.length; i++) {
    let val = evalWatch(watches[i]);
    html += `<div class="watch-row"><span class="watch-expr">${esc(watches[i])}</span><span class="watch-val">${val}</span><button class="watch-del" onclick="removeWatch(${i})">&times;</button></div>`;
  }
  el.innerHTML = html;
}

// === PORTS PANEL ===
const PORT_DEFS = [
  ['UCRREG1', 0x80], ['UCRREG2', 0x82], ['UCRREG3', 0x84],
  ['UMODEREG', 0x86], ['UPORT1CTL', 0x88], ['UIRQEN', 0x8A],
  ['UPORT1', 0x90], ['UPORT2', 0x92],
  ['UTIMER1', 0x94], ['USTATUS', 0x9E]
];

function buildPortsModal() {
  let rows = PORT_DEFS.map(([name, addr]) =>
    `<div class="port-row"><label>${name}</label><span class="port-addr">${hex8(addr)}H</span><input id="port_${name}" type="text" class="port-val" maxlength="2" spellcheck="false"></div>`
  ).join('');
  document.getElementById('portsOv').innerHTML =
    `<div class="exp-pan"><div class="exp-hd"><h3>MUART Port Settings</h3><button class="b" onclick="closePorts()">Close</button></div>` +
    `<div class="exp-body"><div class="port-grid">${rows}</div></div>` +
    `<div class="exp-foot"><button class="b" onclick="readPortValues()">Read Current</button><button class="b b-blu" onclick="writePortValues()">Write</button></div></div>`;
}

function openPorts() { document.getElementById('portsOv').hidden = false; readPortValues(); }
function closePorts() { document.getElementById('portsOv').hidden = true; }

function readPortValues() {
  for (let [name, addr] of PORT_DEFS) {
    let input = document.getElementById('port_' + name);
    if (input) input.value = hex8(ioPorts[addr]);
  }
}

function writePortValues() {
  for (let [name, addr] of PORT_DEFS) {
    let input = document.getElementById('port_' + name);
    if (input) {
      let val = parseInt(input.value, 16);
      if (!isNaN(val)) ioPorts[addr] = val & 0xFF;
    }
  }
  renderAll();
  sLog('Port values written.', 0);
}

// === EMPTY EDITOR STATE ===
let welcomeEl = null;

function initWelcome() {
  welcomeEl = document.getElementById('edWelcome');
}

function showWelcome() {
  if (welcomeEl) welcomeEl.hidden = false;
  document.querySelector('.ew').classList.add('ew-empty');
}

function hideWelcome() {
  if (welcomeEl) welcomeEl.hidden = true;
  document.querySelector('.ew').classList.remove('ew-empty');
}

// === INIT ===
(function initEditorFeatures() {
  measureCharWidth();
  document.fonts.ready.then(measureCharWidth);
  initTooltip();
  initGhost();
  initCurLineBar();
  initWelcome();
  buildPortsModal();

  // Tooltip + occurrence on mouse move
  ed.addEventListener('mousemove', onEditorMouseMove);
  ed.addEventListener('mouseleave', function() {
    hideTooltip();
    updateOccHighlight(null);
  });

  // Ghost text on input
  ed.addEventListener('input', function() {
    updateGhostText();
  });

  // Clear ghost on various events
  ed.addEventListener('blur', clearGhost);
  ed.addEventListener('click', function() { clearGhost(); updateGhostText(); });
  ed.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { clearGhost(); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      clearGhost();
    }
  });

  // Sync ghost scroll
  let origSync = syncScroll;
  syncScroll = function() {
    origSync();
    if (ghostEl) {
      ghostEl.scrollTop = ed.scrollTop;
      ghostEl.scrollLeft = ed.scrollLeft;
    }
    updateCurLineBar();
  };

  // Watch input enter key
  let watchInput = document.getElementById('watchInput');
  if (watchInput) {
    watchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); addWatch(); }
    });
  }

  // Ports overlay click to close
  let portsOv = document.getElementById('portsOv');
  if (portsOv) {
    portsOv.addEventListener('click', function(e) { if (e.target === this) closePorts(); });
  }
})();
