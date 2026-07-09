# FIN-DOC-BULK-DUEDATE — alteração de vencimento em lote

> Feature #162. Size **S**. Módulo `financial`. Sprint Backlog · go-live · gap-contrato.
> Entregue junto de FIN-DOC-LIST-FILTERS (#164) na branch `feat/fin-list-filters-bulk-duedate` → 1 PR.

## Contexto

No grid, o operador seleciona vários títulos e precisa **alterar o vencimento de todos de uma vez**. Hoje só há
`PATCH /api/v2/financial/documents/:id` (individual, com `version`/optimistic lock), que estruturalmente impede
uma chamada multi-documento.

## Escopo (o que muda)

- **Borda** `adapters/http/`: novo endpoint `PATCH /api/v2/financial/documents/due-date` com body
  `{ items: [{ id: uuid, version: int }], dueDate: iso-date }` (bounded: `items` 1..N com N máx. ex. 100).
- **Application**: use-case `bulkUpdateDueDate` que aplica a alteração por item, reusando a lógica de domínio
  do PATCH individual (mudança de vencimento + optimistic lock por `version`).
- **Semântica de falha parcial:** **por item** (não tudo-ou-nada) — cada `id` retorna seu resultado
  (`ok` / `version-conflict` / `not-found`), permitindo ao front reportar quais falharam. HTTP 200 com o mapa
  de resultados (nenhum item processado com sucesso ainda assim é 200 com todos os itens em erro? — decidir no
  W0: 200 sempre com o array de resultados; 400 só para payload inválido).
- Reusa o adapter de persistência existente (save com `expectedVersion`); sem migration.

## Critérios de aceite

- **CA1** — `items` com 3 títulos válidos + `dueDate` → todos atualizados; resposta traz 3 resultados `ok` e a
  nova `dueDate` refletida na listagem/leitura.
- **CA2** — item com `version` stale → resultado `version-conflict` para aquele id; **os demais válidos são
  aplicados** (falha parcial por item, não rollback global).
- **CA3** — item com `id` inexistente → resultado `not-found` para aquele id; demais aplicados.
- **CA4** — payload inválido (`items` vazio, `dueDate` ausente/malformada, `version` não-int) → **400** (nada aplicado).
- **CA5** (x99) — lote misto (ok + conflito) contra MySQL real: apenas os ok mudam de vencimento; `version` incrementa
  só nos aplicados; os conflitados permanecem intactos.

## Definition of Done
W0 RED → W1 GREEN → W2 APPROVED → W3 (typecheck + format:check + lint + test). CA5 no x99. Sem migration. Fecha #162.
