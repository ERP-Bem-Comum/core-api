# W1 — Implementação · FIN-CEDENTE-TYPE-EXTEND (#206)

**Outcome:** GREEN · **Data:** 2026-06-22

Extensão aditiva em 6 camadas + migration:

1. **Domínio** `cedente/types.ts`: `AccountType` e `ACCOUNT_TYPES` += `'cartao' | 'outro'`; `typeLabel?`
   em `CedenteAccount` + `CreateInput`. `cedente-account.ts`: `create` plota `typeLabel` (o guard
   `ACCOUNT_TYPES.includes` passa a aceitar cartao/outro automaticamente).
2. **Drizzle** `schemas/mysql.ts`: coluna `type_label varchar(120)` nullable; CHECK `fin_cedente_accounts_type_chk`
   relaxado p/ incluir `'cartao','outro'`.
3. **Migration** `0019_aromatic_toad_men.sql` (via `db:generate:financial`): DROP CHECK + ADD COLUMN +
   ADD CHECK novo. Drizzle 0.45 diffou o CHECK corretamente — sem hand-edit.
4. **Mapper** `cedente-account.mapper.ts`: `toRow`/`toDomain` mapeiam `typeLabel`.
5. **Use-cases**: `create-cedente-account` (input + plota); `edit-cedente-account` (`typeLabel`
   sempre-editável — fora do guard de dados bancários FR-008).
6. **Borda HTTP**: `schemas.ts` (enum += cartao/outro; `typeLabel` opcional no create/edit + response);
   `plugin.ts` (DTO `cedenteAccountToDto` expõe `typeLabel`; handlers create/edit repassam `b.typeLabel`).

**Ripple:** `cedente-account.mapper.test.ts` (row fixture ganhou `typeLabel: null`).

**Verificação:** domínio #206 GREEN (3/3); `pnpm test` **3115/0**; `test:integration:financial` **51/51**
(novo caso `#206`: cartao/outro + `typeLabel` round-trip no Drizzle — prova CHECK relaxado + coluna).
Conciliação inalterada (type-agnóstica) — CA3 sem código.
