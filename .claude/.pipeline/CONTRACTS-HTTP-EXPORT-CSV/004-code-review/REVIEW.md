# Code Review — Ticket CONTRACTS-HTTP-EXPORT-CSV (C4) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-28T20:30Z
**Escopo revisado:** `contracts-csv.ts` (novo), `schemas.ts` (`csvResponse`), `plugin.ts` (rota export.csv), teste `contracts-export-csv.routes.test.ts`

---

## Issues encontradas

### 🔴 Crítica

Nenhuma.

### 🟡 Importante

Nenhuma.

### 🔵 Sugestão

#### Sugestão 1 — anti-fórmula pode alterar dados legítimos iniciando em `- + @ =`

`neutralizeFormula` prefixa `'` em qualquer célula que comece com um trigger. Um `title`/`objective`
legítimo como `"-fase 1"` vira `"'-fase 1"` no CSV. É o **trade-off conhecido e recomendado** do
hardening anti-CSV-injection (OWASP) — preferível a executar fórmula. Os campos numéricos (cents ≥ 0,
Money não-negativo) e datas ISO nunca disparam o trigger, então o impacto fica restrito a texto livre.
Sem ação; registrar a semântica caso a P.O. estranhe o `'` em exports.

#### Sugestão 2 — `reply.send(...) as unknown as Promise<void>`

Padrão já consolidado no plugin (sendResult/sendDomainError). Sem ação.

---

## O que está bom

- **Escape na ordem correta e completo:** `neutralizeFormula` (prefixo `'` para `= + - @ \t \r`) **antes**
  do quoting RFC 4180 (`"`/`,`/`\n`/`\r` → aspas + `""`). Cobre CA4 (formula injection) e CA5 (quoting). É
  o ponto de segurança do ticket, implementado certo.
- **`contractsToCsv` é puro e testável**, reusa `contractToListItem` (C1) — não reduplica a lógica de
  `Money`/`Period`/`status`. `cellsFor` é **switch exaustivo** por status (compilador trava variante
  faltante), com os campos efetivos só em Active/Expired/Terminated e `endedAt` só nos terminais.
- **Rota estática `export.csv`** com precedência sobre `/:id` confirmada (`Routes.md:253`); CA7 prova que
  não cai no handler paramétrico. Leitura no reader, `authorize('contract:read')` — coerente com o C1.
- **BOM UTF-8** (Excel + PT-BR) + `Content-Disposition: attachment`.
- **OpenAPI `text/csv`** via `csvResponse()` factory; o `serializerCompiler` não corrompeu a string CSV
  (verificado por `res.body` nos testes) — risco que valia checar, resolvido.
- Erro de repo → envelope JSON (503); só o 200 é CSV. Separação correta.
- Zero `any`/`class`/`this`/`throw`. `typecheck`+`lint`+`format`+`test` (1531 pass / 0 fail) verdes.

---

## Próximo passo

- **APPROVED** → W3 (gate de qualidade formal). Sugestões 🔵 opcionais.
