# Phase 0 — Research: contagem de contratos/aditivos por parceiro

## D1 — Direção do acoplamento cross-módulo (read port reverso)

- **Decisão**: criar um read port em **`contracts/public-api`** que partners **consome** (contagem por
  contratado). É o **inverso** do `contractor-view` (que vive em `partners/public-api` e é consumido por
  contracts) — agora contracts expõe e partners consome.
- **Rationale**: a contagem é dado de Contratos; partners não pode ler `ctr_*` direto (ADR-0014) nem importar
  `contracts/domain` (ADR-0006). O port público é o canal sancionado. Espelha o **programs read port** que
  `contracts` já consome (server.ts → `buildProgramsReadPort`).
- **Alternativas**: evento/outbox materializando contagem em partners — rejeitado (complexidade + consistência
  eventual desnecessária para uma contagem de leitura). Leitura cruzada de tabela — proibida (ADR-0014).

## D2 — Forma da contagem (batch, sem N+1)

- **Decisão**: `countByContractor(type, ids[]) → Map<id, { contracts, amendments }>`. Drizzle:
  - contratos: `SELECT contractor_id, COUNT(*) FROM ctr_contracts WHERE contractor_type=? AND contractor_id
IN (...) GROUP BY contractor_id`.
  - aditivos: `SELECT c.contractor_id, COUNT(a.amendment_id) FROM ctr_contracts c JOIN ctr_amendments a ON
a.contract_id=c.id WHERE c.contractor_type=? AND c.contractor_id IN (...) GROUP BY c.contractor_id`.
  - ids ausentes do resultado → contagem 0 (preenchido no port).
- **Rationale**: 2 queries por página (não por linha) — atende FR-003/SC-002. `ctr_amendments.contract_id`
  já é indexado; `(contractor_type, contractor_id)` é índice opcional de perf.
- **Alternativas**: 1 query com LEFT JOIN + 2 COUNTs — possível, mas o JOIN de aditivos multiplicaria linhas;
  2 GROUP BY separados é mais simples e claro.

## D3 — Quais estados contam (Clarifications)

- **Decisão**: **todos os estados** (inclui Cancelled). A contagem não filtra status.
- **Rationale**: clarify do P.O. — mostra o histórico contratual completo do parceiro.

## D4 — Filtro "Status de contrato" do Fornecedor (R2)

- **Decisão**: método `contractorIdsWithContractStatus(type, status) → Set<id>` no mesmo port; o
  `list-suppliers`/borda aplica como pré-filtro (intersecta o conjunto candidato). "Sem contrato" =
  complemento de `contractorIdsWithAnyContract(type)`.
- **Rationale**: o filtro é state-specific (distinto da contagem state-agnostic). Set de ids é leve.
- **Alternativas**: contagem por status no list item — mais dados que o necessário; o filtro só precisa de
  pertinência.

## D5 — Adapter in-memory do count port

- **Decisão**: `makeInMemoryContractCountReadPort(store)` conta sobre um store injetável (lista de
  `{ contractorType, contractorId, status, amendments }`), default vazio. Em `driver=memory` do server, o
  port devolve **0** (sem dados de contrato) — aceitável (memory é efêmero/sem persistência cruzada).
- **Rationale**: testes de borda de partners injetam um store semeado para asserir as contagens; o boot
  memory não quebra.

## D6 — Vínculo Colaborador↔Programa (Eixo B)

- **Decisão**: `programId: string | null` no agregado `Collaborator` (ref leve UUID, validado por smart
  constructor — UUID v4 ou null). Coluna `par_collaborators.program_id varchar(36)` nullable (migration).
  Filtro de listagem `programIds?: string[]` (predicado em memória/SQL, como os demais filtros do
  `list-collaborators`). Sem FK física cross-módulo (ADR-0014).
- **Rationale**: espelha refs leves já usadas (`contractor` em contracts; `programId` em contracts). Opcional
  (nem todo colaborador tem programa). Migration aditiva e nullable → segura.
- **Alternativas**: tabela de junção colaborador×programa (N:N) — rejeitado: o front pede 1 programa por
  colaborador (1:1 opcional); N:N é YAGNI.
