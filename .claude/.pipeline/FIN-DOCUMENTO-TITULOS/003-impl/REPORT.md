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

## Incremento Persistência P1 — port + in-memory + contract suite (GREEN)

`domain/document/repository.ts` (port `DocumentRepository`: `save`/`findById`/`delete`; `StoredDocument` = documento +
`payables | null`). `adapters/persistence/repos/document-repository.in-memory.ts`. Contract suite parametrizada
(`document-repository.suite.ts`): round-trip Open, not-found, delete, rascunho. **52/52 verdes + typecheck OK.**

## Incremento Application A1+A2 — Outbox port + use case saveDocument (GREEN)

`application/ports/outbox.ts` (`FinancialOutbox` mínimo: `append`) + `adapters/outbox/outbox.in-memory.ts`.
Use case `saveDocument` (Imperative Shell): primitivos → VOs (smart constructors: Money/refs/Retention/RegisteredTax) →
`Document.create` → `repo.save` → `outbox.append`. Sequência validar→domain→persist→publish (`.claude/rules/application.md`).
Testes: round-trip + evento, fornecedor inválido (não publica), retenção incompatível. **55/55 verdes + typecheck OK.**

## Incremento Application A3 — use cases de transição (GREEN)

Refinements no domínio (`parseOpen`/`parseApproved`/`parseDraft` → `invalid-state-transition`) + use cases
`approveDocument` (clock+UserRef), `undoApproval`, `cancelDocument` (delete), `submitDraft` — carregam do repo, refinam o
estado (transição inválida vira erro runtime), chamam o domínio, persistem e publicam. Teste `transitions.test.ts`. **61/61 verdes + typecheck OK.**

## Incremento Application A3 completa — adjustDocument (GREEN)

`adjustDocument`: carrega Open, constrói VOs parciais das mudanças (Money/Retention via helpers), `Document.adjust`,
persiste, publica. Teste `adjust-document.test.ts`. **Camada Application da Fatia 1 completa** (`saveDocument` +
`approveDocument`/`undoApproval`/`cancelDocument`/`submitDraft`/`adjustDocument`). **63/63 verdes + typecheck OK.**

## Incremento Persistência P2 — schema `fin_*` + migration + mapper + Drizzle repo (GREEN typecheck + pnpm test)

**Data**: 2026-06-15 · **Agente**: `drizzle-orm-expert` + skill `drizzle-schema-author`

### Arquivos criados

| Arquivo | Conteúdo |
| --- | --- |
| `src/modules/financial/adapters/persistence/schemas/mysql.ts` | 4 tabelas `fin_*`: `fin_documents` (26 colunas), `fin_payables`, `fin_retentions`, `fin_registered_taxes`. CHECKs para todos os enums de domínio, índices justificados por query, FKs ON DELETE CASCADE nomeadas. |
| `src/modules/financial/adapters/persistence/migrations/mysql/0000_solid_solo.sql` | Migration gerada por `pnpm exec drizzle-kit generate --config drizzle.config.financial.ts`. Editada manualmente: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` em cada `CREATE TABLE` + `COLLATE utf8mb4_bin` em todas as colunas UUID (id, FKs, approved_by). |
| `src/modules/financial/adapters/persistence/mappers/document.mapper.ts` | `mapRowToDocument` (bifurca por status: Draft vs Open/Approved/demais), `mapPayableRows`, `mapDocumentToRow`, `mapPayablesToRows`, `mapRetentionsToRows`, `mapRegisteredTaxesToRows`. Todos retornam `Result<T, DocumentMapperError>` — sem throw cruzando a borda. |
| `src/modules/financial/adapters/persistence/drivers/mysql-driver.ts` | `openMysqlFinancial` (espelha driver de contracts). Journal isolado: `__drizzle_migrations_financial` (ADR-0014). |
| `src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts` | `createDrizzleDocumentRepository`. `save()` abre UMA transação: SELECT FOR UPDATE (optimistic lock R5) → INSERT-or-UPDATE → DELETE+INSERT em lote das 3 filhas. `findById()` com try/catch próprio que preserva `document-not-found` semântico. `delete()` via DELETE raiz + CASCADE. |
| `drizzle.config.financial.ts` | Config `drizzle-kit` do módulo financial (espelha `drizzle.config.programs.ts`). Uso: `pnpm exec drizzle-kit generate --config drizzle.config.financial.ts`. |
| `tests/modules/financial/adapters/persistence/document-repository.drizzle-mysql.test.ts` | Consome a contract suite contra MySQL real. Gateado por `MYSQL_INTEGRATION=1` — não interfere em `pnpm test` puro. |

### Decisões de DDL (citadas)

- **UUID → varchar(36) + COLLATE utf8mb4_bin** (ADR-0018 §"Mapeamentos canônicos"). Comparação binária elimina drift Unicode em FK matches e é mais rápida para strings de formato fixo (schema.ts `§CHARSET/COLLATE`).
- **Money → bigint(mode:'number')** (ADR-0018 §"Money cents"). Sem decimal, sem JSON. O mapper converte `number → Money.fromCents()`, que blinda contra negativo e `> MAX_SAFE_INTEGER` (money.ts §"Defeito #8").
- **Enums → varchar(N) + CHECK** (ADR-0018/0020 §"Features proibidas": `mysqlEnum` proibido). `status` 7 valores, `type` 7 valores, `paymentMethod` 8 valores, `kind` 2 valores, `retentionType` 4 valores, `registeredTaxType` 7 valores — todos como `varchar` + `CHECK IN (...)`.
- **FK ON DELETE CASCADE** (data-model.md §"A delete operation must remove everything within the AGGREGATE boundary at once" — Evans DDD). Autorizado porque `fin_payables`, `fin_retentions` e `fin_registered_taxes` são parte do boundary do agregado `Document`.
- **Upsert via SELECT-then-UPDATE-or-INSERT em transação** (ADR-0020 §"Padrão de upsert"). `ODKU` proibido aqui: atua em QUALQUER UNIQUE (Refman §13.2.6.2) — risco de sobrescrita silenciosa.
- **Optimistic lock (R5)**: `SELECT FOR UPDATE` lê `version` atual → `UPDATE WHERE id=? AND version=?`. Conflito detectado por `affectedRows=0`.
- **Journal isolado `__drizzle_migrations_financial`** (ADR-0014 §"Isolamento"): evita que o migrator de um módulo pule migrations do outro por comparação de timestamp.
- **`fin_document_timeline` e `fin_timeline_field_changes` NÃO incluídas** nesta fatia (escopo de P2 conforme task). São read-model futuro.
- **CHARSET/COLLATE manual**: Drizzle 0.45.x não expõe charset/collate table-level (documentado em `contracts/adapters/persistence/schemas/mysql.ts §CHARSET/COLLATE`). Inserido manualmente na migration.

### Índices — justificativas

| Índice | Tabela | Query alvo |
| --- | --- | --- |
| `fin_documents_supplier_ref_idx` | `fin_documents` | Relatório de contas a pagar por fornecedor |
| `fin_documents_status_idx` | `fin_documents` | Dashboard "documentos Open/Approved" |
| `fin_documents_due_date_idx` | `fin_documents` | Agenda de vencimentos na semana |
| `fin_documents_doc_number_idx` | `fin_documents` | Busca por número fiscal |
| `fin_payables_document_id_idx` | `fin_payables` | Reconstrução do agregado (findById) |
| `fin_payables_status_idx` | `fin_payables` | Agenda de pagamentos por status |
| `fin_retentions_document_id_idx` | `fin_retentions` | Reconstrução do agregado (findById) |
| `fin_registered_taxes_document_id_idx` | `fin_registered_taxes` | Reconstrução do agregado (findById) |

### Resultado da validação

```
pnpm run typecheck → ✅ OK (zero erros; projeto todo)
pnpm test         → ✅ 2440 tests · 0 fail · 17 skipped (sem alteração nos skips existentes)
```

O teste de integração `document-repository.drizzle-mysql.test.ts` está corretamente gateado:
sem `MYSQL_INTEGRATION=1` ele imprime aviso e não registra nenhum `describe()` — o runner
Node 24 não o conta como falha nem skip.

### Integração MySQL — executada e verde

- **`pnpm run test:integration:financial`** ✅: contract suite (`document-repository.suite.ts`) contra MySQL 8.4 real
  (Docker Compose `--wait`). **4 testes verdes**: round-trip Open+payables, `document-not-found`, `delete`, persistência
  de `Draft` sem payables. Migration `0000_solid_solo.sql` aplicada pelo driver (`applyMigrations: true`, journal isolado
  `__drizzle_migrations_financial`). Script adicionado em `package.json` espelhando `test:integration:programs`.
- **Correção de borda**: conn string default do teste alinhada a contracts/programs (`root` — migrations exigem DDL;
  o usuário de aplicação do compose é `core_app`, sem grant de DDL; `app` nem existe).

## Borda HTTP `/api/v2/financial` (Fastify + Zod + RBAC) — concluída

> O financeiro é **V2** (montado sob `DEFAULT_API_PREFIX='/api/v2'`; greenfield, sem mirror v1).
> Agente especialista: **`fastify-server-expert`** (rotas/plugin/Zod). Padrão espelha `contracts/adapters/http/`.

**Arquivos:** `adapters/http/{plugin,schemas,dto,composition}.ts` · `public-api/{http,permissions,index}.ts`.

**Rotas (RBAC por rota):** `POST /documents` (write), `PATCH /documents/:id` (write), `POST /documents/:id/approve`
(payable:approve), `POST /documents/:id/undo-approval` (payable:approve), `DELETE /documents/:id` (cancel),
`GET /documents` · `GET /documents/:id` (read). Mapa erro-domínio→HTTP: 400/401/403/404/409/422.

**Permissões:** catálogo RBAC do `auth` estendido (aditivo, ADR-0004) com `fiscal-document:{read,write,cancel}` +
`payable:{approve,undo-approval}`. Testes do catálogo verdes (10/10).

**Testes de borda** (`tests/modules/financial/adapters/http/financial-documents.http.test.ts`): **15/15 verdes** via
`fastify.inject` + driver in-memory + hooks de auth fake (sem login real → sem rate-limit). Cobre CA1–CA15
(criação NFS-e com retenções, draft, ajuste, aprovação com herança, separação de funções 403, undo, cancelamento,
GET detalhe/lista/404, 422 de regra de negócio).

## Gate W3 — verde de ponta a ponta

```
pnpm run typecheck                  → ✅ OK
pnpm run format:check               → ✅ OK
pnpm run lint                       → ✅ OK
pnpm test                           → ✅ 2438 pass · 0 fail · 17 skipped
pnpm run test:integration:financial → ✅ 4 pass · 0 fail
```

## Pendente (próximos incrementos — fora do escopo desta fatia)

- **`fin_document_timeline` + `fin_timeline_field_changes`**: read-model de Time Travel (fatia futura).
- **W2 (code review read-only)** + registro do `financialHttpPlugin` no `src/server.ts` quando a borda for plugada na app real.
- Submódulo Conciliação, módulo Orçamento, integração bancária (fatias futuras).
