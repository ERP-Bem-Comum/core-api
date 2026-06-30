# Code Review — CTR-SWEEPER-DBURL-FILE — Round 1

**Veredito:** APPROVED
**Reviewer:** code-reviewer
**Data:** 2026-06-16
**Escopo:** `src/jobs/contracts/sweeper/config.ts` (`ConnectionFileReader`, `defaultConnectionFileReader`, `isSet`, `resolveConnectionString`, `readJobConfig`) · `tests/jobs/contracts/sweeper/config.test.ts`.

---

## Veredito: APPROVED — zero issue crítica (🔴) / importante (🟡)

Aderente às regras e à decisão CA5 (#50). Sem `throw`/`class`/`this`/`any`. O único `try/catch` está no `defaultConnectionFileReader` — a **borda FS** — e converte a exceção (`ENOENT`/`EACCES`) em `Result` antes de cruzar (regra `adapters.md`). `Result` em todas as saídas; erros são string-literal-union EN kebab-case; return types explícitos; `import type` para `Result`, `.ts`/`node:fs` corretos.

## Checklist por categoria

- **D (ports & adapters):** a leitura de arquivo é um **port-like injetável** (`ConnectionFileReader`) com default real + fake no teste — exatamente o padrão. `readJobConfig` permanece pura; `run.ts` inalterado (default aplicado). ✓
- **Exclusividade/semântica:** XOR centralizado em `resolveConnectionString` (SRP) — `direct && file` → `ambiguous`; vazio conta como ausente via `isSet` (type guard); fail-fast em config ambígua. ✓
- **F (ESM/TS):** `readFileSync` de `node:fs`; subpath `#src/...`; `import { type Result }`. ✓
- **G (idioma):** identificadores EN; slugs `sweeper-*` EN kebab-case. ✓
- **H (tests):** AAA; **fakes injetáveis** (não mocks mágicos); 8 casos cobrindo a tabela completa **com caminhos de erro** (ambiguous/unreadable); FS real só no CA2 para exercitar o `.trim()` do default reader (apropriado — é a borda). ✓

## Issues 🔵 Sugestão (não-bloqueante)

- 🔵-1 — `resolveConnectionString` chama `isSet(direct)` duas vezes (na checagem de ambiguidade e no branch de uso). É **proposital**: preserva o narrowing `raw is string` em cada escopo sem recorrer a cast (`as string`). Custo desprezível, mais seguro que a alternativa. **Não corrigir.**

## O que está bom

- `.trim()` na borda (reader), não no `readJobConfig` — separação correta de responsabilidade (o reader sabe que leu de arquivo).
- Decisão de design (#50) refletida 1:1 na tabela de testes — rastreável.
- `run.ts` não precisou mudar — extensão retrocompatível.

## Próximo passo

APPROVED → W3.
