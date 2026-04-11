// ============================================================
// PAT-286 Render I/O — App module, LED/motor/piezo display,
// I/O log, timeline, port monitor
// ============================================================

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
      html += `<g transform="translate(${x},0)">`;
      html += `<rect x="1" y="2" width="14" height="18" rx="2" fill="${on ? '#2a1515' : '#151520'}" stroke="${on ? '#ff4444' : 'var(--brd)'}" stroke-width="1"/>`;
      html += `<rect x="3" y="4" width="10" height="5" rx="1.5" fill="${on ? '#ff6b6b' : '#1c1f2e'}" ${on ? 'filter="url(#ledGlow)"' : ''}/>`;
      if (on) html += `<rect x="4" y="5" width="8" height="2" rx="1" fill="#ff9999" opacity="0.5"/>`;
      html += `<rect x="2" y="20" width="4" height="2" rx="0.5" fill="var(--brd2)"/>`;
      html += `<rect x="10" y="20" width="4" height="2" rx="0.5" fill="var(--brd2)"/>`;
      html += `</g>`;
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
  let speedArcFill = document.getElementById('speedArcFill');
  if (speedArcFill) {
    let ratio = Math.min(motorDacVal / 255, 1);
    let angle = ratio * Math.PI;
    let ex = 90 - 35 * Math.cos(angle);
    let ey = 230 - 35 * Math.sin(angle);
    let largeArc = angle > Math.PI / 2 ? 1 : 0;
    if (ratio > 0.01) {
      speedArcFill.setAttribute('d', `M 55 230 A 35 35 0 ${largeArc} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`);
      speedArcFill.setAttribute('stroke', ratio > 0.7 ? 'var(--acc)' : ratio > 0.4 ? 'var(--amb)' : 'var(--grn)');
    } else {
      speedArcFill.setAttribute('d', 'M 55 230 A 35 35 0 0 1 55 230');
    }
  }
  let encWheel = document.getElementById('encWheel');
  if (encWheel) encWheel.setAttribute('transform', `rotate(${motorAngle}, 90, 185)`);

  let pzCirc = document.getElementById('pzCirc');
  let pzInner = document.getElementById('pzInner');
  let pzSt = document.getElementById('pzSt');
  let pzWaves = document.getElementById('pzWaves');
  let pzFreqEl = document.getElementById('pzFreq');
  if (pzCirc) {
    pzCirc.setAttribute('fill', piezoOn ? 'var(--amb)' : 'var(--bg)');
    pzCirc.setAttribute('stroke', piezoOn ? 'var(--amb)' : 'var(--brd)');
  }
  if (pzInner) pzInner.setAttribute('fill', piezoOn ? 'var(--amb)' : 'var(--brd)');
  if (pzSt) {
    pzSt.textContent = piezoOn ? 'ON' : 'OFF';
    pzSt.setAttribute('fill', piezoOn ? 'var(--amb)' : 'var(--text3)');
  }
  if (pzWaves) pzWaves.setAttribute('opacity', piezoOn ? '1' : '0');
  if (pzFreqEl) {
    if (piezoFreq > 0 && piezoOn) pzFreqEl.textContent = '~' + piezoFreq + ' Hz';
    else if (!piezoOn) { pzFreqEl.textContent = ''; piezoFreq = 0; }
  }

  let utxOn = (p1 >> 6) & 1;
  let utxCirc = document.getElementById('utxCirc');
  let urxCirc = document.getElementById('urxCirc');
  let ultraWaves = document.getElementById('ultraWaves');
  if (utxCirc) utxCirc.setAttribute('fill', utxOn ? 'var(--pur)' : 'var(--bg)');
  if (urxCirc) urxCirc.setAttribute('fill', (utxOn && objectNear) ? 'var(--pur)' : 'var(--bg)');
  if (ultraWaves) ultraWaves.setAttribute('opacity', utxOn ? '1' : '0');

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

  let seg7Group = document.getElementById('seg7Group');
  if (seg7Group && typeof render7SegInline === 'function') {
    let disp = (patDisplay || '').slice(-8).padStart(8, ' ');
    let html = '';
    for (let i = 0; i < 8; i++) {
      html += render7SegInline(disp[i], i * 32, 0, 1.2);
    }
    seg7Group.innerHTML = html;
  }

  let adcBsyEl = document.getElementById('adcBsy');
  let adcRdEl = document.getElementById('adcRd');
  if (adcBsyEl) adcBsyEl.textContent = 'RDY';
  if (adcRdEl) adcRdEl.textContent = (p1 >> 3) & 1 ? '1' : '0';

  let tmrInfo = document.getElementById('tmrInfo');
  let tmrClk = document.getElementById('tmrClk');
  if (tmrInfo) tmrInfo.textContent = (timerEnabled & 1 ? 'ON' : 'OFF') + ' \u00B7 Val: ' + hex8(timerValue) + ' \u00B7 IRQ: ' + (irqPending ? 'PENDING' : '\u2014');
  if (tmrClk) tmrClk.textContent = 'Clock: ' + hex8(timerClockSel) + ' \u00B7 IRQEN: ' + hex8(timerEnabled);

  let irqInfoEl = document.getElementById('irqInfo');
  let irqVecEl = document.getElementById('irqVec');
  if (irqInfoEl) irqInfoEl.textContent = 'IF=' + gf(IF_) + ' \u00B7 Pending: ' + (irqPending ? hex8(irqPending) : '\u2014');
  if (irqVecEl) {
    let v0 = rw(0x80) ? hex16(rw(0x82)) + ':' + hex16(rw(0x80)) : '\u2014';
    let v1 = rw(0x84) ? hex16(rw(0x86)) + ':' + hex16(rw(0x84)) : '\u2014';
    let v2 = rw(0x94) ? hex16(rw(0x96)) + ':' + hex16(rw(0x94)) : '\u2014';
    irqVecEl.textContent = 'IR0:' + v0 + ' IR1:' + v1 + ' IR2:' + v2;
  }

  let portState = document.getElementById('portState');
  let portData = document.getElementById('portData');
  if (portState) portState.textContent = 'P1CTL:' + hex8(ioPorts[0x88]) + ' MODE:' + hex8(ioPorts[0x86]) + ' CREG1:' + hex8(ioPorts[0x80]) + ' IRQEN:' + hex8(ioPorts[0x8A]);
  if (portData) portData.textContent = 'PORT1:' + hex8(p1) + ' PORT2:' + hex8(p2) + ' TIMER:' + hex8(timerValue) + ' STATUS:' + hex8(ioPorts[0x9E]);
}

function renderIOTimeline() {
  let el = document.getElementById('ioTimeline');
  if (!el) return;
  if (!ioLog.length) { el.innerHTML = ''; return; }
  let last = ioLog.slice(-60);
  let html = '<div class="io-tl-bars">';
  for (let e of last) {
    let cls = e.dir === 'OUT' ? 'io-tl-out' : 'io-tl-in';
    html += `<div class="io-tl-bar ${cls}" title="${e.dir} ${hex8(e.port)}=${hex8(e.val)}"></div>`;
  }
  html += '</div>';
  el.innerHTML = html;
}

function updateMotor() {
  if (motorDacVal > 0) motorAngle = (motorAngle + motorDacVal / 30) % 360;
  let rad = motorAngle * Math.PI / 180;
  let x2 = 90 + 35 * Math.sin(rad);
  let y2 = 185 - 35 * Math.cos(rad);
  let arm = document.getElementById('mArm');
  if (arm) { arm.setAttribute('x2', x2); arm.setAttribute('y2', y2); }
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
  if (!ioLog.length) { el.textContent = '\u2014'; return; }
  const pn = {0x80:'CREG1',0x82:'CREG2',0x84:'CREG3',0x86:'MODE',0x88:'P1CTL',0x8A:'IRQEN',0x8C:'IRQADR',0x90:'PORT1',0x92:'PORT2',0x94:'TMR1',0x40:'PIC'};
  let html = ioLog.slice(-30).map(e => {
    let name = pn[e.port] || hex8(e.port);
    return `<span class="io-${e.dir.toLowerCase()}">${e.dir} ${name}=${hex8(e.val)}</span>`;
  }).join('<br>');
  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}
