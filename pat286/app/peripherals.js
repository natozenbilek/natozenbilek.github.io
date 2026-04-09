// Applications Module SVG — injected into the right panel
function buildAppModuleSVG() {
  return `<svg id="appSvg" viewBox="0 0 440 580" style="width:100%;height:auto;display:block;font-family:var(--mono)">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="segGlow"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="ledGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <!-- PCB trace pattern -->
          <pattern id="pcbGrid" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="0.3" fill="var(--brd)" opacity="0.3"/>
          </pattern>
        </defs>
        <!-- Background PCB -->
        <rect x="0" y="0" width="440" height="580" rx="6" fill="var(--bg2)" stroke="var(--brd)" stroke-width="1.5"/>
        <rect x="2" y="2" width="436" height="576" rx="5" fill="url(#pcbGrid)" opacity="0.5"/>
        <text x="220" y="18" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text2)" letter-spacing="0.1em">APPLICATIONS MODULE</text>

        <!-- PORT 1 LED Bar (PCB style) -->
        <rect x="10" y="28" width="200" height="68" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="110" y="42" text-anchor="middle" font-size="8" fill="var(--text3)" font-weight="600">PORT 1 (0x90)</text>
        <!-- PCB traces -->
        <g id="ledP1traces" transform="translate(22,48)">
          ${Array.from({length:8},(_,i)=>{let x=(7-i)*22; return `<line x1="${x+8}" y1="24" x2="${x+8}" y2="30" stroke="var(--brd)" stroke-width="0.8"/><rect x="${x+5}" y="30" width="6" height="2" rx="0.5" fill="var(--brd)" opacity="0.5"/>`;}).join('')}
        </g>
        <g id="ledP1svg" transform="translate(22,48)"></g>
        <text x="15" y="85" font-size="7" fill="var(--text3)" letter-spacing="0.02em">PB7&nbsp;&nbsp;PB6&nbsp;&nbsp;PB5&nbsp;&nbsp;PB4&nbsp;&nbsp;PB3&nbsp;&nbsp;PB2&nbsp;&nbsp;PB1&nbsp;&nbsp;PB0</text>
        <text x="15" y="93" font-size="7" fill="var(--text3)" opacity="0.7">URX&nbsp;&nbsp;UTX&nbsp;&nbsp;PZO&nbsp;&nbsp;DSC&nbsp;&nbsp;&nbsp;RD&nbsp;&nbsp;BSY&nbsp;&nbsp;&nbsp;WR&nbsp;&nbsp;&nbsp;EN</text>

        <!-- PORT 2 LED Bar (PCB style) -->
        <rect x="230" y="28" width="200" height="68" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="330" y="42" text-anchor="middle" font-size="8" fill="var(--text3)" font-weight="600">PORT 2 / PORT A (0x92)</text>
        <g id="ledP2traces" transform="translate(242,48)">
          ${Array.from({length:8},(_,i)=>{let x=(7-i)*22; return `<line x1="${x+8}" y1="24" x2="${x+8}" y2="30" stroke="var(--brd)" stroke-width="0.8"/><rect x="${x+5}" y="30" width="6" height="2" rx="0.5" fill="var(--brd)" opacity="0.5"/>`;}).join('')}
        </g>
        <g id="ledP2svg" transform="translate(242,48)"></g>
        <text x="235" y="85" font-size="7" fill="var(--text3)">D7&nbsp;&nbsp;&nbsp;D6&nbsp;&nbsp;&nbsp;D5&nbsp;&nbsp;&nbsp;D4&nbsp;&nbsp;&nbsp;D3&nbsp;&nbsp;&nbsp;D2&nbsp;&nbsp;&nbsp;D1&nbsp;&nbsp;&nbsp;D0</text>

        <!-- DC Motor + Disk Encoder (improved) -->
        <rect x="10" y="104" width="160" height="140" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="90" y="118" text-anchor="middle" font-size="8" fill="var(--text3)" font-weight="600">DC MOTOR</text>
        <!-- Motor housing -->
        <rect x="58" y="124" width="64" height="24" rx="4" fill="var(--bg)" stroke="var(--brd2)" stroke-width="1.5"/>
        <text x="90" y="139" text-anchor="middle" font-size="7" fill="var(--text3)">MOTOR</text>
        <!-- Shaft -->
        <line x1="90" y1="148" x2="90" y2="155" stroke="var(--text3)" stroke-width="3" stroke-linecap="round"/>
        <!-- Encoder disk -->
        <circle cx="90" cy="185" r="38" fill="var(--bg)" stroke="var(--brd2)" stroke-width="1.5"/>
        <!-- Encoder slots (8 segments) -->
        <g id="encWheel" transform-origin="90 185">
          ${Array.from({length:16},(_,i)=>{
            let angle=i*22.5; let r1=28,r2=36;
            let rad=angle*Math.PI/180;
            let x1=90+r1*Math.sin(rad), y1=185-r1*Math.cos(rad);
            let x2=90+r2*Math.sin(rad), y2=185-r2*Math.cos(rad);
            return i%2===0 ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--brd2)" stroke-width="1.5"/>` : '';
          }).join('')}
        </g>
        <!-- Rotating arm -->
        <line id="mArm" x1="90" y1="185" x2="90" y2="150" stroke="var(--acc)" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="90" cy="185" r="4" fill="var(--text3)"/>
        <!-- Encoder sensor -->
        <rect x="124" y="179" width="12" height="12" rx="2" fill="var(--bg)" stroke="var(--cyn)" stroke-width="1"/>
        <text x="130" y="188" text-anchor="middle" font-size="5" fill="var(--cyn)">ENC</text>
        <!-- Speed gauge arc -->
        <path id="speedArc" d="M 55 230 A 35 35 0 0 1 125 230" fill="none" stroke="var(--brd)" stroke-width="3" stroke-linecap="round"/>
        <path id="speedArcFill" d="M 55 230 A 35 35 0 0 1 55 230" fill="none" stroke="var(--grn)" stroke-width="3" stroke-linecap="round"/>
        <text id="mRpm" x="90" y="240" text-anchor="middle" font-size="9" fill="var(--acc)" font-weight="600">0 RPM</text>
        <text x="90" y="249" text-anchor="middle" font-size="8" fill="var(--text3)">DAC: <tspan id="mDac">00</tspan>H · DSC: <tspan id="mDsc">0</tspan></text>

        <!-- DAC/ADC Block -->
        <rect x="190" y="104" width="110" height="60" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="245" y="118" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">DAC / ADC</text>
        <text x="245" y="132" text-anchor="middle" font-size="8" fill="var(--cyn)">DAC → Motor</text>
        <text x="245" y="146" text-anchor="middle" font-size="8" fill="var(--blu)">ADC ← Pot</text>
        <text x="245" y="160" text-anchor="middle" font-size="9" fill="var(--text3)">BSY:<tspan id="adcBsy" fill="var(--grn)">RDY</tspan> RD:<tspan id="adcRd">1</tspan></text>

        <!-- Potentiometer -->
        <rect x="320" y="104" width="110" height="60" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="375" y="118" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">POTENTIOMETER</text>
        <rect x="335" y="126" width="80" height="8" rx="3" fill="var(--bg)" stroke="var(--brd)" stroke-width="1"/>
        <rect id="potFill" x="335" y="126" width="40" height="8" rx="3" fill="var(--blu)" opacity="0.6"/>
        <circle id="potKnob" cx="375" cy="130" r="6" fill="var(--blu)" stroke="var(--bg)" stroke-width="1.5"/>
        <text id="potTxt" x="375" y="156" text-anchor="middle" font-size="10" fill="var(--blu)" font-weight="600">80H</text>

        <!-- Piezo Sounder (improved) -->
        <rect x="10" y="258" width="130" height="60" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="75" y="272" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">PIEZO SOUNDER</text>
        <!-- Piezo component (realistic) -->
        <circle cx="40" cy="294" r="12" fill="var(--bg)" stroke="var(--brd)" stroke-width="1.5"/>
        <circle id="pzCirc" cx="40" cy="294" r="8" fill="var(--bg)" stroke="var(--brd)" stroke-width="1"/>
        <circle cx="40" cy="294" r="3" fill="var(--brd)" id="pzInner"/>
        <!-- Sound waves when active -->
        <g id="pzWaves" opacity="0">
          <path d="M 56 288 Q 62 294 56 300" fill="none" stroke="var(--amb)" stroke-width="1.5" opacity="0.6"/>
          <path d="M 62 284 Q 70 294 62 304" fill="none" stroke="var(--amb)" stroke-width="1.2" opacity="0.4"/>
          <path d="M 68 280 Q 78 294 68 308" fill="none" stroke="var(--amb)" stroke-width="1" opacity="0.2"/>
        </g>
        <text x="75" y="290" font-size="8" fill="var(--text3)">PZO (PB5)</text>
        <text id="pzSt" x="75" y="302" font-size="9" fill="var(--text3)" font-weight="600">OFF</text>
        <text id="pzFreq" x="75" y="314" font-size="8" fill="var(--amb)"></text>

        <!-- Ultrasonic TX/RX -->
        <rect x="155" y="258" width="135" height="60" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="222" y="272" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">ULTRASONIC</text>
        <circle id="utxCirc" cx="185" cy="294" r="10" fill="var(--bg)" stroke="var(--brd)" stroke-width="1.5"/>
        <text x="185" y="297" text-anchor="middle" font-size="7" fill="var(--text3)">TX</text>
        <!-- Wave animation -->
        <g id="ultraWaves" opacity="0">
          <line x1="198" y1="290" x2="208" y2="286" stroke="var(--pur)" stroke-width="1" opacity="0.6"/>
          <line x1="198" y1="294" x2="210" y2="294" stroke="var(--pur)" stroke-width="1" opacity="0.8"/>
          <line x1="198" y1="298" x2="208" y2="302" stroke="var(--pur)" stroke-width="1" opacity="0.6"/>
        </g>
        <circle id="urxCirc" cx="248" cy="294" r="10" fill="var(--bg)" stroke="var(--brd)" stroke-width="1.5"/>
        <text x="248" y="297" text-anchor="middle" font-size="7" fill="var(--text3)">RX</text>

        <!-- Optical Link -->
        <rect x="305" y="258" width="125" height="60" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="367" y="272" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">OPTICAL LINK</text>
        <circle id="optSnd" cx="335" cy="294" r="7" fill="var(--bg)" stroke="var(--grn)" stroke-width="1.5"/>
        <text x="335" y="308" text-anchor="middle" font-size="8" fill="var(--text3)">TX</text>
        <line x1="345" y1="294" x2="390" y2="294" stroke="var(--brd)" stroke-width="1" stroke-dasharray="3,3"/>
        <circle id="optRcv" cx="400" cy="294" r="7" fill="var(--bg)" stroke="var(--grn)" stroke-width="1.5"/>
        <text x="400" y="308" text-anchor="middle" font-size="8" fill="var(--text3)">RX</text>
        <text id="optLvlTxt" x="367" y="286" text-anchor="middle" font-size="9" fill="var(--grn)">FF</text>

        <!-- Interactive controls -->
        <rect x="10" y="326" width="420" height="44" rx="4" fill="var(--bg)" stroke="var(--brd)" stroke-width="1"/>
        <text x="20" y="341" font-size="9" fill="var(--text3)" font-weight="600">CONTROLS:</text>
        <rect id="btnObj" x="90" y="330" width="80" height="18" rx="3" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1" cursor="pointer" onclick="toggleObject()"/>
        <text x="130" y="342" text-anchor="middle" font-size="9" fill="var(--text2)" pointer-events="none" id="btnObjTxt">Object: OFF</text>
        <rect id="btnOpt" x="180" y="330" width="80" height="18" rx="3" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1" cursor="pointer" onclick="toggleOptical()"/>
        <text x="220" y="342" text-anchor="middle" font-size="9" fill="var(--text2)" pointer-events="none" id="btnOptTxt">Blocked: NO</text>
        <text x="20" y="363" font-size="9" fill="var(--text3)">Pot:</text>
        <rect x="42" y="354" width="140" height="8" rx="3" fill="var(--bg3)" stroke="var(--brd)" stroke-width="0.5"/>
        <foreignObject x="40" y="351" width="145" height="16"><input xmlns="http://www.w3.org/1999/xhtml" type="range" id="potSlider" min="0" max="255" value="128" oninput="potChanged()" style="width:140px;height:12px;accent-color:#61afef;margin:0;padding:0"/></foreignObject>
        <text id="potCtlTxt" x="195" y="363" font-size="8" fill="var(--blu)" font-weight="600">128</text>

        <!-- PAT 7-Segment Display (real SVG segments) -->
        <rect x="10" y="378" width="420" height="68" rx="4" fill="#080a0e" stroke="var(--brd)" stroke-width="1.5"/>
        <text x="220" y="392" text-anchor="middle" font-size="9" fill="var(--text3)" letter-spacing="0.1em">PAT KEYPAD/DISPLAY</text>
        <g id="seg7Group" transform="translate(90, 396)"></g>

        <!-- Timer Status -->
        <rect x="10" y="454" width="210" height="42" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="115" y="468" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">TIMER 1</text>
        <text id="tmrInfo" x="115" y="482" text-anchor="middle" font-size="8" fill="var(--text2)">OFF · Val: 00 · IRQ: —</text>
        <text id="tmrClk" x="115" y="492" text-anchor="middle" font-size="9" fill="var(--text3)">Clock: — · IRQEN: 00</text>

        <!-- Interrupt Status -->
        <rect x="230" y="454" width="200" height="42" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="330" y="468" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">INTERRUPTS</text>
        <text id="irqInfo" x="330" y="482" text-anchor="middle" font-size="8" fill="var(--text2)">IF=0 · Pending: —</text>
        <text id="irqVec" x="330" y="492" text-anchor="middle" font-size="9" fill="var(--text3)">IR0:— IR1:— IR2:—</text>

        <!-- Port Register State -->
        <rect x="10" y="504" width="420" height="52" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="220" y="518" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">PORT REGISTER STATE</text>
        <text id="portState" x="20" y="532" font-size="9" fill="var(--text2)">P1CTL:00 MODE:00 CREG1:00 IRQEN:00</text>
        <text id="portData" x="20" y="546" font-size="9" fill="var(--text2)">PORT1:00 PORT2:00 TIMER:00 STATUS:00</text>
      </svg>`;
}

function initAppModule() {
  let container = document.getElementById('appModuleContainer');
  if (container) container.innerHTML = buildAppModuleSVG();
}
