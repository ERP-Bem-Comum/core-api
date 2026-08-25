# context/ — o que o Claude Code precisa saber

Índice do material que orienta o agente e **não cabe na estrutura canônica do `.claude/`** (que só
reconhece `agents/`, `skills/`, `rules/`, `commands/`, `workflows/` e `settings`).

**Nada daqui carrega sozinho** — nem este índice. É deliberado: um `@import` no `CLAUDE.md` carregaria tudo integralmente no boot, porque a doc é explícita: _"splitting into @path imports helps organization but doesn't reduce context, since imported files load at launch"_. O agente lê o que precisa quando o assunto aparece, ou quando você aponta.

> Para humanos, veja [`docs/`](../docs/). Para documentação de terceiros, [`handbook/reference/`](../handbook/reference/README.md).

## `decisions/` — decisões com escopo de arquivo

Decisões destiladas dos ADRs em formato acionável: diretiva imperativa, `applies_to` por glob, e o
comando que verifica. **Leia quando** editar um path listado no `applies_to` de alguma decisão.

A norma original vive em `handbook/architecture/adr/` e é imutável — aqui ficam as consequências
operacionais, não a narrativa.

## `domain/` — regra de negócio que o código não conta

Invariantes de domínio, vocabulário e decisões de produto que não se derivam lendo `src/`.
**Leia quando** modelar agregado, VO ou evento, ou quando um termo de negócio aparecer sem contexto.

## `playbooks/` — procedimentos executáveis

Sequências de passos para tarefas recorrentes, no formato how-to do [Diátaxis](https://diataxis.fr/how-to-guides/):
ação e apenas ação, sem explicação, sem ensino. **Leia quando** for executar a tarefa que dá nome ao
arquivo.

Se um playbook for usado com frequência, ele deveria ser uma **skill** — `.claude/skills/` carrega por
descrição e é invocável por `/nome`. Playbook aqui é o estágio anterior: procedimento registrado que
ainda não virou fluxo.

## Regras deste diretório

1. **Nada que já esteja enforced mecanicamente.** Se `eslint`, `tsc`, `semgrep`, hook ou teste já
   garantem, não vira texto. A verificação é a documentação.
2. **Nada derivável do código.** Layout de pastas, assinatura de função e lista de dependências o
   agente lê direto de `src/` e do `package.json`.
3. **Nada duplicado do handbook.** Referencie o ADR ou o documento de domínio; não copie.
4. **Diretiva, não prosa.** "MUST usar X. MUST NOT usar Y" em vez de parágrafo explicando a escolha.
5. **Verificável quando possível.** Toda afirmação testável vem com o comando que a testa.
6. **Se for acionável ao editar um path, o lugar é `.claude/rules/`** — lá carrega sozinho por glob.
   `context/` é para o que não tem path próprio ou é grande demais para carregar sempre.

## O que NÃO vive aqui

| Material                          | Onde vai                                           |
| --------------------------------- | -------------------------------------------------- |
| Regra acionável ao editar arquivo | `.claude/rules/<camada>.md` (carrega por `paths:`) |
| Fluxo invocável por `/nome`       | `.claude/skills/<nome>/SKILL.md`                   |
| Documentação para pessoas         | `docs/`                                            |
| Doc de terceiros                  | `handbook/reference/`                              |
| Decisão arquitetural normativa    | `handbook/architecture/adr/` (imutável)            |
| Histórico de tickets e specs      | `specs/`, e o acervo fora do repo                  |
