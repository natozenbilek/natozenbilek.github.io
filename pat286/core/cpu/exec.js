// ============================================================
// PAT-286 CPU — Instruction Fetch, Decode, Execute
// ============================================================

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

// === STRING OPERATIONS ===
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
  repPrefix = 0;

  while (prefix) {
    let pb = rb(pa(CS, IP));
    if (pb === 0x26) { segOvr = ES; IP = (IP+1) & 0xFFFF; }
    else if (pb === 0x2E) { segOvr = CS; IP = (IP+1) & 0xFFFF; }
    else if (pb === 0x36) { segOvr = SS; IP = (IP+1) & 0xFFFF; }
    else if (pb === 0x3E) { segOvr = DS; IP = (IP+1) & 0xFFFF; }
    else if (pb === 0xF3) { repPrefix = 0xF3; IP = (IP+1) & 0xFFFF; }
    else if (pb === 0xF2) { repPrefix = 0xF2; IP = (IP+1) & 0xFFFF; }
    else prefix = false;
  }

  let op = fetchByte();
  let wide = op & 1;

  // === STRING OPS with REP support ===
  let stringOps = {
    0xA4: 'MOVS', 0xA5: 'MOVS',
    0xAA: 'STOS', 0xAB: 'STOS',
    0xAC: 'LODS', 0xAD: 'LODS',
    0xA6: 'CMPS', 0xA7: 'CMPS',
    0xAE: 'SCAS', 0xAF: 'SCAS',
  };

  if (stringOps[op] !== undefined) {
    let sop = stringOps[op];
    wide = op & 1;
    let suffix = wide ? 'W' : 'B';

    if (repPrefix) {
      let repName = repPrefix === 0xF3 ? 'REP' : 'REPNE';
      let isConditional = (sop === 'CMPS' || sop === 'SCAS');
      if (repPrefix === 0xF3 && isConditional) repName = 'REPE';

      let count = 0;
      while (CX !== 0) {
        execStringOp(sop, wide, segOvr);
        CX = (CX - 1) & 0xFFFF;
        count++;
        if (isConditional) {
          if (repPrefix === 0xF3 && gf(ZF) === 0) break;
          if (repPrefix === 0xF2 && gf(ZF) === 1) break;
        }
        if (count > 65536) break;
      }
      curInstr = `${repName} ${sop}${suffix}`;
      curDesc = `${repName} ${sop}${suffix}: ${count} iterations, CX=${CX}`;
    } else {
      execStringOp(sop, wide, segOvr);
      curInstr = `${sop}${suffix}`;
      curDesc = `${sop}${suffix}: SI=${hex16(SI)} DI=${hex16(DI)}`;
      if (sop === 'LODS') curDesc = `LODS \u2192 ${wide?hex16(AX):hex8(getAL())}`;
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
  // ALU imm to AL/AX
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
    curInstr = `INC ${rn16(r)}`; curDesc = `INC: ${hex16(v)}\u2192${hex16(res)}`;
  }
  // DEC reg16 (48-4F)
  else if (op >= 0x48 && op <= 0x4F) {
    let r = op & 7, v = getReg16(r), res = (v - 1) & 0xFFFF;
    let cf = gf(CF); setFlagsArith16(v - 1, v, 1, true); sf(CF, cf);
    setReg16(r, res);
    curInstr = `DEC ${rn16(r)}`; curDesc = `DEC: ${hex16(v)}\u2192${hex16(res)}`;
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
    curInstr = `POP ${rn16(r)}`; curDesc = `POP \u2192 ${hex16(v)}`;
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
    curInstr = ccn; curDesc = `${ccn}: ${taken ? 'TAKEN \u2192 '+hex16(IP) : 'not taken'}`;
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
    curInstr = `XCHG AX,${rn16(r)}`; curDesc = `XCHG: AX\u2194${rn16(r)}`;
  }
  // CBW (98)
  else if (op === 0x98) {
    AX = signExt8(getAL()) & 0xFFFF;
    curInstr = 'CBW'; curDesc = `CBW: AL=${hex8(getAL())} \u2192 AX=${hex16(AX)}`;
  }
  // CWD (99)
  else if (op === 0x99) {
    DX = (AX & 0x8000) ? 0xFFFF : 0x0000;
    curInstr = 'CWD'; curDesc = `CWD: AX=${hex16(AX)} \u2192 DX:AX=${hex16(DX)}:${hex16(AX)}`;
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
    curInstr = `MOV [${hex16(off)}],${wide?'AX':'AL'}`; curDesc = `MOV: ${hex16(v)}\u2192mem[${hex16(off)}]`;
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
    curInstr = `MOV ${rn8(r)},${hex8(v)}`; curDesc = `MOV: ${hex8(v)}\u2192${rn8(r)}`;
  }
  // MOV reg16, imm16 (B8-BF)
  else if (op >= 0xB8 && op <= 0xBF) {
    let r = op & 7, v = fetchWord();
    setReg16(r, v);
    curInstr = `MOV ${rn16(r)},${hex16(v)}`; curDesc = `MOV: ${hex16(v)}\u2192${rn16(r)}`;
  }
  // RET near (C3)
  else if (op === 0xC3) {
    IP = popW();
    curInstr = 'RET'; curDesc = `RET \u2192 ${hex16(IP)}`;
  }
  // MOV rm, imm (C6/C7)
  else if (op === 0xC6 || op === 0xC7) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    if (modrm.mod !== 3) modrm._ea = calcEA(modrm.mod, modrm.rm, segOvr);
    let imm = wide ? fetchWord() : fetchByte();
    writeRM(modrm, imm, segOvr);
    curInstr = `MOV rm,${hex16(imm)}`; curDesc = `MOV: imm ${hex16(imm)} \u2192 memory`;
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
        curDesc = `INT ${hex8(intNum)} \u2192 ${hex16(newCS)}:${hex16(newIP)}`;
      } else {
        curDesc = `INT ${hex8(intNum)} (no handler)`;
      }
    }
    curInstr = `INT ${hex8(intNum)}`;
  }
  // IRET (CF)
  else if (op === 0xCF) {
    IP = popW(); CS = popW(); FLAGS = popW() | 0x0002;
    curInstr = 'IRET'; curDesc = `IRET \u2192 ${hex16(CS)}:${hex16(IP)}`;
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
        case 0: c = (res >> (bits-1)) & 1; res = ((res << 1) | c) & mask; sf(CF, c); break;
        case 1: c = res & 1; res = ((res >> 1) | (c << (bits-1))) & mask; sf(CF, c); break;
        case 2: c = (res >> (bits-1)) & 1; res = ((res << 1) | gf(CF)) & mask; sf(CF, c); break;
        case 3: c = res & 1; res = ((res >> 1) | (gf(CF) << (bits-1))) & mask; sf(CF, c); break;
        case 4: case 6: c = (res >> (bits-1)) & 1; res = (res << 1) & mask; sf(CF, c);
          sf(ZF, res===0); sf(SF, (res>>(bits-1))&1); sf(PF, parity8(res)); break;
        case 5: c = res & 1; res = (res >> 1) & mask; sf(CF, c);
          sf(ZF, res===0); sf(SF, (res>>(bits-1))&1); sf(PF, parity8(res)); break;
        case 7: c = res & 1; let sgn = res & (1 << (bits-1)); res = ((res >> 1) | sgn) & mask; sf(CF, c);
          sf(ZF, res===0); sf(SF, (res>>(bits-1))&1); sf(PF, parity8(res)); break;
      }
    }
    writeRM(modrm, res, segOvr);
    let sn = ['ROL','ROR','RCL','RCR','SHL','SHR','?','SAR'][modrm.reg];
    curInstr = `${sn} ${wide?'word':'byte'},${cnt}`; curDesc = `${sn}: ${hex16(val)}\u2192${hex16(res)}`;
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
    curInstr = `OUT ${hex8(port)},${wide?'AX':'AL'}`; curDesc = `OUT: ${hex8(v)}\u2192port ${hex8(port)}`;
  }
  // CALL rel16 (E8)
  else if (op === 0xE8) {
    let disp = fetchWord();
    if (disp & 0x8000) disp -= 0x10000;
    pushW(IP);
    IP = (IP + disp) & 0xFFFF;
    curInstr = 'CALL'; curDesc = `CALL \u2192 ${hex16(IP)}`;
  }
  // JMP rel16 (E9)
  else if (op === 0xE9) {
    let disp = fetchWord();
    if (disp & 0x8000) disp -= 0x10000;
    IP = (IP + disp) & 0xFFFF;
    curInstr = 'JMP near'; curDesc = `JMP \u2192 ${hex16(IP)}`;
  }
  // JMP rel8 (EB)
  else if (op === 0xEB) {
    let disp = signExt8(fetchByte());
    IP = (IP + disp) & 0xFFFF;
    curInstr = 'JMP short'; curDesc = `JMP \u2192 ${hex16(IP)}`;
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
    curInstr = `OUT DX,${wide?'AX':'AL'}`; curDesc = `OUT: ${hex8(v)}\u2192port ${hex16(DX)}`;
  }
  // HLT (F4)
  else if (op === 0xF4) {
    if (gf(IF_) && (timerEnabled & 1)) {
      for (let t = 0; t < 5000 && !irqPending; t++) { timerCount++; if(timerCount>=TIMER_CYCLES_PER_TICK){timerCount=0;if(timerValue>0){timerValue--;if(timerValue===0)irqPending|=0x04;}} }
      if (irqPending) { curInstr = 'HLT'; curDesc = 'HLT \u2192 woke by interrupt'; cy++; ic++; return; }
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
  // XLAT (D7)
  else if (op === 0xD7) {
    let addr = pa(segOvr !== null ? segOvr : DS, (BX + getAL()) & 0xFFFF);
    let v = rb(addr); setAL(v);
    curInstr = 'XLAT'; curDesc = `XLAT: AL=[BX+${hex8(getAL())}]=${hex8(v)}`;
  }
  // LAHF (9F)
  else if (op === 0x9F) {
    setAH(FLAGS & 0xFF);
    curInstr = 'LAHF'; curDesc = `LAHF: AH=${hex8(FLAGS & 0xFF)}`;
  }
  // SAHF (9E)
  else if (op === 0x9E) {
    FLAGS = (FLAGS & 0xFF00) | (getAH() & 0xD5) | 0x02;
    curInstr = 'SAHF'; curDesc = `SAHF: FLAGS=${hex16(FLAGS)}`;
  }
  // DAA (27)
  else if (op === 0x27) {
    let al = getAL(), oldAL = al, oldCF = gf(CF);
    if ((al & 0x0F) > 9 || gf(AF)) { al += 6; sf(AF, 1); } else { sf(AF, 0); }
    if (al > 0x9F || oldCF) { al += 0x60; sf(CF, 1); } else { sf(CF, 0); }
    al &= 0xFF; setAL(al);
    sf(ZF, al === 0); sf(SF, (al >> 7) & 1); sf(PF, parity8(al));
    curInstr = 'DAA'; curDesc = `DAA: AL ${hex8(oldAL)}\u2192${hex8(al)}`;
  }
  // DAS (2F)
  else if (op === 0x2F) {
    let al = getAL(), oldAL = al, oldCF = gf(CF);
    if ((al & 0x0F) > 9 || gf(AF)) { al -= 6; sf(AF, 1); } else { sf(AF, 0); }
    if (oldAL > 0x99 || oldCF) { al -= 0x60; sf(CF, 1); } else { sf(CF, 0); }
    al &= 0xFF; setAL(al);
    sf(ZF, al === 0); sf(SF, (al >> 7) & 1); sf(PF, parity8(al));
    curInstr = 'DAS'; curDesc = `DAS: AL ${hex8(oldAL)}\u2192${hex8(al)}`;
  }
  // AAA (37)
  else if (op === 0x37) {
    if ((getAL() & 0x0F) > 9 || gf(AF)) {
      setAL((getAL() + 6) & 0x0F); setAH(getAH() + 1); sf(AF, 1); sf(CF, 1);
    } else { setAL(getAL() & 0x0F); sf(AF, 0); sf(CF, 0); }
    curInstr = 'AAA'; curDesc = `AAA: AX=${hex16(AX)}`;
  }
  // AAS (3F)
  else if (op === 0x3F) {
    if ((getAL() & 0x0F) > 9 || gf(AF)) {
      setAL((getAL() - 6) & 0x0F); setAH(getAH() - 1); sf(AF, 1); sf(CF, 1);
    } else { setAL(getAL() & 0x0F); sf(AF, 0); sf(CF, 0); }
    curInstr = 'AAS'; curDesc = `AAS: AX=${hex16(AX)}`;
  }
  // AAM (D4 0A)
  else if (op === 0xD4) {
    let imm = fetchByte(); if (imm === 0) { halt = true; curInstr = 'AAM'; curDesc = 'AAM: divide by 0'; }
    else { setAH(Math.floor(getAL() / imm)); setAL(getAL() % imm); sf(ZF, getAL()===0); sf(SF, (getAL()>>7)&1); sf(PF, parity8(getAL())); curInstr = 'AAM'; curDesc = `AAM: AX=${hex16(AX)}`; }
  }
  // AAD (D5 0A)
  else if (op === 0xD5) {
    let imm = fetchByte();
    let res = (getAH() * imm + getAL()) & 0xFF; setAL(res); setAH(0);
    sf(ZF, res===0); sf(SF, (res>>7)&1); sf(PF, parity8(res));
    curInstr = 'AAD'; curDesc = `AAD: AX=${hex16(AX)}`;
  }
  // NOT/NEG/MUL/DIV/TEST (F6/F7 group)
  else if (op === 0xF6 || op === 0xF7) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    let val = readRM(modrm, segOvr);
    let mask = wide ? 0xFFFF : 0xFF;
    if (modrm.reg === 2) {
      let res = (~val) & mask;
      writeRM(modrm, res, segOvr);
      curInstr = 'NOT'; curDesc = `NOT: ${hex16(val)}\u2192${hex16(res)}`;
    } else if (modrm.reg === 3) {
      let res = (-val) & mask;
      wide ? setFlagsArith16(-val, 0, val, true) : setFlagsArith8(-val, 0, val, true);
      sf(CF, val !== 0 ? 1 : 0);
      writeRM(modrm, res, segOvr);
      curInstr = 'NEG'; curDesc = `NEG: ${hex16(val)}\u2192${hex16(res)}`;
    } else if (modrm.reg === 4) {
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
    } else if (modrm.reg === 5) {
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
    } else if (modrm.reg === 6) {
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
    } else if (modrm.reg === 7) {
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
    } else if (modrm.reg === 0) {
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
    if (modrm.reg === 0) {
      let v = readRM(modrm, segOvr), res = (v + 1) & (wide ? 0xFFFF : 0xFF);
      let cf = gf(CF);
      wide ? setFlagsArith16(v+1, v, 1, false) : setFlagsArith8(v+1, v, 1, false);
      sf(CF, cf);
      writeRM(modrm, res, segOvr);
      curInstr = `INC ${wide?'word':'byte'}`; curDesc = `INC: ${hex16(v)}\u2192${hex16(res)}`;
    } else if (modrm.reg === 1) {
      let v = readRM(modrm, segOvr), res = (v - 1) & (wide ? 0xFFFF : 0xFF);
      let cf = gf(CF);
      wide ? setFlagsArith16(v-1, v, 1, true) : setFlagsArith8(v-1, v, 1, true);
      sf(CF, cf);
      writeRM(modrm, res, segOvr);
      curInstr = `DEC ${wide?'word':'byte'}`; curDesc = `DEC: ${hex16(v)}\u2192${hex16(res)}`;
    } else if (modrm.reg === 2 && wide) {
      let target = readRM(modrm, segOvr);
      pushW(IP);
      IP = target;
      curInstr = 'CALL rm16'; curDesc = `CALL \u2192 ${hex16(IP)}`;
    } else if (modrm.reg === 4 && wide) {
      let target = readRM(modrm, segOvr);
      IP = target;
      curInstr = 'JMP rm16'; curDesc = `JMP \u2192 ${hex16(IP)}`;
    } else if (modrm.reg === 6 && wide) {
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
    curInstr = 'XCHG'; curDesc = `XCHG: ${hex16(a)}\u2194${hex16(b)}`;
  }
  else {
    curInstr = `??? (${hex8(op)})`; curDesc = `Unknown opcode ${hex8(op)} at ${hex16(startCS)}:${hex16(startIP)}`;
    halt = true; setSt('ERROR');
  }

  cy++; ic++;
}

// === ALU HELPER ===
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

// === CONDITION CODE TESTING ===
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
