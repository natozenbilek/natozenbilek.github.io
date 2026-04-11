; Keyboard Display — "NEZIH" yazisi
; DigiAC2000 keyboard display'e dogrudan yazar
; KYDBUF (0000:047D) = display buffer (system segment)
; 7-seg encoding: a=b0 b=b1 c=b2 d=b3 e=b4 f=b5 g=b6
;   n=54H  E=79H  Z=5BH  I=06H  H=76H
        ORG     0100H
        INCLUDE PATCALLS.INC

        ; DS'yi system segment'e ayarla (0000)
        PUSH    DS
        MOV     AX,0000H
        MOV     DS,AX

        ; Keyboard display buffer'a 7-seg data yaz
        ; 8 haneli display — sola bosluk, saga NEZIH
        MOV     BYTE PTR DS:047DH,00H
        MOV     BYTE PTR DS:047EH,00H
        MOV     BYTE PTR DS:047FH,00H
        MOV     BYTE PTR DS:0480H,54H
        MOV     BYTE PTR DS:0481H,79H
        MOV     BYTE PTR DS:0482H,5BH
        MOV     BYTE PTR DS:0483H,06H
        MOV     BYTE PTR DS:0484H,76H

        POP     DS

        ; Sonsuz dongu (display acik kalsin)
STAY:   JMP     STAY
