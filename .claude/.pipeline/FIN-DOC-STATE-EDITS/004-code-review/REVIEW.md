# Code Review — FIN-DOC-STATE-EDITS — Round 1

**Veredito:** APPROVED · **Data:** 2026-06-19

**Escopo:** `domain/document/document.ts` (cancelDraft, editMetadata), use-cases `cancel-document`/`adjust-document` (roteamento por status) + testes (domínio + HTTP).

## Princípio IX — citação canônica

A decisão de `editMetadata` propagar o `dueDate` aos payables in-place (em vez de deixá-los inconsistentes) mantém a invariante de consistência do agregado — o título é o que se paga, seu vencimento deve seguir o do documento. Ancorada em:

> *"An invariant is a business rule that must always be consistent... transactional consistency, which is considered immediate and atomic."* — Vaughn Vernon, *Implementing DDD*, p. 450 (§"Model True Invariants in Consistency Boundaries").

A consistência doc↔payables é mantida na mesma operação (atômica), preservando ids/status (não regenera) — honra "não regenerar os filhos" do #165 sem deixar dado inconsistente.

## Issues

- 🔴 nenhuma. Zero throw/class/any no domínio; funções puras retornando `Result`; status preservado por construção; roteamento no use-case (não no domínio).
- 🟡 nenhuma.
- 🔵 `editMetadata` reusa o evento `DocumentSaved` (em vez de um novo tipo) — evita expandir a union exaustiva `DOCUMENT_EVENT_TYPES`; a timeline registra o marco com o diff before/after correto.

## O que está bom

- Fail-first (RED→GREEN) no domínio + acceptance HTTP.
- Bloqueio de valor em Approved preservado (409) — só dueDate/description passam.
- #166 trata Draft (sem payables) sem forçar o caminho de payables.
- Sem regressão: suíte completa 2976 pass / 0 fail.

**APPROVED** → W3.
