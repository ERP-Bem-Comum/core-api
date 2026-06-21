# FIN-CATEGORY-HIERARCHY — capacidade de subcategoria (parentId) em fin_categories (#147 F3)

> Follow-up F3 do épico Lançar Documento (#64). Decisão (aceita): **capacidade `parentId`, seed depois** (sem inventar taxonomia). Size **S**.

## Contexto

A tela exibe "Categoria → Subcategoria (dependente)", mas `fin_categories` não tinha hierarquia (`group` é natureza despesa/receita/ajuste, não pai). Não há taxonomia de subcategorias definida no repo (era "pendente de validação com PO"). Inventar seed cairia em Speculative Generality (Fowler). Entrega-se só a **capacidade**.

## Escopo

- `Category` + `CreateInput`: campo `parentId: CategoryId | null` (auto-referente).
- `fin_categories`: coluna `parent_id varchar(36)` nullable + índice. Migration 0017.
- Read store drizzle: SELECT + rehydrate de `parent_id`; in-memory carrega Category direto.
- `GET /financial/categories` (DTO + schema) expõe `parentId`.
- Seed (`ReferenceCategorySeed`) ganha `parentId?` opcional + `seededCategories` repassa → taxonomia futura é **edição de dado**, sem código.
- Documento continua referenciando a folha via `categoryRef` (sem novo campo).

## Critérios de aceite

- **CA1**: `GET /financial/categories` retorna `parentId` em cada item (null = top-level).
- **CA2**: seeds atuais ficam top-level (parentId null) — nenhuma taxonomia inventada.
- **CA3**: coluna nullable — back-compat (categorias pré-existentes leem null).

## Fora de escopo

- Taxonomia concreta de subcategorias (seed) — aguarda a P.O.
- CRUD de categoria/subcategoria (continua read-only/seed, como 020).

## Gate

W0 RED → W1 GREEN → W2 APPROVED → W3 verde.
