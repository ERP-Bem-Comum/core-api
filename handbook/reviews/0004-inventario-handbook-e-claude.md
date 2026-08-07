# Review 0004 — Inventário de `handbook/` e `.claude/`

**Data:** 2026-08-07 · **Origem:** preparação para a higienização · **Reproduzir:** `pnpm run docs:inventory`

> Os **números aqui são um retrato datado** — peça-os de novo com o comando acima antes de agir. O que
> este documento acrescenta é a **leitura**, que é julgamento e não sai de script. Escrever os números
> à mão foi como o `PERGUNTAS-EM-ABERTO.md` ficou três meses divergente.

---

## 1. Por que medir antes de limpar

A reorganização que apagou `handbook/domain/` levou **59 referências** junto e ninguém percebeu por
três meses. Não foi má-fé: foi limpeza sem inventário. Os gates da [spec 041](../specs/041-handbook-reference-integrity/plan.md)
impedem que isso se repita em silêncio — mas eles avisam do dano, não escolhem o que deve morrer.

Este inventário mede três coisas por diretório, e nenhuma delas é qualidade:

| Métrica | O que responde |
| :--- | :--- |
| **órfãos** | quantos `.md` nenhum outro documento cita |
| **citado** | quantos documentos **de fora** apontam para dentro — o alcance real |
| **quieto** | dias desde o último commit no diretório |

---

## 2. O retrato (2026-08-07)

| diretório | arqs | linhas | órfãos | citado | quieto |
| :--- | ---: | ---: | ---: | ---: | ---: |
| `handbook/reference` | 685 | 509.762 | 323 | 22 | 4d |
| `handbook/specs` | 329 | 34.473 | 239 | 3 | 0d |
| `.claude/skills` | 106 | 12.503 | 3 | 20 | 1d |
| `handbook/architecture` | 66 | 8.665 | **0** | **85** | 1d |
| `handbook/interviews` | 51 | 8.392 | 8 | 2 | 80d |
| `handbook/inquiries` | 33 | 5.878 | **0** | 28 | 0d |
| `handbook/tickets` | 33 | 2.178 | 18 | 1 | 53d |
| `.claude/agent-memory` | 25 | 516 | 7 | 0 | 1d |
| `handbook/domain_questions` | 22 | 3.243 | 4 | 7 | 23d |
| `.claude/rules` | 16 | 571 | 12 | 2 | 0d |
| `.claude/agents` | 14 | 3.727 | 1 | 10 | 1d |
| `handbook/infrastructure` | 13 | 2.583 | 8 | 5 | 4d |
| `handbook/research` | 8 | 6.830 | **8** | **0** | 58d |
| `handbook/incidents` | 3 | 444 | 1 | 3 | 1d |
| `handbook/operations` | 3 | 575 | 2 | 4 | 58d |
| `handbook/reviews` | 3 | 722 | 2 | 2 | 4d |
| `handbook/legacy_docs` | 2 | 570 | 1 | 0 | 67d |
| `handbook/po-feedback` | 2 | 249 | 1 | 2 | 62d |
| `handbook/runbooks` | 2 | 276 | 1 | 0 | 30d |
| `handbook/process` | 1 | 1.227 | 0 | 2 | 4d |
| `handbook/api_documentations` | 0 | 0 | 0 | 0 | 71d |
| **TOTAL** | **1.417** | **603.384** | **639** | | |

---

## 3. Como NÃO ler estes números

Três armadilhas, todas verificadas antes de escrever este documento:

- **`.claude/rules` com 12 de 16 "órfãs" é falso positivo.** Rule carrega por `paths:`, não por
  citação — nenhuma precisa ser linkada para funcionar. As 16 têm `paths:` preenchido e são cobradas
  por `rules-self-verify.test.ts`. Aqui, órfão significa apenas "não citada em prosa".
- **`handbook/api_documentations` não está vazio.** Tem 2 arquivos versionados (`openapi.yaml`,
  `doc.yaml`); o inventário conta só `.md`. Diretório sem markdown ≠ diretório morto.
- **Órfão não é condenado.** `handbook/specs` tem 239 órfãos e é **histórico de especificação por
  desenho** — o `CLAUDE.md` diz isso. Documento que ninguém cita pode ser exatamente o registro que
  se consulta uma vez por ano.

---

## 4. O que o retrato mostra

**O volume não é o passivo.** `handbook/reference` sozinho é **85% das linhas** do handbook — e é
material de terceiro espelhado (Node, Drizzle, Fastify, MySQL). Não se edita, se reespelha. Tirá-lo
da conta muda a escala do problema: o material **autoral** são ~730 arquivos, não 1.417.

**Dois diretórios estão claramente vivos e saudáveis:** `handbook/architecture` (66 arquivos, **zero
órfãos**, citado por **85** documentos — é o centro de gravidade real do repositório) e
`handbook/inquiries` (zero órfãos, citado por 28, tocado hoje).

**Três estão quietos há mais de 50 dias com alcance quase nulo** — são os candidatos naturais a uma
decisão explícita:

| diretório | sinal |
| :--- | :--- |
| `handbook/research` | 8 arquivos, **8 órfãos**, **ninguém cita**, 58 dias parado |
| `handbook/tickets` | 18 de 33 órfãos, 1 citador, 53 dias — e o kanban já migrou para issues do GitHub |
| `handbook/interviews` | 51 arquivos, 80 dias — o mais silencioso do acervo |

**`.claude/` está saudável.** `skills` (106 arquivos, 3 órfãos, citado por 20), `agents` (14, 1
órfão, citado por 10) e `rules` (16, todas com `paths:`) são material vivo e recém-tocado. O único
ponto de atenção é `agent-memory`: 25 arquivos, **zero citadores**, e é local por desenho — não é
versionado como conhecimento compartilhado.

---

## 5. O que decidir (nesta ordem)

Nenhuma destas é decisão de ferramenta; todas são de quem conhece o conteúdo.

1. **`handbook/research`** — 8 documentos que ninguém cita há 2 meses. Vira `legacy_docs`, morre com
   lápide em `redirects.json`, ou volta a ser citado por quem deveria?
2. **`handbook/tickets`** — o kanban migrou para issues do GitHub. O que resta em `todo/` ainda é
   backlog vivo, ou é registro do que já foi absorvido?
3. **`handbook/interviews`** — 51 arquivos de uma entrevista fechada. Arquivo histórico (fica como
   está, quieto e legítimo) ou material a consolidar num documento só?
4. **`handbook/api_documentations`** — 2 YAML, 71 dias. É gerado pelo ADR-0027 (contract-first) ou é
   cópia manual que envelhece?

⚠️ **Qualquer remoção passa pelo gate de tombstone**: apagar `.md` citado exige entrada em
[`../redirects.json`](../redirects.json). Isso é a rede de segurança, não um obstáculo — foi
exatamente o que faltou quando `handbook/domain/` evaporou.

---

## 6. O que este inventário não mede

- **Se o conteúdo ainda é verdade.** Alcance e silêncio não dizem se um documento descreve o sistema
  atual. Para isso o instrumento é outro: confrontar afirmação com código, como a spec 040 fez com as
  rules.
- **Arquivos que não são `.md`.** YAML, `.d2`, `.svg` e `.png` ficam de fora da contagem.
- **Qualidade, densidade ou duplicação.** Dois documentos dizendo a mesma coisa aparecem aqui como
  dois documentos citados.
