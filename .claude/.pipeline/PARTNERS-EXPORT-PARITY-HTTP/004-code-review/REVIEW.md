# Code Review — Ticket PARTNERS-EXPORT-PARITY-HTTP — Round 1

**Veredito:** APPROVED ✅

**Reviewer:** code-reviewer
**Data:** 2026-06-06
**Escopo revisado:**

- `src/modules/partners/adapters/export/financier-csv.ts` (NOVO)
- `src/modules/partners/adapters/export/act-csv.ts` (NOVO)
- `src/modules/partners/adapters/http/act-list-query.ts` (NOVO)
- `collaborator-list-query.ts` + `financier-list-query.ts` (+ `*ForExport`)
- `plugin.ts` / `financier-plugin.ts` / `act-plugin.ts` (+ rotas export)
- Testes: `financier-csv.test.ts`, `act-csv.test.ts`, `partners-export-parity.routes.test.ts`

---

## Verificação dos pontos de atenção

| # | Ponto | Resultado |
| --- | --- | --- |
| Security — **escape CSV** | ✅ Todos via `toCsv` (`shared/utils/csv.ts`): `neutralizeFormula` prefixa `'` em célula iniciada por `= + - @ \t \r` + RFC 4180 (aspas/vírgula/quebra). Testado (financier `=`, act `@`). Nenhum serializer monta CSV à mão. |
| Security — **exposição de PII** | ✅ Sem campo novo: o export expõe os mesmos campos da listagem/detalhe por-tipo (já públicos sob a mesma permissão). `financier-csv` não tem dado bancário (domínio Financier não modela); `act`/`collaborator` expõem cpf/email já presentes no detalhe. |
| Security — **RBAC por tipo** | ✅ Cada rota: `preHandler: [requireAuth, authorize('<tipo>:read')]`. Testado 401 (sem sessão) e 403 (sem permissão) nas 3 rotas. |
| Clean-code — **DRY** | 🔵 Os 4 serializers (`supplier`/`financier`/`collaborator`/`act`) repetem o esqueleto `toCsv(HEADER, xs.map(toCells))` + switch `status` p/ `deactivatedAt`; os `*ForExport` repetem `filter→sort(name)→map`. É o **padrão estabelecido** (supplier-csv pré-existente) — consistência > abstração prematura (YAGNI). Não-bloqueante. |
| Precedência de rota | ✅ As 3 rotas estáticas `/export` declaradas **antes** de `/:id` (evita captura pelo param). |
| Achado U1 (analyze) | ✅ `act-list-query.ts` criado (Act não tem `matchesFilter`); `collaborator`/`financier` ganharam `*ForExport` reusando o `*MatchesFilter` do domínio. |

## Checklist (categorias aplicáveis a adapter de borda)

- **A (regras absolutas):** ✅ zero `throw`/`class`/`this`/`any` nos 3 arquivos novos. Switch sobre `status` (union 2 variantes) cobre `Active`/`Inactive` sem `default` (exhaustiveness garantida pelo lint) — espelha `supplier-csv.ts`.
- **D (Ports & Adapters):** ✅ serializers são funções puras de apresentação (sem IO); `*ForExport` puros; IO só nos handlers (via `list*Records` + `sendResult`/`reply`). Falha de reader → 503 (não vaza erro).
- **E (Modular Monolith):** ✅ imports só de `shared/utils` + domínio/ports do **próprio** módulo `partners`. Sem cross-BC.
- **F (ESM/TS):** ✅ imports `.ts`, `import type` nos tipos; sem `require/enum`. typecheck verde.
- **G (idioma/naming):** ✅ EN; nomes específicos (`financiersToCsv`, `actsForExport`, `financierToCells`). Erros internos kebab (`act-read-unavailable`).
- **H (tests):** ✅ AAA; fixtures via `register()` (UUID reais); asserções de HEADER/BOM/CRLF, Active/Inactive, normalização cnpj/cpf, escape anti-injection, e 200+headers/401/403. `teardown` em todos.

## O que está bom

- **Reuso máximo**: `collaborators/export` aproveitou o `collaborator-csv.ts` que já existia (só faltava a rota); `financier`/`act` espelharam fielmente `supplier-csv.ts`.
- **Escape centralizado** no util compartilhado — nenhum serializer reinventa CSV; hardening anti-fórmula uniforme.
- **Headers de download corretos** e idênticos ao `/suppliers/export` (`text/csv; charset=utf-8` + `attachment` + `nosniff`) — paridade total.
- Achado U1 do analyze tratado honestamente (act ganhou list-query próprio; sem gambiarra).

## Próximo passo

**APPROVED** — pipeline avança para **W3**. A sugestão 🔵 (DRY dos serializers) fica como possível refactor futuro caso um 5º tipo de export surja; não justifica abstração agora.
