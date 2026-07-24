# W0 — ASSISTED-BY-TRAILER-CHECK (#549) — RED

**Agente:** `tdd-strategist`. **Decisão do dono (2026-07-24):** modelo **label-gated**.

`tests/scripts/check-commit-trailers.test.ts` — 6 casos unitários da função pura `checkCommitTrailers`:

- **CA1** — PR ai-assisted + commit sem Assisted-by → `missing-assisted-by`.
- **CA2** — PR ai-assisted + todos bem-formados → sem violação.
- **CA3** — Assisted-by malformado (`Foo`, sem `:MODEL`) → `malformed-assisted-by`, **mesmo sem label**.
- **CA4** — PR sem label + commit sem Assisted-by → **sem** violação (não exige presença).
- **CA5** — formato com `[ferramenta]` opcional → ok.
- **CA6** — múltiplos Assisted-by, um malformado → 1 violação apontando o valor.

**RED:** `ERR_MODULE_NOT_FOUND` — `scripts/ci/check-commit-trailers.ts` não existe. 1 fail.
