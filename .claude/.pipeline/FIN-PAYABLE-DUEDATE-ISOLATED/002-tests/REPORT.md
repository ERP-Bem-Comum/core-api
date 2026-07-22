# W0 — Testes RED · FIN-PAYABLE-DUEDATE-ISOLATED (#270)

> **Outcome:** RED · Skill: `tdd-strategist` · Módulo: `financial`

Alterar o `dueDate` de **um único payable** sem propagar pai↔filhos. Contrasta com `editMetadata`
(#165, `domain/document/document.ts:424`), que hoje propaga o `dueDate` a **todos** os payables
(`propagate` em `document.ts:433-437`). O design escolhido espelha o padrão já existente de mutação de
**um** título isolado: `payPayableManually` / `POST /documents/:id/payables/:payableId/manual-payment`.

## Design fixado pelos testes (a implementar no W1)

| Camada | Símbolo | Assinatura esperada |
| :-- | :-- | :-- |
| Domínio | `Document.updatePayableDueDate` | `({ document, payables, payableId, dueDate }) → Result<{ document, payables, events }, DocumentError>` |
| Application | `updatePayableDueDate` (use-case) | `({ repo, clock }) => ({ documentId, payableId, expectedVersion, dueDate: Date }) → Promise<Result<void, …>>` |
| Borda HTTP | `PATCH /financial/documents/:id/payables/:payableId` | body `{ dueDate: iso-date, version: int }`; RBAC `fiscal-document:write` |

Invariante central (CA1): mutar um payable **não** toca `document.dueDate` (agregado-pai), nem o
título-pai, nem os irmãos. Vale em `Open` **e** `Approved` (mesma latitude do `editMetadata`).

## Arquivos de teste (novos)

- `tests/modules/financial/domain/document/update-payable-due-date.test.ts` — 4 casos
- `tests/modules/financial/application/use-cases/update-payable-due-date.test.ts` — 3 casos
- `tests/modules/financial/adapters/http/payable-due-date.http.test.ts` — 6 casos

## Cobertura por CA

| CA | Camada(s) | Caso |
| :-- | :-- | :-- |
| CA1 | domínio + use-case + http | altera só o título alvo; documento-pai, título-pai e irmãos inalterados (child **e** parent como alvo) |
| CA1 (persistência) | use-case | alteração isolada sobrevive ao `findById` após `save` |
| CA1 (identidade) | domínio | só o `dueDate` muda — `id`/`kind`/`status`/`value`/`paymentMethod` preservados |
| CA2 | http | `dueDate` mal-formado (`'31-12-2026'`) → 400 |
| CA3 | domínio + use-case + http | `payableId`/`documentId` inexistente → `payable-not-found` / `document-not-found` (404 de domínio) |
| RBAC | http | sem token → 401; sem `fiscal-document:write` → 403 |

## Prova de RED (motivo correto — inexistência da API, não setup)

- **Domínio:** `TypeError: Document.updatePayableDueDate is not a function` (4/4). Setup (`Document.create`
  + retenções) executa — RED isolado na API ausente.
- **Use-case:** `ERR_MODULE_NOT_FOUND` de `.../use-cases/update-payable-due-date.ts` (módulo ainda não existe).
- **Borda:** 6/6 falham; rota inexistente → `404 Route not found`.

### Nota de rigor — falso-verde eliminado no CA3

O `notFound` handler do app devolve `{ error: { code: 'not-found', message: 'Route not found' } }` — ou
seja, a **rota-ausente** já carrega `error.code: 'not-found'`. A 1ª versão do CA3 ancorava só no `code` e
**passava trivialmente** (2 verdes espúrios) sem a rota montada. Corrigido para ancorar na **mensagem de
domínio** (`toPublicMessage` — `'Documento não encontrado.'` / `'Um ou mais títulos informados não foram
encontrados.'`), distinguindo rota-ausente de not-found de negócio. Resultado: **6/6 RED**.

## Handoff W1

- Domínio (`ts-domain-modeler`): nova função pura em `domain/document/document.ts` espelhando
  `payPayableManually` (`document.ts:277-324`) — `find` por id em `[parent, ...children]`,
  `err('payable-not-found')` se ausente, muta só o alvo, documento/irmãos intactos. Evento novo
  (ex.: `PayableDueDateChanged`) em `domain/document/events.ts` + trilha.
- Application (`ports-and-adapters`): use-case espelhando `register-manual-payment.ts`.
- Borda (`fastify-server-expert` ↔ `zod-expert`): rota espelhando o `manual-payment` (mesmo
  `documentPayableParamsSchema`); novo body schema `{ dueDate: z.iso.date(), version }`.
