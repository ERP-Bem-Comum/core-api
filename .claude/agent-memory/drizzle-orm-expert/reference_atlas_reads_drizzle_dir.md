---
name: atlas-le-o-diretorio-drizzle
description: Atlas lê os .sql do drizzle-kit sem conversão — o obstáculo real é a ausência de atlas.sum e de ordem global entre os 7 journals, não o --dir-format
metadata:
  type: reference
---

Medido em 2026-09-01 com `atlas v1.3.3`.

A suposição corrente era que o `--dir-format` do Atlas (atlas / golang-migrate / flyway / liquibase
/ dbmate) não cobre o layout do drizzle-kit e por isso o Atlas seria inviável aqui. **Está errado.**
O formato *default* (`atlas`) é só "arquivos `.sql` em ordem lexicográfica + `atlas.sum`", e
`--> statement-breakpoint` é comentário SQL válido — o Atlas ignora.

Provado: copiando os 123 `.sql` **sem nenhuma edição** para um diretório plano, renomeados com
prefixo sequencial, `atlas migrate hash` gera o `atlas.sum` e `atlas migrate validate` sai `exit=0`.

**O que de fato falta para adotar Atlas:**

1. `atlas.sum` — não existe no repo; teria de ser gerado e versionado junto do `meta/_journal.json`,
   virando um segundo mecanismo de integridade a manter em dia.
2. **Ordem global entre os 7 journals.** Os módulos têm numeração independente (`0000..0054`) mas
   compartilham o database `core`. O `when` (epoch ms) de cada entrada resolve: ordenando os 123 por
   ele, **zero colisões de timestamp** e **zero quebras de ordem intra-módulo**. A janela vai de
   2026-05-15T14:33Z (`contracts/0000`) a 2026-08-24T20:58Z (`financial/0054`).
3. `atlas migrate lint` **exige `--dev-url`** — não roda sem um MySQL descartável
   (`docker://mysql/8.4/dev`). Sem Docker no ar, o Atlas não classifica nada.

**How to apply:** antes de dizer que Atlas não serve para este repo, lembrar que a barreira é
dev-database + `atlas.sum`, não o formato dos arquivos. Extração de `schema.sql` não precisa dele —
ver [[schema-sql-extraction-toolkit]].

## ⚠️ Correção medida em 2026-09-01 — o `lint` é pago

`atlas migrate lint` **exige Atlas Pro desde a v0.38**. Testado com o binário `v1.3.3`:

```
Abort: Starting with v0.38, 'atlas migrate lint' is available only to Atlas Pro users.
```

`migrate apply` e `migrate validate` seguem na Community Edition. Isso muda a conta de adotar
Atlas aqui: o que motivava a adoção era justamente o lint.

**O gate que substitui, e é melhor:** replay das 123 migrations num MySQL 8.4 limpo — **~64 s**,
sem seed, sem fixture, sem depender do Atlas (`mysql < arquivo.sql` em laço faz o mesmo). Foi ele
que reproduziu a #808: 112 migrations ok, 1 erro na `financial/0050_same_jack_power`, `Error 1267`
por `fin_remittance_payables` nascer sem `ENGINE`/`CHARSET` e herdar `utf8mb4_0900_ai_ci`.
