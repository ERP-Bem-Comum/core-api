# W1 — Implementação até GREEN (FIN-DOCUMENTO-TITULOS)

**Wave**: W1 · **Status**: 🟢 GREEN (incremento MVP — US1) · **Skills**: `ts-domain-modeler` + `typescript-language-expert` · **Data**: 2026-06-15

> **Escopo deste incremento**: Foundational (VOs) + US1 (domínio — `Document.create` não-fiscal). A fatia 1 completa
> (US2..US7, persistência `fin_*`, outbox, borda HTTP) continua nos próximos incrementos — ver `tasks.md`.

## Implementado (`src/modules/financial/domain/`, inside-out)

| Arquivo | Conteúdo |
| --- | --- |
| `shared/refs.ts` | `ContractRef`/`BudgetPlanRef`/`CategoryRef`/`ProgramRef` (rehydrate-only, UUID v4, `financial-ref-invalid`) |
| `shared/document-id.ts` · `payable-id.ts` · `ids.ts` | IDs branded (`generate`/`rehydrate`) + barrel `export * as` |
| `shared/retention.ts` | VO `Retention` (ISS/IRRF/INSS/CSRF), `create(): Result`, `value: Money` |
| `shared/registered-tax.ts` | VO `RegisteredTax` (ICMS/IPI/PIS/COFINS/CBS/IBS\*), apenas leitura |
| `document/types.ts` | `DocumentType`, `PaymentMethod`, `DocumentStatus` (7 valores — ADR-0005), `DocumentCore`, `OpenDocument` |
| `document/errors.ts` · `events.ts` | `DocumentError` (string-literal union); evento `DocumentSaved` |
| `payable/types.ts` | `Payable` (Pai/Filho — entidade interna, ADR-0002), `Payables` |
| `document/financial-data.ts` | `computeNetValue` (R1; impostos registrados fora; `net-value-not-positive`) |
| `document/document.ts` | `Document.create` (não-fiscal → 1 pai `Open` + evento `DocumentSaved`) |

## Resultado

```
pnpm run typecheck → ✅ OK (projeto todo)
node --test (5 arquivos financial) → tests 30 · pass 30 · fail 0
```

**GREEN legítimo**: testes do W0 agora passam; typecheck limpo. Princípios respeitados — domínio puro (sem `class`/`throw`),
`Result<T,E>`, branded VOs, `immutable()`, module-as-namespace, idioma EN no código.

## Decisões de implementação

- `Money` é `{ cents: number }` (kernel) — coluna será `bigint` no `data-model.md` (mapper converte). Ajuste anotado vs o plano.
- `rateBps` (basis points, inteiro) para alíquotas — evita float no domínio.
- Eventos sem `occurredAt`/actor (Functional Core síncrono) — carimbados na borda/use case.

## Pendente (próximos incrementos — mesmo ticket)

US2 (geração de filhos NFS-e/RPA) · US3 (aprovação/herança/imutabilidade) · US4/US5 (ajuste/desfazer) · US6 (cancelamento)
· US7 (rascunho) · persistência Drizzle `fin_*` + migration · outbox · borda HTTP `/api/v1` + RBAC. Depois: W2 (review) + W3 (gate).
