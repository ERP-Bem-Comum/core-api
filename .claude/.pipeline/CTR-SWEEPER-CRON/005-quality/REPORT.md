# W3 — Gate final de qualidade (CTR-SWEEPER-CRON)

**Wave**: W3 · **Disciplina**: `ts-quality-checker` · **Veredito**: 🟢 GREEN · **Data**: 2026-06-16

## Gate canônico (AGENTS.md)

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ sem erros |
| `pnpm run format:check` | ✅ `All matched files use Prettier code style!` |
| `pnpm run lint` (`eslint .`) | ✅ 0 errors |
| `pnpm test` | ✅ **2537 tests · 2519 pass · 0 fail · 18 skipped** |

Inclui `tests/infra/contracts-sweeper-compose.test.ts` — **10/10** (CA1a–i + CA3): serviço, `restart:"no"`, `profiles:[jobs]`, `depends_on mysql:healthy`, secret, `security_opt`, **entrypoint+command rodam o `run.ts`** (não `server.ts` — CA1g), **sem `container_name`** (CA1h), **`cap_drop:[ALL]`+`read_only`** (CA1i), opt-in (CA3).

## CA-exit (rodar o container) — validação de DEPLOY (decisão do P.O.)

O **config-wiring** está provado por: teste de config 10/10 + `docker compose config` (default + `--profile jobs`) exit 0 + entrypoint resolvido (`tini -- node src/jobs/contracts/sweeper/run.ts`).

A **execução real do container** (exit `78` sem URL · exit `0` + contratos `Expired` com URL) exige build da imagem `core-api:dev` (inexistente) + MySQL + dados — é **validação de deploy/integração**, não gate de unidade. Por decisão do P.O., fica **documentada** (não executada neste gate) com o comando canônico no runbook:

```bash
# ERP-INFRA / primeiro deploy:
docker compose --profile jobs run --rm contracts-sweeper   # exit 0 + linha "expired=N scanned=M"
```

Pré-requisito: schema migrado antes (CA6 — `applyMigrations:false`). Ver `handbook/infrastructure/06-contracts-sweeper-job.md`.

## Reforços de confiabilidade entregues (além do escopo mínimo)

- `systemd timer Persistent=true` (catch-up de boot) — documentado e explicado.
- Eliminado o `container_name` fixo (M2) — uma via de "cron para silenciosamente".
- Dead-man's switch (detecção de ausência) → **SPIKE #66** (in-house; runbook aponta + tabela de camadas de confiabilidade).

## Conclusão

Gate canônico verde. CA-exit documentado como validação de deploy (decisão do P.O.). Ticket pronto para fechar. **`Closes #50`** no commit.
