# W0 — Testes RED (FIN-CLI-SCAFFOLD)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (skill)
> **Predecessor:** [`../000-request.md`](../000-request.md)
> **Artefatos:** 2 arquivos novos + 1 modificado

| # | Arquivo | Linhas | Status |
| :--- | :--- | ---: | :--- |
| 1 | `tests/modules/financial/cli/main.test.ts` | 118 | MODIFICADO (+53 linhas, +3 it's preservando 4 existentes do FIN-CLI-WIRE) |
| 2 | `tests/modules/financial/cli/parse-driver-flags.test.ts` | 105 | NOVO |
| 3 | `tests/modules/financial/cli/state.test.ts` | 142 | NOVO |

---

## 1. Estratégia de teste

### 1.1. Preservação dos testes do FIN-CLI-WIRE

`main.test.ts` já existe com 4 testes (CA-3..CA-6) que validam o behavior atual:
- `--help` → stdout exit 0 com cabeçalho "Uso: financial-cli" e "nenhum ainda"
- `-h` alias idêntico
- vazio → stderr exit 64
- subcomando desconhecido → stderr exit 64

**NÃO QUEBRADOS** — mantidos íntegros. W1 deve preservar essas semânticas no `main.ts` refatorado (em particular, manter o texto "(nenhum ainda — …)" no `--help` mesmo com REGISTRY vazio).

### 1.2. 3 novos testes E2E no `main.test.ts`

Validam a integração `parseDriverFlags → buildContext → REGISTRY` via subprocess:

- **CA-NEW-1:** `--driver mysql aprovar-titulo` → exit 64 com mensagem citando `FIN-ADAPTER-DRIZZLE-PAYABLE` (regex `/FIN-ADAPTER-DRIZZLE-PAYABLE|driver.*mysql.*ainda|not.*supported|não.*disponível/i`). Valida que o W1 mapeou `cli-driver-not-supported-yet` para um exit code e que `formatErrorCode` o traduziu para PT-BR humana.
- **CA-NEW-2:** `--driver memory --no-state aprovar-titulo` → exit 64 com mensagem `Subcomando desconhecido: aprovar-titulo` (REGISTRY vazio). Garante que o parser de driver flags **passou** (não disparou `cli-driver-unknown`/`missing-value`/`flag-conflict`).
- **CA-NEW-3:** `--driver invalido foo` → exit 64 com mensagem formatada de `cli-driver-unknown` em PT-BR.

### 1.3. `parse-driver-flags.test.ts` — 8 it's de unit test

Cobertura exaustiva do parser sem subprocess. Inclui:
- Default (memory + DEFAULT_MEMORY_STATE_PATH)
- `--state custom.json`
- `--no-state`
- Conflito `--state X --no-state` → `cli-driver-flag-conflict`
- `--driver mysql` aceito (sem connectionString — fora do escopo)
- `--driver desconhecido` → `cli-driver-unknown`
- `--state` sem valor → `cli-driver-missing-value`
- `rest` preserva subcomando + flags próprias

### 1.4. `state.test.ts` — 4 it's de unit test

- **Round-trip** real via `InMemoryPayableRepository` + `Payable.open` (agregado real) — bug em mappers Drizzle ou na rehydration quebra fixture cedo.
- **`state-file-not-readable`** com path inexistente em diretório tmp isolado.
- **`state-file-corrupted`** com JSON malformado.
- **Lock acquire/release** — 3 chamadas sequenciais validando exclusão e re-aquisição após release.

Fixtures usam `mkdtempSync` + `tmpdir()` para isolamento total entre runs (lição de testes do contracts/state).

---

## 2. Cobertura de CAs

| CA | Cenário | Cobertura |
| :--- | :--- | :--- |
| CA-1..3 (registry vazio + tipo) | type-level via `pnpm run typecheck` em W3; review em W2 | indireto |
| CA-4..6 (context — switch driver, error union) | runtime via CA-NEW-1 (cli-driver-not-supported-yet) + W2 review | parcial |
| CA-7..11 (parser de driver flags) | unit tests em `parse-driver-flags.test.ts` | ✅ 8/8 |
| CA-12 (parse-flags helpers genéricos) | type-level (cópia exata do contracts) + review W2 | indireto |
| CA-13..16 (state file + lock) | unit tests em `state.test.ts` | ✅ 4/4 |
| CA-17..19 (drivers/memory) | runtime indireto via CA-NEW-2 (parser OK ⇒ buildMemoryContext rodou) + round-trip state | parcial |
| CA-20..22 (formatters/error) | runtime via CA-NEW-1 e CA-NEW-3 (regex valida output PT-BR) | ✅ |
| CA-23..26 (main.ts refatorado) | E2E via 3 CA-NEW-* + 4 testes pré-existentes preservados | ✅ |
| CA-27..29 (testes próprios) | este REPORT | ✅ |
| CA-30..33 (typecheck/format/lint/test W3) | W3 | — |

**15 it's runtime do ticket** (3 CA-NEW + 8 parser + 4 state). Mais 4 it's pré-existentes do FIN-CLI-WIRE que devem continuar passando.

---

## 3. Fixtures

### 3.1. `parse-driver-flags.test.ts`

Sem fixtures — testes operam sobre arrays de strings literais (`argv`). Determinístico por construção.

### 3.2. `state.test.ts`

- `buildOpenPayable()` inline — `Payable.open` real com `Money.fromCents(15050)`, `TaxId.fromCpf('11144477735')` (DV válido), `BeneficiaryBankData.fromRaw` válido. Datas literais ISO (`2026-05-20` openedAt, `2026-06-15` dueDate).
- `makeTmpDir()` helper — `mkdtempSync(join(tmpdir(), 'fin-cli-state-test-'))` garante diretório único por chamada; `rmSync(dir, { recursive: true, force: true })` no `finally` limpa entre testes.

### 3.3. `main.test.ts`

Usa o helper `runFinancialCli` pré-existente (`tests/cli/helpers/run-financial-cli.ts`). Subprocess via `spawnSync('node', ['--experimental-strip-types', ..., CLI_ENTRY, ...args])` — sem stubs ou interceptação.

---

## 4. Saída RED

### 4.1. TypeScript (`pnpm run typecheck`) — 2 erros

```
tests/modules/financial/cli/parse-driver-flags.test.ts(28,8):
  error TS2307: Cannot find module '#src/modules/financial/cli/parse-driver-flags.ts'

tests/modules/financial/cli/state.test.ts(38,8):
  error TS2307: Cannot find module '#src/modules/financial/cli/state.ts'
```

### 4.2. Runtime (`pnpm test`)

| Métrica | Baseline (W3 FIN-USECASE-APPROVE-PAYABLE) | W0 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 1095 | 1100 | **+5** |
| pass | 1079 | 1079 | 0 |
| fail | 0 | **5** | **+5** |
| skipped | 16 | 16 | 0 |
| suites | 356 | 357 | +1 |

5 falhas runtime distribuídas:

1. **`CA-NEW-1: --driver mysql ...`** — atual `main.ts` não parseia `--driver` (pega `--driver` como subcomando desconhecido). Regex `/FIN-ADAPTER-DRIZZLE-PAYABLE|driver.*mysql.*ainda/i` não bate.
2. **`CA-NEW-2: --driver memory --no-state ...`** — idem (parser não existe).
3. **`CA-NEW-3: --driver invalido foo`** — idem.
4. **`parse-driver-flags.test.ts`** (file-load fail sintético) — `ERR_MODULE_NOT_FOUND` resolvendo `src/modules/financial/cli/parse-driver-flags.ts`.
5. **`state.test.ts`** (file-load fail sintético) — `ERR_MODULE_NOT_FOUND` resolvendo `src/modules/financial/cli/state.ts`.

**4 testes do FIN-CLI-WIRE (CA-3..CA-6) continuam passando** — math: 1079 pass mantido, +5 tests novos = 1100 total, 5 fails todos novos. **Zero regressão** nos 1079 pré-existentes.

---

## 5. Diagnóstico RED — checklist

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Causa primária por inexistência (não por assert nos novos modules) | ✅ | TS2307 + ERR_MODULE_NOT_FOUND |
| Testes do FIN-CLI-WIRE preservados (CA-3..CA-6) | ✅ | 4 it's continuam passando |
| Testes runtime cobrem main.ts integration via subprocess | ✅ | 3 it's E2E novos |
| Parser unit-tested sem subprocess (rápido) | ✅ | 8 it's |
| State unit-tested com `tmpdir()` isolado | ✅ | 4 it's |
| Sem `class`, `throw` (em prod), `as any` | ✅ | (throws em fixture helpers OK) |
| `import type` separado de runtime | ✅ | |
| Imports `#src/*` | ✅ | |

---

## 6. Lista pronta para W1

Implementer deve criar/modificar 9 arquivos (1 main.ts + 8 src novos):

### 6.1. Ordem sugerida (dependências)

1. **`parse-flags.ts`** — sem dependências (cópia exata do contracts).
2. **`parse-driver-flags.ts`** — depende só de Result.
3. **`state.ts`** — depende de `InMemoryPayableRepositoryHandle` + `Payable` types + (decisão W1: mappers Drizzle existentes ou projeção CLI). **Recomendação:** começar simples, projeção JSON-direct (sem rehydratação completa de Money/Period via mappers — só preserva os campos serializados). Se W2 reclamar de robustez, ticket separado de hardening.
4. **`formatters/error.ts`** + **`formatters/index.ts`** — dicionário PT-BR mínimo (5-8 entries cobrindo `cli-driver-*`, `state-*`, `cli-driver-not-supported-yet`).
5. **`drivers/memory.ts`** — `buildMemoryContext(statePath)` cria `InMemoryOutbox` + `InMemoryPayableRepository(outbox.port)` + lock+load se path; `persist` chama `saveState`; `shutdown` libera lock.
6. **`context.ts`** — `CliContext` type + `buildContext(driver)` switch `memory → buildMemoryContext`, `mysql → err('cli-driver-not-supported-yet')`.
7. **`registry.ts`** — `REGISTRY = {}` vazio + tipo `SubCommand`.
8. **`main.ts`** — refatorado para usar `parseDriverFlags → buildContext → REGISTRY[subcmd]?.run`, mantendo as 4 semânticas do FIN-CLI-WIRE (--help, -h, vazio, subcomando desconhecido).

### 6.2. Preservar texto "nenhum ainda" no `--help`

O teste pré-existente `CA-3` valida `/nenhum ainda/i`. W1 deve manter (pode ajustar para `(nenhum ainda — virá com FIN-CLI-APROVAR-TITULO)` ou similar, desde que o regex case).

### 6.3. Exit codes esperados

- `cli-driver-unknown` / `cli-driver-flag-conflict` / `cli-driver-missing-value` → **64** (EX_USAGE)
- `cli-driver-not-supported-yet` → **64** (decisão deste scaffold — driver não disponível é parte de "uso inválido neste momento")
- `state-*` → **74** (EX_IOERR), mapeados via tabela tipo `Record<StateError, number>` (pattern do contracts)

### 6.4. Métricas esperadas após W1

| Métrica | W0 RED | W1 GREEN esperado |
| :--- | ---: | ---: |
| tests | 1100 | ~1108-1110 |
| pass | 1079 | **~1108-1110** (todos os 15-19 novos do ticket + 4 pré-existentes do FIN-CLI-WIRE) |
| fail | 5 | **0** |
| skipped | 16 | 16 |

Possíveis "novos descobertos" no `state.test.ts` se os 4 it's expandirem para sub-asserts adicionais durante implementação.

---

## 7. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access — guards `assert.ok(... !== undefined)` | ✅ |
| Sem shadowing de built-ins | ✅ |
| `import type` separado de runtime | ✅ |
| Fixtures usam agregado real (`Payable.open`) | ✅ |
| `tmpdir()` + `rmSync` finally para isolamento | ✅ |
| Reuso do helper `runFinancialCli` em vez de re-spawn manual | ✅ |
| `eslint-disable @typescript-eslint/require-await` desnecessário em testes que usam `await` real | ✅ |

---

## 8. Pronto para W1

Sequência sugerida no §6.1. Cuidado especial:

1. **Preservar testes do FIN-CLI-WIRE** — refactor do `main.ts` não pode quebrar os 4 it's existentes.
2. **`state.ts` projeção pragmática** — começar com serialização JSON direta do `Payable` (toJSON via `JSON.stringify(payable)` aproveitando Date → ISO string). Rehydration via reviver custom + revalidação tipo isValidPayable (pattern do contracts). Não tentar reusar Drizzle mappers (escopo creep).
3. **`buildContext` retorna `CliContextError`** que é union de `StateError | 'cli-driver-not-supported-yet'` — main.ts precisa mapear cada variante para exit code.
4. **Mensagem `cli-driver-not-supported-yet`** deve **literalmente** mencionar `FIN-ADAPTER-DRIZZLE-PAYABLE` (regex do CA-NEW-1 é flexível mas vale ser explícito).

Envelope **M** — implementação esperada em 1 round. Sem rejection W2 esperado dado pattern bem espelhado do contracts.
