; Zamansızdık — Manifest (Ateş Atilla)
; Mi minör, ~100 BPM — kolaynota.com nota kağıdından
; DigiAC2000 piezo toggle: UPORT1 tüm bitler
;
; PLAY: SI=yarı-periyot gecikme, DI=döngü sayısı
; Do4=900 Re4=800 Re#4=755 Mi4=710 Fa#4=635
; Sol4=600 La4=535 Si4=475 Do5=450
;
; Süre: e=eighth q=quarter h=half t=triplet
        ORG     0100H
        INCLUDE PATCALLS.INC

        MOV     AL,0FFH
        OUT     UPORT1CTL,AL

        ; ═══ VERSE 1: "Zamansızdık ilk başta" ═══
        ; Fa#(e) Mi(e) Fa#(e) Sol(q) Fa#(e) Mi(e) Do(h)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,900
        MOV     DI,267
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; "Sandım hep iyi kalıcaz"
        ; Fa#(e) Sol(e) Fa#(e) Mi(e) Si(h)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,475
        MOV     DI,505
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; 1st ending: Mi(e) Fa#(e) Sol(e) Fa#(h)
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,378
        CALL    PLAY
        MOV     BX,60
        MOV     AH,WTNMS
        INT     28H

        ; ═══ VERSE 2 (repeat): "yüzler / Artık işitmem sala" ═══
        ; Fa#(e) Mi(e) Fa#(e) Sol(q) Fa#(e) Mi(e) Do(h)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,900
        MOV     DI,267
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; Fa#(e) Sol(e) Fa#(e) Mi(e) Si(h)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,475
        MOV     DI,505
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; 2nd ending: La(q) Si(h)
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,475
        MOV     DI,505
        CALL    PLAY
        MOV     BX,60
        MOV     AH,WTNMS
        INT     28H

        ; ═══ SECTION B: "iltifat hissettirmiyor san" ═══
        ; Fa#(e) Mi(e) Re#(e) Mi(e) Fa#(e) Sol(e) Fa#(q)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,755
        MOV     DI,80
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,189
        CALL    PLAY
        MOV     BX,30
        MOV     AH,WTNMS
        INT     28H

        ; "Boşa dökülen" Mi(q) Mi(e) Fa#(e) Sol(e) Fa#(e) Mi(h)
        MOV     SI,710
        MOV     DI,169
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,338
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; La(q) Si(h)
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,475
        MOV     DI,505
        CALL    PLAY
        MOV     BX,80
        MOV     AH,WTNMS
        INT     28H

        ; ═══ PRE-CHORUS: "konuşma bitsin en başından" ═══
        ; Do(q) La(e) Re(e) Do(q) Do(q) Re(q) Si(q) La(e) Si(h)
        MOV     SI,900
        MOV     DI,133
        CALL    PLAY
        MOV     SI,535
        MOV     DI,112
        CALL    PLAY
        MOV     SI,800
        MOV     DI,75
        CALL    PLAY
        MOV     SI,900
        MOV     DI,133
        CALL    PLAY
        MOV     SI,900
        MOV     DI,133
        CALL    PLAY
        MOV     SI,800
        MOV     DI,150
        CALL    PLAY
        MOV     SI,475
        MOV     DI,253
        CALL    PLAY
        MOV     SI,535
        MOV     DI,112
        CALL    PLAY
        MOV     SI,475
        MOV     DI,505
        CALL    PLAY
        MOV     BX,80
        MOV     AH,WTNMS
        INT     28H

        ; La(q) La(q) La(q) Si(q)
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,475
        MOV     DI,253
        CALL    PLAY
        MOV     BX,80
        MOV     AH,WTNMS
        INT     28H

        ; ═══ NAKARAT: "Her temasında" ═══
        ; La(q) Sol(q) La(q) Sol(q) La(q) Si(h)
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,475
        MOV     DI,505
        CALL    PLAY
        MOV     BX,60
        MOV     AH,WTNMS
        INT     28H

        ; Fa#(e) Sol(e) Fa#(e) Mi(e) Re#(e) Mi(e) Fa#(e) Mi(e) Fa#(h)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,755
        MOV     DI,80
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,378
        CALL    PLAY
        MOV     BX,100
        MOV     AH,WTNMS
        INT     28H

        ; ═══ BRIDGE: "Yanında kayboldum" (triplets) ═══
        ; Mi(t) Sol(t) Fa#(t) Mi(t) Fa#(t) Mi(t) Sol(q)
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,635
        MOV     DI,63
        CALL    PLAY
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,635
        MOV     DI,63
        CALL    PLAY
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        ; Sol(t) Fa#(t) Mi(t) Sol(t) Fa#(t) Mi(t) Sol(t) La(t) Sol(q)
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,635
        MOV     DI,63
        CALL    PLAY
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,635
        MOV     DI,63
        CALL    PLAY
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,535
        MOV     DI,75
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     BX,60
        MOV     AH,WTNMS
        INT     28H

        ; ═══ "Sabrımı çoktan aşmıştın" (triplets) ═══
        ; Sol(t) Fa#(t) Mi(t) Sol(t) Fa#(t) Mi(t) Sol(t) La(t) Sol(q) Fa#(q)
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,635
        MOV     DI,63
        CALL    PLAY
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,635
        MOV     DI,63
        CALL    PLAY
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,535
        MOV     DI,75
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,635
        MOV     DI,189
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; ═══ "Konuşma bitsin" ═══
        ; Do(q) Sol(e) Fa#(e) Do(e) Re(e) Do(q) Do(e) Re(e) Do(q) Fa#(q) Mi(h)
        MOV     SI,900
        MOV     DI,133
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,900
        MOV     DI,67
        CALL    PLAY
        MOV     SI,800
        MOV     DI,75
        CALL    PLAY
        MOV     SI,900
        MOV     DI,133
        CALL    PLAY
        MOV     SI,900
        MOV     DI,67
        CALL    PLAY
        MOV     SI,800
        MOV     DI,75
        CALL    PLAY
        MOV     SI,900
        MOV     DI,133
        CALL    PLAY
        MOV     SI,635
        MOV     DI,189
        CALL    PLAY
        MOV     SI,710
        MOV     DI,338
        CALL    PLAY
        MOV     BX,60
        MOV     AH,WTNMS
        INT     28H

        ; ═══ "Artık düşene yakamdan" ═══
        ; Si(q) Do(e) Si(e) Si(q) Do(e) Si(e) Re(q) La(e) Fa#(e) Mi(e) Fa#(q)
        MOV     SI,475
        MOV     DI,253
        CALL    PLAY
        MOV     SI,450
        MOV     DI,133
        CALL    PLAY
        MOV     SI,475
        MOV     DI,126
        CALL    PLAY
        MOV     SI,475
        MOV     DI,253
        CALL    PLAY
        MOV     SI,450
        MOV     DI,133
        CALL    PLAY
        MOV     SI,475
        MOV     DI,126
        CALL    PLAY
        MOV     SI,800
        MOV     DI,150
        CALL    PLAY
        MOV     SI,535
        MOV     DI,112
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,189
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; ═══ "Güm güm atsa da" ═══
        ; Fa#(e) Mi(e) Fa#(e) Fa#(e) Mi(e) Fa#(e) Mi(e) Fa#(e) Mi(h)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,338
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; ═══ "Ağlatır bir anda" ═══
        ; Fa#(q) Sol(q) Sol(q) Fa#(e) Mi(e) Mi(h) Do(h)
        MOV     SI,635
        MOV     DI,189
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,710
        MOV     DI,338
        CALL    PLAY
        MOV     SI,900
        MOV     DI,267
        CALL    PLAY

        ; === END ===
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     AH,EXIT
        INT     28H

; ---- PLAY subroutine ----
; SI = half-period delay (loop count, controls frequency)
; DI = number of full cycles (controls duration)
PLAY:   MOV     AL,0FFH
        OUT     UPORT1,AL
        MOV     CX,SI
PL1:    NOP
        LOOP    PL1
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     CX,SI
PL2:    NOP
        LOOP    PL2
        DEC     DI
        JNZ     PLAY
        RET
