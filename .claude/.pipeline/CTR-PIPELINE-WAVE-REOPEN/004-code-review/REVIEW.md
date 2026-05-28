# W2 — Code Review (read-only)

**Agente:** code-reviewer
**Round:** 1
**Veredito:** **APPROVED** ✅

## Escopo revisado

- `scripts/pipeline/state-cli.ts` — nova `cmdWaveReopen` + case no switch + string de uso.
- `CLAUDE.md` (raiz) — linha de doc do `wave-reopen` (CA-7).
- `tests/pipeline/state-cli.test.ts` — `describe` block `wave-reopen` (5 testes).

## Checklist

| Critério | Status | Nota |
| --- | :---: | --- |
| Consistência com o módulo | ✅ | Mesmo shape de `cmdWaveRound`/`cmdWaveFinish`: `loadState` → guardas → `map` imutável → `writeStateAndMd` |
| Reuso (sem mágica nova) | ✅ | `MAX_ROUNDS`, `exitFail`, `indexOfWave`, `Flags` reaproveitados |
| Exit codes | ✅ | 1 (wave inexistente — I/O/arg) e 2 (invariante de pipeline), coerente com o cabeçalho do arquivo |
| Imutabilidade | ✅ | `state.waves.map(...)`; `newState` por spread; nada mutado in-place |
| Narrowing TS | ✅ | `exitFail` é `never` → `target` estreita de `WaveEntry\|undefined` para `WaveEntry` após o guard |
| `--agent` opcional | ✅ | atualiza só se `!== undefined && !== ''`, senão mantém `w.agent` (alinha à grammar `[--agent]`) |
| Idioma | ✅ | mensagens PT, identificadores EN |
| Não cruza módulos / `src/` | ✅ | tooling de pipeline; não toca domínio |
| CA-7 (doc) | ✅ | CLAUDE.md §"Pipeline state" atualizado |

## Observações (não-bloqueantes)

1. **Ordem das guardas: MAX_ROUNDS (CA-5) antes de posterior-pending (CA-4).** Se uma wave
   estivesse simultaneamente em `rounds=3` e com posterior não-pending, o erro reportado seria o
   de max-rounds. Não há ambiguidade nos testes (cenários isolam cada guarda) e a precedência é
   defensável (o teto de rounds é o limite mais duro). Aceitável.

2. **`outcome` pós-reopen vira `null`.** Correto: a wave volta a "em andamento sem desfecho". O
   `wave-finish` subsequente exige `in-progress` (`state-cli.ts:179`) e repõe o outcome — ciclo
   fechado e coberto por CA-2.

## Conclusão

Implementação coesa com o modelo existente, guardas completas e bem-testadas. Sem issues
bloqueantes. Liberado para W3.
