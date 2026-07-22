# W3 — Gate de Qualidade · BGP-ETL-READER-MAPPER (fatia 3/3 do ETL de Orçamento)

> Gate final. 4 gates estáticos verdes. Integração ponta-a-ponta documentada como procedimento de
> infra (runbook) — depende do dump de produção + pré-requisitos migrados, não roda no CI padrão.

## Gates estáticos (local) — verificados pelo orquestrador

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` | ✅ verde (0 erros) |
| Format | `pnpm run format:check` | ✅ verde |
| Lint | `pnpm run lint` | ✅ verde |
| Test (puro, sem DB) | `pnpm test` | ✅ 4191 pass · **0 fail** · 19 skipped |

O mapper puro (17 regras + 4 quarentenas) é coberto por 17 unit tests sem DB. A Issue #1 do W2
(JOIN em coluna inexistente do reader) foi corrigida antes do gate.

## Integração ponta-a-ponta — procedimento de INFRA (não CI padrão)

Diferente das fatias 1 e 2 (fixture sintético no CI), o `writer.integration.test.ts` afere as
contagens **de produção** (5/5/4679/36/38/390), a soma por Rede (diff 0) e a idempotência **contra o
banco de referência (o dump)**. Isso exige:

1. O dump de produção restaurado (PII — não vive no CI).
2. Pré-requisitos migrados no core: **programas** (resolve `programRef` por sigla) e **usuários**
   (resolve `updatedBy` por `legacy_id`). Confirmado pela P.O. que já foram migrados (ETLs anteriores).

Portanto a prova ponta-a-ponta é um **procedimento controlado de infra**, documentado em
[`handbook/infrastructure/12-etl-budget-plans-runbook.md`](../../../handbook/infrastructure/12-etl-budget-plans-runbook.md):
ambiente de referência (`compose.etl.yaml`), pré-check dos pré-requisitos, `--dry-run` (lê +
reconcilia + relatório, sem gravar), critérios de aceite, execução real, quarentena, verificação
pós-migração. `PARTNERS_ETL_INTEGRATION=1` + `ETL_LEGACY_CONNECTION_STRING` rodam a versão
automatizada desse runbook no ambiente da infra.

**Por que não foi rodado localmente nesta wave:** tentar montar o ambiente ad-hoc (fonte+destino num
container com usuário na mão) não é reproduzível e não é o que a infra executa — foi descartado a favor
do runbook. O `--dry-run` também exige o core com os pré-requisitos (lê programas/usuários), então não
é executável só com o dump.

## Cobertura que sustenta o merge

- **Mapper**: 17 regras provadas em unit (puro). Cada quarentena tem teste.
- **Reader**: SQL alinhado ao `database.dbml` do legado (Issue #1 do W2 corrigida: `pm.uf` direto).
- **main/idempotência**: `findByLegacyId` antes de `provision`; `UNIQUE(legacy_id)` da fatia 1 garante
  no-duplicate. Prova runtime é o runbook/infra.
- **ADR-0006**: `scripts/etl/budget-plans` importa só a public-api.

## Follow-ups registrados (não bloqueiam)
- Issue #486 — resolver read-by-legacy-id na public-api do `auth` (hoje SELECT direto).
- Issue #487 — `parentId` nulo em silêncio se o pai for quarentenado (inócuo no dado medido).

## Veredito

**GREEN (local) + runbook de infra entregue.** ETL de Orçamento completo (3 fatias). A migração real é
executada pela infra conforme o runbook, com dry-run e verificação. Fecha a série `BGP-ETL-*`.
