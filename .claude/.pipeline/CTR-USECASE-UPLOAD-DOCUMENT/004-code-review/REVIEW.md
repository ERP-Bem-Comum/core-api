# Code Review - Ticket CTR-USECASE-UPLOAD-DOCUMENT - Round 1

**Veredito:** APPROVED

## Issues

Nenhuma critica/importante/sugestao.

## O que esta bom

1. **Sequencia canonica validar -> fetch -> domain -> persist** segue padrao Application (regra invariante .claude/rules/application.md).
2. **Sem EventBus** — evento entra no outbox via `documentRepo.save(doc, [event])`. Padrao CTR-OUTBOX-INTEGRATION-IN-REPOS preservado.
3. **`expectedSha256` upload** — defesa em profundidade. AWS valida server-side; InMemory valida local. Corrupcao em transit detectada.
4. **Defensive copy** dos bytes via `.slice()` antes de calcular hash. Caller nao consegue mutar entre check e store (anti-TOCTOU).
5. **Clock injetado** — `uploadedAt = deps.clock.now()`. Tests deterministicos via `ClockFixed`.
6. **idGenerator opcional** — default `DocumentId.generate`, mas tests podem injetar para determinismo.
7. **storageKey construida pelo use case** — formato `${prefix}/${docId}/${fileName}`. Documentado em §"Sequencia §6". Validada via `createStorageKey` (rejeita path-traversal etc.).
8. **Error union completa** — 11 variantes cobrindo todos os possiveis erros de validacao + repo + storage + domain.
9. **`parent-not-found` propaga ate o caller** — distincao entre erro de validacao de ID (`ContractIdError`) e erro de existencia (`parent-not-found`).
10. **6 tests cobrem happy + 5 error paths** — happy, parent inexistente, storage falha, repo falha, fileName invalido, integrity-mismatch.

## CAs

10/10 satisfeitos.

## Proximo passo

APPROVED -> W3.
