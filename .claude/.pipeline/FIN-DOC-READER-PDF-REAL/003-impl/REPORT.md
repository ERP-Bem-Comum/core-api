# W1 — GREEN (FIN-DOC-READER-PDF-REAL / #386 Fatia 1)

**Agente:** nodejs-runtime-expert. **Outcome:** GREEN (mecânica; escopo Fatia 1)

## Mudanças — `src/modules/financial/adapters/document-reader/native-pdf.ts`
- **`extractText` reescrito:** trata o operador **`TJ`** (array `[ ... ]`, N operandos de string + kerning numérico ignorado), além de `Tj`. Coleta operandos em `pending[]` e aplica no show. **Reconstrução de linha** por operadores de posição (`Td`/`TD`/`T*`/`Tm`) e `BT`/`ET` fecham a linha; runs entre eles são concatenados (desfaz a fragmentação 1-linha-por-Tj). Continua char-a-char O(n), sem regex de backtracking (F1) e com `MAX_OPERAND` por operando.
- **`detectType` ampliado:** cobre **DANFE/DANFCOM/NFC-e/NF-e** (+ NFS-e/RPA/Boleto).
- **Classificação normalizada:** `structure()` roda `detectType` sobre texto com whitespace colapsado — robusto à fragmentação por posição.

## Testes
- **Synthetic (commitados, sem PII) — 15/15 GREEN**: CA1 `TJ`, CA2 reconstrução, CA3 DANFE + os CA/F pré-existentes (inclui adversariais F1–F4, sem regressão).
- **Reais (local, gitignored) — 2 pass / 5 todo / 0 fail**: 35171 (DANFE) e relatorio-2 classificam; os 5 restantes marcados `todo` com causa-raiz → **Fatia 2 (#388)**.

## Escopo / follow-up
Fatia 1 = mecânica (TJ, reconstrução, DANFE, classificação normalizada). Extração profunda dos 5 reais (Identity-H sem `/ToUnicode`, content stream não-comprimido) = **#388**. Reader é puro → sem x99.
