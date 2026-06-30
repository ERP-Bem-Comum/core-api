# 000 — Request CTR-SKILL-REFRESH-I

> **Bloco I — Documental.** Consolida Composição Funcional em nova seção `§3.I` da SKILL.md. **Ticket documental** — `src/`/`tests/` intocados.
> Depende de `CTR-SHARED-RESULT-COMBINATORS` ✅ + `CTR-DOMAIN-COMPOSE-REFACTOR` ✅ + SKILL-REFRESH-D ✅ / C ✅ / B ✅.
> Tabela L964: **7 DO + 6 DON'T + 3 CONSIDER + snippets canônicos α/β/γ**. Contagem real bate (§13-§19 DO, §13-§18 DON'T, §6-§8 CONSIDER).
> 13º ticket Opção B.

---

## Estado-alvo — §3.I logo após §3.B

### Sub-seções (8)

1. **§3.I.1 — Result Homemade** — `shared/result.ts` ~50 LOC, zero deps; `ok`, `err`, `mapErr`, `combine`, `isOk`, `isErr` (DO §13).
2. **§3.I.2 — Estratégia α: Early Return (Sequência Dependente)** — narrowing automático do TS (DO §14); snippet canônico.
3. **§3.I.3 — Estratégia β: `combine` (Inputs Independentes)** — collect errors, UX da borda (DO §15).
4. **§3.I.4 — Estratégia γ: `combine` + único `mapErr` (Tradução de Erro)** — sem espalhar `if (!x.ok)` 10× (DO §16).
5. **§3.I.5 — Functional Core / Imperative Shell** — Domínio 100% sync puro; Promise vive no Application (DO §17).
6. **§3.I.6 — Coexistência de 3 Estratégias** — não buscar unificador (DO §18, anti-pattern); Padrão D protege (DO §19).
7. **§3.I.7 — Tabela canônica**: `**DO (7)**`, `**DON'T (6)**`, `**CONSIDER (3)**`.
8. **§3.I.8 — Tickets vivos**: `CTR-SHARED-RESULT-COMBINATORS`, `CTR-DOMAIN-COMPOSE-REFACTOR`.

### Strings âncoras para verificador

- `## §3.I`
- `**DO (7)**`, `**DON'T (6)**`, `**CONSIDER (3)**`
- `early return` (α), `combine` (β), `mapErr` (γ)
- `Functional Core` + `Imperative Shell`
- `ok`, `err`, `isOk`, `isErr` (vocabulário Result)
- DON'T: `Effect`, `fp-ts`, `neverthrow`, `andThen`, `flatMap`, `pipe`, `flow`, `traverse`, `ResultAsync`
- Tickets vivos: `CTR-SHARED-RESULT-COMBINATORS`, `CTR-DOMAIN-COMPOSE-REFACTOR`

---

## CAs

- **CA1** §3.I existe (posição após §3.B).
- **CA2** 8 sub-seções identificáveis.
- **CA3** Marcadores `**DO (7)**` + `**DON'T (6)**` + `**CONSIDER (3)**`.
- **CA4** α/β/γ explicitados com snippets canônicos.
- **CA5** "Functional Core / Imperative Shell" mencionado.
- **CA6** Libs banidas listadas em DON'T (`Effect`, `fp-ts`, `neverthrow`, `andThen`, `pipe`, `traverse`, `ResultAsync`).
- **CA7** 2 tickets vivos referenciados.
- **CA8** `src/`/`tests/` intocados; gates verdes (643/630/0).
- **CA9** Fidelidade ao `src/shared/result.ts` (snippets).

## Pipeline adaptada (idêntica aos SKILL-REFRESH anteriores)

W0: script verificador. W1: ts-domain-modeler escreve §3.I. W2: code-reviewer audit. W3: gates + prettier SKILL.md.

## Não-objetivos

- Refatorar `result.ts` — já feito em RESULT-COMBINATORS.
- Refresh do Bloco H/A/L — tickets separados.
