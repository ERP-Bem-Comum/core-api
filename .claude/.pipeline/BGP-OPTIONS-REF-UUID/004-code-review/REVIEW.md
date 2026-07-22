# W2 — REVIEW — BGP-OPTIONS-REF-UUID (#394)

**Skill:** `code-reviewer` + agente `zod-expert` · **Round 1** · **Veredito: REJECTED (escalado ao humano)**

## Resumo
O fix W1 (relaxar `redes[].ref` de `z.uuid()` → `z.string()`) faz `/options` retornar 200, mas o audit revelou que **#394 não é um bug de schema isolado — é uma bifurcação arquitetural sobre a identidade de "Rede"**, com contradição interna no módulo e desalinhamento com a intenção documentada da #404. Não deve seguir para W3/PR sem decisão humana.

## BLOCKER-1 — Contradição interna options ↔ create budget
- `/options` (`partner-network.from-partners.ts`) projeta `redes[].ref` = **chave natural (UF/IBGE)** — é tudo que existe hoje.
- `POST /budget-plans/:id/budgets` valida `partnerRef` via domínio `refs.ts:15-16` → `isUuidV4(raw) ? ok : err('budget-plan-ref-invalid')` — **exige UUID v4**.
- Logo o front recebe `'CE'`/`'2304400'` de `/options` e **não consegue criar orçamento por rede** (domínio rejeita). O ciclo está quebrado dos dois lados.

## BLOCKER-2 — Mesmo defeito em 4 pontos (família), todos mascarados por seed UUID
| Ponto | Local | Tipo | Efeito com ref natural |
| :- | :- | :- | :- |
| 1 | `schemas.ts` `redes[].ref` (/options) | response | 500 — **corrigido no W1** |
| 2 | `schemas.ts:349` `addBudgetBodySchema.partnerRef` | **input** | 400/422 — bloqueia criar orçamento |
| 3 | `schemas.ts:76` `budgetDetailItemSchema.partner.ref` (GET /:id) | response | 500 |
| 4 | `schemas.ts:358` `budgetResponseSchema.partner.ref` (POST 201) | response | 500 |
- Ponto **2 (input) é a causa REAL do #319 vir 0** — sem criar orçamento por rede, o consolidado agrega 0. `/options` sozinho **não** desbloqueia #319.
- Todos os testes mascaram: seed usa UUID (`STATE_REF='5555…'`, `STATE_CE='4444…'`) em vez da chave natural real.

## BLOCKER-3 — Direção contrária à intenção da #404
- `geography-read.ts:8-11`: identidade UUID de rede = "**futura entidade de orçamento por parceiro — Fatia 3, fora deste port**". **Não existe hoje.**
- #404 (P.O.) pede: "**#394 `ref` de rede como UUID + semear geografia**" — i.e., a direção Fatia-3 (UUID), oposta ao W1 (string).
- Pela cobrança [[adr-over-code-precedent-for-adherence]]: julgar pela intenção/domínio, não pelo comentário provisório do adapter.

## Decisão requerida (humano)
Escolher a identidade canônica de Rede (chave natural agora vs UUID/Fatia 3). O W1 fica suspenso até a decisão. `#394` deixa de ser quick-win S isolado — está acoplado a `refs.ts`, aos 4 schemas, ao adapter de geografia e ao #341/#317 (Fatia 3).

---

## Round 2 — APPROVED (após decisão: chave natural)

**Data:** 2026-07-10 · **Decisão do Gabriel:** identidade de Rede = **chave natural (UF/IBGE)**, não UUID (fundamentação em `003-impl/REPORT.md`: catálogo estático, O(1) já garantido por hashMap com chave natural, UUID em memória = indireção + dado órfão).

Verificação dos 3 blockers após a reimplementação:
- **BLOCKER-1** (contradição options↔create) → **RESOLVIDO**: `refs.ts` passa a validar UF/IBGE; create budget com `'CE'` → 201.
- **BLOCKER-2** (família de 4 pontos) → **RESOLVIDO**: `networkRefSchema` nos 4 pontos; grep confirma zero `z.uuid()` em rede/partner.
- **BLOCKER-3** (direção contrária à #404) → **REORIENTADO**: a intenção "UUID" da #404 foi refutada pela análise (a própria issue #394 autoriza a alternativa; a Fatia 3 UUID não existe e seria indireção). Chave natural é a decisão canônica.

Achados de qualidade: validação **mais estrita** que o UUID indevido (rejeita lixo, aceita só UF/IBGE); testes tornados fiéis (fim do mascaramento por UUID). Sem `z.uuid()` residual, typecheck/lint limpos. **Veredito: APPROVED.**
