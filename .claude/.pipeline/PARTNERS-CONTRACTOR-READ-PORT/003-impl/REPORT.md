# W1 — GREEN — PARTNERS-CONTRACTOR-READ-PORT

**Skill:** ports-and-adapters.

## Arquivos criados
- src/modules/partners/public-api/contractor-view.mapper.ts
  Views (SupplierView/FinancierView/CollaboratorView + união ContractorView) + mappers PUROS
  supplierToView/financierToView/collaboratorToView: (aggregate, updatedAt) → View.
- src/modules/partners/application/ports/contractor-read.ts
  Interface ContractorReadPort + ContractorReadError ('contractor-read-unavailable').
  getSupplierView/getFinancierView/getCollaboratorView: (id:string) → Promise<Result<View|null, E>>.
- src/modules/partners/adapters/persistence/repos/contractor-read.drizzle.ts
  createDrizzleContractorReadStore(handle): SELECT por id (limit 1) → *FromRow (reuso do mapper de
  leitura) + projeção *ToView injetando row.updatedAt. id ausente → ok(null); mapper-error → infra → err.
  try/catch → Result (zero throw). Só SELECT em par_* (devolve a View, nunca row cru).
- src/modules/partners/public-api/read.ts
  buildPartnersReadPort({connectionString}) → PartnersReadPort (= ContractorReadPort + close()).
  Espelha buildPartnersEtlPort; openPartnersMysql applyMigrations:false (leitura). close() = handle.close().

## Arquivos editados
- src/modules/partners/public-api/index.ts — re-export do buildPartnersReadPort + tipos (Views, port, erros).

## Decisões de design (W1)
- updatedAt: o adapter faz seu próprio SELECT (row inclui updated_at), reconstrói o agregado via
  *FromRow e injeta row.updatedAt no mapper puro. Reusa a reconstrução existente sem duplicar.
  (Não usa repo.findById diretamente porque findById descarta o updatedAt — precisamos do row.)
- PartnersReadPort = ContractorReadPort & { close } (intersection) — close() vive na borda, fora do port puro.
- buildPartnersReadPort NÃO aplica migrations (leitura pós-ETL); buildPartnersEtlPort aplica (one-shot write).

## Invariantes respeitadas
- Domínio puro intocado (zero edição em domain/). Só leitura (CA2). Result em toda borda (CA3).
- ADR-0006: consumo cross-módulo só pela public-api (index.ts re-exporta). 
- ADR-0014: nunca expõe par_* cru — a View é projeção plana (CA4).
- import type onde aplicável; verbatimModuleSyntax ok; extensões .ts nos imports.

## Prova GREEN (saída literal)
typecheck: tsc --noEmit → 0 erros.
node --test (2 arquivos novos): tests 6 / pass 6 / fail 0 (unit GREEN; integração carrega sem
  ERR_MODULE_NOT_FOUND e é no-op sem MYSQL_INTEGRATION).
pnpm test (suite completa): tests 1945 / suites 628 / pass 1929 / fail 0 / skipped 16.

## Próximo passo (W2 REVIEW)
Audit read-only: ADR-0006/0014, só leitura, Result/sem throw, import type, lint estrito.
