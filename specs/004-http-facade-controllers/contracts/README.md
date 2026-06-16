# Phase 1 — Contracts: `004-http-facade-controllers`

> **N/A — preservação total.** Refactor de **comportamento-preservado**: não cria nem altera nenhum contrato HTTP.
> Rotas, métodos, schemas Zod (request/response), status codes, headers, ordem de `preHandler` e envelope de erro
> permanecem **byte-a-byte idênticos** após o refactor.

## Por que não há arquivo de contrato novo

O padrão Facade "**não introduz qualquer nova funcionalidade**" (GoF/Shvets — ver `research.md` R1). A interface HTTP
externa é exatamente a de hoje; muda só a **organização interna** dos handlers (inline → membro de fachada).

## O contrato é a suíte de caracterização existente

O "contrato" desta feature é **negativo** ("nada muda") e é verificado mecanicamente pelos **64 arquivos** de teste de
rota (`fastify.inject`) já existentes, que devem passar **sem alteração de asserção**:

| Módulo    | Diretório de testes (caracterização)     | Arquivos |
| --------- | ---------------------------------------- | -------- |
| auth      | `tests/modules/auth/adapters/http/`      | 21       |
| contracts | `tests/modules/contracts/adapters/http/` | 15       |
| partners  | `tests/modules/partners/adapters/http/`  | 23       |
| programs  | `tests/modules/programs/adapters/http/`  | 5        |

## Invariantes de contrato a preservar (checklist de revisão W2)

- **Status codes** idênticos por rota.
- **Body** (sucesso e erro) idêntico; envelope `{ error: { code, message, requestId } }` intacto.
- **Headers** idênticos — incl. `Deprecation`/`Sunset` (contracts, ADR-0033) e `Content-Type`/`Content-Disposition`/`X-Content-Type-Options: nosniff` (exports de partners).
- **Ordem de `preHandler`/hooks** (`requireAuth` → `authorize` → handler) inalterada.
- **Schemas Zod** (request/response) referenciados sem mudança.
- **Inferência tipada** preservada (fachada dentro da closure — FR-002/R2).
