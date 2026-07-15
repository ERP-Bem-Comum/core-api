# BGP-MONTH-HTTP — escopo (#413)

> O **mês na leitura**: `month` na response e filtro `?month=` opcional no grid.
> Size **S**. Branch `feat/413-budget-plans-monthly`. Fatia **3 de 3** da feature 036 (Orçamento mensal).
> Tasks T024–T027 de [`specs/036-budget-plans-monthly/tasks.md`](../../../specs/036-budget-plans-monthly/tasks.md) — **US2**.

## Contexto

As fatias 1 (`BGP-MONTH-VO`) e 2 (`BGP-MONTH-PERSIST`) fecharam `closed-green`. O mês já existe no VO, no agregado, no banco (com `UNIQUE` + upsert idempotente) e **na escrita HTTP** — a fatia 2 absorveu os 4 POSTs porque o `month` obrigatório atravessa as 3 camadas de uma vez.

**Resta a leitura (US2).** Hoje o `budgetResultToDto` (`adapters/http/budget-result-dto.ts:9-15`) **não expõe `month`**: o dado está no banco, mas some ao sair pela borda — tanto na resposta 201 dos POSTs quanto no `GET by-budget`. Sem isso o front não monta o grid.

## Escopo

### 1. `month` na response — `adapters/http/budget-result-dto.ts` + `schemas.ts`

- `budgetResultResponseSchema` (`schemas.ts:356-362`) ganha `month: z.int().min(1).max(12)`.
- `budgetResultToDto` passa a serializar `month: result.month`.
- Vale para **as 5 rotas** (os 4 POSTs de cálculo + o `GET by-budget`), que compartilham o DTO.

### 2. Filtro `?month=` opcional — `adapters/http/plugin.ts` (~:505)

- Query do `GET /budget-plans/budget-results/by-budget/:budgetId` aceita `month` **opcional**.
- **`z.coerce.number().int().min(1).max(12)`** — `z.coerce` **aqui sim**: query é string (no body é `z.int()`, pois é JSON). Segue o molde de `listBudgetPlansQuerySchema`.
- Ausente = ano inteiro (o grid carrega os 12 meses de uma vez; o passador de mês é **client-side**).

### 3. Leitura no use case — `application/use-cases/get-budget-results.ts`

- Filtro por mês, quando informado. A soma (`Money.add`) já existe e **passa a totalizar o ano** — não duplicar na borda.

## Critérios de aceite

- [ ] **CA1** — **Dado** um lançamento em março, **Quando** `GET by-budget`, **Então** o item traz `"month": 3`.
- [ ] **CA2** — **Dado** um cálculo com `month`, **Quando** `POST /budget-results/{modelo}`, **Então** a **201** traz o `month` no body.
- [ ] **CA3** — **Dado** lançamentos em vários meses, **Quando** `GET by-budget?month=3`, **Então** só os de março voltam.
- [ ] **CA4** — **Dado** `?month=banana` (ou `0`, `13`, `3.5`), **Quando** `GET by-budget`, **Então** **400** (Zod).
- [ ] **CA5** — **Dado** `?month=` ausente, **Quando** `GET by-budget`, **Então** volta o **ano inteiro** (sem filtro).
- [ ] **CA6** — **Dado** 12 meses de uma conta, **Quando** `GET by-budget`, **Então** `totalInCents` = soma dos 12 (prova da P.O.: 3.670,92 × 12 = **4.405.104**).

## Fora de escopo

- Escrita HTTP → **entregue na fatia 2**.
- Paginação do grid: desnecessária — pior caso realista ≈ **1.9k itens** (158 subcategorias × 12), uma ida só (research §D4).
- Passador de mês (navegação) → **client-side**, sem round-trip.

## Invariantes

- Borda Fastify + Zod (ADR-0025/0027); `z.coerce` só na query.
- Erros EN kebab; idioma por camada.
- Regressão zero: baseline **4071** testes, 0 falhas.

## Waves

| Wave | Agente/Skill | Saída |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | `002-tests/REPORT.md` — RED |
| **W1** | `fastify-server-expert` + `zod-expert` (par obrigatório em schema de borda) | `003-impl/REPORT.md` |
| **W2** | `code-reviewer` | `004-code-review/REVIEW.md` — máx 3 rounds |
| **W3** | `ts-quality-checker` | `005-quality/REPORT.md` |
