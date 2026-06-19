# W3 — Gate de qualidade · FIN-RECON-ENTRYTYPE-UNION

**Skill:** ts-quality-checker · **Resultado:** GREEN (todos os gates).

## Gates (saída integral)

| # | Comando | Exit | Resultado |
| --- | --- | --- | --- |
| 1 | `pnpm run typecheck` | 0 | 0 erros TS |
| 2 | `pnpm run format:check` | 0 | `All matched files use Prettier code style!` |
| 3 | `pnpm run lint` | 0 | sem error/warning (sem OOM — flat config OK dentro do worktree) |
| 4 | `pnpm test` | 0 | **tests 2962 · pass 2944 · fail 0 · skipped 18** |

## Integração (Docker, MySQL real) — fora do gate sem-Docker

| Comando | Exit | Resultado |
| --- | --- | --- |
| `pnpm run test:integration:financial` | 0 | `✔ CA5 (#159): CHECK rejeita entry_type fora do union no nível do DB` + CA7 (round-trip / índice único) |

## Política de regressão zero

- `fail 0` na suíte completa. Os **18 skipped** são pré-existentes (testes condicionais/gateados), não introduzidos por este ticket — nenhum teste novo foi suprimido com `skip`.
- Fixtures que o fechamento do tipo quebrou (`'TARIFA'`) foram **corrigidos** para o canônico `'Fee'`, não silenciados.

## Conclusão

Ticket pronto para fechar. Decisão #159 = **caminho A** entregue: union `EntryType` fechado (spec 017), normalização nos parsers, mapper defensivo, CHECK no schema, migration `0009` (renumerar p/ `0013` no rebase — diretriz de merge do épico #171).
