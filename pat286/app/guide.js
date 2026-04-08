// === GUIDE MODAL ===
const GUIDE_HTML = {
overview: `<h3>Overview</h3>
<p>PAT-286 Virtual Lab is a pedagogical 8086/286 real-mode simulator with an Applications Module peripheral panel, designed for microprocessor education.</p>
<table><tr><th>Parameter</th><th>Value</th></tr>
<tr><td>CPU</td><td>Intel 8086/286 (real mode subset)</td></tr>
<tr><td>Memory</td><td>1 MB (20-bit addressing, segment:offset)</td></tr>
<tr><td>User segment</td><td>DS=SS=CS=0080H</td></tr>
<tr><td>Stack</td><td>SP=FFF0H (descending)</td></tr>
<tr><td>I/O</td><td>Memory-mapped ports via Intel 8256 MUART</td></tr></table>
<h4>Keyboard shortcuts</h4>
<table><tr><th>Key</th><th>Action</th></tr>
<tr><td><code>Ctrl+Enter</code></td><td>Assemble</td></tr>
<tr><td><code>F1</code></td><td>Open/close this guide</td></tr>
<tr><td><code>Esc</code></td><td>Close modals</td></tr></table>
<h4>Debugging</h4>
<p>Click line numbers to toggle <strong>breakpoints</strong>. Use <strong>Back/Step/Forward</strong> to navigate execution history. The <strong>Run</strong> button pauses at breakpoints.</p>
<p class="guide-note">All PA01–PA29 practical assignment examples are available in the Program dropdown.</p>`,

registers: `<h3>Registers</h3>
<h4>General purpose (16-bit, split into 8-bit halves)</h4>
<table><tr><th>16-bit</th><th>High</th><th>Low</th><th>Common use</th></tr>
<tr><td><code>AX</code></td><td><code>AH</code></td><td><code>AL</code></td><td>Accumulator, I/O, INT function</td></tr>
<tr><td><code>BX</code></td><td><code>BH</code></td><td><code>BL</code></td><td>Base pointer, addressing</td></tr>
<tr><td><code>CX</code></td><td><code>CH</code></td><td><code>CL</code></td><td>Counter (LOOP, shifts)</td></tr>
<tr><td><code>DX</code></td><td><code>DH</code></td><td><code>DL</code></td><td>Data, MUL/DIV high word, I/O port</td></tr></table>
<h4>Index and pointer</h4>
<table><tr><th>Reg</th><th>Use</th></tr>
<tr><td><code>SI</code></td><td>Source index</td></tr>
<tr><td><code>DI</code></td><td>Destination index</td></tr>
<tr><td><code>SP</code></td><td>Stack pointer</td></tr>
<tr><td><code>BP</code></td><td>Base pointer (stack frames)</td></tr></table>
<h4>Segment registers</h4>
<table><tr><th>Reg</th><th>Default</th><th>Use</th></tr>
<tr><td><code>CS</code></td><td>0080H</td><td>Code segment</td></tr>
<tr><td><code>DS</code></td><td>0080H</td><td>Data segment</td></tr>
<tr><td><code>SS</code></td><td>0080H</td><td>Stack segment</td></tr>
<tr><td><code>ES</code></td><td>0000H</td><td>Extra segment</td></tr></table>
<p class="guide-note">Physical address = segment × 16 + offset. Example: DS:1000H → 0080×16 + 1000 = 01800H</p>
<h4>FLAGS</h4>
<table><tr><th>Bit</th><th>Flag</th><th>Set when</th></tr>
<tr><td>0</td><td><code>CF</code></td><td>Carry/borrow from MSB</td></tr>
<tr><td>2</td><td><code>PF</code></td><td>Result has even parity (low byte)</td></tr>
<tr><td>4</td><td><code>AF</code></td><td>Carry from bit 3 (BCD)</td></tr>
<tr><td>6</td><td><code>ZF</code></td><td>Result is zero</td></tr>
<tr><td>7</td><td><code>SF</code></td><td>Result is negative (MSB=1)</td></tr>
<tr><td>9</td><td><code>IF</code></td><td>Interrupts enabled</td></tr>
<tr><td>10</td><td><code>DF</code></td><td>String ops direction (1=decrement)</td></tr>
<tr><td>11</td><td><code>OF</code></td><td>Signed overflow</td></tr></table>`,

instructions: `<h3>Instruction Set</h3>
<h4>Data movement</h4>
<table><tr><th>Instruction</th><th>Action</th></tr>
<tr><td><code>MOV dst,src</code></td><td>dst ← src</td></tr>
<tr><td><code>PUSH src</code></td><td>SP-=2; [SS:SP]←src</td></tr>
<tr><td><code>POP dst</code></td><td>dst←[SS:SP]; SP+=2</td></tr>
<tr><td><code>PUSHA/POPA</code></td><td>Push/pop all GPRs</td></tr>
<tr><td><code>XCHG a,b</code></td><td>Swap a and b</td></tr>
<tr><td><code>LEA reg,[mem]</code></td><td>Load effective address</td></tr>
<tr><td><code>IN AL/AX,port</code></td><td>Read from I/O port</td></tr>
<tr><td><code>OUT port,AL/AX</code></td><td>Write to I/O port</td></tr>
<tr><td><code>CBW</code></td><td>Sign-extend AL → AX</td></tr>
<tr><td><code>CWD</code></td><td>Sign-extend AX → DX:AX</td></tr></table>
<h4>Arithmetic</h4>
<table><tr><th>Instruction</th><th>Flags</th></tr>
<tr><td><code>ADD/SUB/ADC/SBB</code></td><td>CF ZF SF OF PF AF</td></tr>
<tr><td><code>INC/DEC</code></td><td>ZF SF OF PF AF (not CF)</td></tr>
<tr><td><code>MUL src</code></td><td>AX=AL×src (byte) or DX:AX=AX×src (word)</td></tr>
<tr><td><code>IMUL src</code></td><td>Signed multiply</td></tr>
<tr><td><code>DIV src</code></td><td>AL=AX/src, AH=rem (byte) or AX=DX:AX/src</td></tr>
<tr><td><code>IDIV src</code></td><td>Signed divide</td></tr>
<tr><td><code>NEG dst</code></td><td>dst = -dst (two's complement)</td></tr>
<tr><td><code>CMP a,b</code></td><td>Flags from a-b (result discarded)</td></tr></table>
<h4>Logic and shifts</h4>
<table><tr><th>Instruction</th><th>Notes</th></tr>
<tr><td><code>AND/OR/XOR/NOT</code></td><td>CF=OF=0 after logic ops</td></tr>
<tr><td><code>TEST a,b</code></td><td>Flags from a AND b (no store)</td></tr>
<tr><td><code>SHL/SHR/SAR</code></td><td>Shift left/right/arithmetic right</td></tr>
<tr><td><code>ROL/ROR/RCL/RCR</code></td><td>Rotate (through carry)</td></tr></table>
<h4>String operations</h4>
<table><tr><th>Instruction</th><th>Action</th></tr>
<tr><td><code>MOVSB/MOVSW</code></td><td>Move [DS:SI] → [ES:DI], adjust SI/DI</td></tr>
<tr><td><code>STOSB/STOSW</code></td><td>Store AL/AX → [ES:DI], adjust DI</td></tr>
<tr><td><code>LODSB/LODSW</code></td><td>Load [DS:SI] → AL/AX, adjust SI</td></tr>
<tr><td><code>CMPSB/CMPSW</code></td><td>Compare [DS:SI] with [ES:DI], set flags</td></tr>
<tr><td><code>SCASB/SCASW</code></td><td>Compare AL/AX with [ES:DI], set flags</td></tr>
<tr><td><code>REP</code></td><td>Repeat CX times (MOVS/STOS/LODS)</td></tr>
<tr><td><code>REPE/REPZ</code></td><td>Repeat while equal (CMPS/SCAS)</td></tr>
<tr><td><code>REPNE/REPNZ</code></td><td>Repeat while not equal (CMPS/SCAS)</td></tr></table>
<h4>Control flow</h4>
<table><tr><th>Instruction</th><th>Condition</th></tr>
<tr><td><code>JMP label</code></td><td>Always</td></tr>
<tr><td><code>JZ/JE · JNZ/JNE</code></td><td>ZF=1 / ZF=0</td></tr>
<tr><td><code>JC/JB · JNC/JAE</code></td><td>CF=1 / CF=0</td></tr>
<tr><td><code>JL · JGE</code></td><td>SF≠OF (signed &lt;) / SF=OF</td></tr>
<tr><td><code>JLE · JG</code></td><td>ZF=1 or SF≠OF / ZF=0 and SF=OF</td></tr>
<tr><td><code>CALL/RET</code></td><td>Subroutine call/return</td></tr>
<tr><td><code>LOOP label</code></td><td>CX--; jump if CX≠0</td></tr>
<tr><td><code>INT n</code></td><td>Software interrupt</td></tr>
<tr><td><code>IRET</code></td><td>Return from interrupt</td></tr>
<tr><td><code>HLT</code></td><td>Halt until interrupt</td></tr></table>`,

io_ports: `<h3>I/O Ports (Applications Module)</h3>
<h4>MUART 8256 registers</h4>
<table><tr><th>Port</th><th>Address</th><th>Function</th></tr>
<tr><td><code>UCRREG1</code></td><td>80H</td><td>Command register 1 (clock select)</td></tr>
<tr><td><code>UMODEREG</code></td><td>86H</td><td>Port 2 direction (03H=output, 00H=input)</td></tr>
<tr><td><code>UPORT1CTL</code></td><td>88H</td><td>Port 1 bit-level direction (1=output)</td></tr>
<tr><td><code>UIRQEN</code></td><td>8AH</td><td>IRQ enable (bit 0=Timer 1)</td></tr>
<tr><td><code>UIRQADR</code></td><td>8CH</td><td>IRQ address (read clears IRQ flag)</td></tr>
<tr><td><code>UPORT1</code></td><td>90H</td><td>Port 1 data</td></tr>
<tr><td><code>UPORT2</code></td><td>92H</td><td>Port 2 data (DAC/ADC)</td></tr>
<tr><td><code>UTIMER1</code></td><td>94H</td><td>Timer 1 value</td></tr></table>
<h4>Port 1 bit assignments</h4>
<table><tr><th>Bit</th><th>Signal</th><th>Direction</th><th>Function</th></tr>
<tr><td>PB0</td><td>EN</td><td>Output</td><td>DAC enable (active low)</td></tr>
<tr><td>PB1</td><td>WR</td><td>Output</td><td>ADC start conversion</td></tr>
<tr><td>PB2</td><td>BSY</td><td>Input</td><td>ADC busy (0=converting)</td></tr>
<tr><td>PB3</td><td>RD</td><td>Output</td><td>ADC read enable (active low)</td></tr>
<tr><td>PB4</td><td>DSC</td><td>Input</td><td>Disk encoder pulse</td></tr>
<tr><td>PB5</td><td>PZO</td><td>Output</td><td>Piezo sounder</td></tr>
<tr><td>PB6</td><td>UTX</td><td>Output</td><td>Ultrasonic transmitter on/off</td></tr>
<tr><td>PB7</td><td>URX</td><td>Input</td><td>Ultrasonic receiver</td></tr></table>
<h4>PAT Monitor calls (INT 28H)</h4>
<table><tr><th>AH</th><th>Name</th><th>Action</th></tr>
<tr><td>4</td><td><code>EXIT</code></td><td>Return to monitor</td></tr>
<tr><td>10</td><td><code>RDCHAR</code></td><td>Read one character</td></tr>
<tr><td>12</td><td><code>WRCHAR</code></td><td>Write character (AL)</td></tr>
<tr><td>13</td><td><code>WRBYTE</code></td><td>Write byte as hex (AL)</td></tr>
<tr><td>14</td><td><code>GETIN</code></td><td>Get key (0xFF if none)</td></tr>
<tr><td>15</td><td><code>WT1MS</code></td><td>Wait 1 ms</td></tr>
<tr><td>16</td><td><code>WTNMS</code></td><td>Wait BX ms</td></tr>
<tr><td>18</td><td><code>CLRSCR</code></td><td>Clear display</td></tr></table>
<p class="guide-note"><code>INCLUDE PATCALLS.INC</code> defines all port addresses and function numbers as EQU constants.</p>`
};

let guideTab = 'overview';
function openGuide() { document.getElementById('guideOv').hidden = false; renderGuide(); }
function closeGuide() { document.getElementById('guideOv').hidden = true; }
function setGuideTab(t) { guideTab = t; renderGuide(); }
function renderGuide() {
  let tabs = ['overview','registers','instructions','io_ports'];
  let labels = ['Overview','Registers','Instructions','I/O Ports'];
  let html = '<div class="guide-tabs">';
  for (let i = 0; i < tabs.length; i++) {
    html += `<button class="guide-tab${guideTab===tabs[i]?' on':''}" onclick="setGuideTab('${tabs[i]}')">${labels[i]}</button>`;
  }
  html += '</div>';
  html += GUIDE_HTML[guideTab] || '';
  document.getElementById('guideBody').innerHTML = html;
}
