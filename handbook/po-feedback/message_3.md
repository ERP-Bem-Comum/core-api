# Requisição de API: Módulo Contratos

> **Para:** Time de Backend (core-api)  
> **De:** Frontend v2 (Arquitetura + P.O.)  
> **Data:** 2026-06-02  
> **Prioridade:** 🔴 Bloqueante para MVP do módulo Contratos  
> **Documento complementar:** `api-gap-analysis.md` (análise forense completa)

---

## Resumo Executivo

O frontend v2 do módulo **Contratos** está especificado e pronto para implementação. Precisamos dos endpoints e campos de API abaixo para entregar paridade funcional com a v1.

**Estimativa de esforço:** Média (~3–5 dias para dev senior, considerando que a base estrutural já existe).

---

## 1. Schema do Contrato — Campos Obrigatórios (P1)

O `GET /contracts/{id}` e `POST /contracts` devem suportar:

```typescript
interface Contract {
  id: string                           // ✅ já existe
  sequentialNumber: string             // ✅ já existe (código do contrato)
  title: string                        // ✅ já existe
  objective: string                    // ✅ já existe (objeto/resumo)
  originalValue: { cents: number }     // ✅ já existe
  originalPeriod: { start: Date, end: Date }  // ✅ já existe
  status: 'Pendente' | 'Em Andamento' | 'Finalizado' | 'Distrato'  // 🔴 apenas 4 valores
  signedAt: Date | null               // ✅ já existe (dataAssinatura)
  currentValue: { cents: number }     // ✅ já existe (deve calcular com aditivos)
  currentPeriod: { start: Date, end: Date } | null  // ✅ já existe
  endedAt: Date | null                // ✅ já existe

  // CAMPOS NOVOS (P1):
  classification: 'Contract' | 'ServiceOrder'       // 🔴 NOVO — regra R1 (teto OS)
  contractModel: 'Service' | 'Donation'             // 🔴 NOVO
  contractType: 'Supplier' | 'Financier' | 'Collaborator' | 'ACT'  // 🔴 NOVO
  supplierId?: string                               // 🔴 NOVO (condicional por tipo)
  financierId?: string                              // 🔴 NOVO
  collaboratorId?: string                           // 🔴 NOVO
  supplier?: PartnerSnapshot                        // 🔴 NOVO (dados do contratado)
  financier?: PartnerSnapshot
  collaborator?: PartnerSnapshot
  programId?: number                                // 🟡 P2
  program?: { id: number, name: string }            // 🟡 P2
  budgetPlanId?: number                             // 🟡 P2
  budgetPlan?: { id: number, scenarioName: string, year: number, version: number }  // 🟡 P2
  categorizacao?: 'Avaliação' | 'Operacional' | 'Processo'  // 🟡 P2
  centroDeCusto?: 'RH' | 'Serviços Gerais' | 'Eventos'      // 🟡 P2
  observations?: string                             // 🟡 P2
  email?: string                                    // 🟡 P2
  telephone?: string                                // 🟡 P2
  bancaryInfo?: {                                   // 🟡 P2 (read-only, vindo de Parceiros)
    bank: string
    agency: string
    accountNumber: string
    dv: string
    updatedAt: Date        // para exibir "atualizado em" no placeholder
  }
  pixInfo?: {                                       // 🟡 P2 (read-only, vindo de Parceiros)
    keyType: string
    key: string
    updatedAt: Date
  }
  origin?: string                                   // 🟢 P3
  createdAt: Date                                   // 🟡 P2
  updatedAt: Date                                   // 🟢 P3

  // ANINHAMENTOS OBRIGATÓRIOS (P1):
  children: Amendment[]      // 🔴 NOVO — aditivos do contrato
  files: ContractFile[]      // 🔴 NOVO — documentos anexados
}

interface PartnerSnapshot {
  id: string
  name: string
  document: string           // CNPJ/CPF
  email?: string
  telephone?: string
}

interface Amendment {
  id: string
  amendmentNumber: string
  type: 'prazo' | 'valor' | 'escopo' | 'outro' | 'distrato'  // 🔴 garantir todos, especialmente 'distrato'
  description?: string        // resumo do aditivo
  impactValueCents?: number   // pode ser negativo (supressão)
  newEndDate?: Date           // para tipo 'prazo'
  startDate?: Date            // 🔴 NOVO — início do efeito do aditivo
  status: 'Pendente' | 'Homologado'  // 🔴 apenas 2 estados
  signedAt?: Date             // data de assinatura
  signedContractUrl?: string  // URL do documento assinado
  createdAt: Date
}

interface ContractFile {
  id: string
  name: string
  url: string
  size?: number
  uploadedAt: Date
  uploadedBy?: string
}
```

---

## 2. Endpoints Necessários

### 2.1. CRUD do Contrato

| Operação | Endpoint | Status |
|----------|----------|--------|
| Listar | `GET /api/v2/contracts` | ✅ Existe — precisa de **filtros + paginação + meta** |
| Criar | `POST /api/v2/contracts` | ✅ Existe — precisa aceitar todos os campos novos |
| Detalhe | `GET /api/v2/contracts/{id}` | ✅ Existe — precisa retornar `children[]` + `files[]` |
| Editar | `PUT` / `PATCH` `/api/v2/contracts/{id}` | ❌ **AUSENTE — P1** |
| Excluir | `DELETE /api/v2/contracts/{id}` | ❌ Ausente (não tinha na v1; pode ser P2/P3) |

### 2.2. Query Parameters do GET /contracts (listagem)

```
GET /api/v2/contracts?page=1&limit=20&search=termo&contractType=Supplier&status=Em%20Andamento&contractPeriodStart=2026-01-01&contractPeriodEnd=2026-12-31&minValue=100000&maxValue=500000&budgetPlanId=3&order=DESC
```

**Resposta paginada:**
```json
{
  "items": [ /* ...contracts... */ ],
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 97,
    "limit": 20
  }
}
```

### 2.3. Aditivos

| Operação | Endpoint | Status |
|----------|----------|--------|
| Criar aditivo | `POST /api/v2/contracts/{id}/amendments` | ✅ Existe — precisa aceitar `startDate` |
| Homologar aditivo | `POST /api/v2/contracts/{id}/amendments/{id}/homologate` | ✅ Existe |

**Campo novo no POST de aditivo:** `startDate` (Date) — início do efeito do aditivo.

### 2.4. Documentos

| Operação | Endpoint | Status |
|----------|----------|--------|
| Upload contrato | `POST /api/v2/contracts/{id}/documents` | ✅ Existe |
| Upload aditivo | `POST /api/v2/contracts/{id}/amendments/{id}/documents` | ✅ Existe |
| Substituir documento | `POST /api/v2/contracts/{id}/documents/{id}/supersede` | ✅ Existe |
| **Excluir documento** | `DELETE /api/v2/contracts/{id}/documents/{id}` | ❌ **AUSENTE — P1** |
| Download/preview | `GET /api/v2/contracts/{id}/documents/{id}` ou URL assinada | 🟡 P2 |

### 2.5. Histórico

| Operação | Endpoint | Status |
|----------|----------|--------|
| Histórico | `GET /api/v2/contracts/{id}/history` | ✅ Existe — precisa garantir cobertura de todos os eventos |

Eventos esperados: `created`, `signed`, `amendment_created`, `amendment_homologated`, `document_uploaded`, `document_superseded`, `document_deleted`, `contact_updated`, `status_changed`.

---

## 3. Regras de Negócio a Validar na API (P1)

| Regra | Descrição | Onde validar |
|-------|-----------|------------|
| **R1** | `classification = ServiceOrder` → `originalValue.cents ≤ 999_999` (R$ 9.999,99) | POST / PUT |
| **R2** | `originalValue.cents > 0` | POST / PUT |
| **R3** | `originalPeriod.start` e `originalPeriod.end` obrigatórios | POST / PUT |
| **R4** | Contratante obrigatório conforme tipo: `Supplier`→`supplierId`, `Financier`→`financierId`, `Collaborator`→`collaboratorId` | POST / PUT |

---

## 4. Checklist de Entrega

- [ ] Schema do contrato com todos os campos P1
- [ ] `children[]` e `files[]` no GET detalhe
- [ ] `PUT`/`PATCH` /contracts/{id}
- [ ] Filtros + paginação + meta no GET /contracts
- [ ] Validação das regras R1–R4
- [ ] `DELETE` /contracts/{id}/documents/{id}
- [ ] Tipos de aditivo completos (`distrato` incluso)
- [ ] Campo `startDate` nos aditivos
- [ ] Eventos de histórico completos
- [ ] Estimativa de entrega por item

---

## 5. Contexto de Arquitetura

O frontend v2 usa **BFF (Backend for Frontend)**: o browser nunca fala diretamente com o core-api. As server functions do BFF chamam o core-api e adaptam o contrato. Portanto, **os schemas de request/response do core-api são a fonte da verdade** — o BFF apenas reflete/adapta.

Se houver dúvidas sobre semântica de campos, consultar o documento `api-gap-analysis.md` (análise forense detalhada da v1) ou o P.O. @lekadecastro.
