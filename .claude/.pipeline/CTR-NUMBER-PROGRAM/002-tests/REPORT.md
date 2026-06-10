# 002 — W0 (RED) — CTR-NUMBER-PROGRAM

2 testes foundacionais RED (os demais layers — schema/mapper/use-case/HTTP — são test-first por camada
no W1, como no padrão dos tickets grandes):

- `tests/modules/contracts/domain/contract/contract-classification-metadata.test.ts` —
  `Contract.create`/`createPending` carregam `classification` (CT/OS, default CT, rejeita inválido) +
  `programId`/`budgetPlanId`/`categorizacao`/`centroDeCusto`.
- `tests/modules/contracts/adapters/http/program-composition.test.ts` — `composeProgramBlock` (single,
  detalhe) + `composeProgramBlocks` (batch, lista — 1 chamada, sem N+1) sobre um fake `ProgramReadPort`;
  degrada p/ `snapshot: null` (port null / id inexistente).

## Resultado
`tests 5 · pass 0 · fail 5` no domínio + `ERR_MODULE_NOT_FOUND` na composição (módulo + ProgramReadPort
inexistentes). GREEN no W1.
