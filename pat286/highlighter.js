// === SYNTAX HIGHLIGHTING ===
const HL_KEYWORDS = new Set(['MOV','ADD','SUB','MUL','DIV','IMUL','IDIV','INC','DEC','NEG','NOT','AND','OR','XOR','TEST','CMP','SHL','SHR','SAR','SAL','ROL','ROR','RCL','RCR','PUSH','POP','PUSHF','POPF','CALL','RET','JMP','JE','JNE','JZ','JNZ','JG','JGE','JL','JLE','JA','JAE','JB','JBE','JC','JNC','JS','JNS','JO','JNO','JP','JNP','JCXZ','LOOP','LOOPE','LOOPNE','INT','IRET','HLT','NOP','CLC','STC','CMC','CLD','STD','CLI','STI','XCHG','LEA','CBW','CWD','IN','OUT','MOVS','MOVSB','MOVSW','STOS','STOSB','STOSW','LODS','LODSB','LODSW','CMPS','CMPSB','CMPSW','SCAS','SCASB','SCASW','REP','REPE','REPZ','REPNE','REPNZ','DAA','DAS','AAA','AAS','AAM','AAD','XLAT']);
const HL_REGS = new Set(['AX','BX','CX','DX','AH','AL','BH','BL','CH','CL','DH','DL','SI','DI','SP','BP','CS','DS','SS','ES','IP']);
const HL_DIRS = new Set(['ORG','DB','DW','EQU','END','INCLUDE','BYTE','WORD','PTR','OFFSET','SEG']);
const C_KEYWORDS = new Set(['void','int','char','unsigned','signed','short','long','float','double','struct','union','enum','typedef','const','static','extern','volatile','register','return','if','else','for','while','do','switch','case','default','break','continue','goto','sizeof','include','define','auto','inline']);
const C_TYPES = new Set(['PORT1','PORT2','OUTPUT','INPUT','uint8_t','uint16_t','int8_t','int16_t','size_t','NULL','TRUE','FALSE','bool','FILE','stdin','stdout','stderr']);
const PY_BUILTINS = new Set(['print','range','len','int','str','float','list','dict','set','tuple','type','isinstance','enumerate','zip','map','filter','sorted','reversed','input','open','super','self','cls','__init__','__name__','__main__']);
const JAVA_TYPES = new Set(['System','String','Integer','Long','Double','Float','Boolean','Byte','Character','Object','ArrayList','HashMap','List','Map','Set','Thread','Exception','Override','out','println','printf']);
const GO_BUILTINS = new Set(['fmt','Println','Printf','Sprintf','Print','Fprintf','make','len','cap','append','copy','delete','new','panic','recover','close','Println','Scanf','main']);

function currentFileType() {
  if (!activeTabKey) return 'asm';
  if (activeTabKey.endsWith('.c') || activeTabKey.endsWith('.cpp')) return 'c';
  if (activeTabKey.endsWith('.py')) return 'py';
  if (activeTabKey.endsWith('.java')) return 'java';
  if (activeTabKey.endsWith('.go')) return 'go';
  return 'asm';
}
function isHighLevelFile() { return currentFileType() !== 'asm'; }

function highlightLineC(line) {
  let trimmed = line.trimStart();
  if (trimmed.startsWith('//')) return esc(line.substring(0, line.length - trimmed.length)) + `<span class="hl-c">${esc(trimmed)}</span>`;
  if (trimmed.startsWith('/*')) return `<span class="hl-c">${esc(line)}</span>`;
  if (trimmed.startsWith('*') || trimmed.startsWith('*/')) return `<span class="hl-c">${esc(line)}</span>`;
  if (trimmed.startsWith('#')) return `<span class="hl-d">${esc(line)}</span>`;

  let result = line.replace(/("[^"]*"|'[^']*')|(0[xX][0-9A-Fa-f]+|\b[0-9]+\b)|(\b[A-Za-z_]\w*\b)(\s*\()?|(->|<<|>>|&&|\|\||[!=<>]=)/g,
    function(m, str, num, word, paren, op) {
      if (str) return `<span class="hl-s">${esc(str)}</span>`;
      if (num) return `<span class="hl-n">${esc(num)}</span>`;
      if (op) return `<span class="hl-p">${esc(op)}</span>`;
      if (word) {
        if (C_KEYWORDS.has(word)) return `<span class="hl-k">${esc(word)}</span>` + (paren || '');
        if (C_TYPES.has(word)) return `<span class="hl-d">${esc(word)}</span>` + (paren || '');
        if (paren) return `<span class="hl-d">${esc(word)}</span>` + paren;
        return esc(word);
      }
      return esc(m);
    }
  );
  return result;
}

const PY_KEYWORDS = new Set(['def','return','if','elif','else','for','while','break','continue','pass','import','from','as','class','True','False','None','and','or','not','in','is','lambda','try','except','finally','raise','with','yield','global','nonlocal']);
const JAVA_KEYWORDS = new Set(['public','private','protected','static','void','int','char','byte','short','long','float','double','boolean','class','interface','extends','implements','new','return','if','else','for','while','do','switch','case','default','break','continue','import','package','final','abstract','this','super','true','false','null','String','throws','throw','try','catch','finally']);
const GO_KEYWORDS = new Set(['package','import','func','var','const','type','struct','interface','map','chan','go','select','defer','return','if','else','for','range','switch','case','default','break','continue','fallthrough','true','false','nil','byte','int','uint','string','error','fmt']);

function highlightLineGeneric(line, keywords, commentStr, blockComment, builtins) {
  let trimmed = line.trimStart();
  if (trimmed.startsWith(commentStr)) return esc(line.substring(0, line.length - trimmed.length)) + `<span class="hl-c">${esc(trimmed)}</span>`;
  if (blockComment && (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/'))) return `<span class="hl-c">${esc(line)}</span>`;
  if (trimmed.startsWith('@')) return `<span class="hl-d">${esc(line)}</span>`;

  let result = line.replace(/("[^"]*"|'[^']*'|`[^`]*`)|(0[xX][0-9A-Fa-f]+|\b[0-9]+\.?[0-9]*\b)|(\b[A-Za-z_]\w*\b)(\s*\()?|(:=|->|<<|>>|&&|\|\||[!=<>]=)/g,
    function(m, str, num, word, paren, op) {
      if (str) return `<span class="hl-s">${esc(str)}</span>`;
      if (num) return `<span class="hl-n">${esc(num)}</span>`;
      if (op) return `<span class="hl-p">${esc(op)}</span>`;
      if (word) {
        if (keywords.has(word)) return `<span class="hl-k">${esc(word)}</span>` + (paren || '');
        if (builtins && builtins.has(word)) return `<span class="hl-d">${esc(word)}</span>` + (paren || '');
        if (paren) return `<span class="hl-d">${esc(word)}</span>` + paren;
        if (/^[A-Z]/.test(word)) return `<span class="hl-l">${esc(word)}</span>`;
        return esc(word);
      }
      return esc(m);
    }
  );
  return result;
}

function highlightLine(line) {
  let ft = currentFileType();
  if (ft === 'c') return highlightLineC(line);
  if (ft === 'py') return highlightLineGeneric(line, PY_KEYWORDS, '#', false, PY_BUILTINS);
  if (ft === 'java') return highlightLineGeneric(line, JAVA_KEYWORDS, '//', true, JAVA_TYPES);
  if (ft === 'go') return highlightLineGeneric(line, GO_KEYWORDS, '//', false, GO_BUILTINS);

  // ASM highlighting
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
