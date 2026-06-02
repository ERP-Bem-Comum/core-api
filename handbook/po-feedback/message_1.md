# Relatório de Gap: API v2 Contracts vs. Funcionalidades v1

> **Destinatário:** Time de Backend (core-api)  
> **Emissor:** Product Owner + Arquitetura Frontend v2  
> **Data:** 2026-06-02  
> **Status:** Pendente de revisão técnica backend  
> **Contexto:** Este documento mapeia TODAS as funcionalidades de Contratos presentes na v1 (legado Next.js) e identifica o que está ausente na API v2 (`core-api`) para que o frontend v2 (TanStack Start) possa entregar paridade funcional.

---

## 1. Resumo Executivo

A API v2 possui a **base estrutural** de contratos (CRUD básico, aditivos, documentos, ativação), mas há **gaps significativos** que impedem a portagem fiel das funcionalidades da v1. O frontend v2 depende exclusivamente da API (arquitetura BFF), portanto **todos os gaps devem ser fechados** antes ou durante o desenvolvimento do módulo `contracts`.

**Sintomas principais:**
- Schema da API v2 é minimalista (~10 campos) vs. v1 (~30+ campos com regras de negócio).
- Regras de negócio críticas (teto de OS, obrigatoriedade de contratante, derivação de status) não estão na API — estavam no frontend da v1.
- Aditivos na v2 são simplificados e não retornam aninhados no contrato.
- Filtros avançados de listagem não existem na API.
- Não há endpoint de edição (PUT/PATCH) nem exclusão (DELETE) de contratos.

---

## 2. Endpoints da API v2 (Estado Atual)

| # | Método | Endpoint | Status |
|---|--------|----------|--------|
| 1 | `GET` | `/api/v2/contracts` | ✅ Existe |
| 2 | `POST` | `/api/v2/contracts` | ✅ Existe |
| 3 | `GET` | `/api/v2/contracts/export.csv` | ✅ Existe |
| 4 | `GET` | `/api/v2/contracts/{id}` | ✅ Existe |
| 5 | `POST` | `/api/v2/contracts/{id}/activate` | ✅ Existe |
| 6 | `GET` | `/api/v2/contracts/{id}/history` | ✅ Existe |
| 7 | `POST` | `/api/v2/contracts/{id}/amendments` | ✅ Existe |
| 8 | `POST` | `/api/v2/contracts/{id}/amendments/{amendmentId}/homologate` | ✅ Existe |
| 9 | `POST` | `/api/v2/contracts/{id}/documents` | ✅ Existe |
| 10 | `POST` | `/api/v2/contracts/{id}/amendments/{amendmentId}/documents` | ✅ Existe |
| 11 | `POST` | `/api/v2/contracts/{id}/documents/{documentId}/supersede` | ✅ Existe |
| — | `PUT`/`PATCH` | `/api/v2/contracts/{id}` | ❌ **AUSENTE** |
| — | `DELETE` | `/api/v2/contracts/{id}` | ❌ **AUSENTE** |
| — | `DELETE` | `/api/v2/contracts/{id}/documents/{documentId}` | ❌ **AUSENTE** |

---

## 3. Gaps Detalhados por Categoria

### 3.1. Campos de Domínio Ausentes no Schema do Contrato

A API v2 retorna apenas: `id`, `sequentialNumber`, `title`, `objective`, `originalValue.cents`, `originalPeriod`, `status`, `signedAt`, `currentValue`, `currentPeriod`, `endedAt`.

A v1 utilizava os seguintes campos adicionais, **todos obrigatórios para o produto final**:

| Campo (v1) | Tipo | Onde usado (tela v1) | Prioridade |
|------------|------|----------------------|------------|
| `classification` | enum: `Contract` \| `ServiceOrder` | Formulário de criação/edição; regra de teto de OS | 🔴 P1 |
| `contractModel` | enum: `Service` \| `Donation` | Formulário de criação/edição | 🔴 P1 |
| `contractType` | enum: `Supplier` \| `Financier` \| `Collaborator` \| `ACT` | Formulário; regras de obrigatoriedade; badges de tipo; filtros | 🔴 P1 |
| `supplierId` / `financierId` / `collaboratorId` | UUID \| null | Formulário; vinculação do contratado | 🔴 P1 |
| `supplier` / `financier` / `collaborator` | objeto aninhado | Detalhes do contrato; hero card do contratado | 🔴 P1 |
| `programId` | integer \| null | Formulário; select de programa | 🟡 P2 |
| `program` | `{ id, name }` | Detalhes do contrato | 🟡 P2 |
| `budgetPlanId` | integer \| null | Formulário; select de plano orçamentário | 🟡 P2 |
| `budgetPlan` | `{ id, scenarioName, year, version }` | Detalhes do contrato | 🟡 P2 |
| `categorizacao` | enum: `Avaliação` \| `Operacional` \| `Processo` | Formulário | 🟡 P2 |
| `centroDeCusto` | enum: `RH` \| `Serviços Gerais` \| `Eventos` | Formulário | 🟡 P2 |
| `observations` | string \| null | Formulário; detalhes | 🟡 P2 |
| `email` | string (email) \| null | Formulário; detalhes; editar contato | 🟡 P2 |
| `telephone` | string \| null | Formulário; detalhes; editar contato | 🟡 P2 |
| `bancaryInfo` | `{ bank, agency, accountNumber, dv }` | Formulário (somente leitura, herdado do módulo **Parceiros**; exibe placeholder com data da última atualização) | 🟡 P2 |
| `pixInfo` | `{ key_type, key }` | Formulário (somente leitura, herdado do módulo **Parceiros**; exibe placeholder com data da última atualização) | 🟡 P2 |
| `origin` | string (ex: `Manual`) | Detalhes do contrato | 🟢 P3 |
| `createdAt` | ISO date | Timeline; histórico | 🟡 P2 |
| `updatedAt` | ISO date | Detalhes (audit) | 🟢 P3 |
| `children` | array de aditivos aninhados | Detalhes (tabela de documentos); composição de valor; timeline | 🔴 P1 |
| `files` | array de anexos | Detalhes (tabela de documentos) | 🔴 P1 |

**Nota:** `dataAssinatura` (v1) equivale a `signedAt` (v2) ✅. `contractCode` (v1) equivale a `sequentialNumber` (v2) ✅.

---

### 3.2. Endpoints CRUD Ausentes

| Operação | Endpoint Sugerido | Justificativa |
|----------|-------------------|---------------|
| **Editar contrato** | `PUT` / `PATCH` `/api/v2/contracts/{id}` | A v1 permite editar todos os campos do contrato (exceto talvez os já homologados). Sem isso, não há como corrigir erros de cadastro. |
| **Excluir contrato** | `DELETE` `/api/v2/contracts/{id}` | A v1 não tinha exclusão visível ao usuário, mas pode ser necessária para admin/auditoria. **Decisão do P.O.:** manter fora do MVP se não havia na v1. |
| **Editar contato** | `PATCH` `/api/v2/contracts/{id}` (reutilizar) | A v1 tinha modal "Editar Contato" para email, telefone e observações. Pode ser o mesmo endpoint de edição geral. |

---

### 3.3. Aditivos (Amendments) — Gap Semântico

A API v2 modela aditivos de forma diferente da v1:

| Aspecto | v1 (frontend) | v2 (API atual) | Gap |
|---------|---------------|----------------|-----|
| **Tipos** | `prazo`, `valor`, `escopo`, `outro`, `distrato` | `kind` (valores não documentados; parece ter `value`, `term`, genérico) | 🔴 Mapeamento incompleto; `distrato` é crítico |
| **Campo de descrição** | `object` (resumo do aditivo) | `description` | 🟡 Nome diferente; semântica similar |
| **Campo de valor** | `totalValue` (number) | `impactValueCents` (integer, pode ser negativo) | 🟡 A v2 usa centavos (melhor), mas precisa aceitar negativo para supressão |
| **Campo de prazo** | `contractPeriod.end` (Date) | `newEndDate` (string) | 🟡 Equivalente funcional |
| **Status** | `aditivoStatus`: ~~`Rascunho`~~, `Pendente`, `Homologado` → **apenas 2 estados:** `Pendente`, `Homologado` | `status` (valores não documentados) | 🔴 Precisa garantir os 2 estados |
| **Retorno no contrato** | `children[]` aninhado no GET /contracts/{id} | ❌ **Não retorna** | 🔴 O frontend precisa dos aditivos para renderizar a tabela de documentos e calcular valor atual |
| **Número do aditivo** | `amendmentNumber` | ✅ `amendmentNumber` | ✅ Presente |

**Decisão arquitetural recomendada:** O endpoint `GET /contracts/{id}` deve incluir `amendments[]` (ou `children[]`) aninhados, com todos os campos necessários para renderização da tela de detalhes.

---

### 3.4. Documentos — Gap de Gestão

| Funcionalidade v1 | API v2 | Gap |
|-------------------|--------|-----|
| Upload de documento do contrato | ✅ `POST /contracts/{id}/documents` | ✅ OK |
| Upload de documento do aditivo | ✅ `POST /.../amendments/{id}/documents` | ✅ OK |
| Substituir documento (nova versão) | ✅ `POST /.../documents/{id}/supersede` | ✅ OK |
| **Listar documentos** no GET do contrato | ❌ Não retorna `files[]` | 🔴 P1 |
| **Excluir documento com motivo** | ❌ Não há endpoint DELETE | 🔴 P1 (auditoria + UX) |
| Preview/download do documento | ❌ Não há endpoint GET de documento | 🟡 P2 (o frontend pode usar URL direta se o storage for público) |

---

### 3.5. Listagem e Filtros (GET /contracts)

A v1 tinha uma tela de listagem rica com filtros avançados. A API v2 retorna um array simples.

| Filtro (v1) | Tipo | API v2 | Gap |
|-------------|------|--------|-----|
| `page` | integer (paginação) | ❌ Não documentado | 🔴 P1 |
| `limit` | integer (itens por página) | ❌ Não documentado | 🔴 P1 |
| `search` | string (busca textual) | ❌ Não documentado | 🔴 P1 |
| `contractType` | enum | ❌ Não documentado | 🔴 P1 |
| `contractStatus` | enum | ❌ Não documentado | 🔴 P1 |
| `contractPeriodStart` / `contractPeriodEnd` | date range | ❌ Não documentado | 🟡 P2 |
| `minValue` / `maxValue` | number range | ❌ Não documentado | 🟡 P2 |
| `budgetPlanId` | integer | ❌ Não documentado | 🟡 P2 |
| `order` | `ASC` \| `DESC` | ❌ Não documentado | 🟡 P2 |
| **Meta de paginação** | `meta: { page, totalPages, total, limit }` | ❌ Não retorna | 🔴 P1 |

**Decisão:** A API deve aceitar query parameters de filtro e retornar objeto paginado `{ items: [], meta: { ... } }` (ou similar), não array cru.

---

### 3.6. Regras de Negócio — Gap de Validação

Na v1, essas regras viviam no frontend (Zod + React Hook Form). Na v2, **devem ser garantidas pela API** (fail-fast + consistency):

| # | Regra | Onde existia (v1) | Onde deve existir (v2) |
|---|-------|-------------------|------------------------|
| R1 | **Teto de Ordem de Serviço:** `classification = ServiceOrder` → `totalValue ≤ R$ 9.999,99` | `domain/schemas.ts` | API (validação no POST/PUT) |
| R2 | **Valor original > 0** | `domain/schemas.ts` | API (validação no POST/PUT) |
| R3 | **Período de vigência obrigatório:** `start` e `end` obrigatórios | `domain/schemas.ts` | API (validação no POST/PUT) |
| R4 | **Contratante obrigatório conforme tipo:** `Supplier` → `supplierId`; `Financier` → `financierId`; `Collaborator` → `collaboratorId` | `domain/schemas.ts` | API (validação no POST/PUT) |
| R5 | **Herança de dados bancários/PIX do Parceiro:** dados bancários e PIX são sempre **somente leitura** no escopo de Contratos; são herdados do cadastro do Parceiro (módulo `partners`). O módulo Contratos apenas reflete os dados atualizados, exibindo um placeholder com a **data da última atualização** vinda do módulo Parceiros. Não há obrigatoriedade de preenchimento no Contratos — a obrigatoriedade (se houver) vive no cadastro do Parceiro. | `domain/schemas.ts` (v1 tinha validação, mas regra pertence ao domínio de Parceiros) | API (schema de response inclui `bancaryInfo` e `pixInfo` como read-only, populados via join com Parceiro) |
| R6 | **Derivação de status:** algoritmo baseado em `signedContractUrl`, `contractPeriod`, `children` (distrato homologado). Status canônicos: `Pendente`, `Em Andamento`, `Finalizado`, `Distrato`. **Nota:** "Vencendo" **não é um status** — é um filtro de UI na tela "Listar Contratos" que exibe contratos `Em Andamento` cuja vigência termina em **≤ 45 dias**. | `domain/status.ts` (frontend) | API (campo `derivedStatus` calculado) ou BFF (recomendado: BFF calcula para não duplicar lógica no frontend) |
| R7 | **Composição de valor:** `currentValue = originalValue + Σ(aditivos de valor homologados)` | `ContractDetail.tsx` (frontend) | API (campo `currentValue` já existe ✅, mas precisa incluir aditivos no cálculo) |

**Recomendação:** As regras **R1–R4** devem ser validadas pela API (HTTP 400 com detalhes). A regra **R5** é de integração (read-only join com módulo Parceiros) e deve ser refletida no schema de response. A regra **R6** pode ser calculada pelo BFF (frontend v2) se a API não quiser assumir essa lógica, mas é preferível que a API entregue um campo `derivedStatus` para consistência entre clients.

---

### 3.7. Histórico de Eventos

| Aspecto | v1 | v2 (API) | Gap |
|---------|----|----------|-----|
| Endpoint | Não tinha endpoint dedicado | `GET /contracts/{id}/history` | ✅ Existe |
| Tela | Página simples com `JSON.stringify` | — | 🟡 O frontend v2 fará uma tela bonita |
| Schema | Não tinha schema tipado | Retorna: `eventId`, `contractId`, `kind`, `occurredAt`, `...` | 🟡 Precisa garantir que cobre todos os eventos (criação, assinatura, aditivo, homologação, upload doc, exclusão doc, etc.) |

---

## 4. Matriz de Prioridade para o Backend

| # | Item | Tipo | Prioridade | Bloco |
|---|------|------|------------|-------|
| 1 | Adicionar campos de domínio ao schema do contrato (`classification`, `contractModel`, `contractType`, `supplierId`, `financierId`, `collaboratorId`, `programId`, `budgetPlanId`, `categorizacao`, `centroDeCusto`, `observations`, `email`, `telephone`, `origin`, `createdAt`, `updatedAt`) | Schema | 🔴 P1 | MVP |
| 2 | Retornar `children[]` (aditivos) e `files[]` (documentos) no `GET /contracts/{id}` | Schema | 🔴 P1 | MVP |
| 3 | Implementar `PUT`/`PATCH` `/contracts/{id}` para edição | Endpoint | 🔴 P1 | MVP |
| 4 | Adicionar query parameters de filtro e paginação no `GET /contracts` | Endpoint | 🔴 P1 | MVP |
| 5 | Retornar meta de paginação no `GET /contracts` | Schema | 🔴 P1 | MVP |
| 6 | Validar regras de negócio na API (**R1–R4**) | Validação | 🔴 P1 | MVP |
| 7 | Adicionar `DELETE` `/contracts/{id}/documents/{documentId}` com motivo/auditoria | Endpoint | 🔴 P1 | MVP |
| 8 | Garantir tipos completos de aditivo (`prazo`, `valor`, `escopo`, `outro`, `distrato`) | Schema | 🔴 P1 | MVP |
| 9 | Retornar `contractor` aninhado (dados do fornecedor/financiador/colaborador) no contrato | Schema | 🟡 P2 | MVP |
| 10 | Adicionar `program` e `budgetPlan` aninhados no contrato | Schema | 🟡 P2 | Wave 2 |
| 11 | Incluir `bancaryInfo` e `pixInfo` como **read-only** no response do contrato (populados via join com módulo **Parceiros**, com `updatedAt` do parceiro para exibição do placeholder) | Schema | 🟡 P2 | Wave 2 |
| 12 | Garantir histórico completo de eventos (todos os tipos) | Schema | 🟡 P2 | Wave 2 |
| 13 | Endpoint de preview/download de documento (ou URL pública assinada) | Endpoint | 🟡 P2 | Wave 2 |
| 14 | Campo `derivedStatus` calculado pela API (ou algoritmo documentado para BFF) | Schema | 🟢 P3 | Wave 2 |

---

## 5. Notas Técnicas para o Frontend v2

- O frontend v2 usará **Result<T, HttpError>** para todas as chamadas à API.
- Todos os schemas de request/response serão validados com **Zod 4** na borda (server-fn e gateway).
- O BFF (server functions) orquestrará chamadas ao core-api; o browser nunca fala diretamente com o backend.
- Regras de negócio que a API não validar serão replicadas no BFF como **defesa em profundidade** (fail-fast).

---

## 6. Checklist de Validação (para fechamento deste relatório)

- [ ] Backend revisou e concordou com a lista de campos (seção 3.1)
- [ ] Backend confirmou que `children[]` e `files[]` serão incluídos no GET de detalhe
- [ ] Backend confirmou que implementará `PUT`/`PATCH` de contrato
- [ ] Backend confirmou que implementará filtros + paginação na listagem
- [ ] Backend confirmou que validará regras R1–R4 na API
- [ ] Backend confirmou tipos de aditivo (`distrato` incluso)
- [ ] Backend confirmou endpoint de exclusão de documento
- [ ] Backend forneceu estimativa/versão de entrega de cada item

---

*Documento gerado automaticamente a partir da análise forense do código-fonte v1 e da spec OpenAPI v2. Para dúvidas ou ajustes, contatar Arquitetura Frontend v2.*
