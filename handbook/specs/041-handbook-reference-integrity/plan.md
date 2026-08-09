# Plano 041 — Integridade referencial do handbook

**Estado:** proposto · **Aberto em:** 2026-08-07 · **Origem:** medição de 2026-08-07 sobre os links do `handbook/`

> Este documento guarda **o porquê e as fases**. O estado de execução **não** vive aqui — vive nos gates
> de cada fase. Plano que registra progresso em prosa apodrece igual ao que ele veio consertar.

---

## 1. O problema, medido

Varredura de 1288 arquivos `.md` do `handbook/`, resolvendo cada link relativo a partir do arquivo que o cita:

| Classe | Qtd | O que é |
| :--- | ---: | :--- |
| **`escapes-repo`** | 3046 | Resolve para fora da raiz do repo — docs de terceiros espelhadas em `reference/`, onde link absoluto do site virou `../../../../en/x`. **Não é defeito nosso** |
| **`mirror`** | 42 | Dentro do repo, citado por `reference/` — material de terceiro |
| **`unaddressed`** | **137** | Citado por material que nós escrevemos. **É o passivo** — 73 alvos distintos, 38 arquivos |

Decomposição do passivo autoral por causa-raiz:

| Classe | Qtd | Causa | Consertável editando? |
| :--- | ---: | :--- | :--- |
| **A** | 46 | Aponta para o aparato expurgado pelas specs 038/039 (`.claude/.pipeline/`, `.specify/`, `scripts/pipeline/`, `AGENTS.md`) | **Não** — [ADR-0057](../../architecture/adr/0057-claude-md-as-canonical-agent-doc.md) §5 é invariante |
| **B** | 59 | `handbook/domain/` deixou de existir; o material foi **reescrito** em `domain_questions/` com outra estrutura | Não mecanicamente: 11 dos 14 alvos não têm correspondente por nome |
| **C** | 18 | Prefixo errado — link relativo à raiz escrito dentro do handbook (`handbook/handbook/…`, `specs/…`, `adr/adr/…`) | Sim, mas **7 vivem dentro de ADR aceito** |
| **D** | 15 | Caso a caso — inquiry renomeada, tickets removidos, `cloud_representation.yaml` |  Caso a caso |

**O defeito estrutural por trás dos quatro:** o caminho do arquivo virou API pública sem nunca ter sido
declarado como tal. Uma citação como `[ADR-0017](./0017-correlation-keys-cross-period-audit.md)` acopla
identidade, localização e título num token só — mudar qualquer um quebra todas as citações. A Oxide, de
quem este repositório importou os estados de RFD, referencia por número (`[rfd5]`) e não tem esta classe
de defeito.

> ⚠️ **Menção não é uso — e este parágrafo é a prova.** A primeira varredura deste plano acusou dois links
> mortos que são **exemplos de sintaxe** escritos para explicar o defeito. O scanner da Fase 0 tem de
> ignorar código inline além dos blocos cercados, senão todo documento que **documenta** a regra vira
> vermelho. Por isso todo exemplo de citação neste plano está em crase.

---

## 2. Invariantes — o que este plano não pode violar

1. **ADR aceito é imutável** (`CLAUDE.md` §Anti-padrões #3). Nenhuma fase edita corpo de ADR fechado.
2. **Registro histórico não se reescreve** (ADR-0057 §5). A classe A é **declarada**, nunca consertada.
3. **Regressão zero.** Gate novo só entra depois que o estoque que ele cobriria está endereçado — gate que
   nasce vermelho obriga a violar (1) ou (2) para ficar verde.
4. **Zero mudança de comportamento em `src/`.** Este plano toca doc, script e teste.

---

## 3. A métrica única

**Link autoral não endereçado** — link relativo, em `.md` do `handbook/` fora de `reference/`, cujo alvo
não existe **e** não está coberto por nenhuma das quatro saídas:

| Saída | Significa |
| :--- | :--- |
| **vivo** | o alvo existe |
| **redirecionado** | há entrada em `handbook/redirects.json` cujo destino existe |
| **histórico** | o alvo casa a allowlist de aparato expurgado (ADR-0057 §5) |
| **lápide** | `redirects.json` o declara morto sem substituto (`to: null` + motivo + data) |

**Baseline 2026-08-07: 137. Após a Fase 3: 46. Meta ao fim da Fase 4: 0.**

> 📌 **Reconciliação do baseline (Fase 0).** A medição manual que abriu este plano contou **138**. A
> ferramenta versionada conta **137**, e a diferença foi medida, não estimada: sem remover código inline
> são 139 (os 138 mais o exemplo de sintaxe que este plano introduziu); removê-lo elimina exatamente
> **duas menções** — o `…` literal do CHANGELOG e o exemplo daqui. **137 é o número correto**; 138
> carregava um falso positivo que sempre foi menção.

Este é o único número que mede o plano. Contagem de links "consertados" não serve: consertar por edição
é proibido em metade dos casos.

---

## 4. Fases

Cada fase é um PR próprio, roda o gate padrão (`typecheck` · `format:check` · `lint` · `test`) e só fecha
com a verificação de sucesso demonstrada por comando.

### Fase 0 — A ferramenta antes da política

**Entrega:** `scripts/handbook/link-scan.ts` — a varredura que hoje vive em scratchpad, versionada como
biblioteca (`scanHandbook()`, mais as funções puras `stripCode`, `extractRelativeLinks` e `classifyLink`)
com CLI por cima. Classifica cada link em `escapes-repo` · `mirror` · `live` · `redirected` · `tombstoned`
· `historical` · `unaddressed`. Script `docs:links` no `package.json`.

**Gate:** nenhum ainda — a CLI relata, não bloqueia. Ligar gate aqui violaria o invariante 3.

**Verificação:** `pnpm run docs:links` reproduz o baseline reconciliado (`137` não endereçados, 3046 `escapes-repo`,
42 `mirror`). Teste em `tests/cleanup/` cobre o **classificador** com fixtures — não o número, que muda.

**Falsifica se:** a classificação escapa/espelho depender de heurística instável. Então o recorte vira
allowlist de diretório explícita.

---

### Fase 1 — H4 · o índice passa a ser gerado de fato

Hoje o `INDEX.md` das inquiries declara *"Gerado a partir do disco. Não editar à mão"* e o
`inquiry-hygiene.test.ts` manda *"regere com o script do README"* — **esse script nunca existiu**. O índice
é mantido à mão fingindo ser derivado, e o teste é a muleta que segura a ficção.

**Entrega:** `scripts/handbook/inquiry-index.ts` gera, do frontmatter:
- `handbook/inquiries/INDEX.md` inteiro;
- a **região gerada** do [`PERGUNTAS-EM-ABERTO.md`](../../inquiries/PERGUNTAS-EM-ABERTO.md) — cabeçalho,
  contagens e tabela de visão geral — entre marcadores `<!-- BEGIN:generated -->` / `<!-- END:generated -->`.
  A prosa de cada bloco (contexto, "por que importa", perguntas) fica **fora** dos marcadores e continua manual.

Hook `PostToolUse` regenera ao escrever qualquer `handbook/inquiries/*.md`. Script `docs:index`.

**Gate:** `pnpm run docs:index --check` falha se o commitado difere do gerado.

**Verificação:** apagar o `INDEX.md`, rodar o gerador, `git diff` vazio. As asserções do
`inquiry-hygiene.test.ts` que cobrem a **parte gerada** são removidas — não se testa o que não se escreve —
e as que cobrem a prosa manual permanecem.

**Falsifica se:** a prosa não se separar limpo do gerado. Então só o `INDEX.md` é gerado, e o checklist
segue manual com o gate atual.

---

### Fase 2 — H3 · tombstone obrigatório

O único item que ataca a **causa**, não o estoque: `handbook/domain/` evaporou num commit levando 59
referências, e nada avisou.

**Entrega:** verificação no `.githooks/pre-commit` — para todo `.md` deletado ou renomeado
(`git diff --cached --diff-filter=DR`), consulta o índice de backlinks da Fase 0. Se alguém cita o arquivo,
o commit é recusado até haver entrada em `redirects.json` (destino novo **ou** `to: null` + motivo).

**Gate:** o próprio hook. Escape de emergência segue sendo `--no-verify`.

**Verificação:** teste que exercita a função de backlinks com fixture — deletar um `.md` citado é recusado;
deletar um `.md` órfão passa; deletar com entrada de redirect passa.

**Falsifica se:** o custo por commit ficar alto (varredura de 1288 arquivos a cada commit). Mitigação:
rodar só quando o diff staged tem deleção/renomeação de `.md`.

---

### Fase 3 — H2 · o "301 do repositório"

**Entrega:** `handbook/redirects.json` — `from` (caminho morto) → `to` (destino, ou `null` para declarado
perdido) + `reason` + `since`. Preenchido para as classes **B** (59) e **D** (15). Resolve sem editar um
único documento histórico: o registro fica intacto e o leitor chega ao destino.

O mapeamento `domain/* → domain_questions/*` exige julgamento de conteúdo (não há correspondência por nome)
e é **a única parte deste plano que não é mecânica**. Casos já conhecidos que vão para `to: null`:
`domain/10-mapeamento-legado-schema.md` — 11 citações, incluindo o "documento mestre" da inquiry 0014,
e não existe em lugar nenhum.

**Gate:** teste que exige — todo `to` não-nulo existe; todo `from` **não** existe (entrada que "curou"
sozinha é lixo); toda entrada tem `reason`.

**Verificação:** `pnpm run docs:links` caiu de **137 → 46** — 71 redirecionadas e 20 lápides. Os 46 restantes são exatamente a classe A, que a Fase 4 declara.

**Falsifica se:** ninguém consultar o mapa e ele virar mais um documento a apodrecer. Mitigado por
construção: quem consulta é o gate, não o humano.

---

### Fase 4 — a allowlist histórica, e o gate ligado

**Entrega:** allowlist dos prefixos de aparato expurgado (`.claude/.pipeline/`, `.claude/.planning/`,
`.specify/`, `scripts/pipeline/`, `AGENTS.md`, `ERP-CONTRACTS/`), **pinada por `deepEqual`** — mesmo molde
do `KNOWN_COLLISIONS` em [`handbook-numbering.test.ts`](../../../tests/cleanup/handbook-numbering.test.ts),
para que a lista não cresça em silêncio. Cada entrada cita o ADR-0057 §5.

**Gate:** `docs:links --check` entra no `pnpm test` como `tests/cleanup/handbook-links.test.ts`, ligado
**por diretório**, na ordem `inquiries/` → `architecture/` → `specs/` → resto. Mesmo desenho incremental do
`claude-md-links.test.ts`.

**Verificação:** 46 → **0** não endereçados; o gate ligou em TODO o handbook de uma vez, sem precisar do faseamento por diretório — o estoque já estava endereçado pela Fase 3.

**Falsifica se:** sobrar caso que não é nem vivo, nem redirecionável, nem histórico. Então falta uma quarta
saída, e ela precisa ser nomeada antes de ligar o gate.

---

### Fase 5 — H1 · citação por identificador

A cura estrutural: `[[adr-0017]]`, `[[inquiry-0011]]`, `[[spec-040]]` em vez de caminho. O ID nunca muda,
então **renomear ou mover deixa de quebrar** — inclusive dentro de ADR imutável, que é onde hoje não há
conserto possível. A sintaxe `[[…]]` já é usada no repositório (memórias de agente, inquiry 0019).

**Entrega:** `scripts/handbook/refs.ts` resolve ID → caminho pelo frontmatter; o gerador emite o link
navegável no GitHub; material novo cita por ID.

**Gate:** todo `[[id]]` resolve. Migração **faseada por diretório**, não big-bang.

**Verificação:** feita por mutação — renomear `0018-auditlog-transversal-todos-bcs.md` **não quebrou**
nenhuma citação `[[inquiry-0018]]`. 124 identificadores registrados; a forma antiga por nome de arquivo
foi normalizada. A migração dos demais diretórios segue faseada.

**Falsifica se:** o markdown do GitHub perder navegabilidade — o `[[id]]` cru não é clicável. Mitigação já
prevista: o gerador emite o link markdown completo a partir do ID; o autor escreve o ID, o disco guarda o
caminho. Autoria por identificador, leitura por caminho.

---

### Fase 6 — H6 · frescor como sinal

Todas as 29 inquiries têm `last_reviewed` no frontmatter e **nada o lê**.

**Entrega:** asserção no `inquiry-hygiene.test.ts` — inquiry `open` ou `blocked` com `last_reviewed` além
da janela **falha**. Janela inicial: 90 dias.

**Gate:** o próprio teste. Falha, não avisa: gate que só avisa é regra em `.md` com passo extra.

**Verificação:** passa hoje (todas revisadas em 2026-08-06) e falha por mutação em dois casos: revisão
vencida e data carimbada no futuro. Em 2026-11-04 as `blocked` acendem — que é exatamente o ponto.

**Falsifica se:** virar ruído que se silencia com um toque no campo. Então o campo precisa de prova
(revisão citada), não de data.

---

## 5. Ordem e dependências

```
F0 ferramenta ──┬──► F2 tombstone (usa backlinks)
                ├──► F3 redirects ──► F4 gate ligado ──► F5 citação por ID
                └──► (F1 é independente — pode ir em paralelo)
                                                        F6 independente
```

**F1 primeiro** por ser barata e por corrigir uma afirmação falsa em documento vigente. **F4 nunca antes
de F3** — ligar o gate com 137 em aberto força a violar o ADR-0057 §5 para ficar verde.

| Fase | Não endereçados ao fim | Custo |
| :--- | ---: | :--- |
| F0 | 137 (só torna medível) | baixo |
| F1 | 137 (não mexe em link) | baixo |
| F2 | 137 (impede novos) | baixo |
| F3 | 46 | **médio — exige julgamento de conteúdo** |
| F4 | **0** | baixo |
| F5 | 0, e estruturalmente impossível voltar | médio, faseado |
| F6 | — | quase zero |

---

## 6. Fora de escopo

- **H7 — alinhar a política de emenda à da Oxide** (distinguir corpo normativo imutável de aparato de
  referência emendável). É a hipótese mais cara politicamente, mexe num invariante, e **F5 entrega o mesmo
  resultado sem tocar na imutabilidade**. Fica registrada, não executada.
- **As 3046 de `escapes-repo` e as 42 de `mirror`.** Espelho de terceiro se reespelha, não se edita.
- **Recriar `domain/10-mapeamento-legado-schema.md`.** É chamada de produto: recriar, remover a citação ou
  declarar perdido. A F3 só exige que a escolha seja **declarada**.

---

## 7. Registro

Cada fase entregue ganha entrada no [`CHANGELOG.md`](../../CHANGELOG.md). Se alguma fase produzir decisão
estrutural — o formato do `redirects.json`, a sintaxe de citação por ID — ela vira ADR próprio, não um
parágrafo aqui.
