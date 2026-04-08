// === HIGH-LEVEL → ASM TRANSPILER ===
function compileCtoASM(code) {
  let lines = code.split('\n');
  let asm = [];
  let labelCounter = 0;
  function newLabel(prefix) { return prefix + (labelCounter++); }

  asm.push('; Auto-generated from source');
  asm.push('        ORG     0100H');
  asm.push('        INCLUDE PATCALLS.INC');

  let vars = {};
  let inMain = false;
  let loopStack = [];
  let braceDepth = 0;
  let indentLoop = []; // for Python indentation-based loops

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    // Skip empty, comments, preprocessor, imports, package decl
    if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/')) continue;
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
    if (/^(import|from|package)\b/.test(trimmed)) continue;

    // Detect main function in any language
    if (/\bmain\s*\(/.test(trimmed) || /^def\s+main\s*\(/.test(trimmed) || /^func\s+main\s*\(/.test(trimmed)) {
      inMain = true;
      if (trimmed.includes('{')) braceDepth++;
      continue;
    }
    // Skip class/public declarations
    if (/^(public\s+)?class\b/.test(trimmed)) continue;
    if (!inMain) continue;

    // Remove trailing comments
    trimmed = trimmed.replace(/\/\/.*$/, '').replace(/#.*$/, '').replace(/\/\*.*?\*\//, '').trim();
    // Remove trailing semicolons
    trimmed = trimmed.replace(/;$/, '').trim();
    if (!trimmed) continue;

    // Handle Python indentation-based loop ends
    if (indentLoop.length > 0) {
      let curIndent = line.search(/\S/);
      while (indentLoop.length > 0 && curIndent <= indentLoop[indentLoop.length - 1].indent) {
        let loop = indentLoop.pop();
        if (loop.increment) emitStatement(loop.increment);
        asm.push('        JMP     ' + loop.startLabel);
        asm.push(loop.endLabel + ':');
      }
    }

    // Brace tracking
    if (trimmed === '{') { braceDepth++; continue; }
    if (trimmed === '}') {
      braceDepth--;
      if (loopStack.length > 0) {
        let loop = loopStack[loopStack.length - 1];
        if (loop.increment) emitStatement(loop.increment);
        asm.push('        JMP     ' + loop.startLabel);
        asm.push(loop.endLabel + ':');
        loopStack.pop();
      }
      continue;
    }

    // Handle inline brace
    if (trimmed.endsWith('{')) {
      trimmed = trimmed.slice(0, -1).trim();
      braceDepth++;
    }

    emitStatement(trimmed);
  }

  // Close any remaining Python loops
  while (indentLoop.length > 0) {
    let loop = indentLoop.pop();
    if (loop.increment) emitStatement(loop.increment);
    asm.push('        JMP     ' + loop.startLabel);
    asm.push(loop.endLabel + ':');
  }

  asm.push('        MOV     AH,04H');
  asm.push('        INT     28H');
  return asm.join('\n');

  function emitStatement(stmt) {
    stmt = stmt.replace(/;$/, '').trim();
    if (!stmt) return;

    // Variable declarations: all forms
    let varDecl = stmt.match(/(?:unsigned\s+)?(?:char|int|byte|uint8_t|short|long)\s+(\w+)\s*=\s*(.+)/);
    if (!varDecl) varDecl = stmt.match(/var\s+(\w+)\s+\w+\s*=\s*(.+)/); // Go var
    if (!varDecl) varDecl = stmt.match(/(\w+)\s*:=\s*(.+)/); // Go :=
    if (varDecl) {
      let vname = varDecl[1];
      let val = parseVal(varDecl[2].trim());
      vars[vname] = assignReg(vname);
      asm.push('        MOV     ' + vars[vname] + ',' + val);
      return;
    }

    // port_init / portInit / PortInit
    let portInit = stmt.match(/[Pp]ort_?[Ii]nit\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/);
    if (portInit) {
      asm.push('        ; port_init(' + portInit[1] + ', ' + portInit[2] + ')');
      asm.push('        MOV     AL,0FFH');
      asm.push('        OUT     UCRREG1,AL');
      asm.push('        OUT     UCRREG2,AL');
      asm.push('        OUT     UCRREG3,AL');
      asm.push('        OUT     UMODEREG,AL');
      asm.push('        OUT     UPORT1CTL,AL');
      return;
    }

    // outport / Outport
    let outport = stmt.match(/[Oo]utport\s*\(\s*(\w+)\s*,\s*(.+?)\s*\)/);
    if (outport) {
      let port = outport[1] === 'PORT1' ? 'UPORT1' : 'UPORT2';
      let val = outport[2].trim();
      if (vars[val]) {
        asm.push('        MOV     AL,' + vars[val]);
      } else {
        asm.push('        MOV     AL,' + parseVal(val));
      }
      asm.push('        OUT     ' + port + ',AL');
      return;
    }

    // delay_ms / delayMs / DelayMs
    let delay = stmt.match(/[Dd]elay_?[Mm]s\s*\(\s*(\d+)\s*\)/);
    if (delay) {
      let ms = parseInt(delay[1]);
      let loops = Math.min(Math.max(Math.round(ms * 130), 1), 0xFFFF);
      let lbl = newLabel('DLY');
      asm.push('        MOV     CX,' + toHex16(loops));
      asm.push(lbl + ':   LOOP    ' + lbl);
      return;
    }

    // while (1) / while (true) / while True / for { (Go infinite)
    let whileLoop = stmt.match(/while\s*\(\s*(1|true)\s*\)|while\s+True|^for\s*$/);
    if (whileLoop) {
      let startLbl = newLabel('LOOP');
      let endLbl = newLabel('ENDLP');
      asm.push(startLbl + ':');
      let origLine = lines.find(l => l.trim().startsWith('while'));
      if (origLine && origLine.trim().endsWith(':')) {
        let indent = origLine.search(/\S/);
        indentLoop.push({startLabel: startLbl, endLabel: endLbl, indent: indent});
      } else {
        loopStack.push({type: 'while', startLabel: startLbl, endLabel: endLbl});
      }
      return;
    }

    // for loop with init; ; increment
    let forLoop = stmt.match(/for\s*\(\s*(?:unsigned\s+)?(?:char|int|uint8_t|byte)\s+(\w+)\s*=\s*([^;]+)\s*;\s*;\s*(\w+)\+\+\s*\)/);
    if (forLoop) {
      let vname = forLoop[1];
      let initVal = parseVal(forLoop[2].trim());
      vars[vname] = assignReg(vname);
      asm.push('        MOV     ' + vars[vname] + ',' + initVal);
      let startLbl = newLabel('FOR');
      let endLbl = newLabel('ENDFOR');
      asm.push(startLbl + ':');
      loopStack.push({type: 'for', startLabel: startLbl, endLabel: endLbl, increment: vname + '++'});
      return;
    }

    // ROL pattern: val = (val << 1) | (val >> 7)
    let rol = stmt.match(/(\w+)\s*=\s*\(?\s*\1\s*<<\s*1\s*\)?\s*\|\s*\(?\s*\1\s*>>\s*7\s*\)?/);
    if (rol) {
      let reg = vars[rol[1]];
      if (reg) asm.push('        ROL     ' + reg + ',1');
      return;
    }

    // i++ / i--
    let incr = stmt.match(/^(\w+)\+\+$/);
    if (incr && vars[incr[1]]) { asm.push('        INC     ' + vars[incr[1]]); return; }
    let decr = stmt.match(/^(\w+)--$/);
    if (decr && vars[decr[1]]) { asm.push('        DEC     ' + vars[decr[1]]); return; }

    // i = i + 1 / i = i - 1
    let addOne = stmt.match(/(\w+)\s*=\s*\1\s*\+\s*1$/);
    if (addOne && vars[addOne[1]]) { asm.push('        INC     ' + vars[addOne[1]]); return; }
    let subOne = stmt.match(/(\w+)\s*=\s*\1\s*-\s*1$/);
    if (subOne && vars[subOne[1]]) { asm.push('        DEC     ' + vars[subOne[1]]); return; }

    // SHL pattern
    let shl = stmt.match(/(\w+)\s*=\s*\1\s*<<\s*(\d+)/);
    if (shl && vars[shl[1]]) { asm.push('        SHL     ' + vars[shl[1]] + ',' + shl[2]); return; }

    // Simple assignment: val = expr
    let assign = stmt.match(/^(\w+)\s*=\s*(.+)$/);
    if (assign) {
      let vname = assign[1];
      let val = parseVal(assign[2].trim());
      if (!vars[vname]) vars[vname] = assignReg(vname);
      asm.push('        MOV     ' + vars[vname] + ',' + val);
      return;
    }

    // Anything else: comment
    asm.push('        ; ' + stmt);
  }

  function parseVal(s) {
    s = s.trim();
    let cast = s.match(/^\w+\((.+)\)$/);
    if (cast) s = cast[1].trim();
    if (s.startsWith('0x') || s.startsWith('0X')) return '0' + s.slice(2).toUpperCase() + 'H';
    if (/^\d+$/.test(s)) {
      let n = parseInt(s);
      return '0' + n.toString(16).toUpperCase() + 'H';
    }
    return s;
  }
  function toHex16(n) { return '0' + (n & 0xFFFF).toString(16).toUpperCase() + 'H'; }
  function assignReg(name) {
    let used = new Set(Object.values(vars));
    for (let r of ['BL','DL','BH','DH','CL','CH']) { if (!used.has(r)) return r; }
    return 'BL';
  }
}

function compileIfC() {
  if (!isHighLevelFile()) return false;
  let cSrc = document.getElementById('ed').value;
  let asmCode = compileCtoASM(cSrc);
  let sourceKey = activeTabKey;
  let baseName = (sourceKey || 'output').replace(/\.(c|cpp|py|java|go)$/, '');
  let asmKey = baseName + '.asm';

  // Save current source tab content
  if (sourceKey) {
    let cur = openTabs.find(t => t.key === sourceKey);
    if (cur) cur.content = cSrc;
  }

  // Generate .asm file in tree (don't switch tabs)
  let existing = openTabs.find(t => t.key === asmKey);
  if (existing) { existing.content = asmCode; }
  else { openTabs.push({key: asmKey, content: asmCode}); }
  addDynamicFile(asmKey, asmCode, 'generated');

  // Temporarily switch to .asm to assemble, then switch back
  let savedEditor = document.getElementById('ed').value;
  document.getElementById('ed').value = asmCode;
  doAssemble();
  document.getElementById('ed').value = savedEditor;
  updLn(); updateHighlight();
  renderTabs();
  sLog('Translated \u2192 ' + asmKey + ' & assembled', 0);
  return true;
}
