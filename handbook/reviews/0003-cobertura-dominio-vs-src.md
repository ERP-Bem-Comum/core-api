# 0003 — Cobertura: Domínio documentado × `src/` implementado

> **Data:** 2026-05-25 · **Branch:** `wip/checkpoint-2026-05-25` · **HEAD:** `ec2bcb8`
> **Fontes:** `handbook/domain/` + `handbook/domain_questions/` (≈4.100 linhas) cruzadas com `src/modules/`.
> **Legenda:** ✅ implementado · 🟡 parcial · ❌ ausente

---

## 1. Placar executivo

| Módulo            | Domínio (agregados/VOs/eventos) | Application (use cases) | Adapters (persistência/infra) |   CLI   | Veredito                                                         |
| ----------------- | :-----------------------------: | :---------------------: | :---------------------------: | :-----: | ---------------------------------------------------------------- |
| **Contracts**     |             ✅ ~95%             |         🟡 ~80%         |            ✅ 100%            | ✅ 100% | **Maduro.** Falta encerramento (app) e import legado.            |
| **Financial**     |             🟡 ~35%             |         🟡 ~20%         |            ❌ ~10%            | 🟡 ~20% | **Em construção.** Só o agregado `Payable` (1 de 3) está pronto. |
| **Notifications** |           🟡 scaffold           |       🟡 scaffold       |          🟡 scaffold          |    —    | Port/adapter de e-mail (Fase 2+), fora dos `domain_questions`.   |

**Tese central:** Contratos cumpre quase todo o domínio documentado. No Financeiro, o coração do `TituloFinanceiro`/`Payable` está modelado com fidelidade total à máquina de estados — mas tudo ao redor dele (os outros dois agregados, persistência MySQL, integração bancária, e 7 das 9 transições na camada de aplicação) ainda não existe.

---

## 2. Módulo Contracts — `src/modules/contracts/`

### 2.1. Agregados e máquinas de estado

| Documentado                                                   | `handbook`                                              | Implementado em `src/`                                                                            | Status |
| ------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | :----: |
| Agregado **Contrato** (`Vigente`/`Encerrado`/`Distratado`)    | `domain/contratos/03-gestao-contratos-context.md:84-94` | `domain/contract/types.ts:35-50` (`Active`/`Expired`/`Terminated`)                                |   ✅   |
| Transições: criar, encerrar (data fim), distratar, recalcular | `03-gestao-contratos-context.md:84-94`                  | `domain/contract/contract.ts:472` → `create`, `expire`, `terminate`, `applyHomologatedAdjustment` |   ✅   |
| Agregado **Aditivo** (`Pendente`→`Homologado`)                | `domain/contratos/04-aditivos-context.md:49-50`         | `domain/amendment/types.ts:59-86` (`Pending`/`Homologated`)                                       |   ✅   |
| 4 kinds de aditivo (Acréscimo/Supressão/Prazo/Variado)        | `04-aditivos-context.md:44-48`                          | `domain/amendment/types.ts:7-16` (eixo `kind` independente do `status`)                           |   ✅   |
| **Documento** (`ativo`/`substituído`/`excluído_lógico`)       | `domain/contratos/05-timeline-context.md:50`            | `domain/document/` (aggregate + lifecycle)                                                        |   ✅   |
| Cálculo derivado de `valorVigente` (R1)                       | `03-gestao-contratos-context.md:98`                     | `domain/contract/contract.ts:196-210` (`applyHomologatedAdjustment`)                              |   ✅   |

### 2.2. Eventos de domínio

9 eventos publicados via `public-api/events.ts:46-54`, alinhados ao documentado em `domain/contratos/06-event-line-context.md:15-24`:

`ContractCreated`, `ContractStateUpdated`, `ContractEnded`, `AmendmentCreated`, `AmendmentDocumentAttached`, `AmendmentHomologated`, `ContractDocumentAttached`, `ContractDocumentDeleted`, `ContractDocumentSuperseded`. ✅

### 2.3. Casos de uso (application) — 9 implementados

| Use case documentado                        | `handbook`                                                   | `src/.../use-cases/`                                            | CLI                                    | Status |
| ------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------- | :----: |
| Criar Contrato Mãe                          | `03-gestao-contratos-context.md:50-59`                       | `create-contract.ts`                                            | `criar-contrato`                       |   ✅   |
| Visualizar contrato + estado vigente        | `03-...:61-68`                                               | `get-contract.ts`, `list-contracts.ts`                          | `mostrar-contrato`, `listar-contratos` |   ✅   |
| Registrar aditivo                           | `04-aditivos-context.md:55-59`                               | `create-amendment.ts`                                           | `criar-aditivo`                        |   ✅   |
| Anexar documento assinado                   | `04-...:61-65`                                               | `attach-signed-document.ts`, `upload-document.ts`               | `anexar-documento`, `subir-documento`  |   ✅   |
| Homologar aditivo                           | `04-...:67-71`                                               | `homologate-amendment.ts`                                       | `homologar-aditivo`                    |   ✅   |
| Armazenar documento (storage + hash)        | `05-timeline-context.md:60-64`                               | `upload-document.ts` + adapter S3                               | `subir-documento`                      |   ✅   |
| Excluir documento (lógico)                  | `05-...:66-70`                                               | `delete-document.ts`                                            | `excluir-documento`                    |   ✅   |
| Substituir documento (nova versão, R3)      | `05-...:97`                                                  | `supersede-document.ts`                                         | `substituir-documento`                 |   ✅   |
| **Encerrar contrato** (data fim / distrato) | `03-...:70-74`                                               | ❌ sem use case (domínio pronto: `Contract.expire`/`terminate`) | ❌                                     |   🟡   |
| **Importar contratos legados**              | `01-introduction.md:50` · `especificacao-dominio.md:463-476` | ❌ não existe                                                   | ❌                                     |   ❌   |

### 2.4. Adapters e infra — completos

- **Persistência:** repos Drizzle + in-memory para `contract`/`amendment`/`document`; schema MySQL `ctr_*` (`adapters/persistence/schemas/mysql.ts`); migrations geradas; mappers row↔domínio. ✅
- **Storage:** S3 + MinIO dev (ADR-0019), config Magalu/AWS, error mapper. ✅
- **Outbox (ADR-0015):** schema, repo Drizzle, worker (`worker/outbox-worker.ts`, CLI `run-outbox-worker`). ✅
- **CLI:** drivers `memory` + `mysql` (`--driver` flag). ✅

> **Gaps de Contratos:** (1) use case de encerramento — o domínio já expõe `expire`/`terminate`, falta só a orquestração + comando CLI; (2) importação de legado (UC-11), ainda não iniciada.

---

## 3. Módulo Financial — `src/modules/financial/`

### 3.1. Agregado `Payable` (= `TituloFinanceiro`) — ✅ COMPLETO no domínio

Espelha **integralmente** a máquina de 7 estados de `handbook/domain/09-status-maquina-estados.md:43-102`:

| Estado documentado              | `09-status...:45-55` | `domain/payable/types.ts`                           | Status |
| ------------------------------- | -------------------- | --------------------------------------------------- | :----: |
| Aberto / Aprovado / Transmitido | linhas 45-47         | `Open` (88) · `Approved` (90) · `Transmitted` (92)  |   ✅   |
| Recusado / Atrasado             | linhas 48-49         | `Rejected` (96) · `Overdue` (104)                   |   ✅   |
| Pago (manual vs banco)          | linha 50             | `PaidFromManual` (114) · `PaidFromBank` (119)       |   ✅   |
| Liquidado (manual vs banco)     | linha 51             | `SettledFromManual` (129) · `SettledFromBank` (140) |   ✅   |

**9 transições** no namespace `Payable` (`domain/payable/payable.ts:472-489`) — cobrem todas as transições da matriz documentada (`09-status...:77-101`):
`open`, `approve`, `transmit`, `registerRejection`, `markOverdue`, `resetToApproved`, `registerManualPayment`, `processBankOutflow`, `authorizeSettlement`. ✅

**9 eventos** (`public-api/events.ts:33-41`): `PayableOpened`, `PayableApproved`, `PayableTransmitted`, `PayableRejected`, `PayableMarkedOverdue`, `PayableResetToApproved`, `PayablePaidManually`, `PayableBankOutflowConfirmed`, `PayableSettled`. ✅

**Value Objects** (`domain/shared/`): `PayableId`, `FITID` (R4 anti-duplicidade — `04-titulos-liquidacao-context.md:57`), `beneficiary-bank-data`, `tax-id`, `bank-transaction-id`, `remittance-id`, `source-document-ref`. ✅

> A regra de ouro "PAGO só via saída bancária real, não retorno CNAB" (`04-titulos-liquidacao-context.md:58`) está codificada na separação `PaidFromBank` vs `PaidFromManual`. ✅

### 3.2. Agregado `DocumentoFiscal` (Gestão de Documentos) — ❌ AUSENTE

O **"Fato Gerador"**, raiz absoluta do Financeiro — princípio central _"nada existe no financeiro sem um Documento Fiscal selado"_ (`DOCUMENTO_MESTRE.md:194`, `02-context-map.md:59`). Máquina `Aberto`/`Em_Aprovação`/`Selado` (`09-status-maquina-estados.md:7-29`).

- **Não há** pasta `domain/document*` em `src/modules/financial/`.
- Sem `DocumentoSelado`, `DocumentoReaberto`, geração automática de títulos a partir da selagem (R1/R4 de `03-gestao-documentos-context.md:74-80`).
- Entidades `ItemDocumento`, `Retencao` (ISS/IRRF/INSS/CSRF), `FornecedorSnapshot`: ausentes.

### 3.3. Agregado `LoteComunicacao` (Integração Bancária) — ❌ AUSENTE

Máquina `Recebido`/`Processado`/`Falha_Layout` (`09-status-maquina-estados.md:105-124`). Não existe em `src/`.

- Sem tradutor CNAB 240 (segmentos P/Q/J — `05-integracao-bancaria-context.md:26`).
- Sem importação OFX/XLSX/PDF nem reconciliação por FITID (R4 — `04-titulos-liquidacao-context.md:57`).
- Os VOs `FITID`/`beneficiary-bank-data` existem, mas não há adapter/ACL que os consuma.

### 3.4. Application e Adapters do Financial — 🟡 mínimos

| Camada       | Estado                                                                                                                                                                                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use cases    | 🟡 **2 de ≥9**: `approve-payable.ts`, `get-payable.ts`. Faltam orquestrações para `transmit` (GerarRemessa), `registerRejection`, `markOverdue`, `resetToApproved`, `registerManualPayment`, `processBankOutflow`, `authorizeSettlement` — **todas já existem no domínio**, sem use case. |
| CLI          | 🟡 `aprovar-titulo`, `mostrar-titulo` (`cli/registry.ts:21-22`). Só driver `memory`.                                                                                                                                                                                                      |
| Persistência | ❌ Só `payable-repository.in-memory.ts` + `outbox.in-memory.ts`. **Sem** repo Drizzle, schema `fin_*`, migrations, nem driver MySQL.                                                                                                                                                      |

> **Resumo do Financial:** o agregado `Payable` é um trabalho de domínio sólido e fiel, mas é **1 de 3 agregados**. Falta o `DocumentoFiscal` (que conceitualmente _precede_ o título — é quem o gera), o `LoteComunicacao`, a persistência real, a integração bancária e 7 das 9 transições na camada de aplicação.

---

## 4. Cross-cutting

| Capacidade                                                 | Documentado                                                               | `src/`                                                   |        Status        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- | :------------------: |
| **Outbox** cross-módulo (ADR-0015)                         | `10-mapeamento-legado-schema.md:143`                                      | Contracts: completo · Financial: só in-memory            |          🟡          |
| **Trilha de auditoria** (`AuditLogGenerated`, transversal) | `06-event-line-context.md:24` · `09-...:130`                              | Eventos existem; sem agregado/log de auditoria dedicado  |          🟡          |
| **RBAC / Identidade** (Gestor/Operador/Auditor)            | `domain/contratos/07-external-context.md:40-49`                           | `shared/kernel/user-ref.ts` (VO) apenas; sem enforcement |     ❌ (Fase 2+)     |
| **OCR / Ingestão** de documentos                           | `07-external-context.md:37-40`                                            | —                                                        |          ❌          |
| **Planejamento Orçamentário** (cost_centers, budgets…)     | gap reconhecido no próprio handbook: `10-mapeamento-legado-schema.md:117` | —                                                        | ❌ (BC não previsto) |

---

## 5. Próximos passos sugeridos (candidatos a ticket)

**Financeiro (maior frente aberta):**

1. `FIN-AGG-DOCUMENTO-FISCAL` — modelar o agregado raiz `DocumentoFiscal` (estados Aberto/Em_Aprovação/Selado + entidades Retencao/ItemDocumento). É pré-requisito conceitual do `Payable` (a selagem gera o título).
2. `FIN-DB-SCHEMA-MYSQL-FIN-PREFIX` + `FIN-ADAPTER-DRIZZLE-PAYABLE` — persistência real `fin_*` e repo Drizzle (hoje só in-memory).
3. `FIN-USECASE-*` — expor as 7 transições já existentes no domínio (`transmit`, `registerManualPayment`, `processBankOutflow`, `authorizeSettlement`, etc.) como use cases + comandos CLI.
4. `FIN-AGG-LOTE-COMUNICACAO` + integração bancária (CNAB/OFX/FITID) — frente grande, depende de `handbook/guidelines/` (Bradesco).

**Contratos (acabamento):** 5. `CTR-USECASE-END-CONTRACT` — orquestrar `Contract.expire`/`terminate` (domínio pronto) + comando CLI. 6. Import de legado (UC-11) — quando a migração entrar em pauta.

**Decisão de produto pendente:** 7. BC de **Planejamento Orçamentário** — não existe no handbook mas tem 7 tabelas no legado (`10-mapeamento-legado-schema.md:117`). Exige ADR antes de modelar.

---

_Relatório gerado por inspeção cruzada handbook × código. Citações `arquivo:linha` verificadas contra os arquivos em disco nesta data._
