# W1 — Implementação (GREEN) · PAR-PARTNER-BANK-PIX (US1)

**Outcome:** GREEN · agentes: ts-domain-modeler (VO/agregados) → drizzle-schema-author (schema/migration) → zod-expert (borda)

## O que entrou

### Domínio
- **VO promovido**: `domain/supplier/payment-target.ts` → `domain/shared/payment-target.ts`. ~13 importadores atualizados (supplier, act, mappers, use cases, ETL, contracts/contractor-composition). Justificativa canônica no W0 (Evans, Value Objects / "conceptual whole").
- **Validação de `agency`**: regex `^\d{4}(-?\d)?$` em `createBankAccount` → novo erro `invalid-bank-agency`. **Harmonizada** com Supplier/Act (passam a validar; fixtures legados usam agência válida — sem regressão).
- **Financier**: `bankAccount`/`pixKey` (opcionais) no Core + register/edit (parse via helper) + rehydrate; `FinancierError` compõe `PaymentTargetError`.
- **Collaborator**: idem; `register` parseia banco/PIX; edit/complete/deactivate/reactivate/rehydrate **preservam** via spread.

### Persistência
- `par_financiers` e `par_collaborators`: +6 colunas (`bank_account_*`, `pix_key*`) + checks de bloco (`*_bank_block_chk`, `*_pix_block_chk`). **Sem** `payment_target_chk` (banco/PIX são opcionais — sem invariante "ao menos um").
- Migration **`0010_spooky_violations.sql`** gerada por `pnpm run db:generate:partners` (12 ADD COLUMN + 4 CHECK). Colunas varchar comuns (sem COLLATE bin).
- Mappers `financier.mapper`/`collaborator.mapper`: serialização achatada + reconstrução de VO na leitura.

### Borda HTTP
- `financier-schemas`/`schemas` (collaborator): `bankAccount`/`pixKey` em detail + create (`nullable().default(null)`). PUT do collaborator **omite** banco/PIX (edita só cadastrais — escopo da US1 é create+detail). DTOs incluem os blocos. Erro do payment target → 422 (default de escrita).
- Use cases `register-financier`/`edit-financier`/`register-collaborator`: command com banco/PIX opcional, normalizado `?? null`.

## Decisões registradas (W2)
- **Opcionalidade no input do domínio** (`bankAccount?`): evita quebrar os 11+ fixtures legados que chamam `register` sem banco/PIX (aditivo backward-compatible).
- **Promoção do VO p/ `domain/shared/`** (em vez de duplicar): corrige acoplamento (Act já importava de supplier).

## Resultado
Gate W3 verde (ver `005-quality/REPORT.md`). Sem regressão: suite completa 2671 pass / 0 fail.
