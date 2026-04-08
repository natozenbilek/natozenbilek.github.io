const EX = {
'PA01: Subtract byte': `; PA01 — Subtract DS:1000H from 80H, store at DS:2000H
        ORG     0300H
        MOV     AL,80H
        SUB     AL,BYTE PTR DS:1000H
        MOV     BYTE PTR DS:2000H,AL
        MOV     BX,0000H
        MOV     AH,04H
        INT     028H`,

'PA02: Add bytes': `; PA02 — Add 4DH + 67H, store at DS:1000H
        ORG     0100H
        MOV     AL,4DH
        ADD     AL,67H
        MOV     BYTE PTR DS:1000H,AL
        MOV     BX,0000H
        MOV     AH,04H
        INT     028H`,

'PA03: Copy registers': `; PA03 — Copy AX,BX,CX,DX to memory
        ORG     0100H
        MOV     SI,3000H
        MOV     [SI],AX
        MOV     [SI+2],BX
        MOV     [SI+4],CX
        MOV     [SI+6],DX
        MOV     BX,0000H
        MOV     AH,04H
        INT     28H`,

'PA04: Add 4 bytes': `; PA04 — Add bytes at 4000H..4003H, store at 4004H
        ORG     0200H
        MOV     SI,4000H
        MOV     AL,[SI]
        ADD     AL,[SI+1]
        ADD     AL,[SI+2]
        ADD     AL,[SI+3]
        MOV     [SI+4],AL
        MOV     BX,0000H
        MOV     AH,04H
        INT     28H`,

'PA05: MUL and DIV': `; PA05 — (E7H * C3H) / B9H
        ORG     0300H
        MOV     AX,0E7H
        MOV     BX,0C3H
        MOV     CX,0B9H
        MUL     BX
        DIV     CX
        MOV     DS:3000H,AX
        MOV     DS:3002H,DX
        MOV     BX,0000H
        MOV     AH,04H
        INT     028H`,

'PA06: Zero check': `; PA06 — If DS:1200H is zero, store 33H; else 55H
        ORG     0200H
        MOV     AX,DS:1200H
        OR      AX,0000H
        JZ      EQUALZ
NOTZ:   MOV     DS:2100H,55H
        JMP     FINISH
EQUALZ: MOV     DS:2100H,33H
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H`,

'PA07: Fill memory': `; PA07 — Fill 1400H-14FFH with 77H
        ORG     0400H
        MOV     BX,14FFH
NEXT:   MOV     BYTE PTR [BX],77H
        DEC     BL
        JNZ     NEXT
        MOV     BYTE PTR [BX],77H
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H`,

'PA08: Sequential fill': `; PA08 — Fill 1500H-15FFH with 00H-FFH
        ORG     0500H
        MOV     BX,15FFH
        MOV     AL,0FFH
NEXT:   MOV     BYTE PTR [BX],AL
        DEC     AL
        DEC     BL
        JNZ     NEXT
        MOV     BYTE PTR [BX],AL
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H`,

'PA09: Copy string': `; PA09 — Copy null-terminated string from MEM1 to MEM2
        ORG     0200H
MEM1    EQU     0FFFH
MEM2    EQU     1FFFH
        MOV     SI,0000H
NEXT:   INC     SI
        MOV     AL,MEM1[SI]
        MOV     BYTE PTR MEM2[SI],AL
        OR      AL,00H
        JNZ     NEXT
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H`,

'PA10: Compare with 7F': `; PA10 — Compare DS:2300H with 7FH
        ORG     0400H
        MOV     AL,BYTE PTR DS:2300H
        CMP     AL,7FH
        JZ      EQUAL
        JC      LESS
GREAT:  MOV     DS:2400H,0FEH
        JMP     FINISH
LESS:   MOV     DS:2400H,01H
        JMP     FINISH
EQUAL:  MOV     DS:2400H,0AAH
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H`,

'PA11: Find largest': `; PA11 — Find largest of 3 words
        ORG     0500H
        MOV     AX,DS:2500H
        CMP     AX,DS:2600H
        JNC     LESS1
        MOV     AX,DS:2600H
LESS1:  CMP     AX,DS:2700H
        JNC     LESS2
        MOV     AX,DS:2700H
LESS2:  MOV     DS:2800H,AX
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H`,

'PA12: Bit inspection': `; PA12 — Check if any of bits 0-3 at DS:1200H are clear
        ORG     0300H
        MOV     AL,BYTE PTR DS:1200H
        AND     AL,0FH
        XOR     AL,0FH
        TEST    AL,0FH
        JNZ     TRUE
FALSE:  MOV     BYTE PTR DS:1300H,077H
        JMP     FINISH
TRUE:   MOV     BYTE PTR DS:1300H,0F0H
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H`,

'PA13: Rotate until bit clear': `; PA13 — Rotate DS:1400H right until bit 12 clear
        ORG     0400H
        MOV     WORD PTR DS:1400H,0F800H
CHECK:  ROR     WORD PTR DS:1400H,1
        MOV     AX,DS:1400H
        XOR     AX,0FFFFH
        TEST    AX,1000H
        JZ      CHECK
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H`,

'PA14: Add + Port output': `; PA14 — Add bytes at 1000H and 1100H, output to Port 1
        ORG     0300H
        INCLUDE PATCALLS.INC
        MOV     AL,0FFH
        OUT     UPORT1CTL,AL
        MOV     AL,BYTE PTR DS:1000H
        ADD     AL,BYTE PTR DS:1100H
        OUT     UPORT1,AL
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H`,

'PA15: Binary count + LED': `; PA15 — Binary count on D0-D7 LEDs (Port 2)
        ORG     0500H
        INCLUDE PATCALLS.INC
        ; Init MUART — Port 2 output mode
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        MOV     AL,03H
        OUT     UMODEREG,AL
        MOV     AL,00H
OUTPUT: OUT     UPORT2,AL
        MOV     CX,0FFFFH
DELY:   LOOP    DELY
        INC     AL
        JMP     OUTPUT`,

'PA16: Count + motor disc': `; PA16 — Count on Port 2, paused by motor disc
        ORG     0600H
        INCLUDE PATCALLS.INC
        MOV     AL,00H
        OUT     UPORT1CTL,AL
        MOV     AL,03H
        OUT     UMODEREG,AL
        MOV     AL,00H
        OUT     UPORT2,AL
CHECK:  IN      AL,UPORT1
        TEST    AL,10H
        JNZ     CHECK
COUNT:  IN      AL,UPORT2
        INC     AL
        OUT     UPORT2,AL
        MOV     BX,05H
        MOV     CX,0FFFFH
DELY:   LOOP    DELY
        DEC     BX
        JNZ     DELY
        JMP     CHECK`,

'PA17: Ultrasonic proximity': `; PA17 — Ultrasonic proximity detector with piezo
        ORG     0300H
        INCLUDE PATCALLS.INC
        MOV     AL,60H
        OUT     UPORT1CTL,AL
UTSON:  MOV     AL,40H
        OUT     UPORT1,AL
DETECT: IN      AL,UPORT1
        TEST    AL,80H
        JNZ     DETECT
ALARM:  MOV     BL,64H
OUTPUT: MOV     AL,00H
        OUT     UPORT1,AL
        MOV     CX,0FAH
DELY1:  LOOP    DELY1
        MOV     AL,20H
        OUT     UPORT1,AL
        MOV     CX,0FAH
DELY2:  LOOP    DELY2
        DEC     BL
        JNZ     OUTPUT
        JMP     UTSON`,

'PA19: Pot controls motor': `; PA19 — Potentiometer controls motor speed via ADC/DAC
        ORG     0700H
        INCLUDE PATCALLS.INC
AGAIN:  MOV     AL,00H
        OUT     UMODEREG,AL
        MOV     AL,0AH
        OUT     UPORT1CTL,AL
        MOV     AL,02H
        OUT     UPORT1,AL
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     AL,02H
        OUT     UPORT1,AL
CMPLTE: IN      AL,UPORT1
        TEST    AL,04H
        JZ      CMPLTE
        MOV     AL,0F7H
        OUT     UPORT1,AL
        IN      AL,UPORT2
        MOV     BL,AL
        MOV     AL,08H
        OUT     UPORT1,AL
        MOV     AL,01H
        OUT     UPORT1CTL,AL
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     AL,03H
        OUT     UMODEREG,AL
        MOV     AL,BL
        OUT     UPORT2,AL
        MOV     CX,0700H
DELY:   LOOP    DELY
        JMP     AGAIN`,

'PA20: PUSHA/POPA': `; PA20 — Add AX+BX+CX+DX, save at 1000H, restore regs
        ORG     0200H
        INCLUDE PATCALLS.INC
        PUSHF
        PUSHA
        ADD     AX,BX
        ADD     AX,CX
        ADD     AX,DX
        MOV     DS:1000H,AX
        POPA
        POPF
        RET`,

'PA21: Hex counter display': `; PA21 — Hex count on PAT display
        ORG     0600H
        INCLUDE PATCALLS.INC
        MOV     AH,CLRSCR
        INT     28H
        MOV     AL,00H
REPEAT: PUSH    AX
        MOV     AH,WRBYTE
        INT     028H
        MOV     BX,1000
        MOV     AH,WTNMS
        INT     028H
        MOV     AH,CLRSCR
        INT     28H
        POP     AX
        INC     AL
        JMP     REPEAT`,

'PA22: Display addition': `; PA22 — Display "XX + YY = ZZ" on PAT display
        ORG     0700H
        INCLUDE PATCALLS.INC
        MOV     AH,CLRSCR
        INT     28H
        MOV     AL,BYTE PTR DS:2000H
        MOV     AH,WRBYTE
        INT     028H
        MOV     AL,' '
        MOV     AH,WRCHAR
        INT     028H
        MOV     AL,'+'
        MOV     AH,WRCHAR
        INT     028H
        MOV     AL,' '
        MOV     AH,WRCHAR
        INT     028H
        MOV     AL,BYTE PTR DS:2100H
        MOV     AH,WRBYTE
        INT     028H
        MOV     AL,' '
        MOV     AH,WRCHAR
        INT     028H
        MOV     AL,'='
        MOV     AH,WRCHAR
        INT     028H
        MOV     AL,' '
        MOV     AH,WRCHAR
        INT     028H
        MOV     AL,BYTE PTR DS:2000H
        ADD     AL,BYTE PTR DS:2100H
        MOV     AH,WRBYTE
        INT     028H
        MOV     AH,EXIT
        INT     028H`,

'PA23: Piezo on S key': `; PA23 — Sound piezo when S key pressed
        ORG     0800H
        INCLUDE PATCALLS.INC
CHECK:  MOV     AH,GETIN
        INT     28H
        CMP     AL,0FFH
        JZ      CHECK
        CMP     AL,053H
        JNZ     CHECK
        MOV     AL,20H
        OUT     UPORT1CTL,AL
ALARM:  MOV     BL,64H
OUTPUT: MOV     AL,00H
        OUT     UPORT1,AL
        MOV     AH,WT1MS
        INT     028H
        MOV     AL,20H
        OUT     UPORT1,AL
        MOV     AH,WT1MS
        INT     028H
        DEC     BL
        JNZ     OUTPUT
        JMP     CHECK`,

'PA25: NMI vector setup': `; PA25 — Set NMI vector to F000:6000H
NMIVCT  EQU     0008H
        ORG     0300H
        MOV     DX,DS
        MOV     AX,0000H
        MOV     DS,AX
        MOV     WORD PTR DS:NMIVCT,6000H
        MOV     WORD PTR DS:NMIVCT+2,0F000H
        MOV     DS,DX
HERE:   JMP     HERE`,

'PA26: IRQ2 counter': `; PA26 — Count on Port 1, increment on IR2
        INCLUDE PATCALLS.INC
I22VCT  EQU     0088H
        ORG     0700H
        CLI
        MOV     DX,DS
        MOV     AX,0000H
        MOV     DS,AX
        MOV     WORD PTR DS:I22VCT,0800H
        MOV     WORD PTR DS:I22VCT+2,0080H
        MOV     DS,DX
        MOV     AL,0FFH
        OUT     UPORT1CTL,AL
        MOV     AL,00H
OUTPUT: CLI
        OUT     UPORT1,AL
        STI
        JMP     OUTPUT`,

'PA27: Display + interrupts': `; PA27 — Display "NO INT", change on IR0/IR1
        INCLUDE PATCALLS.INC
        ORG     2000H
BUFFER: DB      "NO INT",00H
        ORG     0900H
        CLI
        MOV     AH,CLRSCR
        INT     28H
        MOV     SI,BUFFER
NXTCHR: MOV     AL,[SI]
        TEST    AL,0FFH
        JZ      DONE
        MOV     AH,WRCHAR
        INT     28H
        INC     SI
        JMP     NXTCHR
DONE:   STI
HERE:   JMP     HERE`,

'PA28: Timer piezo 1kHz': `; PA28 — Timer-driven piezo at 1kHz
        INCLUDE PATCALLS.INC
INT25V  EQU     0094H
        ORG     0300H
        CLI
        MOV     DX,DS
        MOV     AX,0000H
        MOV     DS,AX
        MOV     WORD PTR DS:INT25V,0400H
        MOV     WORD PTR DS:INT25V+2,0080H
        MOV     DS,DX
        MOV     AL,02H
        OUT     UCRREG1,AL
        MOV     AL,08H
        OUT     UTIMER1,AL
        MOV     AL,01H
        OUT     UIRQEN,AL
        MOV     AL,20H
        OUT     UPORT1CTL,AL
        STI
OUTPUT: MOV     AL,00H
        OUT     UPORT1,AL
        HLT
        MOV     AL,20H
        OUT     UPORT1,AL
        HLT
        JMP     OUTPUT
        ORG     0400H
        IN      AL,UIRQADR
        MOV     AL,08H
        OUT     UTIMER1,AL
        MOV     AL,01H
        OUT     UIRQEN,AL
        MOV     AL,20H
        OUT     40H,AL
        IRET`,

'PA29: Motor speed display': `; PA29 — Timer-driven motor speed display
        INCLUDE PATCALLS.INC
INT25V  EQU     0094H
        ORG     0500H
        CLI
        MOV     DX,DS
        MOV     AX,0000H
        MOV     DS,AX
        MOV     WORD PTR DS:INT25V,0600H
        MOV     WORD PTR DS:INT25V+2,0080H
        MOV     DS,DX
AGAIN:  MOV     AL,00H
        OUT     UMODEREG,AL
        MOV     AL,0AH
        OUT     UPORT1CTL,AL
        MOV     AL,02H
        OUT     UPORT1,AL
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     AL,02H
        OUT     UPORT1,AL
CMPLTE: IN      AL,UPORT1
        TEST    AL,04H
        JZ      CMPLTE
        MOV     AL,0F7H
        OUT     UPORT1,AL
        IN      AL,UPORT2
        MOV     BL,AL
        MOV     AL,08H
        OUT     UPORT1,AL
        MOV     AL,01H
        OUT     UPORT1CTL,AL
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     AL,03H
        OUT     UMODEREG,AL
        MOV     AL,BL
        OUT     UPORT2,AL
        MOV     AL,03H
        OUT     UCRREG1,AL
        MOV     AL,0FAH
        OUT     UTIMER1,AL
        MOV     AL,01H
        OUT     UIRQEN,AL
        STI
        MOV     CL,00H
CHECK:  IN      AL,UPORT1
        TEST    AL,10H
        JZ      CHECK
        INC     CL
WTHIGH: IN      AL,UPORT1
        TEST    AL,10H
        JNZ     WTHIGH
        JMP     CHECK
        ORG     0600H
        IN      AL,UIRQADR
        MOV     AL,0FAH
        OUT     UTIMER1,AL
        MOV     AL,01H
        OUT     UIRQEN,AL
        PUSHA
        MOV     AH,CLRSCR
        INT     28H
        MOV     AL,CL
        MOV     DL,04H
        MUL     DL
        MOV     AH,WRBYTE
        INT     028H
        MOV     CL,00H
        MOV     AL,20H
        OUT     40H,AL
        POPA
        JMP     AGAIN`,

'Bubble Sort': `; Bubble sort — ascending order
        INCLUDE PATCALLS.INC
        ORG     USRBSE
START:  XOR     BL,BL
        MOV     SI,OFFSET TABLE
        MOV     CX,SZTABLE
AGAIN:  MOV     AL,[SI]
        CMP     AL,[SI+1]
        JC      NOSWAP
        MOV     AH,AL
        MOV     AL,[SI+1]
        MOV     [SI],AL
        MOV     [SI+1],AH
        INC     BL
NOSWAP: INC     SI
        LOOP    AGAIN
        OR      BL,BL
        JNZ     START
        MOV     AH,EXIT
        INT     USER
TABLE   DB      1,7,3,5,2,8,4,9,0,6
SZTABLE EQU     $-TABLE`,

'Subroutine demo': `; CALL/RET with subroutine
        ORG     0100H
        INCLUDE PATCALLS.INC
        CALL    ADD_NUMS
        MOV     AH,WRBYTE
        INT     028H
        MOV     AH,EXIT
        INT     028H
ADD_NUMS:
        MOV     AL,10H
        ADD     AL,20H
        RET`,

'REP STOSB demo': `; REP STOSB — Fill 256 bytes at 2000H with AAH
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     AX,DS
        MOV     ES,AX
        MOV     DI,2000H
        MOV     CX,0100H
        MOV     AL,0AAH
        CLD
        REP     STOSB
        MOV     AH,CLRSCR
        INT     28H
        MOV     AL,BYTE PTR DS:2000H
        MOV     AH,WRBYTE
        INT     28H
        MOV     AH,EXIT
        INT     028H`,

'REP MOVSB demo': `; REP MOVSB — Copy string from SRC to DST
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     AX,DS
        MOV     ES,AX
        MOV     SI,OFFSET SRC
        MOV     DI,OFFSET DST
        MOV     CX,6
        CLD
        REP     MOVSB
        MOV     AH,CLRSCR
        INT     28H
        MOV     SI,OFFSET DST
SHOW:   MOV     AL,[SI]
        TEST    AL,0FFH
        JZ      DONE
        MOV     AH,WRCHAR
        INT     28H
        INC     SI
        JMP     SHOW
DONE:   MOV     AH,EXIT
        INT     028H
SRC     DB      "HELLO",00H
DST     DB      00H,00H,00H,00H,00H,00H`,

'HW: LED all on': `; Tum D0-D7 LED'lerini yakar (RESET ile durdurun)
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        ; D0-D7 yak (Port 2)
        MOV     AL,0FFH
        OUT     UPORT2,AL
HERE:   JMP     HERE`,

'HW: LED all off': `; Tum D0-D7 LED'lerini sondurur
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        MOV     AL,00H
        OUT     UPORT2,AL
        MOV     AH,EXIT
        INT     28H`,

'HW: LED blink': `; D0-D7 LED'leri yakar, bekler, sondurur, EXIT
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        ; Yak
        MOV     AL,0FFH
        OUT     UPORT2,AL
        ; Gecikme
        MOV     CX,0FFFFH
WAIT1:  NOP
        LOOP    WAIT1
        ; Sondur
        MOV     AL,00H
        OUT     UPORT2,AL
        MOV     AH,EXIT
        INT     28H`,

'HW: LED chase': `; LED kayan isik — D0'dan D7'ye sirayla yakar
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
AGAIN:  MOV     BL,01H
        MOV     DL,8
SHIFT:  MOV     AL,BL
        OUT     UPORT2,AL
        MOV     CX,0FFFFH
DELAY:  NOP
        LOOP    DELAY
        SHL     BL,1
        DEC     DL
        JNZ     SHIFT
        JMP     AGAIN`,

'HW: Binary counter': `; LED'lerde 0-FF binary sayici
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        MOV     BL,00H
COUNT:  MOV     AL,BL
        OUT     UPORT2,AL
        MOV     CX,0FFFFH
DELAY:  NOP
        LOOP    DELAY
        INC     BL
        JMP     COUNT`,

'HW: Hello serial': `; Seri porta "Hello PAT!" yazar
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     AH,CLRSCR
        INT     28H
        MOV     SI,OFFSET MSG
PRINT:  MOV     AL,[SI]
        TEST    AL,0FFH
        JZ      DONE
        MOV     AH,WRCHAR
        INT     28H
        INC     SI
        JMP     PRINT
DONE:   MOV     AH,EXIT
        INT     28H
MSG     DB      "Hello PAT!",00H`,

'HW: Piezo beep': `; Piezo buzzer kisa bip sesi
; PZO = Port 1 bit 5 (20H)
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        MOV     DX,500
BEEP:   MOV     AL,20H
        OUT     UPORT1,AL
        MOV     CX,200
D1:     NOP
        LOOP    D1
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     CX,200
D2:     NOP
        LOOP    D2
        DEC     DX
        JNZ     BEEP
        MOV     AH,EXIT
        INT     28H`,
};

let activeFileEl = null;
let openTabs = []; // [{key, content}]
let activeTabKey = null;

function loadExByKey(key, fileEl) {
  if (!EX[key]) return;
  // Save current tab content before switching
  if (activeTabKey) {
    let cur = openTabs.find(t => t.key === activeTabKey);
    if (cur) cur.content = document.getElementById('ed').value;
  }
  // Open tab if not already open
  let existing = openTabs.find(t => t.key === key);
  if (!existing) {
    openTabs.push({key, content: EX[key]});
  }
  activeTabKey = key;
  let tab = openTabs.find(t => t.key === key);
  document.getElementById('ed').value = tab.content;
  updLn(); updateHighlight(); doReset();
  // Update file browser highlight
  if (activeFileEl) activeFileEl.classList.remove('active');
  if (fileEl) { fileEl.classList.add('active'); activeFileEl = fileEl; }
  else highlightFileInTree(key);
  renderTabs();
}

function switchTab(key) {
  let fileEl = document.querySelector('.fb-file[data-key="' + CSS.escape(key) + '"]');
  loadExByKey(key, fileEl);
}

function closeTab(key, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  let idx = openTabs.findIndex(t => t.key === key);
  if (idx < 0) return;
  openTabs.splice(idx, 1);
  if (activeTabKey === key) {
    if (openTabs.length > 0) {
      let newIdx = Math.min(idx, openTabs.length - 1);
      switchTab(openTabs[newIdx].key);
    } else {
      activeTabKey = null;
      document.getElementById('ed').value = '';
      updLn(); updateHighlight();
      if (activeFileEl) { activeFileEl.classList.remove('active'); activeFileEl = null; }
    }
  }
  renderTabs();
}

function fileLabel(key) {
  if (key.includes('.')) return key;
  let short = key.replace(/^PA(\d+):\s*/, 'pa$1_').replace(/^HW:\s*/, 'hw_');
  short = short.replace(/\s+/g, '_').toLowerCase();
  return short + '.asm';
}

function renderTabs() {
  let bar = document.getElementById('tabBar');
  if (!bar) return;
  bar.innerHTML = '';
  openTabs.forEach(t => {
    let tab = document.createElement('div');
    tab.className = 'tab' + (t.key === activeTabKey ? ' active' : '');
    let label = document.createElement('span');
    label.textContent = fileLabel(t.key);
    label.title = t.key;
    let close = document.createElement('span');
    close.className = 'tab-close';
    close.textContent = '\u00D7';
    close.addEventListener('click', function(e) { closeTab(t.key, e); });
    tab.appendChild(label);
    tab.appendChild(close);
    tab.addEventListener('click', function() { switchTab(t.key); });
    bar.appendChild(tab);
  });
}

function highlightFileInTree(key) {
  if (activeFileEl) activeFileEl.classList.remove('active');
  let el = document.querySelector('.fb-file[data-key="' + CSS.escape(key) + '"]');
  if (el) { el.classList.add('active'); activeFileEl = el; }
}

function loadEx() {
  let s = document.getElementById('ex').value;
  if (EX[s]) loadExByKey(s, null);
}

const EXTRA_FILES = [
  { folder: 'scripts', name: 'led_blink.c', content: '/* LED blink — compiles to 8086 ASM */\n#include <pat286.h>\n\nvoid main() {\n    port_init(PORT2, OUTPUT);\n    unsigned char val = 0x01;\n    while (1) {\n        outport(PORT2, val);\n        delay_ms(500);\n        val = (val << 1) | (val >> 7);\n    }\n}' },
  { folder: 'scripts', name: 'counter.c', content: '/* Binary counter on D0-D7 LEDs */\n#include <pat286.h>\n\nvoid main() {\n    port_init(PORT2, OUTPUT);\n    for (unsigned char i = 0; ; i++) {\n        outport(PORT2, i);\n        delay_ms(200);\n    }\n}' }
];

function buildExDropdown() {
  let folders = [
    { name: 'pratikler', icon: '\uD83D\uDCC1', keys: [] },
    { name: 'demos', icon: '\uD83D\uDCC1', keys: [] },
    { name: 'hardware', icon: '\uD83D\uDCC1', keys: [] },
    { name: 'scripts', icon: '\uD83D\uDCC1', extras: EXTRA_FILES.filter(f => f.folder === 'scripts') }
  ];
  for (let k of Object.keys(EX)) {
    if (k.startsWith('PA')) folders[0].keys.push(k);
    else if (k.startsWith('HW:')) folders[2].keys.push(k);
    else folders[1].keys.push(k);
  }

  let tree = document.getElementById('fbTree');
  if (!tree) return;
  tree.innerHTML = '';

  function makeFolder(folder) {
    let div = document.createElement('div');
    div.className = 'fb-folder';

    let hd = document.createElement('div');
    hd.className = 'fb-folder-hd';
    let arrow = document.createElement('span');
    arrow.className = 'fb-arrow open';
    arrow.textContent = '\u25B6';
    let folderIcon = document.createElement('span');
    folderIcon.className = 'fb-folder-icon';
    folderIcon.textContent = folder.icon;
    let name = document.createElement('span');
    name.textContent = folder.name;
    hd.appendChild(arrow);
    hd.appendChild(folderIcon);
    hd.appendChild(name);

    let items = document.createElement('div');
    items.className = 'fb-folder-items';

    hd.addEventListener('click', function() {
      arrow.classList.toggle('open');
      items.classList.toggle('collapsed');
    });

    // ASM files from EX
    if (folder.keys) {
      folder.keys.forEach(k => {
        let file = document.createElement('div');
        file.className = 'fb-file';
        file.setAttribute('data-key', k);
        let icon = document.createElement('span');
        icon.className = 'fb-file-icon';
        icon.textContent = '\uD83D\uDCCB';
        let label = document.createElement('span');
        label.textContent = fileLabel(k);
        label.title = k;
        file.appendChild(icon);
        file.appendChild(label);
        file.addEventListener('click', function() { loadExByKey(k, file); });
        items.appendChild(file);
      });
    }

    // Extra files (Python etc)
    if (folder.extras) {
      folder.extras.forEach(ef => {
        let file = document.createElement('div');
        file.className = 'fb-file';
        file.setAttribute('data-key', ef.name);
        let icon = document.createElement('span');
        icon.className = 'fb-file-icon';
        icon.textContent = ef.name.endsWith('.c') ? '\u{1F1E8}' : '\uD83D\uDCC4';
        let label = document.createElement('span');
        label.textContent = ef.name;
        file.appendChild(icon);
        file.appendChild(label);
        file.addEventListener('click', function() {
          // Save current tab
          if (activeTabKey) {
            let cur = openTabs.find(t => t.key === activeTabKey);
            if (cur) cur.content = document.getElementById('ed').value;
          }
          let existing = openTabs.find(t => t.key === ef.name);
          if (!existing) openTabs.push({key: ef.name, content: ef.content});
          activeTabKey = ef.name;
          let tab = openTabs.find(t => t.key === ef.name);
          document.getElementById('ed').value = tab.content;
          updLn(); updateHighlight();
          if (activeFileEl) activeFileEl.classList.remove('active');
          file.classList.add('active'); activeFileEl = file;
          renderTabs();
        });
        items.appendChild(file);
      });
    }

    div.appendChild(hd);
    div.appendChild(items);
    tree.appendChild(div);
  }

  folders.forEach(makeFolder);

  // Also populate hidden select for backward compat
  let sel = document.getElementById('ex');
  if (sel) {
    for (let k of Object.keys(EX)) {
      let opt = document.createElement('option');
      opt.value = k; opt.textContent = k;
      sel.appendChild(opt);
    }
  }
}
