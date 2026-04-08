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
  // Save current tab content
  if (activeTabKey) {
    let cur = openTabs.find(t => t.key === activeTabKey);
    if (cur) cur.content = document.getElementById('ed').value;
  }
  let tab = openTabs.find(t => t.key === key);
  if (!tab) return;
  // For EX files, try loading via loadExByKey
  if (EX[key]) {
    let fileEl = document.querySelector('.fb-file[data-key="' + CSS.escape(key) + '"]');
    loadExByKey(key, fileEl);
    return;
  }
  // For non-EX files (extras, dynamic, local)
  activeTabKey = key;
  document.getElementById('ed').value = tab.content;
  updLn(); updateHighlight();
  if (activeFileEl) activeFileEl.classList.remove('active');
  highlightFileInTree(key);
  renderTabs();
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

function updateAsmBtnLabel() {
  let btn = document.getElementById('asmBtn');
  if (!btn) return;
  let hl = isHighLevelFile();
  btn.innerHTML = hl ? '&#9654; Translate to ASM' : '&#9654; Assemble';
  btn.className = hl ? 'b b-blu' : 'b bp';
}

function renderTabs() {
  let bar = document.getElementById('tabBar');
  if (!bar) return;
  bar.innerHTML = '';
  updateAsmBtnLabel();
  let closeAll = document.getElementById('closeAllBtn');
  if (closeAll) closeAll.style.display = openTabs.length > 0 ? '' : 'none';
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
    tab.addEventListener('contextmenu', function(e) {
      e.preventDefault(); e.stopPropagation();
      showTabContextMenu(e, t.key);
    });
    bar.appendChild(tab);
  });
}

function showTabContextMenu(e, key) {
  hideCtxMenu();
  ctxMenu = document.createElement('div');
  ctxMenu.className = 'ctx-menu';
  ctxMenu.style.left = e.clientX + 'px';
  ctxMenu.style.top = e.clientY + 'px';

  function addItem(label, fn) {
    let item = document.createElement('div');
    item.className = 'ctx-item';
    item.textContent = label;
    item.addEventListener('click', function() { hideCtxMenu(); fn(); });
    ctxMenu.appendChild(item);
  }
  function addSep() { let s = document.createElement('div'); s.className = 'ctx-sep'; ctxMenu.appendChild(s); }

  addItem('Close', function() { closeTab(key); });
  addItem('Close Others', function() {
    let keep = openTabs.find(t => t.key === key);
    openTabs = keep ? [keep] : [];
    activeTabKey = key;
    if (keep) {
      document.getElementById('ed').value = keep.content;
      updLn(); updateHighlight();
    }
    renderTabs();
  });
  addItem('Close All', function() { closeAllTabs(); });
  addSep();
  addItem('Copy Path', function() {
    navigator.clipboard.writeText(key).then(() => sLog('Copied: ' + key, 0));
  });
  addItem('Duplicate', function() {
    let tab = openTabs.find(t => t.key === key);
    if (!tab) return;
    let copyName = 'copy_' + key;
    addDynamicFile(copyName, tab.content, 'local');
    openFileInTab(copyName, tab.content);
  });

  document.body.appendChild(ctxMenu);
  let rect = ctxMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) ctxMenu.style.left = (window.innerWidth - rect.width - 4) + 'px';
  if (rect.bottom > window.innerHeight) ctxMenu.style.top = (window.innerHeight - rect.height - 4) + 'px';
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
  { folder: 'c', name: 'led_blink.c', content: '/* LED blink — PAT-286 pseudo-C\n * This is educational pseudo-code.\n * Use "Translate to ASM" to convert to 8086 Assembly.\n */\n#include <pat286.h>\n\nvoid main() {\n    port_init(PORT2, OUTPUT);\n    unsigned char val = 0x01;\n    while (1) {\n        outport(PORT2, val);\n        delay_ms(500);\n        val = (val << 1) | (val >> 7);\n    }\n}' },
  { folder: 'python', name: 'counter.py', content: '# Binary counter on D0-D7 LEDs\n# PAT-286 pseudo-Python — educational\n# Use "Translate to ASM" to convert to 8086 Assembly\nfrom pat286 import *\n\ndef main():\n    port_init(PORT2, OUTPUT)\n    i = 0\n    while True:\n        outport(PORT2, i)\n        delay_ms(200)\n        i = i + 1' },
  { folder: 'go', name: 'chase.go', content: '// LED chase — rotating light on D0-D7\n// PAT-286 pseudo-Go — educational\n// Use "Translate to ASM" to convert to 8086 Assembly\npackage main\n\nimport "pat286"\n\nfunc main() {\n    portInit(PORT2, OUTPUT)\n    val := 0x01\n    for {\n        outport(PORT2, val)\n        delayMs(300)\n        val = (val << 1) | (val >> 7)\n    }\n}' },
  { folder: 'java', name: 'blink.java', content: '// LED blink on/off cycle\n// PAT-286 pseudo-Java — educational\n// Use "Translate to ASM" to convert to 8086 Assembly\nimport pat286.*;\n\npublic class Blink {\n    public static void main(String[] args) {\n        portInit(PORT2, OUTPUT);\n        while (true) {\n            outport(PORT2, 0xFF);\n            delayMs(500);\n            outport(PORT2, 0x00);\n            delayMs(500);\n        }\n    }\n}' },
  { folder: 'cpp', name: 'counter.cpp', content: '// Binary counter with C++\n// PAT-286 pseudo-C++ — educational\n// Use "Translate to ASM" to convert to 8086 Assembly\n#include <pat286.h>\n\nint main() {\n    port_init(PORT2, OUTPUT);\n    for (uint8_t i = 0; ; i++) {\n        outport(PORT2, i);\n        delay_ms(200);\n    }\n}' },
  { folder: 'asm', name: 'led_blink.asm', content: '; LED blink — all D0-D7 LEDs on, delay, off, EXIT\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n        ; MUART init\n        MOV     AL,0FFH\n        OUT     UCRREG1,AL\n        OUT     UCRREG2,AL\n        OUT     UCRREG3,AL\n        OUT     UMODEREG,AL\n        OUT     UPORT1CTL,AL\n        ; LEDs on\n        MOV     AL,0FFH\n        OUT     UPORT2,AL\n        ; Delay\n        MOV     CX,0FFFFH\nWAIT1:  NOP\n        LOOP    WAIT1\n        ; LEDs off\n        MOV     AL,00H\n        OUT     UPORT2,AL\n        MOV     AH,EXIT\n        INT     28H' },
  { folder: 'asm', name: 'knight_rider.asm', content: '; LED Knight Rider — bouncing pattern D0-D7-D0 on Port 2\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n        ; MUART init\n        MOV     AL,0FFH\n        OUT     UCRREG1,AL\n        OUT     UCRREG2,AL\n        OUT     UCRREG3,AL\n        OUT     UMODEREG,AL\n        OUT     UPORT1CTL,AL\nAGAIN:  ; Shift left D0 to D7\n        MOV     BL,01H\n        MOV     DL,8\nSLEFT:  MOV     AL,BL\n        OUT     UPORT2,AL\n        MOV     CX,0FFFFH\nDLY1:   NOP\n        LOOP    DLY1\n        SHL     BL,1\n        DEC     DL\n        JNZ     SLEFT\n        ; Shift right D7 to D0\n        MOV     BL,80H\n        MOV     DL,8\nSRIGHT: MOV     AL,BL\n        OUT     UPORT2,AL\n        MOV     CX,0FFFFH\nDLY2:   NOP\n        LOOP    DLY2\n        SHR     BL,1\n        DEC     DL\n        JNZ     SRIGHT\n        JMP     AGAIN' },
  { folder: 'asm', name: 'fibonacci.asm', content: '; Calculate first 10 Fibonacci numbers, store at DS:3000H\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n        MOV     SI,3000H\n        MOV     CX,10\n        MOV     AL,00H\n        MOV     BL,01H\n        MOV     [SI],AL\n        INC     SI\n        DEC     CX\n        MOV     [SI],BL\n        INC     SI\n        DEC     CX\nNXTFIB: MOV     DL,AL\n        ADD     DL,BL\n        MOV     [SI],DL\n        MOV     AL,BL\n        MOV     BL,DL\n        INC     SI\n        LOOP    NXTFIB\n        MOV     AH,EXIT\n        INT     28H' }
];

// Dynamic files: generated .asm from translation, opened from PC
let dynamicFiles = []; // [{name, content, folder}]

function addDynamicFile(name, content, folder) {
  let existing = dynamicFiles.find(f => f.name === name);
  if (existing) { existing.content = content; }
  else { dynamicFiles.push({name, content, folder: folder || 'generated'}); }
  buildExDropdown();
}

function openFileInTab(key, content, fileEl) {
  // Save current tab
  if (activeTabKey) {
    let cur = openTabs.find(t => t.key === activeTabKey);
    if (cur) cur.content = document.getElementById('ed').value;
  }
  let existing = openTabs.find(t => t.key === key);
  if (existing) { existing.content = content; }
  else { openTabs.push({key, content}); }
  activeTabKey = key;
  document.getElementById('ed').value = content;
  updLn(); updateHighlight();
  if (activeFileEl) activeFileEl.classList.remove('active');
  if (fileEl) { fileEl.classList.add('active'); activeFileEl = fileEl; }
  else highlightFileInTree(key);
  renderTabs();
}

function buildExDropdown() {
  // Collect language folders from EXTRA_FILES
  let langFolders = {};
  for (let ef of EXTRA_FILES) {
    if (!langFolders[ef.folder]) langFolders[ef.folder] = [];
    langFolders[ef.folder].push(ef);
  }

  // Collect dynamic file folders
  let dynFolders = {};
  for (let df of dynamicFiles) {
    if (!dynFolders[df.folder]) dynFolders[df.folder] = [];
    dynFolders[df.folder].push(df);
  }

  let folders = [
    { name: 'pratikler', keys: [] },
    { name: 'demos', keys: [] },
    { name: 'hardware', keys: [] },
    { name: 'scripts', children: [] }
  ];
  for (let k of Object.keys(EX)) {
    if (k.startsWith('PA')) folders[0].keys.push(k);
    else if (k.startsWith('HW:')) folders[2].keys.push(k);
    else folders[1].keys.push(k);
  }

  // Add language folders as children of scripts
  for (let lang of Object.keys(langFolders)) {
    folders[3].children.push({ name: lang, extras: langFolders[lang] });
  }

  // Add dynamic folders (generated, local)
  for (let fn of Object.keys(dynFolders)) {
    folders.push({ name: fn, dynamics: dynFolders[fn] });
  }

  let tree = document.getElementById('fbTree');
  if (!tree) return;
  // Save open folder state before rebuild
  let openFolders = new Set();
  tree.querySelectorAll('.fb-folder').forEach(f => {
    let items = f.querySelector('.fb-folder-items');
    let nameEl = f.querySelector('.fb-folder-hd span:last-child');
    if (items && !items.classList.contains('collapsed') && nameEl) {
      openFolders.add(nameEl.textContent);
    }
  });
  tree.innerHTML = '';

  function makeFileEl(key, label, clickFn) {
    let file = document.createElement('div');
    file.className = 'fb-file';
    file.setAttribute('data-key', key);
    let span = document.createElement('span');
    span.textContent = label;
    span.title = key;
    file.appendChild(span);
    file.addEventListener('click', clickFn);
    return file;
  }

  function makeFolder(folder, depth) {
    depth = depth || 0;
    let div = document.createElement('div');
    div.className = 'fb-folder';

    let hd = document.createElement('div');
    hd.className = 'fb-folder-hd';
    if (depth > 0) hd.style.paddingLeft = (6 + depth * 12) + 'px';
    let arrow = document.createElement('span');
    arrow.className = 'fb-arrow';
    arrow.textContent = '\u25B6';
    let folderIcon = document.createElement('span');
    folderIcon.className = 'fb-folder-icon';
    folderIcon.textContent = '\uD83D\uDCC1';
    let name = document.createElement('span');
    name.textContent = folder.name;
    hd.appendChild(arrow);
    hd.appendChild(folderIcon);
    hd.appendChild(name);

    let items = document.createElement('div');
    items.className = 'fb-folder-items collapsed';
    div.setAttribute('data-folder', folder.name);

    // Restore open state
    if (openFolders.has(folder.name)) {
      items.classList.remove('collapsed');
      arrow.classList.add('open');
    }

    hd.addEventListener('click', function() {
      arrow.classList.toggle('open');
      items.classList.toggle('collapsed');
    });

    // ASM files from EX
    if (folder.keys) {
      folder.keys.forEach(k => {
        let file = makeFileEl(k, fileLabel(k), function() { loadExByKey(k, file); });
        if (depth > 0) file.style.paddingLeft = (20 + depth * 12) + 'px';
        items.appendChild(file);
      });
    }

    // Extra files (language scripts)
    if (folder.extras) {
      folder.extras.forEach(ef => {
        let file = makeFileEl(ef.name, ef.name, function() {
          openFileInTab(ef.name, ef.content, file);
        });
        if (depth > 0) file.style.paddingLeft = (20 + depth * 12) + 'px';
        items.appendChild(file);
      });
    }

    // Dynamic files (generated/opened)
    if (folder.dynamics) {
      folder.dynamics.forEach(df => {
        let file = makeFileEl(df.name, df.name, function() {
          openFileInTab(df.name, df.content, file);
        });
        if (depth > 0) file.style.paddingLeft = (20 + depth * 12) + 'px';
        items.appendChild(file);
      });
    }

    // Nested child folders
    if (folder.children) {
      folder.children.forEach(child => {
        items.appendChild(makeFolder(child, depth + 1).el);
      });
    }

    div.appendChild(hd);
    div.appendChild(items);
    return { el: div };
  }

  folders.forEach(f => { let r = makeFolder(f, 0); tree.appendChild(r.el); });

  // Restore active file highlight
  if (activeTabKey) highlightFileInTree(activeTabKey);
}

// === INLINE EDITING ===
function startInlineEdit(el, currentName, callback) {
  let input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.className = 'fb-inline-input';
  input.style.cssText = 'font-family:var(--mono);font-size:11px;padding:1px 4px;border:1px solid var(--blu);border-radius:2px;background:var(--bg);color:var(--text);width:100%;outline:none;box-sizing:border-box';
  el.innerHTML = '';
  el.appendChild(input);
  input.focus();
  input.select();
  function commit() {
    let val = input.value.trim();
    if (val && val !== currentName) callback(val);
    else buildExDropdown();
  }
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); buildExDropdown(); }
  });
  input.addEventListener('blur', commit);
}

function startNewFileInline(tree, callback) {
  let input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'filename.asm';
  input.className = 'fb-inline-input';
  input.style.cssText = 'font-family:var(--mono);font-size:11px;padding:2px 6px;margin:2px 8px;border:1px solid var(--blu);border-radius:2px;background:var(--bg);color:var(--text);width:calc(100% - 16px);outline:none;box-sizing:border-box';
  tree.insertBefore(input, tree.firstChild);
  input.focus();
  function commit() {
    let val = input.value.trim();
    input.remove();
    if (val) callback(val);
  }
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); input.remove(); }
  });
  input.addEventListener('blur', commit);
}

// === FILE BROWSER CONTEXT MENU ===
let ctxMenu = null;
function hideCtxMenu() { if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; } }
document.addEventListener('click', hideCtxMenu);
document.addEventListener('contextmenu', function(e) {
  // Only handle right-click inside file browser
  let tree = document.getElementById('fbTree');
  if (!tree || !tree.contains(e.target)) return;
  e.preventDefault();
  hideCtxMenu();

  let fileEl = e.target.closest('.fb-file');
  let folderEl = e.target.closest('.fb-folder-hd');
  let folderDiv = e.target.closest('.fb-folder');

  ctxMenu = document.createElement('div');
  ctxMenu.className = 'ctx-menu';
  ctxMenu.style.left = e.clientX + 'px';
  ctxMenu.style.top = e.clientY + 'px';

  function addItem(label, fn, disabled) {
    let item = document.createElement('div');
    item.className = 'ctx-item' + (disabled ? ' disabled' : '');
    item.textContent = label;
    if (!disabled) item.addEventListener('click', function() { hideCtxMenu(); fn(); });
    ctxMenu.appendChild(item);
  }
  function addSep() { let s = document.createElement('div'); s.className = 'ctx-sep'; ctxMenu.appendChild(s); }

  if (fileEl) {
    let key = fileEl.getAttribute('data-key');
    let isDynamic = dynamicFiles.some(f => f.name === key);
    let isExtra = EXTRA_FILES.some(f => f.name === key);
    let isEX = !!EX[key];

    addItem('Open', function() { fileEl.click(); });
    addItem('Open in New Tab', function() {
      let tab = openTabs.find(t => t.key === key);
      if (!tab) {
        let content = EX[key] || '';
        let ef = EXTRA_FILES.find(f => f.name === key);
        let df = dynamicFiles.find(f => f.name === key);
        if (ef) content = ef.content;
        if (df) content = df.content;
        openTabs.push({key, content});
        renderTabs();
      }
    });
    addSep();
    addItem('Rename', function() {
      startInlineEdit(fileEl, key, function(newName) {
        if (!newName || newName === key) return;
        if (isDynamic) {
          let df = dynamicFiles.find(f => f.name === key);
          if (df) df.name = newName;
        }
        let tab = openTabs.find(t => t.key === key);
        if (tab) tab.key = newName;
        if (activeTabKey === key) activeTabKey = newName;
        buildExDropdown(); renderTabs();
      });
    }, isEX);
    addItem('Duplicate', function() {
      let content = '';
      let ef = EXTRA_FILES.find(f => f.name === key);
      let df = dynamicFiles.find(f => f.name === key);
      if (EX[key]) content = EX[key];
      else if (ef) content = ef.content;
      else if (df) content = df.content;
      let tab = openTabs.find(t => t.key === key);
      if (tab) content = tab.content;
      let copyName = 'copy_' + (key.includes('.') ? key : key + '.asm');
      addDynamicFile(copyName, content, 'local');
      openFileInTab(copyName, content);
    });
    addItem('Delete', function() {
      if (!confirm('Delete "' + key + '"?')) return;
      dynamicFiles = dynamicFiles.filter(f => f.name !== key);
      closeTab(key);
      buildExDropdown();
    }, isEX || isExtra);
    addSep();
    addItem('Copy Content', function() {
      let content = '';
      let tab = openTabs.find(t => t.key === key);
      if (tab) content = tab.content;
      else if (EX[key]) content = EX[key];
      else { let ef = EXTRA_FILES.find(f => f.name === key); if (ef) content = ef.content; }
      navigator.clipboard.writeText(content).then(() => sLog('Copied: ' + key, 0));
    });
    addItem('Download', function() {
      let content = '';
      let tab = openTabs.find(t => t.key === key);
      if (tab) content = tab.content;
      else if (EX[key]) content = EX[key];
      else { let ef = EXTRA_FILES.find(f => f.name === key); if (ef) content = ef.content; }
      let blob = new Blob([content], {type: 'text/plain'});
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = key.includes('.') ? key : key + '.asm';
      a.click();
    });
  } else {
    // Right-click on folder or empty area
    addItem('New File', function() {
      startNewFileInline(tree, function(name) {
        if (!name) return;
        addDynamicFile(name, '; ' + name + '\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n\n', 'local');
        openFileInTab(name, dynamicFiles.find(f => f.name === name).content);
      });
    });
    addItem('New Folder', function() {
      sLog('Folders are auto-created from file extensions', 0);
    }, true);
    addSep();
    addItem('Collapse All', function() {
      document.querySelectorAll('.fb-folder-items').forEach(el => el.classList.add('collapsed'));
      document.querySelectorAll('.fb-arrow').forEach(el => el.classList.remove('open'));
    });
    addItem('Expand All', function() {
      document.querySelectorAll('.fb-folder-items').forEach(el => el.classList.remove('collapsed'));
      document.querySelectorAll('.fb-arrow').forEach(el => el.classList.add('open'));
    });
  }

  document.body.appendChild(ctxMenu);
  // Keep menu in viewport
  let rect = ctxMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) ctxMenu.style.left = (window.innerWidth - rect.width - 4) + 'px';
  if (rect.bottom > window.innerHeight) ctxMenu.style.top = (window.innerHeight - rect.height - 4) + 'px';
});
