# Code Review — Ticket FIN-CLI-SCAFFOLD — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-23T13:54Z
**Round:** 1 / 3
**Escopo revisado:** 12 arquivos (7 src novos + 1 src modificado + 3 tests novos/modificados) + 1 leitura cruzada (`contracts/cli/parse-flags.ts` — verificação de paridade)

| # | Arquivo | Linhas | Status |
| :--- | :--- | ---: | :--- |
| 1 | `src/modules/financial/cli/parse-flags.ts` | 64 | NOVO |
| 2 | `src/modules/financial/cli/parse-driver-flags.ts` | 117 | NOVO |
| 3 | `src/modules/financial/cli/state.ts` | 239 | NOVO |
| 4 | `src/modules/financial/cli/formatters/error.ts` | 54 | NOVO |
| 5 | `src/modules/financial/cli/formatters/index.ts` | 8 | NOVO |
| 6 | `src/modules/financial/cli/drivers/memory.ts` | 73 | NOVO |
| 7 | `src/modules/financial/cli/context.ts` | 45 | NOVO |
| 8 | `src/modules/financial/cli/registry.ts` | 18 | NOVO |
| 9 | `src/modules/financial/cli/main.ts` | 122 | MODIFICADO |
| 10 | `tests/modules/financial/cli/main.test.ts` | 126 | MODIFICADO |
| 11 | `tests/modules/financial/cli/parse-driver-flags.test.ts` | 108 | NOVO |
| 12 | `tests/modules/financial/cli/state.test.ts` | 175 | NOVO |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — Header doc do `parse-flags.ts` diz "copiado tal qual" mas tem diff intencional

**Categoria:** G (precisão de docs)
**Localização:** `src/modules/financial/cli/parse-flags.ts:6`

```ts
 * Pattern espelha `src/modules/contracts/cli/parse-flags.ts` — copiado tal qual.
```

Diff cross-módulo revela 3 diferenças intencionais:
1. Import: `#src/shared/primitives/result.ts` (financial) vs `../../../shared/primitives/result.ts` (contracts) — subpath alias.
2. Header doc + JSDoc adicionados.
3. Comentários "REGR #9" / "REGR #10" do contracts removidos.

A lógica é **funcionalmente idêntica**, mas o texto não é literal.

**Sugestão (não-bloqueia):** trocar "copiado tal qual" por algo mais preciso:

```ts
 * Pattern espelha `src/modules/contracts/cli/parse-flags.ts` — lógica idêntica;
 * imports adaptados para `#src/*` subpath e comentários REGR específicos do
 * contracts substituídos por JSDoc genérico.
```

#### Sugestão 2 — `drivers/memory.ts` header não cita explicitamente "outbox efêmero"

**Categoria:** G (clareza arquitetural)
**Localização:** `src/modules/financial/cli/drivers/memory.ts:1-15`

O header doc explica que `InMemoryOutbox` é criado por chamada (default isolado), mas não menciona explicitamente que **o outbox é efêmero** (NÃO persiste em `fin-cli-state.json`). Esta é uma decisão importante alinhada com o pattern do contracts (W1 REPORT §4 menciona, mas o source não).

**Sugestão (não-bloqueia):** adicionar 1 linha no header:

```ts
 * **Outbox efêmero:** o `InMemoryOutbox` criado aqui NÃO é serializado no
 * state file (mesma decisão do contracts/cli/drivers/memory.ts). Quando
 * `FIN-WORKER-OUTBOX` chegar com persistência real, será via tabela
 * `fin_outbox` no driver mysql, não via state file do driver memory.
```

#### Sugestão 3 — `cli-driver-flag-conflict` mensagem não antecipa caso futuro `--connection-string`

**Categoria:** G (mensagens de erro completas)
**Localização:** `src/modules/financial/cli/formatters/error.ts:19-20`

```ts
'cli-driver-flag-conflict':
  'Flags incompatíveis. Regras: --state e --no-state só valem com --driver memory.',
```

Quando `FIN-ADAPTER-DRIZZLE-PAYABLE` adicionar suporte a `--driver mysql`, o caso `--connection-string` com `--driver memory` também disparará esta mesma error. A mensagem atual não cobre.

**Sugestão (não-bloqueia):** atualizar quando `mysql` ficar disponível, OU já antecipar:

```ts
'cli-driver-flag-conflict':
  'Flags incompatíveis. Regras: --state e --no-state só valem com --driver memory; quando --driver mysql estiver disponível, --connection-string ficará exclusivo a ele.',
```

Adiamento até o ticket mysql é defensável (YAGNI).

#### Sugestão 4 — `parse-flags.ts` e `validateAllowedFlags` exportados mas sem consumidor

**Categoria:** G (dead code suspeito)
**Localização:** `src/modules/financial/cli/parse-flags.ts:17,55`

`parseFlags` e `validateAllowedFlags` estão exportados, mas nenhum arquivo neste ticket os consome (REGISTRY vazio, sem comandos). Serão usados em `FIN-CLI-APROVAR-TITULO` quando o primeiro comando real precisar parsear `--payable-id` / `--approved-by`.

**Não bloqueia** — é dead code apenas se o próximo ticket não os consumir (provável que consuma). Vale validar no W2 do próximo ticket.

---

## O que está bom

### Auditoria automática — todas verdes

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" \
    src/modules/financial/cli/**/*.ts
(nenhum em código de produção)
```

- Zero `throw` em src/ — `try/catch` aparece apenas em `state.ts` (borda I/O: `readFileSync`, `writeFileSync`, `openSync`, `renameSync`, `statSync`, `rmSync`, `JSON.parse`) e é **sempre** convertido em `Result` antes de retornar.
- Zero `class`, `this`, `new Error`, `extends Error`, `any`, `as any`.
- Único `as` em `state.ts:97` é annotation type-level (`p['status'] as PayableStatus`) dentro de type guard — pattern aceito.

### Verificação cruzada — paridade com contracts confirmada

```bash
$ diff src/modules/contracts/cli/parse-flags.ts src/modules/financial/cli/parse-flags.ts
```

Diff revela diffs **funcionalmente nulos** (só import path + JSDoc). Sugestão 1 acima é cosmética (header doc deve refletir a realidade do diff).

### `EXIT_CODE_BY_CONTEXT_ERROR` força exaustividade em compile time

```ts
// main.ts:50-58
const EXIT_CODE_BY_CONTEXT_ERROR: Readonly<Record<CliContextError, number>> = {
  'cli-driver-not-supported-yet': EXIT_USAGE,
  'state-file-not-readable': EXIT_IOERR,
  'state-file-corrupted': EXIT_IOERR,
  'state-schema-invalid': EXIT_IOERR,
  'state-entity-invalid': EXIT_IOERR,
  'state-concurrent-lock': EXIT_IOERR,
  'state-file-not-writable': EXIT_IOERR,
};
```

Tipagem `Record<CliContextError, number>` obriga novas variantes do union a serem mapeadas (TS rejeita o build se faltar). Pattern excelente vs `switch + throw unreachable`.

### Switch exaustivo no `buildContext` sem `default: throw`

```ts
// context.ts:38-44
switch (driver.kind) {
  case 'memory':
    return buildMemoryContext(driver.statePath);
  case 'mysql':
    return err('cli-driver-not-supported-yet');
}
// Exhaustive: TS valida todas as variantes em compile time.
```

Sem `default` — TS força exaustividade via `noFallthroughCasesInSwitch`. Quando `DriverKind` ganhar variante nova, o build quebra aqui.

### Cleanup `try/finally` com `ctx.shutdown()`

```ts
// main.ts:107-111
try {
  return await cmd.run(ctx, subArgv);
} finally {
  await ctx.shutdown();
}
```

Garante que o lock do state file é liberado mesmo se o comando lançar. Pattern correto para resources com lifecycle.

### `loadState` arquivo ausente → `ok(undefined)` — decisão arquitetural alinhada com contracts

```ts
// state.ts:163
// Arquivo ausente é OK (primeira execução do CLI — saveState cria depois).
// Pattern alinhado com `contracts/cli/state.ts:324`.
if (!existsSync(path)) return ok(undefined);
```

Comentário explica POR QUE (não apenas O QUE). Teste W0 também ajustado para refletir essa semântica — bom alinhamento código ↔ testes.

### Atomicidade `saveState` via tmp + rename

```ts
// state.ts:213-229
const tmpPath = `${path}.tmp.${randomUUID()}`;
writeFileSync(tmpPath, ..., 'utf-8');
renameSync(tmpPath, path);
```

POSIX `rename(2)` é atômico no mesmo FS. Se o processo crasha entre `write` e `rename`, o arquivo original permanece intacto. Pattern correto.

### Lock acquire/release com retry exponencial curto

```ts
// state.ts:126-145
const acquireLock = (statePath): Result<string, 'state-concurrent-lock'> => {
  for (let attempt = 0; attempt < LOCK_RETRY_MAX; attempt++) {
    try {
      const fd = openSync(lockPath, 'wx');
      closeSync(fd);
      return ok(lockPath);
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      if (code !== 'EEXIST') return err('state-concurrent-lock');
      // backoff de 30ms × 50 = ~1.5s total
    }
  }
  return err('state-concurrent-lock');
};
```

Comportamento: tolera ~1.5s de contenção. **`openSync('wx')`** é a única forma atômica de "create-if-not-exists" no Node sem race. Pattern do contracts replicado.

### Header doc do `main.ts` cita preservação do FIN-CLI-WIRE

```ts
// main.ts:9-12
 * Preserva semântica do `FIN-CLI-WIRE`:
 *   - 4 testes pré-existentes (CA-3..CA-6) continuam passando.
 *   - REGISTRY vazio gera "(nenhum ainda — virá com FIN-CLI-APROVAR-TITULO)".
```

Reviewer entende sem precisar abrir o REPORT W1 — intenção arquitetural no source.

### Mensagem `cli-driver-not-supported-yet` cita literalmente FIN-ADAPTER-DRIZZLE-PAYABLE

```ts
// formatters/error.ts:23-24
'cli-driver-not-supported-yet':
  'Driver mysql ainda não está disponível para o módulo Financial. Será adicionado quando o adapter Drizzle do PayableRepository existir (ver ticket FIN-ADAPTER-DRIZZLE-PAYABLE). Use --driver memory por enquanto.',
```

Mensagem completa: contexto + razão técnica + ticket bloqueante + workaround imediato. Excelente UX de erro.

### Test CA-NEW-1 documenta defeito conceitual + ajuste

```ts
// main.test.ts:70-89
it('CA-NEW-1: --driver mysql é parseado com sucesso (rejeição em buildContext só dispara quando REGISTRY tiver comando real — FIN-CLI-APROVAR-TITULO)', () => {
  // Com REGISTRY vazio neste ticket, o lookup "subcomando desconhecido"
  // vence o buildContext (fail-fast — pattern do contracts/cli/main.ts).
  // O caminho `cli-driver-not-supported-yet` será exercitado em
  // `FIN-CLI-APROVAR-TITULO`, quando houver um comando real no REGISTRY.
```

Comentário explica POR QUE o teste foi ajustado. Reviewer/futuro mantenedor entende a história sem consultar REPORT.

### Imports limpos — `import type` separado de runtime

```ts
// main.ts
import { buildContext, type CliContextError } from './context.ts';
import { formatErrorCode } from './formatters/index.ts';
import { parseDriverFlags } from './parse-driver-flags.ts';
import { REGISTRY } from './registry.ts';
```

`type` inline (`type CliContextError`) em vez de import separado — válido com `verbatimModuleSyntax`. Sem mistura.

### Suíte de testes isolada via `tmpdir()` + `mkdtempSync`

```ts
// state.test.ts:76
const makeTmpDir = (): string => mkdtempSync(join(tmpdir(), 'fin-cli-state-test-'));
// state.test.ts:108,121,134,148,171
finally {
  rmSync(dir, { recursive: true, force: true });
}
```

Cada `it` cria um dir único e limpa no `finally`. Zero conflito entre runs paralelos ou repetidos.

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas de domínio | N/A — escopo é CLI/adapters; não toca domain |
| B. Smart constructors / Branded | N/A neste ticket |
| C. Discriminated unions | ✅ `DriverFlags` é union com discriminador `kind`; switch exaustivo no `buildContext` |
| D. Ports & Adapters | ✅ Adapter (CLI) consome ports `PayableRepository`/`OutboxPort`/`Clock`; converte try/catch em Result na borda I/O |
| E. Modular Monolith | ✅ `domain/payable/types.ts` é importado como `import type` — sem dependência runtime cruzada; sem cross-module (não importa de `contracts/`) |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts` em todos; `import type` separado; sem require/namespace/enum |
| G. Naming, EN/PT, clareza | ✅ identifiers EN; mensagens PT-BR no formatter; sufixos consistentes (`Error`, `Flags`); sem `Impl`. Sugestões 1-4 são cosméticas. |
| H. Tests | ✅ AAA implícito; fixtures usam `Payable.open` real; UUIDs reais via `PayableId.generate`; tmpdir isolado; sem mocks |

---

## Verificações específicas do prompt da review

| Ponto | Resultado |
| :--- | :--- |
| A.1 adapters.md (try/catch → Result na borda) | ✅ `state.ts` 100% Result; outros sem try/catch |
| A.2 testing.md (mirror src/) | ✅ `tests/modules/financial/cli/` espelha `src/modules/financial/cli/` |
| A.3 ADR-0006 (Clock compartilhado) | ✅ `ClockReal` importado de `#src/shared/adapters/clock-real.ts` |
| A.4 ADR-0020 (só MySQL; driver mysql reservado) | ✅ `parse-driver-flags.ts` reconhece `'memory' \| 'mysql'`; `buildContext` rejeita `mysql` com `cli-driver-not-supported-yet` |
| B.1 parse-flags.ts cópia exata? | ⚠️ Funcionalmente idêntico, texto diff (Sugestão 1) |
| B.2 parse-driver-flags diferenças documentadas | ✅ Header L13-16 explica |
| B.3 state.ts versão enxuta + validação pragmática documentada | ✅ Header L5-10 |
| B.4 formatters cobre só erros do scaffold | ✅ 11 entradas, nenhuma de domínio Payable |
| B.5 drivers/memory enxuto (1 handle) | ✅ vs 3 handles do contracts |
| B.6 context switch exaustivo sem default:throw | ✅ L38-44 |
| B.7 registry vazio mas tipado | ✅ L18 |
| B.8 main.ts preserva FIN-CLI-WIRE | ✅ texto "nenhum ainda" L29 (regex `/nenhum ainda/i` passa) |
| C.1 Header `state.ts` POR QUE pragmática | ✅ L5-10 |
| C.2 Header `parse-driver-flags` POR QUE mysql sem connectionString | ✅ L13-16 |
| C.3 Header `drivers/memory` POR QUE outbox efêmero | ⚠️ implícito (Sugestão 2) |
| C.4 Header `main.ts` cita FIN-CLI-WIRE | ✅ L9-12 |
| C.5 Mensagem `cli-driver-not-supported-yet` cita FIN-ADAPTER-DRIZZLE-PAYABLE | ✅ L24 |
| D.1 `loadState` arquivo ausente → ok | ✅ L163 |
| D.2 `loadState` path para diretório → state-file-not-readable | ✅ L166-170 |
| D.3 `loadState` JSON malformado → state-file-corrupted | ✅ L182-188 |
| D.4 `isValidPayable` checa invariantes estruturais | ✅ L92-117 |
| D.5 `saveState` atômico (tmp + rename) | ✅ L213-220 |
| D.6 Lock acquire+release via openSync('wx') | ✅ L130-131 |
| E.1 `EXIT_CODE_BY_CONTEXT_ERROR` Record exaustivo | ✅ L50 |
| E.2 Ordem pipeline parseDriverFlags → registry → buildContext → cmd.run | ✅ L76-108 |
| E.3 Cleanup try/finally com shutdown | ✅ L107-111 |
| E.4 `--help` antes de qualquer parsing | ✅ L71-74 |
| F.1 parse-driver-flags.test 7+ cenários | ✅ 8 it's (CA-7..11 + bonus rest) |
| F.2 state.test usa tmpdir + isolation | ✅ `mkdtempSync` + finally rmSync |
| F.3 main.test preserva 4 + adiciona 3 | ✅ 7 it's totais (4 FIN-CLI-WIRE + 3 CA-NEW) |
| F.4 CA-NEW-1 ajustado documenta REGISTRY vazio | ✅ comentário L71-74 |
| F.5 Lock test 1.5s correto, não bloqueia | ✅ comportamento esperado |
| G. Anti-padrões absolutos | ✅ Zero ocorrência em src/ produção; throws em fixtures helpers OK (padrão) |
| H. Decisões pragmáticas documentadas | ✅ todas no header docs ou em comentários inline |

---

## Marco — Scaffold CLI do módulo Financial APROVADO

Padrões consolidados neste ticket:

- **Pipeline pronto para receber comandos** — `parseDriverFlags → registry → buildContext → cmd.run` com cleanup via try/finally.
- **Driver `memory` operacional** — InMemoryOutbox + InMemoryPayableRepository + state file Payables com lock.
- **Driver `mysql` reservado** — `buildContext` rejeita com mensagem que aponta para `FIN-ADAPTER-DRIZZLE-PAYABLE`.
- **Validação pragmática** documentada — escopo creep evitado.
- **Mensagens de erro completas** — UX excelente (`cli-driver-not-supported-yet` cita ticket bloqueante + workaround).
- **Preserva FIN-CLI-WIRE** — refactor não quebrou os 4 testes pré-existentes.
- **Decisões documentadas no source** — reviewer entende sem abrir REPORT.

Tudo casa com o pattern de `contracts/cli/` mas com adaptações enxutas (sem amendmentRepo/documentRepo, sem WorkerOutboxOps, sem driver mysql implementado).

---

## Próximo passo

- **APPROVED** → main-session avança para W3.
- 4 sugestões 🔵 listadas — **não bloqueiam W3**. Recomendação: aplicar Sugestão 1 (header doc `parse-flags`) e Sugestão 2 (header `drivers/memory`) antes do W3 (cosméticas, baixo risco). Sugestões 3 e 4 podem esperar (3 = quando mysql for habilitado; 4 = quando `FIN-CLI-APROVAR-TITULO` valida o uso de `parseFlags`).
- Expectativa W3: **ALL-GREEN round 1** — 4º ticket FIN-* M seguido sem rejection W2 manteria o recorde.
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-CLI-SCAFFOLD` (36º ticket fechado).
- **Próximo ticket sugerido:** `FIN-CLI-APROVAR-TITULO` (S) — primeiro comando real consumindo o scaffold (consome `parseFlags` + `validateAllowedFlags`, valida Sugestão 4 acima).
