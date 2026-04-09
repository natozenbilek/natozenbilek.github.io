// ============================================================
// PAT-286 Example Programs — Assembly source data
// ============================================================
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
        MOV     AH,EXIT
        INT     28H`,

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
        MOV     CX,SZTABLE-1
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

'Fibonacci': `; Calculate first 10 Fibonacci numbers, store at DS:3000H
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     SI,3000H
        MOV     CX,10
        MOV     AL,00H
        MOV     BL,01H
        MOV     [SI],AL
        INC     SI
        DEC     CX
        MOV     [SI],BL
        INC     SI
        DEC     CX
NXTFIB: MOV     DL,AL
        ADD     DL,BL
        MOV     [SI],DL
        MOV     AL,BL
        MOV     BL,DL
        INC     SI
        LOOP    NXTFIB
        MOV     AH,EXIT
        INT     28H`,

'Factorial 6!': `; Calculate 6! = 720 (02D0H), store at DS:2000H
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     CX,6
        MOV     AX,1
MLOOP:  MUL     CX
        LOOP    MLOOP
        MOV     DS:2000H,AX
        MOV     AH,EXIT
        INT     28H`,

'String reverse': `; Reverse a string in-place using the stack
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     SI,OFFSET STR1
        XOR     CX,CX
        ; Push all chars onto stack
PUSH1:  MOV     AL,[SI]
        TEST    AL,0FFH
        JZ      DOPOP
        PUSH    AX
        INC     CX
        INC     SI
        JMP     PUSH1
        ; Pop chars back in reverse order
DOPOP:  MOV     SI,OFFSET STR1
POP1:   POP     AX
        MOV     [SI],AL
        INC     SI
        LOOP    POP1
        ; Display reversed string
        MOV     AH,CLRSCR
        INT     28H
        MOV     SI,OFFSET STR1
SHOW:   MOV     AL,[SI]
        TEST    AL,0FFH
        JZ      DONE
        MOV     AH,WRCHAR
        INT     28H
        INC     SI
        JMP     SHOW
DONE:   MOV     AH,EXIT
        INT     28H
STR1    DB      "ABCDEF",00H`,

'Hex to ASCII display': `; Read byte from DS:1000H, display as two hex ASCII chars
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     AH,CLRSCR
        INT     28H
        MOV     AL,BYTE PTR DS:1000H
        MOV     BL,AL
        ; High nibble
        SHR     AL,1
        SHR     AL,1
        SHR     AL,1
        SHR     AL,1
        CALL    NIB2ASC
        MOV     AH,WRCHAR
        INT     28H
        ; Low nibble
        MOV     AL,BL
        AND     AL,0FH
        CALL    NIB2ASC
        MOV     AH,WRCHAR
        INT     28H
        MOV     AH,EXIT
        INT     28H
; Subroutine: convert nibble in AL to ASCII hex char
NIB2ASC:
        CMP     AL,0AH
        JC      ISDIG
        ADD     AL,37H
        RET
ISDIG:  ADD     AL,30H
        RET`,

'Countdown display': `; Count from 99 to 00 on PAT display with delay
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     AH,CLRSCR
        INT     28H
        MOV     BL,99
CNTLP:  PUSH    BX
        MOV     AH,CLRSCR
        INT     28H
        ; Display tens digit
        MOV     AL,BL
        XOR     AH,AH
        MOV     DL,10
        DIV     DL
        ADD     AL,30H
        MOV     AH,WRCHAR
        INT     28H
        ; Display ones digit
        POP     BX
        PUSH    BX
        MOV     AL,BL
        XOR     AH,AH
        MOV     DL,10
        DIV     DL
        MOV     AL,AH
        ADD     AL,30H
        MOV     AH,WRCHAR
        INT     28H
        ; Delay
        MOV     BX,500
        MOV     AH,WTNMS
        INT     28H
        POP     BX
        DEC     BL
        CMP     BL,0FFH
        JNZ     CNTLP
        MOV     AH,EXIT
        INT     28H`,

'HW: LED Knight Rider': `; LED Knight Rider — bouncing pattern D0-D7-D0 on Port 2
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
AGAIN:  ; Shift left D0 to D7
        MOV     BL,01H
        MOV     DL,8
SLEFT:  MOV     AL,BL
        OUT     UPORT2,AL
        MOV     CX,0FFFFH
DLY1:   NOP
        LOOP    DLY1
        SHL     BL,1
        DEC     DL
        JNZ     SLEFT
        ; Shift right D7 to D0
        MOV     BL,80H
        MOV     DL,8
SRIGHT: MOV     AL,BL
        OUT     UPORT2,AL
        MOV     CX,0FFFFH
DLY2:   NOP
        LOOP    DLY2
        SHR     BL,1
        DEC     DL
        JNZ     SRIGHT
        JMP     AGAIN`,

'HW: LED Dice': `; LED Dice — random-ish dice pattern on Port 2
; Rolls through patterns rapidly, press RESET to stop
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        ; Dice face patterns (LED bits):
        ; 1=08H  2=24H  3=2CH  4=66H  5=6EH  6=77H
ROLL:   MOV     SI,OFFSET FACES
        MOV     DL,6
NXTFC:  MOV     AL,[SI]
        OUT     UPORT2,AL
        MOV     CX,0FFFFH
DLY1:   NOP
        LOOP    DLY1
        INC     SI
        DEC     DL
        JNZ     NXTFC
        JMP     ROLL
FACES   DB      08H,24H,2CH,66H,6EH,77H`,

'HW: LED all on': `; Turn on all D0-D7 LEDs (press RESET to stop)
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        ; Light D0-D7 (Port 2)
        MOV     AL,0FFH
        OUT     UPORT2,AL
HERE:   JMP     HERE`,

'HW: LED all off': `; Turn off all D0-D7 LEDs
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

'HW: LED blink': `; Blink D0-D7 LEDs on, delay, off, EXIT
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        ; LEDs on
        MOV     AL,0FFH
        OUT     UPORT2,AL
        ; Delay
        MOV     CX,0FFFFH
WAIT1:  NOP
        LOOP    WAIT1
        ; LEDs off
        MOV     AL,00H
        OUT     UPORT2,AL
        MOV     AH,EXIT
        INT     28H`,

'HW: LED chase': `; LED chase — shift light from D0 to D7
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

'HW: Binary counter': `; Binary counter 0-FF on D0-D7 LEDs
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

'HW: Hello serial': `; Write "Hello PAT!" to serial port
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

'HW: Piezo beep': `; Piezo buzzer short beep
; PZO = Port 1 bit 5 (20H)
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; Port 1 bit 5 output (piezo)
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        MOV     AL,20H
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

'Keyboard Display: NEZIH': `; Keyboard Display — "NEZIH" yazisi
; INT 28H ile 7-segment display'e yazar
; Fiziksel DigiAC'ta keyboard display'de gorunur
        ORG     0100H
        INCLUDE PATCALLS.INC

        ; Ekrani temizle
        MOV     AH,CLRSCR
        INT     28H

        ; N harfi
        MOV     AL,'N'
        MOV     AH,WRCHAR
        INT     28H
        ; E harfi
        MOV     AL,'E'
        MOV     AH,WRCHAR
        INT     28H
        ; Z harfi
        MOV     AL,'Z'
        MOV     AH,WRCHAR
        INT     28H
        ; I harfi
        MOV     AL,'I'
        MOV     AH,WRCHAR
        INT     28H
        ; H harfi
        MOV     AL,'H'
        MOV     AH,WRCHAR
        INT     28H

        ; Sonsuz dongude kal (display acik kalsin)
STAY:   JMP     STAY`,

'Display Test': `; Display Test — 7-segment display demo
; Writes text and counts on the PAT Display
        ORG     0100H
        INCLUDE PATCALLS.INC

        ; Clear display
        MOV     AH,CLRSCR
        INT     28H

        ; Write "HELLO" character by character
        MOV     AL,'H'
        MOV     AH,WRCHAR
        INT     28H
        MOV     AL,'E'
        MOV     AH,WRCHAR
        INT     28H
        MOV     AL,'L'
        MOV     AH,WRCHAR
        INT     28H
        MOV     AL,'L'
        MOV     AH,WRCHAR
        INT     28H
        MOV     AL,'0'
        MOV     AH,WRCHAR
        INT     28H

        ; Wait 2 seconds
        MOV     BX,2000
        MOV     AH,WTNMS
        INT     28H

        ; Now count 00..FF on display
        MOV     AH,CLRSCR
        INT     28H
        MOV     CL,00H
COUNT:  MOV     AL,CL
        MOV     AH,WRBYTE
        INT     28H
        MOV     BX,500
        MOV     AH,WTNMS
        INT     28H
        MOV     AH,CLRSCR
        INT     28H
        INC     CL
        JNZ     COUNT

        MOV     AH,EXIT
        INT     28H`,

'Zamansızdık - Manifest': `; Zamansızdık — Manifest (Ates Atilla)
; E minor, 100 BPM — kolaynota.com notasyonundan
; TONE: AH=21, BX=freq(Hz), CX=sure(ms)
; NOTOFF: AH=22
;
; Nota frekanslari:
; Do4=262 Re4=294 Mi4=330 Fa#4=370 Sol4=392
; La4=440 Si4=494 Do5=523 Re5=587
        ORG     0100H
        INCLUDE PATCALLS.INC

        MOV     AH,CLRSCR
        INT     28H

        ; === VERSE 1: "Zamansızdık ilk başta" ===
        ; Olcu 1: Fa# Mi Fa# Sol  Fa# Mi  Do
N01:    MOV     BX,370
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,262
        MOV     CX,600
        MOV     AH,TONE
        INT     28H

        ; Olcu 2: Fa# Sol Fa# Sol Mi Si Mi Fa# Sol Fa#
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,494
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,300
        MOV     AH,TONE
        INT     28H

        ; pause
        MOV     AH,NOTOFF
        INT     28H
        MOV     BX,150
        MOV     AH,WTNMS
        INT     28H

        ; === "Sandım hep iyi kalıcaz" ===
        ; Olcu 3: Fa# Mi Fa# Sol Fa# Mi
        MOV     BX,370
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,600
        MOV     AH,TONE
        INT     28H

        ; Olcu 4: Mi Si Mi Fa# Sol Fa# Mi La Si
        MOV     BX,330
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,494
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,440
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,494
        MOV     CX,300
        MOV     AH,TONE
        INT     28H

        MOV     AH,NOTOFF
        INT     28H
        MOV     BX,200
        MOV     AH,WTNMS
        INT     28H

        ; === "Yetmiyordu..." ===
        ; Olcu 5: Do La Re Do Do Re Si La Si
        MOV     BX,262
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,440
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,294
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,262
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,262
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,294
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,494
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,440
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,494
        MOV     CX,300
        MOV     AH,TONE
        INT     28H

        MOV     AH,NOTOFF
        INT     28H
        MOV     BX,200
        MOV     AH,WTNMS
        INT     28H

        ; === NAKARAT: "La Sol La Sol La Si" ===
        MOV     BX,440
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,440
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,440
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,494
        MOV     CX,600
        MOV     AH,TONE
        INT     28H

        MOV     AH,NOTOFF
        INT     28H
        MOV     BX,100
        MOV     AH,WTNMS
        INT     28H

        ; "Sol La Sol Fa# Sol La Sol Fa# Mi"
        MOV     BX,392
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,440
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,440
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,600
        MOV     AH,TONE
        INT     28H

        MOV     AH,NOTOFF
        INT     28H
        MOV     BX,200
        MOV     AH,WTNMS
        INT     28H

        ; === "Her te ma sin da..." (Fa# Sol Fa# Mi Fa# Mi) ===
        MOV     BX,370
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,600
        MOV     AH,TONE
        INT     28H

        MOV     AH,NOTOFF
        INT     28H
        MOV     BX,100
        MOV     AH,WTNMS
        INT     28H

        ; "Her pey gi zel de..." (Fa# Fa# Mi Fa# Mi Fa# Mi)
        MOV     BX,370
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,600
        MOV     AH,TONE
        INT     28H

        MOV     AH,NOTOFF
        INT     28H
        MOV     BX,200
        MOV     AH,WTNMS
        INT     28H

        ; === BRIDGE: "Fa# Sol Fa# Mi Re Mi Fa# Sol" ===
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,294
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,400
        MOV     AH,TONE
        INT     28H

        MOV     AH,NOTOFF
        INT     28H
        MOV     BX,150
        MOV     AH,WTNMS
        INT     28H

        ; "Fa# Sol Fa# Sol Fa# Sol Fa# Mi" (agla...)
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,392
        MOV     CX,300
        MOV     AH,TONE
        INT     28H
        MOV     BX,370
        MOV     CX,200
        MOV     AH,TONE
        INT     28H
        MOV     BX,330
        MOV     CX,600
        MOV     AH,TONE
        INT     28H
        MOV     BX,262
        MOV     CX,600
        MOV     AH,TONE
        INT     28H

        ; === END ===
        MOV     AH,NOTOFF
        INT     28H
        MOV     AH,EXIT
        INT     28H`,
};
