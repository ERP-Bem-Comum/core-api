# 002 — W0 (RED) — CTR-CONTRACT-SEQUENTIAL-NUMBER

`tests/modules/contracts/application/use-cases/contract-sequential-number.test.ts` — RED:

- `createContract` SEM `sequentialNumber` → backend gera `NNNN/YYYY` (ano do clock).
- numeração crescente (`0001/2026`, `0002/2026`); reinicia em outro ano (`0001/2027`).
- número fornecido (import legado) é preservado.

Falha hoje porque o backend exige `sequentialNumber` do cliente (sem geração). GREEN no W1.
