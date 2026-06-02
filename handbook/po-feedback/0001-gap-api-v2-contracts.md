# 0001 — Gap: API v2 Contracts vs. Funcionalidades v1

| Campo               | Valor                                                                                                                                                                                                                               |
| :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Emissor**         | Product Owner (Alessandra Castro) + Arquitetura Frontend v2                                                                                                                                                                         |
| **Destinatário**    | Time de Backend (`core-api`)                                                                                                                                                                                                        |
| **Data do retorno** | 2026-06-02                                                                                                                                                                                                                          |
| **Módulo**          | contracts                                                                                                                                                                                                                           |
| **Origem**          | Relatório de gap (frontend v2 TanStack Start vs. OpenAPI v2)                                                                                                                                                                        |
| **Status**          | 🟢 Em correção — decisão-mãe tomada ([ADR-0032](../architecture/adr/0032-transient-http-composition-read-until-bff.md)): composição transitória na borda. Restam tickets do Bucket B (borda HTTP) + read na public-api de Parceiros |

> O conteúdo da seção **A** é o relatório recebido **na íntegra** (registro do retorno da P.O.). A seção
> **B — Encaminhamento do backend** é a triagem inicial, cruzando cada item com o estado real do código.

---

## A. Retorno da P.O. (íntegra)

### 1. Resumo Executivo

A API v2 possui a **base estrutural** de contratos (CRUD básico, aditivos, documentos, ativação), mas há **gaps significativos** que impedem a portagem fiel das funcionalidades da v1. O frontend v2 depende exclusivamente da API (arquitetura BFF), portanto **todos os gaps devem ser fechados** antes ou durante o desenvolvimento do módulo `contracts`.

**Sintomas principais:**

- Schema da API v2 é minimalista (~10 campos) vs. v1 (~30+ campos com regras de negócio).
- Regras de negócio críticas (teto de OS, obrigatoriedade de contratante, derivação de status) não estão na API — estavam no frontend da v1.
- Aditivos na v2 são simplificados e não retornam aninhados no contrato.
- Filtros avançados de listagem não existem na API.
- Não há endpoint de edição (PUT/PATCH) nem exclusão (DELETE) de contratos.

### 2. Endpoints da API v2 (Estado Atual)

| #   | Método        | Endpoint                                                     | Status         |
| --- | ------------- | ------------------------------------------------------------ | -------------- |
| 1   | `GET`         | `/api/v2/contracts`                                          | ✅ Existe      |
| 2   | `POST`        | `/api/v2/contracts`                                          | ✅ Existe      |
| 3   | `GET`         | `/api/v2/contracts/export.csv`                               | ✅ Existe      |
| 4   | `GET`         | `/api/v2/contracts/{id}`                                     | ✅ Existe      |
| 5   | `POST`        | `/api/v2/contracts/{id}/activate`                            | ✅ Existe      |
| 6   | `GET`         | `/api/v2/contracts/{id}/history`                             | ✅ Existe      |
| 7   | `POST`        | `/api/v2/contracts/{id}/amendments`                          | ✅ Existe      |
| 8   | `POST`        | `/api/v2/contracts/{id}/amendments/{amendmentId}/homologate` | ✅ Existe      |
| 9   | `POST`        | `/api/v2/contracts/{id}/documents`                           | ✅ Existe      |
| 10  | `POST`        | `/api/v2/contracts/{id}/amendments/{amendmentId}/documents`  | ✅ Existe      |
| 11  | `POST`        | `/api/v2/contracts/{id}/documents/{documentId}/supersede`    | ✅ Existe      |
| —   | `PUT`/`PATCH` | `/api/v2/contracts/{id}`                                     | ❌ **AUSENTE** |
| —   | `DELETE`      | `/api/v2/contracts/{id}`                                     | ❌ **AUSENTE** |
| —   | `DELETE`      | `/api/v2/contracts/{id}/documents/{documentId}`              | ❌ **AUSENTE** |

### 3. Gaps Detalhados por Categoria

#### 3.1. Campos de Domínio Ausentes no Schema do Contrato

A API v2 retorna apenas: `id`, `sequentialNumber`, `title`, `objective`, `originalValue.cents`, `originalPeriod`, `status`, `signedAt`, `currentValue`, `currentPeriod`, `endedAt`.

Campos adicionais usados na v1 (todos marcados como obrigatórios para o produto final): `classification`
(Contract|ServiceOrder), `contractModel` (Service|Donation), `contractType` (Supplier|Financier|
Collaborator|ACT), `supplierId`/`financierId`/`collaboratorId` + objeto aninhado do contratado, `programId`/
`program`, `budgetPlanId`/`budgetPlan`, `categorizacao`, `centroDeCusto`, `observations`, `email`,
`telephone`, `bancaryInfo`, `pixInfo`, `origin`, `createdAt`, `updatedAt`, `children[]` (aditivos
aninhados), `files[]` (anexos). `dataAssinatura`≡`signedAt` ✅; `contractCode`≡`sequentialNumber` ✅.

#### 3.2. Endpoints CRUD ausentes

Editar contrato (`PUT`/`PATCH`), excluir contrato (`DELETE` — P.O.: manter fora do MVP se não havia na
v1), editar contato (email/telefone/observações — pode reusar o PATCH geral).

#### 3.3. Aditivos — gap semântico

Tipos v1: `prazo`, `valor`, `escopo`, `outro`, `distrato` (o `distrato` é crítico). Valor em centavos
(v2, melhor) deve aceitar negativo p/ supressão. Status: garantir 2 estados (`Pendente`, `Homologado`).
**O GET /contracts/{id} deve incluir `amendments[]`/`children[]` aninhados.**

#### 3.4. Documentos — gap de gestão

Falta `files[]` no GET de detalhe, `DELETE` com motivo, e preview/download.

#### 3.5. Listagem e filtros

Faltam `page`/`limit`/`search`/`contractType`/`contractStatus`/date range/value range/`order` + **meta de
paginação** `{ page, totalPages, total, limit }`. A API deve retornar objeto paginado, não array cru.

#### 3.6. Regras de negócio (viviam no frontend v1 — devem ir para a API)

- **R1** Teto de OS: `classification = ServiceOrder` → `valor ≤ R$ 9.999,99`.
- **R2** Valor original > 0.
- **R3** Período de vigência obrigatório (start/end).
- **R4** Contratante obrigatório por tipo (Supplier→supplierId; Financier→financierId; Collaborator→collaboratorId).
- **R5** Herança de dados bancários/PIX do **Parceiro** (read-only no escopo de Contratos; placeholder com data da última atualização vinda de Parceiros).
- **R6** Derivação de status: `Pendente`, `Em Andamento`, `Finalizado`, `Distrato`. "Vencendo" **não é status** — é filtro de UI (≤ 45 dias).
- **R7** Composição de valor: `currentValue = originalValue + Σ(aditivos de valor homologados)`.

#### 3.7. Histórico de eventos

`GET /contracts/{id}/history` ✅ existe; garantir cobertura de todos os tipos de evento.

### 4. Matriz de Prioridade (P.O.)

| #   | Item                                                            | Prioridade |
| --- | --------------------------------------------------------------- | ---------- |
| 1   | Campos de domínio no schema do contrato                         | 🔴 P1      |
| 2   | `children[]` (aditivos) e `files[]` (documentos) no GET detalhe | 🔴 P1      |
| 3   | `PUT`/`PATCH /contracts/{id}`                                   | 🔴 P1      |
| 4   | Query params de filtro + paginação no GET                       | 🔴 P1      |
| 5   | Meta de paginação                                               | 🔴 P1      |
| 6   | Validar R1–R4 na API                                            | 🔴 P1      |
| 7   | `DELETE` documento com motivo                                   | 🔴 P1      |
| 8   | Tipos de aditivo completos (incl. `distrato`)                   | 🔴 P1      |
| 9   | `contractor` aninhado                                           | 🟡 P2      |
| 10  | `program`/`budgetPlan` aninhados                                | 🟡 P2      |
| 11  | `bancaryInfo`/`pixInfo` read-only (join com Parceiros)          | 🟡 P2      |
| 12  | Histórico completo de eventos                                   | 🟡 P2      |
| 13  | Preview/download de documento                                   | 🟡 P2      |
| 14  | `derivedStatus` calculado pela API (ou BFF)                     | 🟢 P3      |

### 5–6. Notas técnicas + checklist

Frontend v2 usa `Result<T, HttpError>` + Zod 4 na borda; BFF orquestra (browser nunca fala direto com o
backend); regras não validadas pela API são replicadas no BFF como defesa em profundidade. Checklist de
fechamento: backend revisar campos, confirmar `children[]`/`files[]` no detalhe, `PUT`/`PATCH`, filtros+
paginação, R1–R4, tipos de aditivo (`distrato`), `DELETE` documento, estimativas.

---

## B. Encaminhamento do backend — triagem inicial (2026-06-02)

> Cruzamento de cada item com o estado real do `core-api` (refs `path:linha`). **Achado central:** o
> agregado `Contract` do core-api é **deliberadamente minimalista por DDD** — ele modela o _ciclo de vida
> contratual_ (estado vigente, aditivos, homologação, documentos, imutabilidade + trilha), **não** os
> metadados de cadastro. Vários "campos ausentes" pertencem a **outros módulos** (Parceiros, Planejamento
> Orçamentário) ou conflitam com invariantes do projeto (imutabilidade). Logo, boa parte do relatório é
> **divergência de modelo** (decisão arquitetural), não "campo faltando".

### Bucket A — Já atendido pelo core-api ✅

| Item                                    | Veredito                                                  | Ref                                                  |
| :-------------------------------------- | :-------------------------------------------------------- | :--------------------------------------------------- |
| R2 — valor > 0                          | ✅ Existe                                                 | `domain/contract/contract.ts:76,142`; `errors.ts:52` |
| R3 — período obrigatório                | ✅ Existe (VO `Period`, rejeita `end ≤ start`)            | `types.ts:24,34`; `shared/kernel/period.ts:22-30`    |
| R6 — status derivado (4 estados)        | ✅ Existe, **nomes divergentes** (ver Bucket C)           | `domain/contract/types.ts:51-86`                     |
| R7 — composição de valor                | ✅ Existe (recalcula on-the-fly via aditivos homologados) | `contract.ts:260-337`                                |
| Tipos de aditivo                        | ✅ 4 kinds (`Addition`/`Suppression`/`TermChange`/`Misc`) | `domain/amendment/types.ts:29-34`                    |
| Status de aditivo (Pendente/Homologado) | ✅ Existe                                                 | `domain/amendment/types.ts:58-105`                   |
| Documento + exclusão com motivo         | ✅ Existe no domínio (RN-11)                              | `domain/document/document.ts:119-168`                |

### Bucket B — Gap real de borda (domínio tem; falta expor/ajustar na API HTTP) 🟢

| Item (§4)                                | Veredito                                                               | Esforço                                         | Ref                                                       |
| :--------------------------------------- | :--------------------------------------------------------------------- | :---------------------------------------------- | :-------------------------------------------------------- |
| #2 `children[]`/`files[]` no GET detalhe | Domínio tem aditivos/documentos; o DTO de detalhe **não os compõe**    | Médio (novo DTO + use case de leitura agregada) | `adapters/http/contract-dto.ts:25-65`; `schemas.ts:37-52` |
| #7 `DELETE` documento com motivo         | Use case `logicallyDelete` existe; falta **endpoint HTTP** (só há CLI) | Baixo                                           | `domain/document/document.ts:119-168`                     |
| #4/#5 filtros + paginação no GET         | `listContracts()` devolve lista completa; sem query params nem meta    | Médio                                           | `adapters/http/plugin.ts:149-164`                         |
| #12 histórico completo                   | `GET /history` existe                                                  | Baixo (verificar cobertura de eventos)          | `plugin.ts:208-233`                                       |
| #13 preview/download de documento        | Storage existe (bucket/key); falta endpoint GET (ou URL assinada)      | Baixo-médio                                     | `domain/document/types.ts`                                |

### Bucket C — Divergência de modelo (decisão arquitetural, NÃO implementação direta) 🔴

| Item                                                                                                                                                                     | Por que diverge                                                                                            | Encaminhamento                                                                                                              |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| #1 campos de cadastro (`classification`, `contractModel`, `contractType`, `categorizacao`, `centroDeCusto`, `observations`, `email`, `telephone`, `origin`, `updatedAt`) | O agregado `Contract` **não modela cadastro** — só ciclo de vida                                           | **Decisão:** onde esses metadados moram? Estendem o agregado, ou viram um BC/contexto de "cadastro de contrato"? Requer ADR |
| #9 `contractType` + `supplier`/`financier`/`collaborator` (R4)                                                                                                           | O contratado é **do módulo Parceiros** (`par_*`, em construção via ETL)                                    | Cross-módulo: o GET de contrato compõe via **public-api de Parceiros** ou o BFF junta. ADR-0006/0014                        |
| #11 `bancaryInfo`/`pixInfo` (R5)                                                                                                                                         | O **próprio relatório** reconhece: read-only herdado de Parceiros                                          | Idem #9 — join/projeção a partir de Parceiros                                                                               |
| #10 `program`/`budgetPlan`                                                                                                                                               | BC de **Planejamento Orçamentário** ainda **ausente** do handbook (Inquiry-0014)                           | Bloqueado por BC inexistente. Escalar                                                                                       |
| R1 — teto de OS                                                                                                                                                          | Depende de `classification = ServiceOrder` existir (não existe)                                            | Bloqueado por #1; quando houver `classification`, a regra entra no domínio                                                  |
| #8 `distrato` como tipo de aditivo                                                                                                                                       | O core-api modela rescisão como `Contract.terminate` (transição de estado), **não** como aditivo           | Alinhar vocabulário: o "distrato" da v1 = `terminate` no v2. Mapear no BFF/DTO, não criar aditivo                           |
| R6 — nomes de status                                                                                                                                                     | core-api: `Pending`/`Active`/`Expired`/`Terminated`; v1: `Pendente`/`Em Andamento`/`Finalizado`/`Distrato` | Mapeamento de apresentação (BFF/dicionário), não mudança de domínio. "Vencendo" = filtro ≤45d (de acordo)                   |

### Bucket D — Edição (PUT/PATCH) — tensão com a imutabilidade 🔴

| Item                             | Tensão                                                                                                                                                                  | Encaminhamento                                                                                                                                                           |
| :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #3 `PUT`/`PATCH /contracts/{id}` | O core-api é **imutável + event-driven** (mudança de valor/prazo só via **aditivo homologado** — princípios #12/#14 do handbook). "Editar tudo" da v1 conflita com isso | **Separar:** (a) correção de _metadados de cadastro_ (título, observações, contato) pode ter PATCH; (b) valor/período **não** — vai por aditivo. Decisão de escopo + ADR |
| `DELETE /contracts/{id}`         | v1 não tinha; imutabilidade proíbe hard-delete                                                                                                                          | P.O. já sinalizou "fora do MVP". Recusado por princípio (exclusão lógica, nunca física — #14)                                                                            |

### Resumo da triagem

- **7 itens já atendidos** (Bucket A) — incluindo R2/R3/R6/R7 e a base de aditivos/documentos.
- **5 itens são gap real de borda** (Bucket B) — trabalho de API direto, viram tickets W0→W3.
- **~8 itens são divergência de modelo** (Bucket C/D) — **exigem decisão arquitetural** antes de qualquer código: onde moram os metadados de cadastro, como compor dados de Parceiros/Orçamento, e o escopo da edição vs. imutabilidade.

### Próximos passos

1. ✅ **Decisão arquitetural tomada — [ADR-0032](../architecture/adr/0032-transient-http-composition-read-until-bff.md):** a visão rica é composta no **adapter HTTP** (rota gorda **transitória**, com `Sunset`, até o BFF v2 assumir); domínio/use cases **intocados**; cross-módulo só via **public-api**. Os **metadados próprios** do contrato (`classification`, `contractModel`, `contractType`, `categorizacao`, `centroDeCusto`, `observations`) **entram no agregado quando o produto precisar** (modelagem legítima, não corrupção). Destrava os itens dos Buckets C/D.
2. **Tickets do Bucket B** (borda HTTP, trabalho direto): `children[]`/`files[]` no GET de detalhe, `DELETE` documento (rota faltando, use case existe), filtros + paginação no `GET /contracts`.
3. **Read na public-api de Parceiros** (ticket próprio): a rota composta precisa ler o contratado/bancário de Parceiros pela public-api (hoje só há write port de ETL).
4. **Vocabulário** (status PT, "distrato"→`terminate`, `derivedStatus`): mapeamento na camada de composição/BFF — sem tocar o domínio.
5. **Escalar** o BC de **Planejamento Orçamentário** ausente (program/budgetPlan) — bloqueado por BC inexistente (Inquiry-0014).
