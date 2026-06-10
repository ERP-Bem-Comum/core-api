# 002 — W0 (RED) — CTR-AMENDMENT-SIGNEDAT-AND-NUMBER

2 arquivos de teste RED (G2 + G3):

- `tests/modules/contracts/application/use-cases/amendment-number-generation.test.ts` (G3) —
  `createAmendment` SEM `amendmentNumber` → backend gera `NN/AAAA` (ano do clock); crescente por
  contrato (`01/2026`, `02/2026`); escopo per-contract (outro contrato reinicia em `01/2026`).
- `tests/modules/contracts/application/use-cases/amendment-signedat.test.ts` (G2) — domínio:
  `Amendment.attachSignedDocument(pending, docRef, signedAt)` → PendingWithDocument carrega `signedAt`;
  `homologate` preserva. Use case: o aditivo persistido expõe o `signedAt` informado.

## Resultado

`tests 6 · pass 0 · fail 6`. Falham por: `amendmentNumber` exigido no command (sem geração/
nextAmendmentNumber); `Amendment.attachSignedDocument` não recebe `signedAt` e o agregado não o expõe.

GREEN no W1.
