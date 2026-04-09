// ============================================================
// PAT-286 Right Panel — VM content generator
// Generates right panel HTML, 7-segment display, memory ASCII
// ============================================================

function buildRightPanel() {
  let rp = document.getElementById('rpContent');
  if (!rp) return;

  rp.innerHTML = `
    <div class="cyc">
      <span>Cycle: <b id="cyN">0</b></span>
      <span>Instr: <b id="inN">0</b></span>
    </div>
    <div class="cd"><div class="ch">Current instruction</div><div class="cb">
      <div class="ir-box" id="irD">&mdash;</div>
      <div class="desc-box" id="desc" style="margin-top:4px">&mdash;</div>
      <div class="diff-box" id="diffBox" style="margin-top:4px">&mdash;</div>
    </div></div>
    <div class="cd"><div class="ch">General purpose registers</div><div class="cb">
      <div class="rg rg-gp" id="rgGP"></div>
    </div></div>
    <div class="cd"><div class="ch">Segment registers</div><div class="cb">
      <div class="rg rg-seg" id="rgSeg"></div>
    </div></div>
    <div class="cd"><div class="ch">Control</div><div class="cb">
      <div class="rg rg-ctl" id="rgCtl"></div>
    </div></div>
    <div class="cd"><div class="ch">Flags</div><div class="cb">
      <div class="fr" id="flG"></div>
    </div></div>
    <div class="cd"><div class="ch">PAT Display <span class="ch-sub">INT 28H output</span></div><div class="cb">
      <div class="seg7-wrap" id="seg7Wrap"></div>
      <div class="pat-disp-lbl">7-segment display</div>
    </div></div>
    <div class="cd"><div class="ch">Stack <span class="ch-sub" id="stkInfo">SS:SP</span></div><div class="cb">
      <div class="stk" id="stkView">&mdash;</div>
    </div></div>
    <div class="cd"><div class="ch">Memory</div><div class="cb">
      <div style="display:flex;gap:4px;margin-bottom:4px;align-items:center">
        <input id="memAddr" type="text" value="0080:0100" class="mem-input" placeholder="seg:off">
        <button class="b" onclick="renderMem()" style="font-size:10px;padding:3px 8px">View</button>
        <div class="mem-follow">
          <button class="b" id="followIP" onclick="toggleFollow('IP')" title="Auto-follow CS:IP" style="font-size:10px;padding:2px 6px">IP</button>
          <button class="b" id="followSP" onclick="toggleFollow('SP')" title="Auto-follow SS:SP" style="font-size:10px;padding:2px 6px">SP</button>
        </div>
      </div>
      <div class="mem-view-wrap">
        <div class="mg" id="memGrid"></div>
        <div class="mg-ascii" id="memAscii"></div>
      </div>
    </div></div>
    <div class="cd"><div class="ch">Execution Trace <span class="ch-sub" id="traceCount">0</span></div><div class="cb" style="padding:4px">
      <div class="trace" id="traceView"><span style="color:var(--text3)">Run program to see trace</span></div>
    </div></div>
    <div class="cd"><div class="ch">Watch</div><div class="cb" style="padding:4px">
      <div class="watch-input-row">
        <input id="watchInput" type="text" class="watch-input" placeholder="AX, DS:1000, [SI], label..." spellcheck="false">
        <button class="b" onclick="addWatch()" style="font-size:10px;padding:2px 8px">Add</button>
      </div>
      <div id="watchList" class="watch-list"><span class="watch-empty">Add expressions (registers, addresses, labels)</span></div>
    </div></div>
    <div class="cd"><div class="ch">Applications Module</div><div class="cb" style="padding:4px">
      <div id="appModuleContainer"></div>
    </div></div>
    <div class="cd"><div class="ch">I/O Log <span class="ch-sub">last 30</span></div><div class="cb" style="padding:0">
      <div class="io-timeline" id="ioTimeline"></div>
      <div class="io-log" id="ioLog">&mdash;</div>
    </div></div>`;
}

// === 7-SEGMENT DISPLAY ===
function render7Seg(char) {
  const SEGS = {
    '0':[1,1,1,1,1,1,0],'1':[0,1,1,0,0,0,0],'2':[1,1,0,1,1,0,1],'3':[1,1,1,1,0,0,1],
    '4':[0,1,1,0,0,1,1],'5':[1,0,1,1,0,1,1],'6':[1,0,1,1,1,1,1],'7':[1,1,1,0,0,0,0],
    '8':[1,1,1,1,1,1,1],'9':[1,1,1,1,0,1,1],
    'A':[1,1,1,0,1,1,1],'B':[0,0,1,1,1,1,1],'C':[1,0,0,1,1,1,0],'D':[0,1,1,1,1,0,1],
    'E':[1,0,0,1,1,1,1],'F':[1,0,0,0,1,1,1],
    'H':[0,1,1,0,1,1,1],'L':[0,0,0,1,1,1,0],'P':[1,1,0,0,1,1,1],'U':[0,1,1,1,1,1,0],
    '-':[0,0,0,0,0,0,1],' ':[0,0,0,0,0,0,0]
  };
  let s = SEGS[char.toUpperCase()] || SEGS[' '];
  let on = 'var(--grn)', off = 'var(--bg4)';
  return `<svg viewBox="0 0 18 30" width="18" height="30">
    <rect x="3" y="1" width="12" height="2" rx="1" fill="${s[0]?on:off}"/>
    <rect x="14" y="3" width="2" height="11" rx="1" fill="${s[1]?on:off}"/>
    <rect x="14" y="16" width="2" height="11" rx="1" fill="${s[2]?on:off}"/>
    <rect x="3" y="27" width="12" height="2" rx="1" fill="${s[3]?on:off}"/>
    <rect x="2" y="16" width="2" height="11" rx="1" fill="${s[4]?on:off}"/>
    <rect x="2" y="3" width="2" height="11" rx="1" fill="${s[5]?on:off}"/>
    <rect x="3" y="14" width="12" height="2" rx="1" fill="${s[6]?on:off}"/>
  </svg>`;
}

// Render 7-seg character at given position inside an SVG (for app module)
function render7SegInline(char, x, y, scale) {
  scale = scale || 1;
  const SEGS = {
    '0':[1,1,1,1,1,1,0],'1':[0,1,1,0,0,0,0],'2':[1,1,0,1,1,0,1],'3':[1,1,1,1,0,0,1],
    '4':[0,1,1,0,0,1,1],'5':[1,0,1,1,0,1,1],'6':[1,0,1,1,1,1,1],'7':[1,1,1,0,0,0,0],
    '8':[1,1,1,1,1,1,1],'9':[1,1,1,1,0,1,1],
    'A':[1,1,1,0,1,1,1],'B':[0,0,1,1,1,1,1],'C':[1,0,0,1,1,1,0],'D':[0,1,1,1,1,0,1],
    'E':[1,0,0,1,1,1,1],'F':[1,0,0,0,1,1,1],
    'H':[0,1,1,0,1,1,1],'L':[0,0,0,1,1,1,0],'P':[1,1,0,0,1,1,1],'U':[0,1,1,1,1,1,0],
    '-':[0,0,0,0,0,0,1],' ':[0,0,0,0,0,0,0]
  };
  let s = SEGS[char.toUpperCase()] || SEGS[' '];
  let on = 'var(--grn)', off = '#1a1d24';
  let w = 18 * scale, h = 30 * scale;
  // Segment rectangles relative to x,y
  let segs = [
    [3,1,12,2.5],  // a - top
    [14,3,2.5,11], // b - topR
    [14,16,2.5,11],// c - botR
    [3,27,12,2.5], // d - bot
    [2,16,2.5,11], // e - botL
    [2,3,2.5,11],  // f - topL
    [3,14,12,2.5]  // g - mid
  ];
  let svg = `<g transform="translate(${x},${y}) scale(${scale})">`;
  for (let i = 0; i < 7; i++) {
    let [rx,ry,rw,rh] = segs[i];
    let fill = s[i] ? on : off;
    let glow = s[i] ? ' filter="url(#segGlow)"' : '';
    svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="1" fill="${fill}"${glow}/>`;
  }
  svg += '</g>';
  return svg;
}

function update7SegDisplay() {
  let wrap = document.getElementById('seg7Wrap');
  if (!wrap) return;
  let text = (patDisplay || '').slice(-8).padStart(8, ' ');
  let html = '';
  for (let i = 0; i < text.length; i++) {
    html += render7Seg(text[i]);
  }
  wrap.innerHTML = html;
}

// === MEMORY VIEW WITH ASCII ===
function enhanceMemoryView() {
  if (typeof renderMem !== 'function') return;
  let _origRenderMem = renderMem;

  renderMem = function() {
    _origRenderMem();
    let asciiCol = document.getElementById('memAscii');
    if (!asciiCol) return;

    let seg, off;
    if (memFollowMode === 'IP') { seg = CS; off = IP; }
    else if (memFollowMode === 'SP') { seg = SS; off = SP; }
    else {
      let input = document.getElementById('memAddr').value.trim();
      seg = 0x80; off = 0x100;
      let m = input.match(/^([0-9A-Fa-f]+):([0-9A-Fa-f]+)$/);
      if (m) { seg = parseInt(m[1], 16); off = parseInt(m[2], 16); }
      else { off = parseInt(input, 16) || 0x100; }
    }
    let base = off & ~7;
    let asciiHtml = '';
    for (let r = 0; r < 8; r++) {
      let rowAddr = base + r * 8;
      let ascii = '';
      for (let c = 0; c < 8; c++) {
        let v = rb(pa(seg, rowAddr + c));
        if (v >= 0x20 && v < 0x7F) ascii += String.fromCharCode(v);
        else ascii += '<span class="ma-dot">.</span>';
      }
      asciiHtml += `<span class="ma-ascii">${ascii}</span>`;
    }
    asciiCol.innerHTML = asciiHtml;
  };
}
