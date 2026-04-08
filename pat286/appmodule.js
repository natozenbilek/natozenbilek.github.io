// Applications Module SVG — injected into the right panel
function buildAppModuleSVG() {
  return `<svg id="appSvg" viewBox="0 0 440 540" style="width:100%;height:auto;display:block;font-family:var(--mono)">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <!-- Background -->
        <rect x="0" y="0" width="440" height="540" rx="6" fill="var(--bg2)" stroke="var(--brd)" stroke-width="1.5"/>
        <text x="220" y="18" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text2)" letter-spacing="0.1em">APPLICATIONS MODULE</text>

        <!-- PORT 1 LED Bar -->
        <rect x="10" y="28" width="200" height="58" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="110" y="42" text-anchor="middle" font-size="8" fill="var(--text3)" font-weight="600">PORT 1 (0x90)</text>
        <g id="ledP1svg" transform="translate(22,48)"></g>
        <text x="15" y="82" font-size="9" fill="var(--text3)">PB7  PB6  PB5  PB4  PB3  PB2  PB1  PB0</text>

        <!-- PORT 2 LED Bar -->
        <rect x="230" y="28" width="200" height="58" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="330" y="42" text-anchor="middle" font-size="8" fill="var(--text3)" font-weight="600">PORT 2 / PORT A (0x92)</text>
        <g id="ledP2svg" transform="translate(242,48)"></g>
        <text x="235" y="82" font-size="9" fill="var(--text3)">D7   D6   D5   D4   D3   D2   D1   D0</text>

        <!-- Bit labels for Port 1 -->
        <text x="15" y="92" font-size="8" fill="var(--text3)">URX  UTX  PZO  DSC   RD  BSY   WR   EN</text>

        <!-- DC Motor + Disk Encoder -->
        <rect x="10" y="100" width="160" height="130" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="90" y="114" text-anchor="middle" font-size="8" fill="var(--text3)" font-weight="600">DC MOTOR</text>
        <!-- Motor disk -->
        <circle cx="90" cy="170" r="38" fill="var(--bg)" stroke="var(--brd2)" stroke-width="2"/>
        <circle cx="90" cy="170" r="30" fill="none" stroke="var(--brd)" stroke-width="1" stroke-dasharray="4,4"/>
        <line id="mArm" x1="90" y1="170" x2="90" y2="135" stroke="var(--acc)" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="90" cy="170" r="4" fill="var(--text3)"/>
        <!-- Encoder slots -->
        <circle cx="90" cy="170" r="34" fill="none" stroke="var(--brd)" stroke-width="1" stroke-dasharray="2,8" id="encSlots"/>
        <text id="mRpm" x="90" y="218" text-anchor="middle" font-size="9" fill="var(--acc)" font-weight="600">0 RPM</text>
        <text x="90" y="227" text-anchor="middle" font-size="9" fill="var(--text3)">DAC: <tspan id="mDac">00</tspan>H \u00B7 DSC: <tspan id="mDsc">0</tspan></text>

        <!-- DAC/ADC Block -->
        <rect x="190" y="100" width="110" height="60" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="245" y="114" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">DAC / ADC</text>
        <text x="245" y="128" text-anchor="middle" font-size="8" fill="var(--cyn)">DAC \u2192 Motor</text>
        <text x="245" y="142" text-anchor="middle" font-size="8" fill="var(--blu)">ADC \u2190 Pot</text>
        <text x="245" y="156" text-anchor="middle" font-size="9" fill="var(--text3)">BSY:<tspan id="adcBsy" fill="var(--grn)">RDY</tspan> RD:<tspan id="adcRd">1</tspan></text>

        <!-- Potentiometer -->
        <rect x="320" y="100" width="110" height="60" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="375" y="114" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">POTENTIOMETER</text>
        <rect x="335" y="122" width="80" height="8" rx="3" fill="var(--bg)" stroke="var(--brd)" stroke-width="1"/>
        <rect id="potFill" x="335" y="122" width="40" height="8" rx="3" fill="var(--blu)" opacity="0.6"/>
        <circle id="potKnob" cx="375" cy="126" r="6" fill="var(--blu)" stroke="var(--bg)" stroke-width="1.5"/>
        <text id="potTxt" x="375" y="152" text-anchor="middle" font-size="10" fill="var(--blu)" font-weight="600">80H</text>

        <!-- Piezo Sounder -->
        <rect x="10" y="240" width="130" height="50" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="75" y="254" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">PIEZO SOUNDER</text>
        <circle id="pzCirc" cx="40" cy="272" r="10" fill="var(--bg)" stroke="var(--brd)" stroke-width="1.5"/>
        <text x="60" y="276" font-size="8" fill="var(--text3)">PZO (PB5)</text>
        <text id="pzSt" x="115" y="276" font-size="8" fill="var(--text3)" font-weight="600">OFF</text>

        <!-- Ultrasonic TX/RX -->
        <rect x="155" y="240" width="135" height="50" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="222" y="254" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">ULTRASONIC</text>
        <circle id="utxCirc" cx="180" cy="272" r="8" fill="var(--bg)" stroke="var(--brd)" stroke-width="1"/>
        <text x="192" y="275" font-size="9" fill="var(--text3)">TX</text>
        <circle id="urxCirc" cx="240" cy="272" r="8" fill="var(--bg)" stroke="var(--brd)" stroke-width="1"/>
        <text x="252" y="275" font-size="9" fill="var(--text3)">RX</text>

        <!-- Optical Link -->
        <rect x="305" y="240" width="125" height="50" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="367" y="254" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">OPTICAL LINK</text>
        <circle id="optSnd" cx="335" cy="272" r="7" fill="var(--bg)" stroke="var(--grn)" stroke-width="1.5"/>
        <text x="335" y="286" text-anchor="middle" font-size="8" fill="var(--text3)">TX</text>
        <line x1="345" y1="272" x2="390" y2="272" stroke="var(--brd)" stroke-width="1" stroke-dasharray="3,3"/>
        <circle id="optRcv" cx="400" cy="272" r="7" fill="var(--bg)" stroke="var(--grn)" stroke-width="1.5"/>
        <text x="400" y="286" text-anchor="middle" font-size="8" fill="var(--text3)">RX</text>
        <text id="optLvlTxt" x="367" y="262" text-anchor="middle" font-size="9" fill="var(--grn)">FF</text>

        <!-- Interactive controls -->
        <rect x="10" y="300" width="420" height="44" rx="4" fill="var(--bg)" stroke="var(--brd)" stroke-width="1"/>
        <text x="20" y="315" font-size="9" fill="var(--text3)" font-weight="600">CONTROLS:</text>
        <rect id="btnObj" x="90" y="304" width="80" height="18" rx="3" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1" cursor="pointer" onclick="toggleObject()"/>
        <text x="130" y="316" text-anchor="middle" font-size="9" fill="var(--text2)" pointer-events="none" id="btnObjTxt">Object: OFF</text>
        <rect id="btnOpt" x="180" y="304" width="80" height="18" rx="3" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1" cursor="pointer" onclick="toggleOptical()"/>
        <text x="220" y="316" text-anchor="middle" font-size="9" fill="var(--text2)" pointer-events="none" id="btnOptTxt">Blocked: NO</text>
        <text x="20" y="337" font-size="9" fill="var(--text3)">Pot:</text>
        <rect x="42" y="328" width="140" height="8" rx="3" fill="var(--bg3)" stroke="var(--brd)" stroke-width="0.5"/>
        <foreignObject x="40" y="325" width="145" height="16"><input xmlns="http://www.w3.org/1999/xhtml" type="range" id="potSlider" min="0" max="255" value="128" oninput="potChanged()" style="width:140px;height:12px;accent-color:#61afef;margin:0;padding:0"/></foreignObject>
        <text id="potCtlTxt" x="195" y="337" font-size="8" fill="var(--blu)" font-weight="600">128</text>

        <!-- PAT 7-Segment Display -->
        <rect x="10" y="352" width="420" height="52" rx="4" fill="#0a0c10" stroke="var(--brd)" stroke-width="1.5"/>
        <text x="220" y="366" text-anchor="middle" font-size="9" fill="var(--text3)" letter-spacing="0.1em">PAT KEYPAD/DISPLAY</text>
        <text id="seg7" x="220" y="393" text-anchor="middle" font-size="24" font-weight="700" fill="var(--grn)" letter-spacing="4px" filter="url(#glow)">\u00A0</text>

        <!-- Timer Status -->
        <rect x="10" y="412" width="210" height="42" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="115" y="426" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">TIMER 1</text>
        <text id="tmrInfo" x="115" y="440" text-anchor="middle" font-size="8" fill="var(--text2)">OFF \u00B7 Val: 00 \u00B7 IRQ: \u2014</text>
        <text id="tmrClk" x="115" y="450" text-anchor="middle" font-size="9" fill="var(--text3)">Clock: \u2014 \u00B7 IRQEN: 00</text>

        <!-- Interrupt Status -->
        <rect x="230" y="412" width="200" height="42" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="330" y="426" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">INTERRUPTS</text>
        <text id="irqInfo" x="330" y="440" text-anchor="middle" font-size="8" fill="var(--text2)">IF=0 \u00B7 Pending: \u2014</text>
        <text id="irqVec" x="330" y="450" text-anchor="middle" font-size="9" fill="var(--text3)">IR0:\u2014 IR1:\u2014 IR2:\u2014</text>

        <!-- Port Signal Names -->
        <rect x="10" y="462" width="420" height="52" rx="4" fill="var(--bg3)" stroke="var(--brd)" stroke-width="1"/>
        <text x="220" y="476" text-anchor="middle" font-size="9" fill="var(--text3)" font-weight="600">PORT REGISTER STATE</text>
        <text id="portState" x="20" y="490" font-size="9" fill="var(--text2)">P1CTL:00 MODE:00 CREG1:00 IRQEN:00</text>
        <text id="portData" x="20" y="504" font-size="9" fill="var(--text2)">PORT1:00 PORT2:00 TIMER:00 STATUS:00</text>
      </svg>`;
}

function initAppModule() {
  let container = document.getElementById('appModuleContainer');
  if (container) container.innerHTML = buildAppModuleSVG();
}
