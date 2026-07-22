# W3 — Gate de Qualidade · BGP-ETL-LEGACY-ID (fatia 1/3 do ETL-BUDGET-PLANS)

> Gate final. Os 4 gates estáticos rodaram localmente e estão **verdes**. A prova de integração
> (constraints em MySQL real) fica **para o CI** — decisão da P.O. (2026-07-17), justificada abaixo.

## Gates estáticos (local) — verificados pelo orquestrador

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` | ✅ verde (0 erros) |
| Format | `pnpm run format:check` | ✅ verde |
| Lint | `pnpm run lint` | ✅ verde |
| Test (puro, sem DB) | `pnpm test` | ✅ 4170 pass · **0 fail** · 19 skipped |

Contagem: `pass 4158 (W0) → 4170 (W1) → 4170 (W3)`. Os 12 RED estruturais do W0 estão GREEN; zero
regressão.

### Ajuste durante o W3 (não-código)
O lint acusou 1 erro de parsing em `.tmp/calc-probe.ts` — a **sondagem descartável** do cálculo (que
já validou os 4.679 lançamentos). Arquivo em `.tmp/` (gitignored), removido; não faz parte de nenhuma
fatia. Lint voltou ao verde.

## Integração — DEFERIDA AO CI (decisão da P.O., caminho 2)

Os 19 testes gated (`test:integration:budget-plans`, `MYSQL_INTEGRATION=1`) que provam as constraints
em MySQL real — CA1 (coluna+UNIQUE via information_schema), CA2 (múltiplos NULL convivem), CA3
(duplicata → `ER_DUP_ENTRY`), CA4 (regressão nativa) — **não rodaram localmente**, por conflito de
ambiente, **não por falha de código**:

1. **Porta 3306 ocupada pelo `erp-mysql` do legado** — recurso gerido em outro contexto; o hook do
   projeto bloqueia mexer nele. O runner sobe o próprio MySQL na 3306 e colide.
2. **Porta alternativa (3310) → `Access denied for root`** em **todos** os testes de budget-plans,
   inclusive os pré-existentes (round-trip, CAs do #317, `sumByBudgetIds`). Causa provável: o volume
   persistente `mysql-data` (compose.yaml:186) foi inicializado com senha root diferente do secret
   atual (MySQL só define root na 1ª init com datadir vazio). É estado de infra compartilhada com o
   dev — não se limpa por uma fatia aditiva.

**Prova de que não é regressão do diff:** o `Access denied` atinge testes que passavam antes deste
ticket. O diff da fatia 1 é 6 colunas + 6 uniques + migration aditiva — não toca auth nem conexão.

**Por que o CI resolve:** o CI sobe MySQL **efêmero e limpo** (volume novo, sem conflito de porta, sem
volume velho) — é o ambiente natural desta prova. O `legacy-id.drizzle-mysql.test.ts` já está
registrado no runner (`scripts/ci/test-integration.ts`), então roda automaticamente lá.

## Cobertura local que sustenta o merge

O que o CI vai provar em runtime já está garantido estruturalmente aqui:
- **Schema**: teste estrutural (sempre roda) verifica, nas 6 tabelas, `legacyId` (`MySqlInt`,
  nullable) + `uniqueIndex` de coluna única. Verde.
- **Migration**: `0009` gerada por `db:generate` (ADR-0020), inspecionada — 6 `ADD legacy_id int`
  nullable + 6 `ADD CONSTRAINT UNIQUE(legacy_id)` de coluna única. Aditiva pura.
- **Semântica do UNIQUE nullable** (múltiplos NULL convivem) é garantia do InnoDB, não do nosso
  código — o mesmo padrão de auth/partners/financial já em produção.

## Veredito

**GREEN (local) com integração deferida ao CI.** Fatia aditiva, reversível, sem lógica de negócio. O
gate de merge no CI executa a integração em ambiente limpo. Fatia 1/3 pronta — destrava
`BGP-ETL-WRITE-PORT` (fatia 2).
