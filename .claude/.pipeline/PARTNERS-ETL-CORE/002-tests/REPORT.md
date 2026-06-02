# W0 — RED — PARTNERS-ETL-CORE

**Skill:** tdd-strategist · **Outcome:** RED

Arquivos de teste (fixtures 100% sintéticos — zero PII do dump):
- `tests/etl/quarantine.test.ts` · `tests/etl/reconcile.test.ts`
- `tests/etl/mappers/{financier,supplier,collaborator,user}.mapper.test.ts`

Cada suíte RED por inexistência do módulo alvo (`ERR_MODULE_NOT_FOUND`). `#scripts/*` adicionado ao `package.json#imports` para resolução.
