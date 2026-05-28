# CONTRACTS-HTTP-DOCS-HARDENING — follow-ups 🟡 do C3

## Origem

Notas 🟡 do W2 de `CONTRACTS-HTTP-DOCUMENTS` (C3) — `004-code-review/REVIEW.md`. Hardening pós-entrega,
solicitado pelo dono (2026-05-28). Não bloqueava o C3; tratado agora num ticket próprio.

## O que este ticket entrega

1. **Ownership do E3 (`:documentId` ↔ `:id`)** — `POST /contracts/:id/documents/:documentId/supersede`
   passa a validar que o documento pertence ao contrato do path (simetria com o E2). Novo reader
   `getDocument` no composition; o handler do E3 verifica:
   - doc `parentType:'Contract'` → `parentId === :id`;
   - doc `parentType:'Amendment'` → resolver o aditivo (`getAmendment`) e comparar `contractId === :id`.
   - Não pertence → **409** (`document-contract-mismatch`); doc inexistente → **404** (já existente).

2. **OpenAPI do corpo binário (E1/E2)** — as rotas de upload passam a documentar `requestBody` com
   `content: application/octet-stream`, `schema { type: string, format: binary }` no `/docs/json`, **sem**
   reativar validação Zod do corpo (que continua opaco/Buffer — D1 do C3). Guiado por teste; se a stack
   `fastify-zod-openapi` não suportar de forma limpa, registrar a limitação e ajustar o alvo.

3. **Atomicidade distribuída do E2** — registrar o E2 (`uploadDocument` + `attachSignedDocument`, 2 saves)
   como segundo caso afetado do débito já documentado em `.planning/HOMOLOGATE-DISTRIBUTED-ATOMICITY.md`.
   **Documentação apenas** (a resolução real é o épico `CTR-HOMOLOGATE-ATOMIC-TX`, fora deste ticket).

## Critérios de aceitação

- **CA1 (ownership E3):** supersede com `:documentId` de doc que pertence ao `:id` → 200 (regressão);
  `:documentId` de doc cujo contrato ≠ `:id` → **409**; doc inexistente → 404 (mantido).
- **CA2 (OpenAPI):** `/docs/json` das rotas E1/E2 contém `requestBody` com `application/octet-stream` +
  `format: binary`. As 3 rotas seguem presentes (regressão do CA6 do C3).
- **CA3 (regressão):** os 21 casos do C3 + suíte HTTP completa seguem verdes; upload continua funcional
  (corpo Buffer, sem validação Zod do corpo).
- **CA4 (doc):** `.planning/HOMOLOGATE-DISTRIBUTED-ATOMICITY.md` lista o E2 como caso afetado.

## Fora de escopo

- Resolver a atomicidade distribuída de fato (épico `CTR-HOMOLOGATE-ATOMIC-TX`).
- Isolamento por tenant no RBAC (o `contract:write` segue global).
