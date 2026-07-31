# Phase 0 — Research: Aposentadoria da pipeline W0→W3

**Feature**: `038-retire-pipeline-w0w3` · **Data**: 2026-07-30

Este documento resolve as questões em aberto da spec antes do design. Cada decisão traz o que foi
escolhido, por quê, e o que foi rejeitado. Fatos foram medidos no repositório, não presumidos.

---

## R0 — Ancoragem canônica (Princípio IX)

O Princípio IX exige citação literal ≥4 linhas de livro canônico para toda decisão-chave. A decisão
aqui — **aposentar um aparato de processo e deletar seu código** — é ancorada em três fontes.

### Sobre deletar o que não serve mais

> ### 8.2.2 Limpeza de Código
>
> Muitas vezes, sistemas legados têm muito código que não é mais necessário. Logo, esse código deve ser deletado, pois ele atrasa atividades de manutenção ao ocupar espaço mental dos desenvolvedores, que perdem tempo ao achar que o código tem relação com uma mudança que eles planejam implementar. Fazendo uma analogia, assim como um guarda-roupas cheio de peças que não usamos há anos, código também tem muitas linhas que só ocupam espaço e prejudicam o seu entendimento. Então, a seguir, descrevemos alguns tipos de código que podem ser removidos (e que ocorrem com mais intensidade em sistemas legados).
>
> **Código Morto:** Código morto é aquele que não é mais usado nem chamado. Por exemplo, uma função que está implementada, mas nunca é chamada.

— Marco Tulio Valente, _Fundamentos de Manutenção de Software_, §8.2.2 (linha 2951)

**Por que ancora esta decisão:** Valente nomeia exatamente o custo que o Gabriel relatou — não disco,
mas **espaço mental**. A pipeline não apenas ocupa espaço: ela ativamente se apresenta como relevante
em toda sessão, que é a forma mais cara do problema descrito.

### Sobre o odor do que ficou para trás

> ## G9: Código morto
>
> Um código morto é aquele não executado. [...] O problema com códigos mortos é que após um tempo ele começa a "cheirar". Quanto mais antigo ele for, mais forte e desagradável o odor se torna. Isso porque um código morto não é atualizado completamente quando um projeto muda. Ele ainda compila, mas não segue as novas convenções ou regras. Ele foi escrito numa época quando o sistema era diferente. Quando encontrar um código morto, faça a coisa certa. Dê a ele um funeral decente. Exclua-o do sistema.

— Robert C. Martin, _Código Limpo_, p. 280 (linha 10150)

**Por que ancora esta decisão:** "Ele foi escrito numa época quando o sistema era diferente" descreve
a pipeline com precisão — nasceu quando o projeto tinha um módulo e a CLI era a UX; hoje há quatro
Bounded Contexts, borda HTTP e o fluxo spec-kit. O aparato não acompanhou.

### Sobre o que NÃO pode cair junto

> Código limpo que funciona, em uma frase concisa de Ron Jeffries, é o objetivo do Desenvolvimento Guiado por Testes (TDD). [...]
>
> Mas como obtemos código limpo que funciona? Muitas forças nos desviam de código limpo, ou mesmo de código que funciona. Sem pedir conselhos aos nossos medos, aqui está o que fazemos: conduzimos o desenvolvimento com testes automatizados, um estilo de desenvolvimento chamado Desenvolvimento Guiado por Testes (TDD).

— Kent Beck, _TDD: Desenvolvimento Guiado por Testes_, p. 3 (linha 84)

**Por que ancora esta decisão:** Beck define TDD como **"conduzimos o desenvolvimento com testes
automatizados"** — e nada mais. Não há ticket, wave numerada, dashboard de estado nem métrica de
processo na definição. Isso separa cirurgicamente o que morre (o aparato) do que fica (a disciplina),
e sustenta a emenda ao Princípio I proposta em R4.

---

## R1 — Destino do acervo `.claude/.pipeline/`

**Decisão**: mover para `../core-api-pipeline-archive/`, diretório irmão do repositório, fora da
árvore versionada e fora de qualquer worktree. Movimentação por cópia verificada seguida de remoção,
nunca `mv` cego.

**Rationale**: o usuário declarou "joga para fora da pasta, vou mexer nela individualmente depois" —
o requisito é preservação íntegra e saída do caminho, não organização final. Um irmão do repo mantém
o acervo a um `cd ..` de distância, sem risco de ser capturado por `git`, `grep`, `rg` ou pelo
indexador de qualquer ferramenta que opere na raiz do projeto.

**Alternativas rejeitadas**:

- _Branch órfã no próprio repo_ — continuaria no repositório; `git log --all` e buscas cross-branch
  seguiriam alcançando o conteúdo. Não resolve o ruído.
- _Repositório separado com histórico_ — exigiria `git subtree split` ou `filter-repo` sobre 3.429
  arquivos, com custo alto e risco de reescrita. Desproporcional para dado que o usuário quer apenas
  arquivar, e o histórico já está preservado no repo original (R6).
- _Deletar sem preservar_ — contrariado explicitamente pelo usuário.
- _`mv` direto_ — impede verificação de integridade antes da remoção. FR-018 exige contagem
  conferida, o que só é possível com cópia → verificação → remoção.

---

## R2 — Bloqueio `core.bare = true` ⚠️

**Diagnóstico medido** (não presumido):

| Evidência                            | Resultado                                                          |
| ------------------------------------ | ------------------------------------------------------------------ |
| `git rev-parse --is-bare-repository` | `true`                                                             |
| `.git/config:4`                      | `bare = true`                                                      |
| `.git/` é diretório com `index`      | sim — 1.085.553 bytes, mtime 2026-07-29                            |
| `.git/HEAD`                          | `ref: refs/heads/fix/368-deadman-audit-false-fired`                |
| `git --work-tree=. status`           | **funciona** — retorna 19 arquivos                                 |
| `git -c core.bare=false status`      | falha — o override sozinho não basta                               |
| `.git/config.worktree`               | não existe, embora `extensions.worktreeConfig = true` esteja ativo |

**Conclusão**: não é um repositório bare de verdade. É um repositório normal — com índice, HEAD em
branch e árvore populada — carregando uma flag incorreta. Provável resíduo do arranjo de 11 worktrees.

**Decisão**: corrigir com `git config core.bare false` como **primeira task da implementação**,
antes de qualquer outra. É correção de configuração, reversível em um comando, e não altera nem um
byte de conteúdo versionado.

**Rationale**: sem isso, FR-019, FR-021 e FR-023 são inexecutáveis — não há como remover do índice,
commitar por camada nem garantir recuperabilidade. Usar `--work-tree=.` em todo comando é paliativo
frágil: qualquer ferramenta que chame git sem a flag continua falhando, incluindo hooks, o próprio
spec-kit e o CI local.

**Efeito colateral já observado e grave**: a flag vinha **mascarando 19 arquivos modificados**. O
hook `SessionStart` reportou "arquivos modificados=0" e o `git status` de abertura desta sessão disse
"(clean)" — ambos falsos, porque o comando falhava e a saída vazia foi lida como árvore limpa. Este é
o mesmo defeito de classe descrito na Política de Regressão Zero: **falha silenciosa lida como verde**.

**Alternativas rejeitadas**:

- _Conviver com `--work-tree=.`_ — não corrige hooks nem ferramentas de terceiros; propaga o defeito.
- _Ignorar e seguir_ — deixaria a feature sem como cumprir três requisitos.
- _Recriar o clone_ — destrói 11 worktrees ativos com trabalho em andamento. Desproporcional.

**Autorização**: a correção altera configuração do repositório do usuário. Ela está registrada como
task explícita e **requer o OK dele**, não sendo executada de forma implícita por esta feature.

---

## R3 — Trabalho não commitado que colide com a remoção ⚠️

**Descoberta**: revelados pela correção de R2, existem **19 arquivos** em estado sujo, dos quais
**7 são exatamente os alvos da US3**:

```
 M scripts/pipeline/render-state-md.ts      ← será deletado
 M scripts/pipeline/state-cli.ts            ← será deletado
 M scripts/pipeline/state-schema.ts         ← será deletado
 M tests/pipeline/dashboard.test.ts         ← será deletado
 M tests/pipeline/metrics.test.ts           ← será deletado
 M tests/pipeline/render-state-md.test.ts   ← será deletado
 M tests/pipeline/state-cli.test.ts         ← será deletado
```

São modificações do ticket `PIPELINE-STATE-WAVE-OVERRIDE` (W1 GREEN, W2 em round 2/3) — implementação
de `wave-override` que nunca foi commitada. Além disso, `.claude/.pipeline/PIPELINE-STATE-WAVE-OVERRIDE/`
e `handbook/process/` estão **untracked**: nunca entraram no versionamento.

**Decisão**: commitar o trabalho pendente **antes** de iniciar a remoção, em commit próprio e
separado, preservando-o no histórico. Só então executar as camadas.

**Rationale**: deletar arquivo com modificação não commitada perde o trabalho **de forma irrecuperável**
— não há blob no objeto store para voltar. FR-021 e FR-023 prometem reversibilidade; essa promessa é
falsa para conteúdo que nunca foi commitado. Commitar primeiro custa um commit e torna a promessa real.

**Alternativas rejeitadas**:

- _Descartar com `git checkout -- .`_ — destrói trabalho de terceiros sem consentimento.
- _Deletar por cima_ — mesma perda, com a agravante de ser silenciosa.
- _`git stash`_ — o stash é local e não sobrevive a um clone novo; frágil como mecanismo de preservação.

---

## R4 — Emenda ao Princípio I da constituição

**Decisão**: reescrever o Princípio I preservando **teste-antes-de-código** e removendo ticket, waves
numeradas, comandos de estado e o mapeamento RED→YELLOW→GREEN. O Princípio II (regressão zero) fica
**intacto**. A seção "Development Workflow & Quality Gates" perde a linha "Pipeline state" e mantém
o gate de qualidade.

**Rationale**: ancorado em R0/Beck — TDD é conduzir o desenvolvimento com testes automatizados; o
resto era andaime local. O usuário reclamou de contexto e burocracia, nunca de testar. Preservar o
núcleo mantém a rede de segurança sem o custo que motivou a feature.

**Ordem imposta pela própria constituição**: a seção Governance determina que _"alterações de stack ou
de princípio exigem ADR novo (com `supersedes`), não edição aqui"_. Portanto o **ADR vem antes** da
emenda — nunca o contrário. A emenda também sobe a versão da constituição (1.2.0 → **2.0.0**, major,
por remover um princípio marcado NÃO-NEGOCIÁVEL).

**Alternativas rejeitadas**:

- _Apagar o Princípio I e renumerar_ — renumerar quebra todas as referências cruzadas a "Princípio
  IV/VII/IX" espalhadas pelo repo. Reescrever mantendo a posição é mais barato e mais seguro.
- _Manter as waves como "opcional"_ — regra opcional em `.md` não é regra; é ruído que volta a ser
  citado. Ver a lição registrada em `prefer-mechanical-enforcement-over-md-rules`.
- _Editar a constituição sem ADR_ — viola a própria Governance.

---

## R5 — Os 11 worktrees ativos

**Decisão**: não tocar. Cada worktree recebe a remoção quando sua branch integrar a linha principal,
pela via normal do merge.

**Rationale**: os 11 têm trabalho em andamento em branches próprias (`feat/416-…`, `feat/423-…`,
`epic/deno-postgres-migration` etc.). Remover arquivos neles agora produz conflito em todo merge
futuro, sem benefício — eles não afetam o contexto da worktree principal, que é onde o problema dói.

**Alternativas rejeitadas**:

- _Aplicar em todos agora_ — 11 conflitos garantidos, alto risco, zero ganho imediato.
- _Deletar os worktrees_ — descarta trabalho em curso alheio a esta feature.

---

## R6 — ADRs imutáveis que citam a pipeline

**Levantamento**: 7 ADRs mencionam a pipeline. **Nenhum a institui** — todas as menções são
referenciais:

| ADR                            | Natureza da menção                                      | Impacto da remoção          |
| ------------------------------ | ------------------------------------------------------- | --------------------------- |
| `0018`                         | link para `.claude/.pipeline/CTR-ADAPTER-DRIZZLE-DUAL/` | link passa a apontar fora   |
| `0034`                         | link para `.claude/.pipeline/BRUNO-CLI-ADOPT/`          | link passa a apontar fora   |
| `0054`                         | "código-IA passa pela **mesma** Pipeline W0→W3"         | referencia processo extinto |
| `0022`, `0023`, `0042`, `0050` | citam tickets W0→W3 como rastreabilidade histórica      | apenas histórico            |

**Decisão**: **não editar nenhum ADR**. Criar ADR novo — `0055-retire-w0-w3-pipeline.md` — que
registra a aposentadoria e declara explicitamente como ler os anteriores após ela. Registrar em
`handbook/CHANGELOG.md`.

**Rationale**: a hierarquia de regras torna ADR aceito imutável; editar seria a violação mais grave
disponível. Um ADR novo é o mecanismo previsto e deixa a trilha de decisão auditável. Não é
`supersedes` de nenhum ADR — nenhum instituía a pipeline —, e sim um ADR que **reconcilia a leitura**
do `0054` e assume os links quebrados como custo aceito e documentado.

**Alternativas rejeitadas**:

- _Editar `0054` para remover a menção_ — proibido pela hierarquia de regras.
- _Consertar os links de `0018`/`0034`_ — editar ADR aceito; mesmo problema.
- _Nenhum ADR_ — deixaria a Governance descumprida e a emenda da constituição sem base.

---

## R7 — Destino das skills e do agente de roteamento

**Decisão**:

| Artefato                                   | Destino                                 | Motivo                                                                                                                   |
| ------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `.claude/skills/pipeline-maestro/`         | **remover**                             | Existe unicamente para orquestrar as 4 waves. Sem waves, não sobra função.                                               |
| `.claude/skills/ts-quality-checker/`       | **manter**, desvincular de "W3"         | Acionada pelo hook `speckit.verify`, que é `optional: false` no `after_implement`. Remover quebraria o fluxo substituto. |
| `.claude/skills/code-reviewer/`            | **manter**, desvincular de "W2"         | Revisão read-only tem valor independente do ritual; só o rótulo de wave sai.                                             |
| `.claude/agents/contratos-orchestrator.md` | **manter**, podar orquestração de waves | É o ponto de entrada de roteamento para agentes/skills — função que sobrevive à pipeline.                                |

**Rationale**: separar **função** de **rótulo**. O que morre é o vocabulário de wave e a orquestração
de tickets; o que fica é revisão e gate de qualidade, ambos exigidos pelo fluxo spec-kit que substitui
a pipeline. Remover `ts-quality-checker` derrubaria um hook obrigatório — a feature sabotaria seu
próprio substituto.

**Alternativas rejeitadas**:

- _Remover as três skills_ — quebra `speckit.verify` (hook mandatório) e perde revisão.
- _Manter tudo como está_ — deixa vocabulário de wave vivo, e ele voltaria a ser citado.

---

## R8 — Ordem de execução das camadas

**Decisão**: `R2 (core.bare)` → `R3 (commit pendente)` → **US1** → **US2** → **US3** → **US4**, um
commit por etapa.

**Rationale**: a ordem é ditada por risco e por alívio, não por arrumação lógica.

1. **R2 antes de tudo** — sem árvore de trabalho utilizável, nenhuma etapa é commitável.
2. **R3 em seguida** — preserva trabalho que a US3 destruiria irrecuperavelmente.
3. **US1 (hooks) primeiro entre as camadas** — é a dor aguda, é reversível e não destrói nada. Entrega
   alívio imediato mesmo que tudo mais pare aqui.
4. **US2 (doutrina) antes da ferramenta** — se a ferramenta saísse antes, a doutrina remanescente
   apontaria para comandos inexistentes; a janela de inconsistência fica menor nesta ordem.
5. **US3 (código)** — a essa altura nada mais o referencia.
6. **US4 (acervo) por último** — é a única etapa que mexe em dado histórico e exige verificação de
   integridade; deve rodar quando todo o resto já está estável, e o `inject-ticket-context` já morreu
   (US1), então a pasta some sem quebrar automação viva.

**Alternativa rejeitada**: _começar pela CLI_ — foi o pedido literal do usuário, mas o levantamento
mostrou que a CLI é o item de menor impacto sobre a dor relatada (1.503 LOC não consomem contexto).
Começar por ela adiaria o alívio real. A divergência foi apresentada e a priorização, acordada.

---

## Riscos residuais

| Risco                                                   | Probabilidade             | Mitigação                                                                            |
| ------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| Perda de trabalho não commitado                         | **alta** se R3 for pulado | R3 é pré-condição bloqueante da US3                                                  |
| `git config core.bare false` afetar os 11 worktrees     | baixa                     | Worktrees operam com repo não-bare normalmente; validar com `git worktree list` após |
| Links quebrados em ADRs imutáveis                       | **certa**                 | Custo aceito e documentado no ADR-0055 (R6)                                          |
| Assistente continuar propondo waves por memória externa | média                     | Memória `always-full-w0-w3-pipeline` já corrigida em 2026-07-30                      |
| Acervo perdido na movimentação                          | baixa                     | Cópia → verificação por contagem → remoção; nunca `mv` cego (R1)                     |
| Reintrodução acidental de `.claude/.pipeline/`          | média                     | Entrada em `.gitignore` (FR-020)                                                     |
