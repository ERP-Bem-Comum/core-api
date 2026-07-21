# FIN-REALIZED-PROVISIONED-READ — W3 (QUALITY)

> Wave W3 · skill `ts-quality-checker` · fatia 2/3 de `REPORTS-REALIZED-VS-PLANNED`.
> Gates locais **verdes**; integração MySQL **não executada** por bloqueio de infra (#500) — registrada
> como tal, **jamais** como verde.

## Gates locais (rodados no fio principal)

| Gate | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ limpo |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm run lint` | ✅ limpo |
| `pnpm test` | ✅ **4251 tests · 4232 pass · 0 fail · 19 skipped** |

Baseline (início da fatia): 4250 / 4227. Δ = +1 test / +5 pass (3 boundary + 2 superfície) / −4 fail
(os do W0 RED, agora verdes). **Regressão zero.**

## Integração MySQL — NÃO executada (bloqueio #500)

Os 7 casos gated (`MYSQL_INTEGRATION=1`) de
`tests/modules/financial/public-api/realized-provisioned.drizzle-mysql.test.ts` — que provariam contra
banco real as duas medidas (16000, 40000, 26000/30000, buckets mar/abr, filtro por eixo de data) —
**não rodaram**: exigem MySQL na 3306, hoje ocupada pelo ambiente de dev, e o runner oficial é
destrutivo (issue #500, `bug`/alta). Estão provados **só** por leitura de código e pelo SQL emitido
(W2). Registrado como **não-executado**.

## Retomada da verificação real

Junto com as fatias 1 (`BGP-READ-PORT`, W3 também bloqueado) e 3, numa **leva única** de integração
quando a #500 fechar **ou** houver janela para o ritual manual (parar o MySQL de dev → descartável →
restaurar). É a verificação end-to-end das 3 medidas do relatório contra o dado do `ETL-BUDGET-PLANS`.

## Achados de wave anterior — estado

- **W2 Minor #1** (chave de costura sem separador, com chars de controle invisíveis): **resolvido** no
  pós-review — separador `|` visível + sentinela NUL. Ver adendo no `004-code-review/REVIEW.md`.

## Estado do ticket

Código: **pronto e verde nos gates locais**. Bloqueio de integração é **externo** (#500), não do
código. Fatia 2/3 entregável; a rota (fatia 3) pode consumir o reader.
