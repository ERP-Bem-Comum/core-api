[← Voltar para ADRs](./README.md)

# ADR-0035: Parceria territorial (estados/municípios) — Entity persistida com soft-delete (resolve D9 do ADR-0031)

- **Status:** Accepted
- **Date:** 2026-06-06
- **Deciders:** Gabriel Aderaldo + Arquiteto técnico
- **Resolve:** **questão aberta D9** do [ADR-0031](./0031-partners-registry-module.md) — _"partner-states/municipalities: hard delete (legado) vs soft-delete padronizado"_.
- **Relacionado:** [ADR-0031](./0031-partners-registry-module.md) (módulo `partners`), [ADR-0014](./0014-mysql-database-isolation.md) (isolamento, prefixo `par_*`), [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) (sem JSON/ENUM nativos), [ADR-0033](./0033-api-versioning-v1-legacy-mirror.md) (`/api/v1` espelho legado), [ADR-0006](./0006-modular-monolith-core-api.md) (módulo extraível).
- **Origem:** épico `core-api` `specs/001-partners-http-gaps/` (ticket `PARTNERS-TERRITORY`); promove o ADR de feature `specs/001-partners-http-gaps/adr/0001-territorial-partnership-soft-delete.md`.

---

## Contexto

O ADR-0031 criou o módulo `partners` mas deixou a **D9** em aberto: como modelar a marcação de um
estado/município como "parceiro". No legado, geografia era catálogo e a parceria era hard-deletada. O
frontend (épico `web-app/specs/008-partners/`) precisa marcar/desmarcar localidades com persistência, e
operava em **mock total** até esta decisão (ver `api-readiness-report.md`).

No core-api, geografia já existia como **catálogo read-only** (`domain/geography/state.ts`,
`municipality.ts` — seed estático, decisão D7 do ADR-0031), **sem** tabela de parceria, sem toggle. O
módulo `partners` já tinha um **padrão consolidado de soft-delete** (`active` + `deactivated_at` + CHECK de
coerência) em `par_financiers`/`par_suppliers`/`par_collaborators`.

## Decisão

1. A parceria territorial é uma **Entity persistida** — `PartnerState` (identidade `uf`) e
   `PartnerMunicipality` (identidade `ibge_code`, + `uf` para listagem cross-state) — **não** Value Object,
   porque a decisão de soft-delete lhe dá **ciclo de vida** (Active ↔ Inactive) e continuidade identificável.
2. **Soft-delete padronizado** (resolve D9): `active boolean NOT NULL DEFAULT true` + `deactivated_at
   datetime(3) NULL` + CHECK `(active = FALSE) = (deactivated_at IS NOT NULL)` — **idêntico** ao padrão dos
   demais agregados `par_*`. Desmarcar = inativar; marcar = criar/reativar (idempotente). **Não** hard delete.
3. Novas tabelas `par_states` / `par_municipalities` (prefixo `par_*`, ADR-0014), migrations geradas por
   Drizzle Kit (ADR-0020). O catálogo geográfico permanece read-only imutável; a parceria o **referencia**.
4. Borda HTTP sob `/api/v1` (ADR-0033): `GET/POST/DELETE /partner-states` e `/partner-municipalities`,
   RBAC `geography:read`/`geography:write`, envelope de erro `{ error: { code, message, requestId } }`.

## Por que soft-delete (e não o hard delete do legado)

- **Consistência de padrão**: o módulo inteiro usa soft-delete; hard delete seria a exceção.
- **Auditabilidade**: `deactivated_at` preserva quando a parceria foi desfeita (o legado perdia o fato).
- **Reversibilidade barata**: reativar = `active=true`, sem recriar histórico.
- **Custo aceito**: linhas inativas acumulam; mitigado por índice em `active` e volume baixo (≤27 UFs;
  municípios na casa de milhares).

## Consequências

- **Positivas**: D9 fechada; padrão único de soft-delete no módulo; destrava os 2 sub-domínios territoriais
  do frontend (saem do mock) sem que UI/ViewModel mudem na troca mock→real.
- **Negativas / custo**: 2 tabelas + migration + repos (Drizzle + in-memory) + plugin; divergência consciente
  com o `domain.md` do frontend (que os modelou como VO de referência — lá sem persistência).
- **Reversibilidade**: a Entity é pequena; migrar para hard delete depois seria DROP de colunas + ajuste de
  repo, isolado da borda.

## Alternativas consideradas

| Alternativa | Por que rejeitada |
|---|---|
| **Hard delete** (espelho do legado) | Quebra o padrão de soft-delete do módulo; perde auditoria; ganho marginal. |
| **VO de referência** (como o frontend) | Sem persistência não há ciclo de vida; o backend precisa persistir → vira Entity. |
| **Agregado territorial único** (lista de UFs) | Viola a regra de agregados pequenos (Vernon); cria contenção e invariante inexistente entre UFs. |

## Referências

- `specs/001-partners-http-gaps/adr/0001-territorial-partnership-soft-delete.md` — ADR de feature (origem), com a citação canônica (Vernon, *Implementing DDD*, p.1 / agregados pequenos).
- `specs/001-partners-http-gaps/domain.md` — modelagem `PartnerState`/`PartnerMunicipality` (Entity, citações Evans/Vernon).
- `web-app/specs/008-partners/api-readiness-report.md` — relatório que originou o épico.
