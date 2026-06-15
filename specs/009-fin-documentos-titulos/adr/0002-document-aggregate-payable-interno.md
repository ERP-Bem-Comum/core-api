# ADR-0002 (feature 009): `Document` como agregado raiz, `Payable` como entidade interna na Fatia 1

**Status**: Proposed

**Data**: 2026-06-15

**Feature**: `specs/009-fin-documentos-titulos/`

**Decisores**: Gabriel (P.O./arquiteto) + agente Financeiro

## Contexto

O handbook trata "Gestão de Documentos" e "Títulos e Liquidação" como BCs distintos (`README.md:7-8`), mas o documento e
o título pai **compartilham o mesmo status** (`gestao-documentos.md:22-24`). Na Fatia 1, todas as operações — gerar
(pai+filhos), aprovar com herança (`titulos-liquidacao.md:67` R7), ajustar/recalcular, cancelar com hard delete
(`gestao-documentos.md:86-87`), desfazer aprovação recriando filhos (`titulos-liquidacao.md:71` R8.1) — são
**transacionais sobre o conjunto documento+títulos**. Em tensão: a R7.1 (`titulos-liquidacao.md:68`) prevê **ciclo de
vida financeiro independente** por título (pagamento/baixa/conciliação individuais), que só se materializa nas fatias de
Liquidação/Conciliação.

## Decisão

Na Fatia 1, **`Document` é a raiz do agregado** e os `Payable` (pai + filhos) são **entidades internas** — uma única
fronteira de consistência transacional. Quando as fatias de Liquidação/Conciliação introduzirem o ciclo independente
(R7.1), **reavaliar a promoção** de `Payable` a agregado próprio referenciado por `DocumentId` (novo ADR).

## Citação canônica _(obrigatória — princípio IX)_

> **[CITAÇÃO PENDENTE]** — trecho ≥4 linhas (Vernon, _Effective Aggregate Design_: "Design small Aggregates" /
> consistência transacional × eventual) via `skills_citar`, indisponível nesta sessão.

## Alternativas consideradas

- **`Payable` como agregado próprio já na Fatia 1** — rejeitada: na fatia 1 não há ciclo independente; separar agora
  introduz consistência eventual e complexidade prematura sem benefício.
- **Documento e título sem relação de agregado clara** — rejeitada: dispersaria as invariantes de geração/herança.

## Consequências

- **Positivas**: invariantes (cálculo do líquido, geração de filhos, herança, hard delete) garantidas numa transação;
  modelo simples e testável.
- **Negativas / trade-offs**: quando o ciclo independente entrar, haverá refactor de split — **gatilho documentado**
  (entrada da fatia de Liquidação/Conciliação).
- **Impacto em BCs / outbox / migrations**: a persistência grava documento + payables na mesma transação; o read-model
  de timeline cobre ambos os alvos (`Document`/`Payable`).
