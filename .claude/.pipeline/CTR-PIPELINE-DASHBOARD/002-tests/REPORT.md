# 002 — W0 (RED) — CTR-PIPELINE-DASHBOARD

**Skill:** `tdd-strategist`
**Data:** 2026-05-21
**Veredito:** ✅ **RED CONFIRMADO** — `pass=0, fail=1` (top-level import quebra; CA-T8 também não pode rodar via execFile pois `dashboard-cli.ts` não existe).

---

## Arquivos criados

| Arquivo | Cenários | CA cobertos |
| :--- | :---: | :--- |
| `tests/pipeline/dashboard.test.ts` | 8 | CA-T1..T8 |

---

## Intenção de cada teste

### `loadAllStates` — leitura de múltiplos STATE.json

- **CA-T1**: 3 tickets válidos (`CTR-ZULU`, `CTR-ALPHA`, `CTR-MIKE`) → 3 snapshots ordenados alfabeticamente (`ALPHA, MIKE, ZULU`), zero erros.
- **CA-T2**: 1 ticket válido + 1 diretório sem STATE.json → 1 snapshot, zero erros. Legacy é **silencioso** (não vira erro).
- **CA-T3**: 1 ticket válido + 1 STATE.json com `schemaVersion: 2` → 1 snapshot válido + 1 entry em `errors[]` com `reason` mencionando `SchemaVersionMismatch` e `ticketDir` apontando para `CTR-BAD`.

### `renderDashboardTable` — filtros

- **CA-T4**: `filter='open'` → inclui `status ∈ {'open', 'in-progress'}`, exclui `'closed-green'`.
- **CA-T5**: `filter='closed'` → inclui `'closed-green' + 'closed-rejected'`, exclui `'open'`.

### `renderDashboardJson` — output estruturado

- **CA-T6**: produz JSON parseável com `summary: { total, open, closed, blocked }` e `tickets: []`. Asserts: `total=2, open=1, closed=1, blocked=0`, primeiro ticket = `CTR-A` com `daysOpen=2`.

### `daysOpen` — `now` injetado (testabilidade)

- **CA-T7**: ticket criado em `2026-05-16T00:00:00Z`; `now = 2026-05-21T00:00:00Z`; render mostra `daysOpen=5`. **Crítico:** o cálculo de tempo NÃO usa `new Date()` inline — recebe `now` por argumento.

### CLI E2E — `dashboard-cli.ts`

- **CA-T8**: cria `tmpdir/<rand>/.claude/.pipeline/` vazio, roda `node scripts/pipeline/dashboard-cli.ts --json` com `cwd = tmpdir/<rand>` → exit 0, stdout parseável, `summary.total = 0`. Prova: diretório sem tickets **não é erro fatal**.

---

## Saída do runner (resumo)

```
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ duration_ms 169.55
```

Erro top-level:

```
ERR_MODULE_NOT_FOUND
url: scripts/pipeline/dashboard.ts
```

**Por que `tests=1` em vez de 8:** o `import` no topo de `dashboard.test.ts` falha porque `scripts/pipeline/dashboard.ts` não existe. `node:test` reporta o arquivo inteiro como 1 fail unitário, sem descobrir os 8 `it()` aninhados. Em W1 (após implementar), os 8 cenários virão à tona individualmente.

---

## Constraints e decisões herdadas para W1

1. **Função pura `loadAllStates(pipelineRoot)`** — recebe path raiz, retorna `{ snapshots, errors }`. Assinatura:

   ```ts
   export const loadAllStates = async (
     pipelineRoot: string,
   ): Promise<LoadResult>;
   ```

2. **Ordenação alfabética por padrão.** `result.snapshots` sai ordenado por `state.ticket` ASC. Se quiser outra ordem, fica para flag futura `--sort`.

3. **Legacy ≠ erro.** Diretório sem STATE.json NÃO entra em `errors[]`. Pode entrar em um contador futuro `summary.legacy` (CA-T8 não testa, mas o request mencionou). Implementação livre — testes não exigem `summary.legacy`.

4. **`errors[].reason` é string descritiva**, não tagged union — facilita display sem enumerar variantes. Inclua a tag do erro do parser (ex.: `"SchemaVersionMismatch: expected 1, actual 2"`).

5. **`now` é argumento de `RenderOptions`**, NÃO chamada `new Date()` dentro do render. Teste CA-T7 falha imediatamente se o cálculo de `daysOpen` ler relógio interno.

6. **`renderDashboardTable` aceita `DashboardFilter`** com 4 variantes: `'all' | 'open' | 'closed' | 'blocked'`. `'open'` inclui `'open' + 'in-progress'`. `'closed'` inclui `'closed-green' + 'closed-rejected'`. `'blocked'` inclui só `'blocked'`. `'all'` não filtra.

7. **`renderDashboardJson`** retorna string serializada (não objeto). O CLI faz `process.stdout.write(json)`. Test parseia com `JSON.parse(out)`.

8. **CLI exit 0 em diretório vazio.** `dashboard-cli.ts` não é erro se `pipelineRoot` está vazio — só erro fatal se `pipelineRoot` não existe (ex.: `<cwd>/.claude/.pipeline` ausente).

9. **CLI flags:** `--filter open|closed|blocked|all` (default `all`) + `--json` (default Markdown). Parser pode reusar o `parseFlags` de `state-cli.ts` (copy ou export).

10. **Pattern do `execFileAsync`** reusado de `tests/pipeline/state-cli.test.ts` — function async + wrap manual de `node:child_process.execFile` (não usar `promisify`, lint rejeita).

---

## Notas de implementação para W1

- `scripts/pipeline/dashboard.ts` — funções puras + types.
- `scripts/pipeline/dashboard-cli.ts` — entrypoint (parseFlags, lê `process.cwd()/.claude/.pipeline`, decide entre `renderDashboardTable` ou `renderDashboardJson`).
- `package.json` ganha `"pipeline:status": "node --experimental-strip-types --no-warnings scripts/pipeline/dashboard-cli.ts"`.
- `CLAUDE.md` atualizado no W1 (não em W0).
- Dogfood ao final do W1: rodar `pnpm run pipeline:status` no próprio repo e capturar output no REPORT W1 — deve mostrar `CTR-PIPELINE-STATE-JSON` (closed) e `CTR-PIPELINE-DASHBOARD` (in-progress).

---

## Veredito W0

✅ **RED confirmado.** 8 cenários descritos em 1 arquivo de teste. Top-level fail (1) já garante que nenhum teste roda verde acidentalmente. Em W1, esses 8 cenários virão à tona individualmente.

Próxima wave: **W1 — GREEN** com implementação mínima de `scripts/pipeline/dashboard.ts` + `scripts/pipeline/dashboard-cli.ts`.
