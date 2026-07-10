# W1 — GREEN — BGP-OPTIONS-REF-UUID (#394)

**Agentes:** `ts-domain-modeler` (domínio) + `zod-expert` (schemas) · **Data:** 2026-07-10

## Decisão de contrato (validada com o Gabriel)
Identidade da Rede = **chave natural** (UF de 2 letras para estado, código IBGE de 7 dígitos para município), **não UUID**. Fundamentação:
- O catálogo de geografia é **estático e imutável** (`partners/domain/geography/state.ts`, `municipalities.data.ts`) — não há nem nunca haverá UUID de rede; a chave natural (UF/IBGE) é oficial, única e estável.
- Lookup O(1) já existe via `Map<string, …>` (`state.ts:57` `BY_ABBREVIATION`) — chave natural em hashMap é O(1) igual a UUID (Ramakrishnan §8.4.6/§12.2.2: hash indexa **qualquer** atributo, não exige UUID). UUID em memória seria indireção + risco de identidade instável (dado órfão a cada boot).
- **Não relaxar** (`z.string()` cru descartaria validação): valida-se o **formato certo** (UF/IBGE), mais estrito que o `z.uuid()` indevido.

## Mudanças (produção)
1. **Domínio** `budget-plans/domain/shared/refs.ts`: `PartnerStateRef` valida **UF** (`/^[A-Z]{2}$/`), `PartnerMunicipalityRef` valida **IBGE** (`/^[0-9]{7}$/`). `ProgramRef` segue UUID (Programa é entidade gerada). Antes: os três usavam `isUuidV4` (rótulo trocado).
2. **Schemas** `budget-plans/adapters/http/schemas.ts`: helper `networkRefSchema` (`/^([A-Z]{2}|[0-9]{7})$/`) aplicado aos **4 pontos** que tratavam rede/partner como UUID:
   - `redes[].ref` (GET /options — response)
   - `addBudgetBodySchema.partnerRef` (POST /budgets — **input**, era o gargalo do #319)
   - `budgetDetailItemSchema.partner.ref` (GET /:id — response)
   - `budgetResponseSchema.partner.ref` (POST 201 — response)

## Testes (11 arquivos) — seeds tornados fiéis à produção
UUIDs de rede substituídos por chave natural (`'CE'` / `'2304400'`) em: `_support.ts`, `budget-plan.test.ts`, `budget-plans.routes`, `budget-crud.routes`, `consolidated.routes`, `consolidated.drizzle-mysql`, `budget-plan-repository.suite`, `current-approved`, `delete-budget`, `start-calibration` (+ os que importam `_support`). Todos mascaravam o bug com UUID.

## Evidência
```
budget-plans (não-integração): arquivos=34 tests=198 pass=198 fail=0
```
- CA1 `/options` → 200 com `redes[].ref` = chave natural.
- CA2 create budget com `'CE'` → 201 (antes: 422 `budget-plan-ref-invalid` no domínio).

## Nota de rigor (fail-first)
RED **capturado** para `/options` (W0). Para os pontos 2/3/4 + `refs.ts`, o RED é a **mesma causa-raiz** (validação de formato exigindo UUID de chave natural): com o `refs.ts` antigo (`isUuidV4`), os testes de create/consolidado com `'CE'` falhariam no rehydrate. Extensão feita na mesma leva por coesão (defeito único, mesmo arquivo).

## Persistência
Sem migration: `partner_ref` é `varchar(36)` — `'CE'`/`'2304400'` cabem. Mapper Drizzle (`budget-plan.mapper.ts`) rehidrata via os VOs corrigidos → validação x99 recomendada antes do merge (testes `*.drizzle-mysql` pulam sem DB).
