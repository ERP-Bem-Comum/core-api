# Code Review — FIN-DOC-SEARCH — Round 1

**Veredito:** APPROVED

**Reviewers (painel adversarial, 3 independentes):**
- `code-reviewer` (skill) — regras de camada + clean code
- `drizzle-orm-expert` (agente) — LIKE/escape/JOIN/count/collation/ADR-0020
- `security-backend-expert` (agente) — injeção/ReDoS/bounds/exposição

**Data:** 2026-07-09 · **Escopo:** document-repository.{drizzle,in-memory}.ts, domain/document/query.ts, http/{schemas,plugin}.ts + testes.

## Consolidação

| Reviewer | Veredito | Blocker | Major | Minor |
| --- | --- | --- | --- | --- |
| code-reviewer | APPROVED | 0 | 0 | 2 |
| drizzle-orm-expert | APPROVED | 0 | 0 | 3 |
| security-backend-expert | APPROVED | 0 | 0 | 2 |

**Nenhum achado bloqueante.**

## Confirmações-chave
- **COUNT não infla** (drizzle): `finSupplierView.supplierRef` é PK → LEFT JOIN 1:0..1; `recon` é GROUP BY (1:0..1); ambos ancorados em `finDocuments`, sem produto cartesiano. Provado por `mine.length === 1` na CA4.
- **Escape correto p/ MySQL 8.4** (drizzle): `like()` bind-param (não concatena); `sql_mode` do projeto sem `NO_BACKSLASH_ESCAPES` → `\` é escape default. `%`/`_`/`\` viram literais.
- **Case-insensitive** (drizzle): colunas herdam `utf8mb4_unicode_ci` (sem `_bin` explícito) → CA1 garantido pelo schema.
- **Sem SQLi** (security, CWE-89 N/A): termo é parâmetro bindado. **Sem ReDoS** (CWE-1333 N/A): regex de escape é O(n) char-class. Rota autenticada + rate-limit 200/min.
- **Sem IDOR novo**: `q` só adiciona predicado sobre o dataset já autorizado (`FINANCIAL_PERMISSION.read`); LEFT JOIN supplier_view já existia.

## Minor aplicados nesta rodada (recomendados pelos revisores)
1. **Guard de caracteres de controle no `q`** (security Minor-2) — `.regex(/^[^\x00-\x1F\x7F]*$/)` espelhando `paymentDetailInput`. Defesa em profundidade (log/export futuro). ✅ aplicado em `schemas.ts`.
2. **Referência stale no 000-request** (drizzle Minor A) — corrigida de `payable-list-view` → `document-repository`. ✅
3. **Caso x99 de wildcard literal** (drizzle Minor C) — semeia `documentNumber` com `%` e prova `q='50%'` casa literal e `q='%'` não vira coringa, contra MySQL real. ✅ adicionado ao teste de integração.

## Minor não aplicados (registro)
- **Full scan `LIKE '%q%'`** (security Minor-1 / drizzle Minor 4) — decisão de design documentada (sem migration); `slow-query-log` (`long_query_time=1`) captura organicamente; ADR-0020 já permite FULLTEXT como próximo passo se o volume crescer. **Não é bug** — YAGNI.
- **CA4 x99** (drizzle Minor B) — parte da DoD; será executado no x99 antes de fechar o W3.

## Próximo (W3)
Gate: typecheck + format:check + lint + test. CA4 + CA3-x99 validados no x99.
