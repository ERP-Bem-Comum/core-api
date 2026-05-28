# W2 — REVIEW — CTR-SKILL-REFRESH-D

> **Veredito:** APPROVED — round 1.

**Reviewer:** code-reviewer
**Data:** 2026-05-20
**Escopo revisado:**
- `.claude/skills/ts-domain-modeler/SKILL.md` (604 linhas — único arquivo modificado pelo ticket)
- `src/modules/contracts/domain/contract/types.ts` (verificação cruzada de fidelidade)
- `src/modules/contracts/domain/amendment/types.ts` (verificação cruzada de fidelidade)
- `src/modules/contracts/domain/shared/non-zero-money.ts` (verificação cruzada de fidelidade)
- `src/modules/contracts/domain/contract/contract.ts` (verificação cruzada — parseActive + terminate)
- `src/modules/contracts/domain/contract/errors.ts` (verificação cruzada — tagged errors)
- `src/modules/contracts/application/use-cases/create-amendment.ts` L77-88 (rota γ)

---

## Verificador W0

```
Verificando: .claude/skills/ts-domain-modeler/SKILL.md
---
[PASS] CA1: Seção §3.D existe (## §3.D — Tagged Errors & Invariantes em Tipos)
[PASS] CA2: 6 sub-seções presentes (Tagged Errors, State Machine, Invariantes, Aninhamento, Tabela DO/DON'T, Tickets vivos)
[PASS] CA3: Contagem exata declarada: **DO (10)**, **DON'T (7)**, **CONSIDER (2)** presentes
[PASS] CA4: Nomenclatura semântica: 'VO como Prova', 'Agregado como Guardião', 'Caso de Uso como Orquestrador'
[PASS] CA5: Aninhamento ≠ cross-product: ambos os termos presentes no arquivo
[PASS] CA6: 4 tickets vivos referenciados (TAGGED-ERRORS, STATE-MACHINE-CONTRACT, STATE-MACHINE-AMENDMENT, INVARIANT-CONTEXTUAL)
[PASS] CA7: Checklist (3 itens: tagged records, tipo refinado, assinatura refinada) + antipatterns (2: assertPending, 3×4=12)
[PASS] CA8: src/ e tests/ intocados pelo ticket (zero arquivos staged em src/ e tests/)
[PASS] CA9: Fidelidade ao código vivo: ActiveContract, status:'Active', PendingWithoutDocumentAmendment, NonZeroMoney
---
Result: 9/9 PASSED
Status: GREEN — todos os critérios satisfeitos.
```

**Observação sobre CA8:** `git status --porcelain src/ tests/` retorna arquivos com status ` M` (modified no working tree, não staged) e `??` (untracked) — todos eles são de tickets anteriores ao `CTR-SKILL-REFRESH-D`. O script usa corretamente `git diff --cached`, que retornou zero arquivos staged, confirmando que este ticket documental não tocou `src/` nem `tests/`.

---

## Sumário audit qualitativo

- Cobertura dos critérios: **9/9**.
- Eixos auditados: **10** (ratio legis, fidelidade ao código vivo, links válidos, nomenclatura semântica, heurística α/β/γ, aninhamento ≠ cross-product, exemplos compilam, coerência com handbook, anti-patterns, checklist).
- Issues encontradas: **2** (0 críticas, 2 médias, 0 baixas).

---

## Issues por arquivo:linha

### `.claude/skills/ts-domain-modeler/SKILL.md:361-362` — Divergência de assinatura — MÉDIA

**Categoria:** Fidelidade ao código vivo (CA9 qualitativo).

**Problema:** As assinaturas de `expire` e `terminate` no snippet ilustrativo da §3.D.2 divergem do código real em dois pontos:

1. `terminate` declara `by: UserRef` como terceiro parâmetro — parâmetro que **não existe** no código real (`contract.ts` L147: `terminate(contract: ActiveContract, at: Date)`).
2. Os tipos de evento `ContractExpired` / `ContractTerminated` não existem como tipos standalone; o código real usa `ContractEvent` (union discriminada via `type` field).

```ts
// SKILL.md L361-362 — snippet atual (divergente)
expire(c: ActiveContract, at: Date): Result<{ contract: ExpiredContract; event: ContractExpired }, ContractError>
terminate(c: ActiveContract, by: UserRef, at: Date): Result<{ contract: TerminatedContract; event: ContractTerminated }, ContractError>

// src/modules/contracts/domain/contract/contract.ts L109-112 e L147-150 — código real
const expire = (
  contract: ActiveContract,
  at: Date,
): Result<{ contract: ExpiredContract; event: ContractEvent }, ContractError.ContractError>

const terminate = (
  contract: ActiveContract,
  at: Date,
): Result<{ contract: TerminatedContract; event: ContractEvent }, ContractError.ContractError>
```

**Impacto:** Médio. Um desenvolvedor usando este trecho como referência adicionaria `by: UserRef` e `ContractExpired/ContractTerminated` ao código real sem precisar. O snippet é doc — não compila — mas induz erro de modelagem.

**Fix sugerido (para W3 ou ticket de housekeeping posterior):**
```ts
// Correção das assinaturas na §3.D.2
expire(c: ActiveContract, at: Date): Result<{ contract: ExpiredContract; event: ContractEvent }, ContractError>
terminate(c: ActiveContract, at: Date): Result<{ contract: TerminatedContract; event: ContractEvent }, ContractError>
```

---

### `.claude/skills/ts-domain-modeler/SKILL.md:99` — throw no exhaustive switch — MÉDIA (pré-existente)

**Categoria:** Consistência interna da SKILL.md.

**Problema:** A seção "Obrigações" (L99) — **pré-existente à §3.D, não introduzida por este ticket** — exibe `throw new Error(...)` no `default` do exhaustive switch:

```ts
default: { const _exhaustive: never = amendment; throw new Error(`unreachable: ${_exhaustive}`); }
```

Isso contradiz:
- A regra invariante do `CLAUDE.md` (zero `throw` no domínio).
- O próprio DON'T D§19 da §3.D recém-inserida (assertActive que lança).
- O padrão vigente no `src/` (nenhum switch de domínio usa `throw` no default).

**Nota de escopo:** Esta inconsistência precede o ticket `CTR-SKILL-REFRESH-D` e, portanto, **não bloqueia** este veredito. Registrada para rastreabilidade — deve ser corrigida em ticket de housekeeping da SKILL.md (sugestão: incluir em `CTR-SKILL-REFRESH-B` ou novo ticket `CTR-SKILL-HOUSEKEEPING-EXHAUSTIVE`).

**Fix sugerido:**
```ts
// antes (L99)
default: { const _exhaustive: never = amendment; throw new Error(`unreachable: ${_exhaustive}`); }

// depois
default: { const _: never = amendment; return _; }
```

---

## Cobertura dos 9 CAs — audit qualitativo

| CA | Status | Evidência qualitativa |
| :--- | :--- | :--- |
| CA1 — §3.D existe | PASS | `## §3.D — Tagged Errors & Invariantes em Tipos` em L261; posicionado após "Templates rápidos" (L223) e antes de "Workflow" (L540). |
| CA2 — 6 sub-seções | PASS | §3.D.1 L266, §3.D.2 L341, §3.D.3 L399, §3.D.4 L448, §3.D.5 L495, §3.D.6 L529. Títulos identificáveis. |
| CA3 — 10 DO + 7 DON'T + 2 CONSIDER | PASS | Cabeçalhos `**DO (10)**`, `**DON'T (7)**`, `**CONSIDER (2)**` presentes em L499, L512, L522. Contagem manual: 10 bullets DO, 7 bullets DON'T, 2 bullets CONSIDER — exata. |
| CA4 — Nomenclatura semântica | PASS | "VO como Prova" (L403, L407, L439, L507), "Agregado como Guardião" (L405, L440, L508), "Caso de Uso como Orquestrador" (L405, L421, L441, L507). Cada nome aparece na tabela, no corpo expandido e na heurística. |
| CA5 — Aninhamento ≠ cross-product | PASS | "NUNCA cross-product (3 status × 4 kinds = 12 tipos)" em L450. Seção "Por que não cross-product?" com 3 bullets explicativos em L479-483. Exemplo canônico do Amendment com aninhamento em L455-477. |
| CA6 — 4 tickets vivos | PASS | Tabela §3.D.6 (L531-536) com os 4 IDs. Pasta `.claude/.pipeline/CTR-DOMAIN-TAGGED-ERRORS/` confirmada como existente. |
| CA7 — Checklist + antipatterns | PASS | 3 itens novos no checklist (L564-566): tagged records, tipo refinado, assinatura refinada — todos acionáveis. 2 linhas novas nos antipatterns (L581-582): assertPending, cross-product — ambas com explicação do motivo e correção. |
| CA8 — src/ e tests/ intocados | PASS | `git diff --cached --name-only -- src/ tests/` retornou zero. Modificações no working tree são de tickets anteriores. `pnpm run typecheck` e `pnpm run lint` zerados. |
| CA9 — Fidelidade ao código vivo | PASS (com ressalva na issue MÉDIA acima) | `ActiveContract`/`ExpiredContract`/`TerminatedContract` em L348-352: match perfeito com `types.ts:35-50`. `PendingWithoutDocumentAmendment` em L383-387: match com `amendment/types.ts:56-62`. `NonZeroMoney` em L414-418: match perfeito com `non-zero-money.ts:37-43`. Rota γ em L426-434: match perfeito com `create-amendment.ts:77-88`. Único desvio: assinatura de `terminate` inclui `by: UserRef` ausente no código real (issue MÉDIA registrada). |

---

## O que está bom

**Ratio legis presente e bem fundamentado.** Cada sub-seção descritiva (§3.D.1 a §3.D.4) termina com bloco `> **Ratio legis:**` que justifica o padrão com referência teórica (Wlaschin "Parse, don't validate", Evans). Isso é o que transforma a SKILL.md de "lista de regras" para "guia com fundamentos" — exatamente o objetivo do ticket.

**Fidelidade exemplar em 4 dos 5 snippets críticos.** Os trechos de `ActiveContract`, `NonZeroMoney.from`, rota γ (`createAmendment`) e `parseActive` reproduzem o código vivo com precisão cirúrgica — incluindo nomes de variáveis, tipo de retorno e estilo de formatação.

**Heurística α/β/γ clara e acionável.** A tabela de 3 rotas (L401-406) com "quando usar" e "exemplo vivo" seguida da heurística de escolha (L437-442) resolve a ambiguidade de quando usar cada rota — que era o gap central do bloco D.

**Aninhamento explicado com exemplo numérico.** "3 status × 4 kinds = 12 tipos" como anti-padrão explícito + a seção "Por que não cross-product?" com bullets de justificativa torna a regra memorável e defensável em code review.

**Checklist e antipatterns ficaram acionáveis.** Os 3 itens do checklist e as 2 linhas de antipattern são verificáveis em qualquer diff — não são vagos nem redundantes com o que já existia.

**Consistência de nomenclatura semântica.** Os 3 nomes canônicos (VO como Prova / Agregado como Guardião / Caso de Uso como Orquestrador) aparecem de forma consistente em 4 contextos cada: tabela de rotas, corpo expandido, heurística e tabela DO — reforço pedagógico correto.

---

## Próximo passo

**W3 QUALITY.** Nenhuma issue crítica. As 2 issues médias registradas:
- Issue L361-362 (assinatura de `terminate` divergente): corrigível em housekeeping posterior ou junto ao próximo `CTR-SKILL-REFRESH-*` que tocar §3.D.2. Não bloqueia W3.
- Issue L99 (throw no exhaustive switch pré-existente): pré-existe ao ticket, não introduzida por W1. Abrir `CTR-SKILL-HOUSEKEEPING-EXHAUSTIVE` ou incluir em `CTR-SKILL-REFRESH-B` ao cobrir a seção "Regras Não-Negociáveis".

`ts-quality-checker` deve rodar: `pnpm run typecheck` + `pnpm run lint` + `pnpm run format:check` + `pnpm test`. Como o ticket é estritamente documental, espera-se zero regressão em todos os gates.
