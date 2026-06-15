# Research (Fase 0): Financeiro — Fatia 1

**Feature**: `specs/009-fin-documentos-titulos/` · resolve as incógnitas técnicas antes do design (Fase 1).

Todas as decisões abaixo herdam dos ADRs 0001–0005 e da spec clarificada. Formato: Decisão / Razão / Alternativas.

## R1 — Boundary do agregado

- **Decisão**: `Document` é raiz; `Payable` (Pai/Filho) é entidade interna (sem repository próprio). Persistência grava documento + payables na mesma transação.
- **Razão**: operações da fatia (gerar/aprovar/cancelar/desfazer) são transacionais sobre o conjunto (ADR-0002; Evans:1474).
- **Alternativas**: `Payable` como agregado próprio — adiado para a fatia de Liquidação (gatilho R7.1).

## R2 — Persistência da trilha por-campo (Time Travel)

- **Decisão**: **tabela materializada append-only** `fin_document_timeline` (uma linha por marco/evento) + tabela filha `fin_timeline_field_changes` (uma linha por campo alterado: `field`, `before`, `after`). Os use cases gravam a entry + changes na mesma transação do agregado.
- **Razão**: MySQL sem event store nativo; ADR-0020 **proíbe JSON nativo**, então `changes` não pode ser uma coluna JSON — decompõe-se em tabela filha (1ª forma normal: valores atômicos). Materializar evita recomputar a projeção a cada `GET /timeline` (MP-004). Semântica permanece "derivada de eventos" (ADR-0003).
- **Alternativas**: projeção on-the-fly a partir do outbox (rejeitada: custo de leitura + outbox é fila, não histórico permanente); coluna JSON (proibida — ADR-0020).

## R3 — Validação de referências cross-BC

- **Decisão**: smart constructor valida **apenas formato UUID v4** (`SupplierRef`/`ContractRef`/`BudgetPlanRef`/`CategoryRef`/`ProgramRef`); sem cross-check de existência.
- **Razão**: ADR-0001 + clarify Q2 — desacopla a fatia; integridade do fornecedor pode ser reforçada na borda depois.
- **Alternativas**: cross-check via `partners`/`programs` read ports — adiado.

## R4 — Identidade do documento

- **Decisão**: identidade interna **UUID** (gerado pela aplicação, `node:crypto` randomUUID); `document_number`/`series` fiscais são **input do usuário** (sem número de negócio gerado).
- **Razão**: clarify Q4; o domínio não pede número gerado (diferente de `programs`/`contracts`). PK `varchar(36)`, sem AUTO_INCREMENT (ADR-0020).
- **Alternativas**: identidade dupla com número sequencial — rejeitada (fora do domínio).

## R5 — Concorrência (NFR-005)

- **Decisão**: **optimistic locking** via coluna `version` (int) no `fin_documents`; `UPDATE ... WHERE id=? AND version=?` (sem UPSERT nativo — ADR-0020). Conflito → erro `document-version-conflict`.
- **Razão**: edição/aprovação concorrente do mesmo documento não pode corromper estado/valores.
- **Alternativas**: lock pessimista (`SELECT ... FOR UPDATE`) — reservado para casos de contenção alta (fatias futuras).

## R6 — Enums sem ENUM nativo

- **Decisão**: `type`, `status`, `payment_method`, `kind`, `retention_type`, `registered_tax_type` como `varchar` + **CHECK constraint** enumerando os valores. Status já comporta os **7 valores** (ADR-0005), CHECK lista todos.
- **Razão**: ADR-0020 proíbe ENUM nativo; CHECK dá validação no banco + enum estável p/ fatias futuras.

## R7 — Money

- **Decisão**: reusar `Money` do shared kernel (`src/shared/kernel/money.ts`), persistido em `bigint` (centavos). `net_value` derivado, nunca digitado.
- **Razão**: ADR-0020 (Money bigint); domínio já tem o VO.

## R8 — Eventos / Outbox

- **Decisão**: reusar o padrão de outbox de `contracts` (adapter drizzle + in-memory). Eventos do BC em `financial/public-api/events.ts` com decoder versionado v1. Cada use case grava agregado + outbox na mesma transação.
- **Razão**: ADR-0015; consistência transacional do evento (Vernon:7556 — store do modelo e da mensageria consistentes).
- **Alternativas**: publicação direta sem outbox — rejeitada (perda de garantia at-least-once).

## R9 — Borda HTTP

- **Decisão**: Fastify plugin `financial` montado em `/api/v1/financial`, schemas Zod (request/response), autorização por permissão (`onRequest`/`preHandler`). Reusar composition root e padrões de `contracts`/`programs` (`adapters/http`).
- **Razão**: ADR-0037 (HTTP-first); Fastify já ativo no projeto. Validação na borda → primitivos para os smart constructors (ts-domain-modeler §3.A.5 — Zod na borda, não no domínio).
- **Alternativas**: CLI — aposentada (ADR-0037).

## R10 — Permissões RBAC

- **Decisão**: adicionar ao catálogo deploy-time do `auth` (`permission-catalog.ts`): `fiscal-document:read/write/cancel`, `payable:read/approve/undo-approval`. Perfis = roles dinâmicos compostos.
- **Razão**: ADR-0004; separação de funções (Operador ≠ Aprovador).
- **Pendência cross-módulo**: a edição do catálogo do `auth` é coordenação cross-módulo (Shared Kernel — Evans:4913); fazer aditivamente.

## Incógnitas resolvidas

Nenhuma `NEEDS CLARIFICATION` remanescente — as 4 decisões de escopo foram fechadas no `/speckit-clarify` e as técnicas acima derivam dos ADRs. Pronto para a Fase 1 (design).
