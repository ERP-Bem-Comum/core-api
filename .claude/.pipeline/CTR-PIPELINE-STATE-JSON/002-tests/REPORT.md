# 002 — W0 (RED) — CTR-PIPELINE-STATE-JSON

**Skill:** `tdd-strategist`
**Data:** 2026-05-21
**Veredito:** ✅ **RED CONFIRMADO** — `pass=0, fail=8` (todos os cenários vermelhos por inexistência de `scripts/pipeline/*.ts`).

---

## Arquivos criados

| Arquivo | Cenários | CA cobertos |
| :--- | :--- | :--- |
| `tests/pipeline/state-schema.test.ts` | 4 | CA-T1, CA-T2, CA-T3, CA-T4 |
| `tests/pipeline/state-io.test.ts` | 2 | CA-T5a (happy path), CA-T5b (atomic via rename mock) |
| `tests/pipeline/render-state-md.test.ts` | 2 | CA-T6 (determinismo), CA-T7 (compat hook) |
| `tests/pipeline/state-cli.test.ts` | 5 | CA-T8, CA-T9, CA-T10, CA-T11, CA-T12 |
| **Total** | **13** | **CA-T1..T12** (T5 desdobrado em 2 para cobrir interface + atomicidade) |

---

## Intenção de cada teste

### `state-schema.test.ts` — parser `parsePipelineState`

- **CA-T1**: JSON v1 válido → `ok(PipelineState)` com 4 waves e `schemaVersion === 1`.
- **CA-T2**: string não-JSON → `err({ tag: 'InvalidJson' })`.
- **CA-T3**: `schemaVersion: 2` → `err({ tag: 'SchemaVersionMismatch', expected: 1, actual: 2 })`.
- **CA-T4**: JSON sem campo `ticket` → `err({ tag: 'MissingField', field: 'ticket' })`.

### `state-io.test.ts` — `writeState` / `readState`

- **CA-T5a** (happy path): `writeState(dir, state)` produz `STATE.json` parseável e **não deixa `STATE.json.tmp`** residual. `readState(dir)` retorna o mesmo estado.
- **CA-T5b** (atomicidade): com `STATE.json` original contendo `stateA`, mockar `fsp.rename` para lançar; `writeState(dir, stateB)` retorna `err`, e o `STATE.json` no disco continua sendo `stateA` (não foi corrompido nem substituído).

### `render-state-md.test.ts` — gerador determinístico

- **CA-T6**: `renderStateMd(state)` chamado duas vezes com o mesmo input produz strings idênticas (byte-by-byte).
- **CA-T7**: output contém o ID do ticket e 4 linhas de tabela `| W0 ` / `| W1 ` / `| W2 ` / `| W3 `, compatível com o regex que `inject-ticket-context.sh` usa hoje no `STATE.md`.

### `state-cli.test.ts` — comandos do CLI

- **CA-T8**: `init <ticket> --size S` → cria `STATE.json` em `.claude/.pipeline/<ticket>/` com `status=open`, 4 waves `id ∈ {W0,W1,W2,W3}` todas `status=pending`.
- **CA-T9**: `wave-start W1` sem ter feito `wave-finish W0` → exit code **2** + mensagem no `stderr`.
- **CA-T10**: `init` → `wave-start W0` → `wave-finish W0 --outcome RED --report 002-tests/REPORT.md` → STATE.json reflete `currentWave: 'W1'`, `W0.status: 'done'`, `W0.outcome: 'RED'`.
- **CA-T11**: estado em W2 in-progress (rounds=1). Chamadas: `wave-round W2` (1→2) ok, (2→3) ok, (3→4) **falha com exit 2**. `rounds` final no JSON = `3`.
- **CA-T12**: ticket com W0 done mas W1/W2/W3 pending → `close` falha com exit 2; `status` não muda para `closed-green` e `closedAt` continua `null`.

---

## Saída do runner (resumo)

```
ℹ tests 8
ℹ suites 1
ℹ pass 0
ℹ fail 8
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 776.438708
```

**Por que `tests=8` e não 13:**

- `state-schema.test.ts`, `state-io.test.ts`, `render-state-md.test.ts` falham no **top-level import** porque `scripts/pipeline/*.ts` não existe. O `node:test` reporta cada arquivo como **1 fail unitário** (3 fails).
- `state-cli.test.ts` não importa o CLI — invoca via `execFile`. Os **5 testes individuais executam** e cada um vê `Cannot find module 'scripts/pipeline/state-cli.ts'`, retornando exit code do node ≠ 2/0 esperados. **5 fails** individuais.
- Soma: 3 + 5 = 8 fails. ✅ Comportamento esperado em W0; em W1 todos os 13 cenários virão à tona.

Trecho representativo do erro (CA-T11, idêntico padrão em todos):

```
Error: Cannot find module '.../scripts/pipeline/state-cli.ts'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1476:15)
    code: 'MODULE_NOT_FOUND'
```

---

## Constraints e decisões herdadas para W1

1. **Atomic IO — namespace import obrigatório.** O test `CA-T5b` usa `t.mock.method(fsp, 'rename', ...)` para injetar falha. Para o mock surtir efeito, `state-io.ts` **DEVE** importar `node:fs/promises` como namespace:

   ```ts
   import * as fsp from 'node:fs/promises';
   // ...
   await fsp.rename(tmpPath, finalPath);  // ← chamada via namespace, não named import
   ```

   Named import (`import { rename } from 'node:fs/promises'`) cria uma binding local que o mock não intercepta.

2. **`writeState` deve retornar `Result<void, WriteError>`** (não lançar). O test `CA-T5b` assere `w.ok === false` quando o rename falha.

3. **CLI: exit codes documentados.**
   - `0` — sucesso
   - `1` — erro inesperado (default)
   - `2` — violação de invariante do pipeline (wave start fora de ordem, round > 3, close com waves pendentes)

4. **`wave-finish` avança `currentWave` automaticamente** para a próxima wave (W0→W1, W1→W2, W2→W3, W3→null + status `closed-green`).

5. **Ordem das waves no JSON garantida W0→W3.** Testes consultam por `find((w) => w.id === ...)` mas também checam `.map((w) => w.id) === ['W0','W1','W2','W3']`.

6. **`Result<T, E>` reusado de `#src/shared/result.ts`** — nenhum re-implementação. Em `scripts/pipeline/*.ts` use o subpath ou caminho relativo (`../src/shared/result.ts`).

7. **Mensagens de erro em PT-BR** quando humano-visíveis (stderr); tags de erro internas em **EN kebab-case** (`InvalidJson`, `SchemaVersionMismatch`, `MissingField`, `InvalidFieldType`).

---

## Notas de implementação para W1

- `scripts/pipeline/state-schema.ts`, `state-io.ts`, `render-state-md.ts`, `state-cli.ts` precisam ser **todos** criados.
- `package.json` ganha `"pipeline:state": "node --experimental-strip-types --no-warnings scripts/pipeline/state-cli.ts"`.
- `CLAUDE.md` é atualizado no W1 (não em W0).
- Dogfood: ao final do W1, o próprio ticket `CTR-PIPELINE-STATE-JSON` deve ter um `STATE.json` (não só `STATE.md`).

---

## Veredito W0

✅ **RED confirmado.** 13 cenários de teste descritos; 8 fails reportados pelo runner (3 arquivos com import quebrado + 5 tests individuais do CLI via execFile). Nenhum teste passou. W0 fechado.

Próxima wave: **W1 — GREEN** com implementação mínima de `scripts/pipeline/{state-schema,state-io,render-state-md,state-cli}.ts`.
