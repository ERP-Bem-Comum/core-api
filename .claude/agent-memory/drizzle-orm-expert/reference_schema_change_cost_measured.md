---
name: schema-change-cost-measured
description: Medição real (01/09/2026) do custo de adicionar coluna em prg_programs — cascata para em 2 arquivos, format:check reprova por JSON do drizzle-kit, e o fake in-memory é cego ao schema
metadata:
  type: reference
---

Medido em worktree descartável, módulo `programs`, MySQL/Drizzle 0.45.2 + kit 0.31.x.

## O que o gate cobra, em número

- **Coluna nullable** (`varchar` sem constraint): `typecheck`, `lint` e os 11.478 testes passam
  **sem tocar em nada**. Cascata = 0 arquivos de código. Só 3 arquivos gerados.
- **Coluna `NOT NULL`**: o compilador aponta **1 arquivo** (`programToInsert`, porque `$inferInsert`
  torna o campo obrigatório). `programFromRow` NÃO quebra — ele monta objeto literal e descarta
  colunas extras do row em silêncio.
- **Campo obrigatório no tipo de domínio** (`Program`): o compilador aponta **2 arquivos** —
  `domain/program/program.ts` (o `create` monta literal) e o mapper. `update` usa spread e escapa.
  Total do caminho correto: 4 arquivos à mão + 3 gerados. A cascata **não explode**.

## Dois custos que nada avisa

1. **`db:generate` produz arquivo que o próprio gate reprova.** `meta/_journal.json` e
   `meta/NNNN_snapshot.json` saem fora do estilo Prettier — `format:check` falha em TODA geração de
   migration. Cura: `pnpm exec prettier --write` nos dois. Nenhum script encadeia isso; é passo
   manual esquecível, e a falha aparece longe da causa.
2. **O fake `.in-memory.ts` é estruturalmente cego ao schema.** Medido: **86 dos 88** fakes do
   repositório não importam `schemas/mysql.ts` (os 2 que importam são outbox, nenhum é repositório
   de agregado). Eles tipam contra o domínio, não contra a linha. Coluna nova, `CHECK` novo,
   `NOT NULL` novo — nada disso pode quebrá-los. Corolário: o contrato compartilhado
   (`*.suite.ts`) roda idêntico nos dois lados e **passa nos dois** com a coluna mentindo.

## O falso-verde barato

Um literal chumbado no mapper (`visibility: 'PUBLICO'`) leva o gate INTEIRO ao verde:
typecheck + lint + 11.478 testes, 0 falhas — com a coluna desconhecida do domínio. O gate não
distingue "campo preenchido pelo agregado" de "constante escrita pelo adapter".

Ver [[mysql-notnull-check-two-statements]] para o lado do DDL.
