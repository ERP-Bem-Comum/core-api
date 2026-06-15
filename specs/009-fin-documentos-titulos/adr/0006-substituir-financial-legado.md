# ADR-0006 (feature 009): Substituir o módulo `financial` legado pela reconstrução SDD-009

**Status**: Accepted (decidido pelo P.O. nesta sessão, 2026-06-15)

**Data**: 2026-06-15

**Feature**: `specs/009-fin-documentos-titulos/`

**Decisores**: Gabriel (P.O./arquiteto) + agente Financeiro (consulta `software-architect` + cânone via fallback ACDG)

## Contexto

O módulo `src/modules/financial/` **já existe** em `main` — um esqueleto **Payable-cêntrico** (agregado `Payable` com máquina
de 7 estados de liquidação, `sourceDocumentId` como ref leve, 17 testes). Porém:

1. Foi construído sobre `handbook/domain/04-titulos-liquidacao-context.md`, **fonte removida** do repositório por conter
   gaps e regras de negócio incorretas (decisão do P.O.). A fonte canônica passou a ser `handbook/domain_questions/financeiro/`.
2. Está **100% isolado**: nenhuma referência externa a `financial/public-api` (verificado em `src/` e `tests/`).
3. Seus 17 testes validam o **modelo errado** — não são rede de segurança útil para o domínio canônico.

A fatia 1 (SDD-009) é **Document-cêntrica** (agregado `Document`/Fato Gerador gerando títulos) e ocupa o mesmo path.

## Decisão

**Substituímos** o módulo `financial` legado pela reconstrução SDD-009. O legado é **arquivado** (tag git
`legacy/financial-payable-centric`) e **removido** de `src/modules/financial/` e `tests/modules/financial/`. As fatias
futuras de **liquidação/conciliação** (que o legado endereçava) serão replanejadas via SDD sobre `domain_questions`,
usando o legado apenas como **referência histórica** (recuperável pela tag).

## Citação canônica _(obrigatória — princípio IX)_

> "Another case is when it's easier to rewrite it than to refactor it. This is a tricky decision. Often, I can't tell how
> easy it is to refactor some code unless I spend some time trying and thus get a sense of how difficult it is. The
> decision to refactor or rewrite requires good judgment and experience..."
> — _(refactoring--martin-fowler.md:2227; Martin Fowler, *Refactoring*, 2ª ed.)_

> "If you do a big-bang rewrite, the only thing you're guaranteed of is a big bang." — _(building-microservices--sam-newman.md:1323; Sam Newman)_
> O strangler fig / migração incremental (Newman:1430) endereça sistemas **em uso**; aqui há **0 consumidores**, então a
> incrementalidade vem do **fatiamento do SDD** (US1→US2→…→liquidação), não de conviver com o legado.

(Fontes via fallback local `acdg/skills_base/shared-references/` — MCP `acdg-skills` off.)

## Alternativas consideradas

- **Refatorar o legado para o modelo canônico** — rejeitada: o modelo está conceitualmente errado e os testes validam o
  erro (Fowler:2293 — refatorar legado depende de testes confiáveis, que aqui não existem). Reescrever é mais barato.
- **Conviver / strangler fig** — rejeitada: sem consumidores, não há sistema "em uso" a estrangular (Newman:1430).
- **Manter os dois** — rejeitada: colisão de path e de modelo (`Payable` agregado de 7 estados vs entidade interna do `Document`).

## Consequências

- **Positivas**: path limpo alinhado à fonte canônica; SDD-009 implementável sem dívida conceitual; remoção sem quebra (isolado).
- **Negativas / trade-offs**: descarta-se a máquina de liquidação já modelada — **mitigado** pela tag de arquivo e pelo
  replanejamento das fatias futuras sobre `domain_questions`.
- **Impacto em BCs / outbox / migrations**: remove `src/modules/financial/` + `tests/modules/financial/` legados; nenhum
  outro módulo afetado. A 1ª migration `fin_*` da SDD-009 nasce limpa.
