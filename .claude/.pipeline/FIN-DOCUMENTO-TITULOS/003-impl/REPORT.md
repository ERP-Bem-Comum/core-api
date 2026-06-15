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

## Incremento US2 — geração de filhos (GREEN)

`document.ts`: validação tipo×retenção (`ALLOWED_RETENTIONS`: NFS-e={ISS,IRRF,INSS,CSRF}, RPA={IRRF,INSS,CSRF}) +
geração de 1 filho por retenção (kind `Child`, `retentionType`, `value`=retention.value, status `Open`, vencimento do pai).
DANFE/Fatura/não-fiscais → só pai. Erro novo `retention-not-allowed-for-type`. Teste: `children.test.ts` (CT-003/005/006/009 + RPA com ISS).
**35/35 testes verdes + typecheck OK.**

## Incremento US3 — aprovação (GREEN)

`document.ts`: `approve` (Open → Approved) com tipo refinado `ApprovedDocument` (+ `approvedAt`/`approvedBy`); herança
ao(s) filho(s) (status `Approved`); campos vitais imutáveis (garantido pelo tipo refinado — não há operação que os altere).
Evento `PayableApproved` por título (pai + filhos). Separação de funções (Operador ≠ Aprovador) fica na borda HTTP.
Teste: `approve.test.ts` (CT-011/012). **38/38 verdes + typecheck OK.**

## Incremento US4 + US5 — ajuste e desfazer aprovação (GREEN)

Refator (regressão zero): extraídos helpers `retentionsAllowed`, `buildOpenPayables`, `documentSavedEvents` (reuso create/adjust).
`adjust` (Open→Open): merge de `changes` + recálculo do líquido + **regeneração dos filhos** (hard delete + recria — R8.1).
`undoApproval` (Approved→Open): filhos voltam a `Open` (reaproveitados); evento `ApprovalUndone`. Testes: `adjust.test.ts`
(CT-016 + regeneração + retenção inválida) e `undo-approval.test.ts` (CT-018/019). **44/44 verdes + typecheck OK.**

## Incremento US6 + US7 — cancelamento e rascunho (GREEN) — DOMÍNIO COMPLETO

`cancel` (Open→⊥): emite `DocumentCancelled` (pai+filhos); hard delete físico é do repositório. `saveDraft` (rascunho
parcial, sem validação) + `submit` (Draft→Open: valida obrigatórios → `create`; senão `document-incomplete`).
`DraftDocument` com campos nuláveis. Testes: `cancel.test.ts` (CT-022) + `draft.test.ts` (CT-024/025/026). **48/48 verdes + typecheck OK.**

> **Camada de domínio da Fatia 1 completa**: create · filhos · approve · adjust · undoApproval · cancel · saveDraft · submit.

## Pendente (infra — mesmo ticket)

Persistência Drizzle `fin_*` + migration · mappers + repos (drizzle/in-memory) · outbox · use cases (application) ·
borda HTTP `/api/v1` + permissões RBAC (separação de funções). Depois: W2 (review) + W3 (gate completo).
