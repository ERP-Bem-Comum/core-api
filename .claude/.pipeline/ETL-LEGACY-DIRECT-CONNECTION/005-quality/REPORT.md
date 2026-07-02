# W3 — Gate de qualidade (GREEN) · ETL-LEGACY-DIRECT-CONNECTION

**Skill:** ts-quality-checker · **Outcome:** GREEN · **Data:** 2026-07-02

Comandos rodados com o binário real do Node (`$HOME/.nvm/.../v24.16.0/bin/node`) para evitar recursão do nvm lazy-load.

## Resultados

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `tsc --noEmit` | ✅ **0 erros** |
| Format | `prettier --check .` | ✅ "All matched files use Prettier code style!" |
| Lint | `eslint .` | ✅ **0 erros / 0 warnings** |
| Test | `node --test "tests/**/*.test.ts"` | ✅ **3410 tests · 3392 pass · 0 fail · 18 skipped** |

Os 18 skipped são as suítes de integração gateadas (`MYSQL_INTEGRATION`/`PARTNERS_ETL_INTEGRATION` +
`ETL_LEGACY_CONNECTION_STRING` ausentes) — skip com razão explícita, nunca RED. Política de regressão
zero satisfeita: nenhuma falha não-endereçada.

## Ressalva de escopo (não bloqueia W3)

- **CA5** (integração ETL ao vivo contra MySQL) não executada nesta sessão — exige MySQL/Docker (sem
  autorização; validar no ambiente/CI). O código e o runner (`ETL_DB_ENV`) estão prontos; a suíte
  skipa limpo sem a env. Recomendação de validação manual:
  `pnpm run test:integration:etl` / `:etl:orchestrate` / `:etl:contracts` / `:etl:financial`.

## Conclusão

W3 GREEN. Ticket pronto para fechar. Diff entregue: reader do legado por `ETL_LEGACY_CONNECTION_STRING`,
sem Docker/dump; `restore.ts` + `compose.etl.yaml` removidos; entrypoints, diagnóstico, runner e testes
de integração migrados.
