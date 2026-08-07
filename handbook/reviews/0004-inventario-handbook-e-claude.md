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

## 2. O retrato (2026-08-07, **corrigido** — ver §2.1)

| diretório | arqs | linhas | órfãos | citado | quieto |
| :--- | ---: | ---: | ---: | ---: | ---: |
| `handbook/reference` | 688 | 514.022 | 3 | 79 | 4d |
| `handbook/specs` | 329 | 34.473 | 188 | 10 | 0d |
| `.claude/skills` | 106 | 12.503 | 3 | 37 | 1d |
| `handbook/architecture` | 66 | 8.665 | **0** | **117** | 1d |
| `handbook/interviews` | 51 | 8.392 | 2 | 3 | 80d |
| `handbook/inquiries` | 33 | 5.878 | **0** | 30 | 0d |
| `handbook/tickets` | 33 | 2.110 | **1** | 2 | 53d |
| `.claude/agent-memory` | 25 | 516 | 7 | **0** | 1d |
| `handbook/domain_questions` | 22 | 3.243 | 0 | 37 | 23d |
| `.claude/rules` | 16 | 571 | 4 | 24 | 0d |
| `.claude/agents` | 14 | 3.727 | 0 | 18 | 1d |
| `handbook/infrastructure` | 13 | 2.583 | 5 | 8 | 4d |
| `handbook/research` | 5 | 2.571 | **0** | 4 | 58d |
| `handbook/reviews` | 4 | 846 | 1 | 4 | 0d |
| `handbook/incidents` | 3 | 444 | 1 | 4 | 1d |
| `handbook/operations` | 3 | 575 | 2 | 4 | 58d |
| `handbook/legacy_docs` | 2 | 570 | 1 | **0** | 67d |
| `handbook/po-feedback` | 2 | 249 | 1 | 2 | 62d |
| `handbook/runbooks` | 2 | 276 | 1 | **0** | 30d |
| `handbook/process` | 1 | 1.227 | 0 | 4 | 4d |
| `handbook/api_documentations` | 0 | 0 | 0 | 0 | 71d |
| **TOTAL** | **1.418** | **603.508** | **227** | | |

### 2.1 Errata — a primeira medição estava errada, e o erro era da ferramenta

A versão original deste retrato contava **639 órfãos**; são **227**. A diferença não foi mudança no
repositório: foi defeito na métrica, descoberto ao aplicá-la pela primeira vez — em `handbook/research`,
que aparecia com **8 órfãos e zero citadores** e é a **fonte canônica declarada de quatro specs entregues**.
Seguir aquele número teria arquivado material vivo.

Três causas, todas corrigidas e agora cobertas por teste em `tests/scripts/inventory.test.ts`:

| Causa | Efeito |
| :--- | :--- |
| Só link markdown contava | 4 das 6 citações ao `research` estão **em crase**, e o extrator as descartava — a regra "menção não é uso", certa para o tombstone, é **errada** para medir alcance |
| Redirects não eram resolvidos | citação escrita com prefixo errado aponta para caminho inexistente, mas **referencia documento vivo** |
| Referência a diretório não creditava o conteúdo | a spec 005 declara como insumo a **pasta** `…/gestao_de_usuarios`; os dois arquivos dentro apareciam sem citador |

> ⚠️ **Duas perguntas diferentes, e confundi-las foi o erro de origem.** O tombstone pergunta *"alguém
> quebra se eu apagar?"* — só link clicável quebra. O inventário pergunta *"alguém referencia isto?"* —
> menção em prosa referencia. `buildBacklinks` seguiu como estava; `buildReferences` nasceu ao lado.

**A calibragem tem limite declarado.** Creditar diretório de **topo** foi tentado e revertido: fazia
este próprio review — que lista todos os diretórios numa tabela — "citar" os 1.418 arquivos e zerar os
órfãos do repositório inteiro. Hoje só diretório com **dois segmentos abaixo da raiz** credita conteúdo.
É heurística, não verdade: serve para **priorizar leitura**, nunca para decidir remoção sozinha.

---

## 3. Como NÃO ler estes números

Três armadilhas, todas verificadas antes de escrever este documento:

- **`.claude/rules` com 4 "órfãs" segue sendo falso positivo.** Rule carrega por `paths:`, não por
  citação — nenhuma precisa ser linkada para funcionar. As 16 têm `paths:` preenchido e são cobradas
  por `rules-self-verify.test.ts`. Aqui, órfão significa apenas "não citada em prosa".
- **`handbook/api_documentations` não está vazio.** Tem 2 arquivos versionados (`openapi.yaml`,
  `doc.yaml`); o inventário conta só `.md`. Diretório sem markdown ≠ diretório morto.
- **Órfão não é condenado.** `handbook/specs` tem 188 órfãos e é **histórico de especificação por
  desenho** — o `CLAUDE.md` diz isso. Documento que ninguém cita pode ser exatamente o registro que
  se consulta uma vez por ano.
- **Zero órfão também engana.** `handbook/reference` aparece com 0, mas é porque uma menção a
  `handbook/reference/<tech>` credita a árvore inteira daquela tecnologia. O número diz "alguém
  apontou para este conjunto", não "cada arquivo tem leitor".

---

## 4. O que o retrato mostra

**O volume não é o passivo.** `handbook/reference` sozinho é **85% das linhas** do handbook — e é
material de terceiro espelhado (Node, Drizzle, Fastify, MySQL). Não se edita, se reespelha. Tirá-lo
da conta muda a escala do problema: o material **autoral** são ~730 arquivos, não 1.418.

**Dois diretórios estão claramente vivos e saudáveis:** `handbook/architecture` (66 arquivos, **zero
órfãos**, citado por **117** documentos — é o centro de gravidade real do repositório) e
`handbook/inquiries` (zero órfãos, citado por 30, tocado hoje).

**Os candidatos a decisão explícita, depois da correção da métrica:**

| diretório | sinal | leitura |
| :--- | :--- | :--- |
| `handbook/research` | 5 arquivos, **0 órfãos**, 4 citadores, 58d | ✅ **resolvido** — `feture_propose/` é fonte canônica de 4 specs entregues e **ficou**; os 3 cookbooks de terceiro foram para `reference/ia-tooling/` |
| `handbook/tickets` | 33 arquivos, **1 órfão**, 53d | ✅ **resolvido** — os 14 cards de `todo/` descreviam trabalho concluído; `todo/` foi absorvido por `done/` e o README declara o handoff encerrado |
| `handbook/interviews` | 51 arquivos, 2 órfãos, 80d | o mais silencioso, mas quase tudo é citado — arquivo histórico legítimo |
| `handbook/legacy_docs` · `runbooks` | 2 arquivos cada, **zero citadores** | os únicos com alcance realmente nulo |

**`.claude/` está saudável.** `skills` (106 arquivos, 3 órfãos, citado por 37), `agents` (14, **zero
órfãos**, citado por 18) e `rules` (16, todas com `paths:`) são material vivo e recém-tocado. O único
ponto de atenção é `agent-memory`: 25 arquivos, **zero citadores** — e é local por desenho, não
versionado como conhecimento compartilhado.

---

## 5. O que decidir (nesta ordem)

Nenhuma destas é decisão de ferramenta; todas são de quem conhece o conteúdo.

1. ✅ **`handbook/research` — RESOLVIDO em 2026-08-07.** A leitura desfez a suspeita: `feture_propose/`
   é fonte canônica de 4 specs entregues e **ficou**. Os 3 cookbooks de terceiro (4.256 linhas, 62% do
   diretório) foram para `reference/ia-tooling/`, com entrada em `redirects.json`. O diretório passou a
   ter **5 arquivos e zero órfãos** — material autoral, todo referenciado.
2. ✅ **`handbook/tickets` — RESOLVIDO em 2026-08-07.** A triagem confrontou os 14 cards de `todo/` contra
   a borda HTTP: **todos descreviam trabalho concluído**. `todo/` foi absorvido por `done/`, o README passou
   a declarar o diretório como arquivo de handoff encerrado, e o único tema vivo (auto-expire em estado
   `Pendente`) já tinha issue própria — a #426.
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
