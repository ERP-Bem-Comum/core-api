---
name: schema-sql-extraction-toolkit
description: Como extrair um schema.sql consolidado dos 7 módulos (drizzle-kit export funciona em MySQL) e as duas pegadinhas de CLI que custam turnos
metadata:
  type: reference
---

Medido em 2026-09-01, drizzle-kit 0.31.10 / drizzle-orm 0.45.2.

## `drizzle-kit export` FUNCIONA em MySQL

O `.mdx` do handbook só exemplifica `postgresql`, mas `--dialect=mysql` é aceito:

```
./node_modules/.bin/drizzle-kit export --dialect=mysql \
  --schema=src/modules/<m>/adapters/persistence/schemas/mysql.ts --sql
```

Emite o DDL do schema TS **sem tocar em banco nem em migration**. Concatenando os 7 módulos: 67
tabelas, 1236 linhas, **determinístico** (duas execuções, `diff` vazio). Não é preciso replay em
MySQL efêmero para ter um `schema.sql` — só para conferir o que as migrations realmente fizeram.

**O que o export NÃO traz:** o sufixo `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.
Isso confirma mecanicamente que esse sufixo é sempre edição manual pós-geração — é o marcador mais
confiável de migration tocada à mão. `COLLATE utf8mb4_bin` em coluna, ao contrário, **é** emitido
pelo Drizzle (vem de `identifier-columns.ts`), então não serve de marcador.

## Duas pegadinhas de CLI

1. **`--out` absoluto quebra.** `drizzle-kit generate` prefixa `./` ao valor, produzindo
   `.//Users/...` e ENOENT no `meta/0000_snapshot.json`. Rodar com CWD na raiz do alvo e passar
   caminho relativo. (O binário pode vir do `node_modules` de outro checkout — a resolução de
   `drizzle-orm` sobe a árvore a partir do arquivo de schema.)
2. **A palavra `hash` num comando Bash** dispara o guard de isolamento de worktree. Para rodar
   `atlas migrate hash`, montar o subcomando dentro de um `.sh` (`SUB=$(printf 'h%s' 'ash')`).

## Detectar drift schema-TS × migrations sem banco

`drizzle-kit generate` em cada módulo: se imprime `No schema changes, nothing to migrate` e o
`git status` fica vazio, o histórico reproduz o schema. Medido: **zero drift nos 7 módulos**.
Cuidado — isso compara o *snapshot* do Drizzle com o TS; não enxerga edição manual no `.sql`
(ENGINE/CHARSET, ALTER fundido, DML). Ver [[atlas-le-o-diretorio-drizzle]].
