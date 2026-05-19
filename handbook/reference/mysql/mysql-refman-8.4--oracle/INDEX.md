# MySQL 8.4 Reference Manual — Split Index

Arquivo fonte: `../tex-source/mysql-refman-8.4--oracle.tex` (13MB, 221.231 linhas — LaTeX exportado pela Oracle).
Dividido por capítulo. Capítulos com mais de 8.000 linhas foram subdivididos em partes de ~5.000 linhas, cortando no `\section*{...}` mais próximo do alvo.

Para ler um capítulo específico: `Read` o arquivo correspondente abaixo (faixa de linhas é do arquivo original, para referência cruzada).

| # | Arquivo / Partes | Título | Faixa (linha no original) | Linhas |
|---|------------------|--------|---------------------------|-------:|
| | `00-front-matter-and-preface.md` | Front matter (cover, abstract, TOC) + Preface and Legal Notices | 1–1399 | 1.399 |
| | `01-general-information.md` | Chapter 1 — General Information | 1400–2926 | 1.527 |
| | `02-installing-mysql.md` | Chapter 2 — Installing MySQL | 2927–5550 | 2.624 |
| | `02a-appendix-apt-repo.md` | Appendix A — Adding and Configuring the MySQL APT Repository Manually (nested under chapter 2) | 5551–9252 | 3.702 |
| | `03-upgrading-mysql.md` | Chapter 3 — Upgrading MySQL | 9253–10090 | 838 |
| | `04-downgrading-mysql.md` | Chapter 4 — Downgrading MySQL | 10091–10112 | 22 |
| | `05-tutorial.md` | Chapter 5 — Tutorial | 10113–12100 | 1.988 |
| | **Chapter 6 — MySQL Programs** | _(4 partes)_ | 12101–27296 | 15.196 |
| | &nbsp;&nbsp;↳ `06-mysql-programs.part01.md` | parte 1 — começa em "Chapter 6 MySQL Programs" | 12101–15698 | 3.598 |
| | &nbsp;&nbsp;↳ `06-mysql-programs.part02.md` | parte 2 — começa em "TRUE" | 15699–19706 | 4.008 |
| | &nbsp;&nbsp;↳ `06-mysql-programs.part03.md` | parte 3 — começa em "Help Options" | 19707–23343 | 3.637 |
| | &nbsp;&nbsp;↳ `06-mysql-programs.part04.md` | parte 4 — começa em "Running innochecksum on Multiple System Tablespace Files" | 23344–27296 | 3.953 |
| | **Chapter 7 — MySQL Server Administration** | _(5 partes)_ | 27297–49695 | 22.399 |
| | &nbsp;&nbsp;↳ `07-server-administration.part01.md` | parte 1 — começa em "Chapter 7 MySQL Server Administration" | 27297–29632 | 2.336 |
| | &nbsp;&nbsp;↳ `07-server-administration.part02.md` | parte 2 — começa em "7．1．5 Server System Variable Reference" | 29633–35706 | 6.074 |
| | &nbsp;&nbsp;↳ `07-server-administration.part03.md` | parte 3 — começa em "Warning \\ Setting max_digest_length to zero disables digest production, which a" | 35707–40599 | 4.893 |
| | &nbsp;&nbsp;↳ `07-server-administration.part04.md` | parte 4 — começa em "Persisting Sensitive System Variables" | 40600–45343 | 4.744 |
| | &nbsp;&nbsp;↳ `07-server-administration.part05.md` | parte 5 — começa em "Behaviors When Binary Log Transaction Compression is Enabled" | 45344–49695 | 4.352 |
| | **Chapter 8 — Security** | _(5 partes)_ | 49696–71077 | 21.382 |
| | &nbsp;&nbsp;↳ `08-security.part01.md` | parte 1 — começa em "Chapter 8 Security" | 49696–54127 | 4.432 |
| | &nbsp;&nbsp;↳ `08-security.part02.md` | parte 2 — começa em "Server-Side Startup Configuration for Encrypted Connections" | 54128–58245 | 4.118 |
| | &nbsp;&nbsp;↳ `08-security.part03.md` | parte 3 — começa em "Device Unregistration for WebAuthn" | 58246–62588 | 4.343 |
| | &nbsp;&nbsp;↳ `08-security.part04.md` | parte 4 — começa em "Note \\ If installed, the audit_log plugin involves some minimal overhead even w" | 62589–66766 | 4.178 |
| | &nbsp;&nbsp;↳ `08-security.part05.md` | parte 5 — começa em "Audit Message Function" | 66767–71077 | 4.311 |
| | `09-backup-and-recovery.md` | Chapter 9 — Backup and Recovery | 71078–72027 | 950 |
| | **Chapter 10 — Optimization** | _(3 partes)_ | 72028–82184 | 10.157 |
| | &nbsp;&nbsp;↳ `10-optimization.part01.md` | parte 1 — começa em "Chapter 10 Optimization" | 72028–75637 | 3.610 |
| | &nbsp;&nbsp;↳ `10-optimization.part02.md` | parte 2 — começa em "Index Prefixes" | 75638–78752 | 3.115 |
| | &nbsp;&nbsp;↳ `10-optimization.part03.md` | parte 3 — começa em "Index-Level Optimizer Hints" | 78753–82184 | 3.432 |
| | `11-language-structure.md` | Chapter 11 — Language Structure | 82185–84901 | 2.717 |
| | `12-character-sets-collations-unicode.md` | Chapter 12 — Character Sets, Collations, Unicode | 84902–88728 | 3.827 |
| | `13-data-types.md` | Chapter 13 — Data Types | 88729–92108 | 3.380 |
| | **Chapter 14 — Functions and Operators** | _(4 partes)_ | 92109–110064 | 17.956 |
| | &nbsp;&nbsp;↳ `14-functions-and-operators.part01.md` | parte 1 — começa em "Chapter 14 Functions and Operators" | 92109–96896 | 4.788 |
| | &nbsp;&nbsp;↳ `14-functions-and-operators.part02.md` | parte 2 — começa em "Regular Expression Function and Operator Descriptions" | 96897–100585 | 3.689 |
| | &nbsp;&nbsp;↳ `14-functions-and-operators.part03.md` | parte 3 — começa em "-" | 100586–107178 | 6.593 |
| | &nbsp;&nbsp;↳ `14-functions-and-operators.part04.md` | parte 4 — começa em "GROUP BY student_name;" | 107179–110064 | 2.886 |
| | **Chapter 15 — SQL Statements** | _(5 partes)_ | 110065–132987 | 22.923 |
| | &nbsp;&nbsp;↳ `15-sql-statements.part01.md` | parte 1 — começa em "Chapter 15 SQL Statements" | 110065–114655 | 4.591 |
| | &nbsp;&nbsp;↳ `15-sql-statements.part02.md` | parte 2 — começa em "Locking" | 114656–119683 | 5.028 |
| | &nbsp;&nbsp;↳ `15-sql-statements.part03.md` | parte 3 — começa em "Result Set Column Names and Data Types" | 119684–124019 | 4.336 |
| | &nbsp;&nbsp;↳ `15-sql-statements.part04.md` | parte 4 — começa em "ITERATE label" | 124020–128408 | 4.389 |
| | &nbsp;&nbsp;↳ `15-sql-statements.part05.md` | parte 5 — começa em "Performance Considerations" | 128409–132987 | 4.579 |
| | `16-data-dictionary.md` | Chapter 16 — MySQL Data Dictionary | 132988–133203 | 216 |
| | **Chapter 17 — The InnoDB Storage Engine** | _(3 partes)_ | 133204–147925 | 14.722 |
| | &nbsp;&nbsp;↳ `17-innodb-storage-engine.part01.md` | parte 1 — começa em "Chapter 17 The InnoDB Storage Engine" | 133204–138067 | 4.864 |
| | &nbsp;&nbsp;↳ `17-innodb-storage-engine.part02.md` | parte 2 — começa em "Monitoring Buffer Pool Load Progress Using Performance Schema" | 138068–141425 | 3.358 |
| | &nbsp;&nbsp;↳ `17-innodb-storage-engine.part03.md` | parte 3 — começa em "InnoDB System Variables" | 141426–147925 | 6.500 |
| | `18-alternative-storage-engines.md` | Chapter 18 — Alternative Storage Engines | 147926–149286 | 1.361 |
| | **Chapter 19 — Replication** | _(2 partes)_ | 149287–157841 | 8.555 |
| | &nbsp;&nbsp;↳ `19-replication.part01.md` | parte 1 — começa em "Chapter 19 Replication" | 149287–153645 | 4.359 |
| | &nbsp;&nbsp;↳ `19-replication.part02.md` | parte 2 — começa em "System Variables Used with Binary Logging" | 153646–157841 | 4.196 |
| | `20-group-replication.md` | Chapter 20 — Group Replication | 157842–163246 | 5.405 |
| | `21-mysql-shell.md` | Chapter 21 — MySQL Shell (reference only — see dedicated manual) | 163247–163258 | 12 |
| | `22-document-store.md` | Chapter 22 — Using MySQL as a Document Store | 163259–166852 | 3.594 |
| | `23-innodb-cluster.md` | Chapter 23 — InnoDB Cluster (reference only) | 166853–166886 | 34 |
| | `24-innodb-replicaset.md` | Chapter 24 — InnoDB ReplicaSet (reference only) | 166887–166909 | 23 |
| | **Chapter 25 — MySQL NDB Cluster 8.4** | _(7 partes)_ | 166910–200493 | 33.584 |
| | &nbsp;&nbsp;↳ `25-ndb-cluster.part01.md` | parte 1 — começa em "Chapter 25 MySQL NDB Cluster 8.4" | 166910–171722 | 4.813 |
| | &nbsp;&nbsp;↳ `25-ndb-cluster.part02.md` | parte 2 — começa em "Memory Allocation" | 171723–176466 | 4.744 |
| | &nbsp;&nbsp;↳ `25-ndb-cluster.part03.md` | parte 3 — começa em "MySQL Server Options for NDB Cluster" | 176467–182042 | 5.576 |
| | &nbsp;&nbsp;↳ `25-ndb-cluster.part04.md` | parte 4 — começa em "Example" | 182043–186080 | 4.038 |
| | &nbsp;&nbsp;↳ `25-ndb-cluster.part05.md` | parte 5 — começa em "Usage" | 186081–190844 | 4.764 |
| | &nbsp;&nbsp;↳ `25-ndb-cluster.part06.md` | parte 6 — começa em "Note \\ On Windows, you can also use SC STOP and SC START commands, NET STOP and" | 190845–195674 | 4.830 |
| | &nbsp;&nbsp;↳ `25-ndb-cluster.part07.md` | parte 7 — começa em "Getting general information about fragments and memory usage" | 195675–200493 | 4.819 |
| | `26-partitioning.md` | Chapter 26 — Partitioning | 200494–204131 | 3.638 |
| | `27-stored-objects.md` | Chapter 27 — Stored Objects | 204132–205600 | 1.469 |
| | `28-information-schema.md` | Chapter 28 — INFORMATION_SCHEMA Tables | 205601–210781 | 5.181 |
| | **Chapter 29 — MySQL Performance Schema** | _(3 partes)_ | 210782–221136 | 10.355 |
| | &nbsp;&nbsp;↳ `29-performance-schema.part01.md` | parte 1 — começa em "Chapter 29 MySQL Performance Schema" | 210782–214241 | 3.460 |
| | &nbsp;&nbsp;↳ `29-performance-schema.part02.md` | parte 2 — começa em "Statement Monitoring" | 214242–217583 | 3.342 |
| | &nbsp;&nbsp;↳ `29-performance-schema.part03.md` | parte 3 — começa em "Status Variable Summaries" | 217584–221136 | 3.553 |
| | `30-sys-schema.md` | Chapter 30 — MySQL sys Schema | 221137–221232 | 96 |

## Critérios do split

- **Fronteira primária:** marcadores `\section*{Chapter N ...}` do LaTeX-original.
- **Sub-split (capítulos > 8.000 linhas):** divididos em N partes (~5.000 linhas), com corte no `\section*{...}` de conteúdo mais próximo do alvo (descartados callouts `Note`/`Warning`/`Important`/`Caution`/`Tip`).
- Toda quebra cai numa fronteira sintática real do documento — nunca em meio de parágrafo, código ou tabela.
- O arquivo original permanece intacto.
