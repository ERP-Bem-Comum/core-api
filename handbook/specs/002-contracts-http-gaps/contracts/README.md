# Contratos HTTP — `002-contracts-http-gaps`

> Borda `/api/v2` do módulo `contracts` (Fastify + `fastify-zod-openapi`, ADR-0025/0027). Todas as rotas:
> `requireAuth` + `authorize(<permissão>)`, envelope de erro `{ error: { code, message, requestId } }`.
> Schemas Zod (Zod 4) abaixo são o contrato normativo — request e response. Casam 1:1 com o que o BFF/cliente consome.

## Envelope de erro (todas as rotas)

```ts
const ErrorEnvelope = z.object({
  error: z.object({
    code: z.string(), // EN kebab-case (ex.: 'contract-not-found')
    message: z.string(), // PT-BR (via dicionário cli/formatters)
    requestId: z.string(),
  }),
});
```

Status transversais: `401` (sem sessão), `403` (sem permissão), `400` (shape inválido — Zod), `404` (contrato inexistente — RBAC puro, sem tenant).

---

## 1. `POST /api/v2/contracts` — criar contrato (ALTERADO: + contractor)

**Permissão**: `contract:write`

**Request body** (campos existentes + `contractor` **obrigatório**):

```ts
const ContractorRefInput = z.object({
  type: z.enum(['supplier', 'financier', 'collaborator', 'act']),
  id: z.string().uuid(),
});

const CreateContractBody = z.object({
  // ...campos já existentes do POST atual (title, objective, originalValue, period, ...)
  contractor: ContractorRefInput, // NOVO — obrigatório
});
```

**Responses**:

- `201` → contrato criado (DTO de detalhe sem snapshot composto, ou id + leitura subsequente — manter shape atual + `contractor:{type,id}`).
- `400` → `contractor` ausente/ inválido (envelope). _Cenário US1-2._
- `401/403` → envelope.

> Não valida existência do `contractor.id` em Parceiros (R4 — grava sem validar).

---

## 2. `GET /api/v2/contracts/:id` — detalhe (ALTERADO: + contractor composto)

**Permissão**: `contract:read`

**Response `200`** (DTO atual + bloco `contractor`):

```ts
const SupplierSnapshot = z.object({
  name: z.string(),
  document: z.string(),
  bankAccount: BankAccount.nullable(),
  pixKey: PixKey.nullable(),
  updatedAt: z.string().datetime(),
});
const SimpleSnapshot = z.object({
  // financier | collaborator | act
  name: z.string(),
  document: z.string(),
  updatedAt: z.string().datetime(),
});

const ContractorBlock = z.object({
  type: z.enum(['supplier', 'financier', 'collaborator', 'act']),
  id: z.string().uuid(),
  snapshot: z.union([SupplierSnapshot, SimpleSnapshot]).nullable(), // null = degradação (FR-006)
});

const ContractDetail = z.object({
  // ...DTO de detalhe atual (id, sequentialNumber, title, status, currentValue, ...)
  contractor: ContractorBlock,
  observations: z.string().nullable(),
  email: z.string().nullable(),
  telephone: z.string().nullable(),
});
```

**Headers de resposta** (rota composta transitória — ADR-0032):

```
Deprecation: true
Sunset: <data/condição: quando o BFF v2 assumir a composição>
```

**Comportamento**:

- `bankAccount`/`pixKey` presentes **só** quando `type === 'supplier'`. _US1-3/US1-4._
- contratado ausente/ilegível em Parceiros → `snapshot: null` (status `200`, **nunca 500**), resposta **idêntica** a erro de IO (anti-oráculo). _US1-6._
- chamada à public-api de Parceiros com **timeout** explícito de **2s** (config).

---

## 3. `PATCH /api/v2/contracts/:id` — editar metadados (NOVO)

**Permissão**: `contract:write` · **RBAC puro** (sem ownership por tenant — `contracts` não tem scoping de organização). Contrato inexistente → `404`.

**Request body** (`.strict()` + `.refine` ≥1 campo):

```ts
const PatchContractMetadataBody = z
  .object({
    title: z.string().min(1).optional(),
    objective: z.string().min(1).optional(),
    observations: z.string().max(1000).optional(),
    email: z.string().email().optional(),
    telephone: z.string().max(32).optional(),
  })
  .strict() // chave não declarada → 400
  .refine(
    (b) => Object.keys(b).length > 0, // corpo vazio → 400
    { message: 'pelo menos um campo deve ser informado' },
  );
```

**Responses**:

- `200` → contrato atualizado (DTO de detalhe). _US2-1._
- `400` → campo imutável presente (`originalValue`/período/datas/`sequentialNumber`) **ou** chave desconhecida **ou** corpo vazio **ou** `title`/`objective` vazios. _US2-2 / US2-3._
- `404` → contrato inexistente (RBAC puro — sem ownership por tenant).
- `401/403` → envelope.

> **422 não é usado** aqui: o schema não declara campos imutáveis, então `.strict()` rejeita na borda (400) antes do domínio (R2 / ADR-0027).

---

## 4. `DELETE /api/v2/contracts/:id` — recusado (NOVO, política)

**Permissão**: `requireAuth` obrigatório (não vazar existência da rota a não-autenticado) + `contract:write`.

**Response**:

- `405 Method Not Allowed` → envelope com `code: 'contract-delete-forbidden'`, mensagem PT explicando imutabilidade (exclusão física proibida — princípio #14). _US2-4._
- `401` → sem sessão (antes de qualquer política).

> Status **405** fixado (decisão `/speckit-analyze` A1): é o mais semântico (método não suportado no recurso);
> o corpo carrega a política. `requireAuth` precede a recusa.

---

## Casamento com o front

Estes contratos resolvem os ITENs 1 e 2 do ticket do front (contratos `/api/v2`). O bloco `contractor` no
detalhe + `contractor` obrigatório no POST eliminam o "contrato solto". O PATCH cobre edição de cadastro sem
ferir a imutabilidade. Itens 3 e 4 do ticket (partners `/api/v1`) pertencem à spec `001-partners-http-gaps`.
