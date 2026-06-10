## O que é este PR

Rodada de **handoff ao frontend**: fecha o backlog de gaps de backend que destravam telas do
front e entrega um **documento único de API + breaking changes** para a equipe de front. Base: `dev`
(25 commits). Toca 4 áreas — Parceiros, Auth/Conta, Contratos e Docs/infra.

> 📄 **Comece por aqui:** [`docs/05-frontend-api-handoff.md`](../../docs/05-frontend-api-handoff.md) —
> referência endpoint-a-endpoint de toda a superfície HTTP + seção de breaking changes em ordem de
> impacto + checklist de migração.

## ⚠️ Breaking changes (para quem já integrou)

1. **ACT reescrito: pessoa-física → Acordo de Cooperação Técnica** (`/api/v1/acts`). Sai
   `cpf`/`role`/`startOfContract`/`employmentRelationship`/`registrationStatus`; entra `cnpj`,
   `corporateName`, `fantasyName`, `legalRepresentative`, `actNumber` (único), vigência
   `startDate`/`endDate`, `hasFinancialTransfer` + `bankAccount`/`pixKey` (repasse condicional).
2. **Senha mínima 8 → 12** (OWASP 2025). Consumir `GET /api/v2/auth/password-policy` (não hardcode).
3. **Minha Conta:** e-mail editável em `PUT /api/v1/me`; **CPF imutável** no autosserviço.
4. **Fornecedor** ganhou `serviceRating` (`RUIM|REGULAR|BOM|OTIMO`) + `ratingComment`.
5. **Contratos:** numeração gerada pelo backend (não enviar `sequentialNumber`/`amendmentNumber`);
   distrato (`POST /contracts/:id/end`) com motivo + documento `signed_termination`; cancelamento
   via `DELETE /contracts/:id` (Pending→Cancelled); bloco `program` composto no detalhe.

## Entregas por área

### Parceiros (`partners`)
- **EPIC-PAR-ACT-ACORDO** — reescrita vertical completa do ACT (domínio → persistência → use cases →
  HTTP → export → contractor-view + seed). Ticket `PAR-ACT-ACORDO` closed-green (W0→W3).
- `PAR-SUPPLIER-AVALIACAO` — avaliação de fornecedor.
- `PAR-GEO-ADDED-MUNICIPALITIES` — `GET /api/v1/partner-municipalities/added` (parceiros cross-state).

### Auth / Conta
- `USR-ME-PHOTO` — foto de perfil no autosserviço (`PUT`/`DELETE /me/photo`).
- `USR-PASSWORD-POLICY` — política OWASP (min 12) + `GET /password-policy`.
- `USR-ME-PROFILE-FIELDS` — e-mail editável / CPF imutável.
- `USR-SEED-PERMISSIONS` — preset de permissões de admin para dev.

### Contratos
- `CTR-NUMBER-PROGRAM` — read port de programs + bloco `program` no detalhe do contrato.
- Numeração gerada + cancelamento + `signedAt`/número de aditivo; remove CLI embutida.
- `CTR-HTTP-DISTRATO-DOCUMENTO` — motivo do distrato persistido no agregado + evento.

### Docs / infra
- `docs/05-frontend-api-handoff.md` (handoff do front).
- Runbook de setup do stack local (MinIO + MySQL) + RBAC/seed.
- Higiene do kanban; remoção do `handbook/domain/` legado.

## Migrations (aplicar no deploy)
- `partners`: `0007_cheerful_justin_hammer`, `0008_act_acordo_rewrite` (DROP+CREATE de `par_acts` — D3:
  ACTs eram só seed de teste, sem produção).
- `contracts`: `0009`–`0013` (numeração, distrato, program, etc.).

## Qualidade (gate W3 verde)
- `pnpm run typecheck` ✅ 0 erros · `pnpm run format:check` ✅ · `pnpm run lint` ✅ ·
  `pnpm test` ✅ **2585 pass / 0 fail** (17 skip de integração opt-in).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
