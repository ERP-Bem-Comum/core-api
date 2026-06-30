# W1 — CTR-SWEEPER-DBURL-FILE — REPORT (GREEN) ✓

**Outcome:** GREEN · **Agente/skill:** ports-and-adapters (reader injetável) + nodejs-runtime-expert (padrão de leitura)

## Resultado

```
config.test.ts → 8/8 pass (CA1, CA1b, CA2, CA3, CA4, CA5, CA6, CA7)
pnpm run typecheck → verde
```

## Implementação (`src/jobs/contracts/sweeper/config.ts`)

- **`type ConnectionFileReader = (path: string) => Result<string, 'unreadable'>`** — dependência injetável (port-like) da leitura de arquivo.
- **`defaultConnectionFileReader`** — `readFileSync(path, 'utf8').trim()` em `try/catch → Result`. Converte exceção FS (ENOENT/EACCES) em `err('unreadable')` na borda (regra `adapters.md`); `.trim()` remove o trailing `\n` dos secrets.
- **`isSet(raw): raw is string`** — type guard (`!== undefined && !== ''`); env vazia conta como ausente (CA1b).
- **`resolveConnectionString(env, readFile)`** — XOR num só lugar: ambos setados → `sweeper-ambiguous-connection-config`; só direta → usa; só `_FILE` → lê (vazio após reader → `sweeper-unreadable-connection-file`); nenhum → `sweeper-missing-connection-string`.
- **`readJobConfig(env, readFile = defaultConnectionFileReader)`** — 2º parâmetro com default real; `run.ts` **inalterado** (`readJobConfig(process.env)` usa o default).
- **`JobConfigError`** expandido com os 2 novos slugs.

## Aderência

- Função permanece **pura** — a leitura de FS é injetada; 7 dos 8 testes usam fakes (sem FS). Só CA2 toca FS real (arquivo temp) para exercitar o `.trim()` do default reader — apropriado (testa a borda).
- `readFileSync` síncrono no boot one-shot: idiomático (nodejs-runtime-expert; `node:fs` §"Synchronous example").
- Zero `throw`/`class`/`this`/`any`; `Result` em tudo; erros EN kebab-case; return types explícitos.

## Mapa CA → implementação

| CA | Implementação |
|---|---|
| CA1/CA1b | `isSet(direct)` (vazio = ausente) |
| CA2 | `defaultConnectionFileReader` com `.trim()` |
| CA3 | `isSet(direct) && isSet(filePath)` → ambiguous |
| CA4 | fallthrough → missing |
| CA5 | `!read.ok` → unreadable |
| CA6 | `read.value === ''` → unreadable |
| CA7 | `batchSize` ortogonal à fonte da URL |
