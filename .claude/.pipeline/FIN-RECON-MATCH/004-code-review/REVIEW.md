# Code Review — Ticket FIN-RECON-MATCH (#121) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-18T17:55Z
**Escopo revisado:**

- `domain/reconciliation/match-score.ts` (VO + compute + band + evaluateCriteria)
- `application/use-cases/{suggest-matches,reject-suggestion}.ts`
- `application/ports/{suggestion-view,rejected-suggestion-repository}.ts`
- `adapters/persistence/repos/{suggestion-view,rejected-suggestion-repository}.{in-memory,drizzle}.ts`
- `adapters/http/{plugin,composition,schemas,dto,error-mapping}.ts`
- testes (match-score, use-cases, http, integração)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Domínio puro (sem `throw`/`class`/`any`/`new Date()`); R1 respeitado (suggestMatches é read-only,
não concilia); sem violação de ADR; sem bug funcional (CA1–CA6 + integração verdes).

### 🟡 Importante

Nenhuma.

### 🔵 Sugestão (estilo / heurística / doc)

- **`compute` usa `as MatchScore`** (`match-score.ts`) fora do smart constructor `fromValue`. É **defensável**:
  `compute` é ele próprio um constructor do VO e o total é 0–100 por construção (Σ pesos = 100), com comentário
  explicando. Alternativa: rotear por `fromValue(total)` (exige tratar o ramo `err` impossível). Mantido.
- **`memoRef` com nº de documento curto** pode dar falso-positivo (`memo.includes('1')`). Peso médio (10) e o
  score é heurística sob confirmação humana (R1) — impacto baixo. Endurecer (ex.: match por token/`\b`) cabe no #140.
- **`supplierOpenCount`** = nº de candidatos `Paid` que compartilham o fornecedor (proxy do critério "títulos
  abertos do fornecedor", peso baixo). Interpretação documentada no REPORT; refinar com a semântica exata é #140.
- **Doc do port `rejected-suggestion-repository.ts`**: comentário do `listByTransaction` diz "FITID das duplas"
  — deveria ser "payableIds das duplas". Typo de comentário (1 palavra).

---

## O que está bom

- **Score determinístico e puro** (D-MATCH): `compute` aplica pesos a `MatchCriteria`; `evaluateCriteria` isola a
  comparação (favorecido normalizado, valor exato, data D0, memo contém ref) — tudo testável e auditável; **R1**
  garantido por separar cálculo (read) de efeito (conciliação é comando à parte, #123).
- **VO `MatchScore`** com smart constructor `fromValue` (range + inteiro) + `band` (faixas exatas do data-model).
- **`suggestMatches`** read-model limpo: exclui rejeitadas + band `baixa`, ordena desc, deriva `supplierOpenCount`
  da própria lista (sem query extra). `MatchSuggestion.band` tipado `Exclude<MatchBand,'baixa'>` (type-safe com o schema).
- **Reuso da tabela `fin_rejected_suggestions`** (migration 0006/#123) — sem migration nova; rejeição idempotente
  via `ON DUPLICATE KEY UPDATE` no UNIQUE `(transaction_id, payable_id)`.
- **SuggestionView Drizzle** = JOIN `fin_payables × fin_documents × fin_supplier_view` (LEFT no read-model de
  fornecedor → degradação graciosa quando vazio); boundary try/catch → `Result`.
- **Borda** no padrão do módulo (Zod, RBAC `reconciliation:read`/`:write`, band `baixa` não retornada — FR-011).
- **Testes** cobrem domínio (faixas/score), use-cases (ordenação/exclusão/rejeição/not-found), HTTP (200/reject/403)
  e integração (JOIN real + idempotência da rejeição).

---

## Resolução pós-review (a pedido do humano — "faça as sugestões")

- **🔵 #1 (cast em `compute`):** **RESOLVIDO** — `compute` agora faz **clamp** a `[0,100]` antes do cast,
  blindando o VO mesmo se os pesos mudarem (cast incondicionalmente seguro).
- **🔵 #2 (`memoRef` falso-positivo):** **RESOLVIDO** — match por **fronteira de palavra** (`\b` + escape de
  regex) em vez de substring; doc `'1'` não casa em `'1000'`. Teste de domínio adicionado (memoRef + payeeMatch/dateD0).
- **🔵 #4 (typo de doc):** **RESOLVIDO** — comentário do `listByTransaction` corrigido ("FITID" → "payableIds").
- **🔵 #3 (`supplierOpenCount`):** mantido (proxy documentado); refino fino permanece escopo do **#140**.

Re-gate: typecheck ✅ · format ✅ · lint ✅ · `pnpm test` ✅ **2815/0** (+2 testes de `evaluateCriteria`).

## Próximo passo

- **APPROVED** (com 🔵 aplicados) → avançar para **W3** (`ts-quality-checker`): gate + `test:integration:financial`.
