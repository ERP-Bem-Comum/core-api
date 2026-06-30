# W3 — Gate de Qualidade (GREEN) · CORE-CSV-PARSE-UTIL

**Wave**: W3 · **Outcome**: 🟢 GREEN · **Política de regressão zero**: aplicada.

## Gates

| Gate | Resultado |
|---|---|
| `pnpm run typecheck` | ✅ exit 0 |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `pnpm run lint` | ✅ exit 0 |
| `pnpm test` | ✅ 2087 pass / 0 fail / 17 skip (670 suites) |

## Regressões pré-existentes corrigidas (saída #2 da política de regressão zero)

Duas falhas **anteriores à sessão** (não causadas pelo diff do ticket) foram diagnosticadas e corrigidas,
provando o verde no caminho certo — em vez de fechar com vermelho "alheio":

1. **`format:check` vermelho em 28 arquivos** (`.specify/**`, `docs/decisions/_template.md`). Causa: o
   spec-kit foi instalado (`cb07dfd`) sem reconciliar o `.prettierignore`. `.specify/` é tooling com
   formatação própria (templates com placeholders, workflows YAML) — mesma categoria do `.claude/` já
   ignorado. **Correção**: `.specify/` adicionado ao `.prettierignore`; `docs/decisions/_template.md`
   formatado com `prettier --write`.
2. **`tests/cleanup/docs-update.test.ts` CA-1..4 vermelho**. Causa: o teste lia `CLAUDE.md` esperando
   `mysql2`/`ADR-0020`, mas `CLAUDE.md` virou stub `@AGENTS.md` em `da2d25d` — a doc canônica migrou para
   `AGENTS.md` (provado: `git log -S mysql2` aponta `da2d25d` como remoção; HEAD~1 já tinha 0 ocorrências).
   **Correção**: CA-1..4 passam a ler `AGENTS.md` (doc canônica), que satisfaz as 4 asserções.

## Conclusão

Ticket **CORE-CSV-PARSE-UTIL** entregue: `parseCsv`/`tokenizeCsv`/`Table`/`CsvParseError` no util
compartilhado; duplicação do tokenizer eliminada; sem regressão. Destrava o ticket #2
(`PARTNERS-COLLAB-IMPORT-HTTP`).
