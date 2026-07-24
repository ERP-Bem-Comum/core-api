# CI-RUNNER-NON-DESTRUCTIVE — W3 (QUALITY)

> Parte A da #500 · `ts-quality-checker` · 2026-07-22.

## Gates (fio principal)
| Gate | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ 0 erros |
| `pnpm run format:check` | ✅ limpo |
| `pnpm run lint` | ✅ limpo |
| `pnpm test` | ✅ **4337 tests · 4318 pass · 0 fail · 19 skipped** |

Baseline: 4329/4309. Δ: +8 tests / +9 pass (8 novos + a suíte do RED recuperada) / 0 fail. **Regressão zero.**

## O que a Parte A entrega
O runner de integração deixou de destruir o dev local: projeto Docker isolado (`-p core-api-test` — `down -v`
só apaga `core-api-test_*`) + backup/restore dos secrets do dev (byte-a-byte, no `finally`). Verificado por
teste (fs puro + inspeção de args), **sem** tocar Docker. O ponto crítico (CA5) é estruturalmente garantido:
`composeDownArgs()` é a única fonte do `down` e embute o `-p`.

## Achado fora de escopo → issue #517 (atribuída ao Gabriel)
O W2 achou o **mesmo bug** nos `scripts/e2e/*.sh` (`down -v` sem `-p` + `rm -f secrets` sem backup) — a Parte A
não os cobre (fora do escopo). Registrado em **#517** (`shared:e2e-scripts:destructive-down-v-secrets`), não
consertado inline (ADR-0040).

## Estado — o ritual seguro agora é possível
Com a Parte A, rodar `test:integration:*` **não apaga mais o banco/secrets de dev**. O caminho para provar as
âncoras do épico #502 (R$55, R$5.500) contra banco real está destravado: parar o dev → rodar → religar intacto.
Falta a Parte B (porta/68 arquivos — coexistência+CI) e a Parte C (workflow), com o Gabriel.
