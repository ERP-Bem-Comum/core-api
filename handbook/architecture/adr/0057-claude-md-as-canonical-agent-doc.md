# ADR-0057: `CLAUDE.md` como doc canônica de agente — aposentadoria do `AGENTS.md` e errata das referências

- **Status:** Accepted
- **Date:** 2026-08-03
- **Deciders:** Tech Lead (Gabriel — decisão do dono do repo, 2026-08-03)
- **Complementa:** [ADR-0040](./0040-agent-findings-as-github-issues.md) e [ADR-0054](./0054-ai-assisted-contribution-policy.md) (ambos citam o `AGENTS.md` pelo nome — ver §4, Errata) · [ADR-0037](./0037-http-first-retire-embedded-cli.md) (idem)
- **Contexto de origem:** auditoria do harness em `context/HARNESS-AUDIT-2026-07-31.md` e inventário de decisões em `context/decisions/`

## Contexto

O `AGENTS.md` foi criado para ser **padrão aberto multi-ferramenta**: um arquivo que qualquer agente de IA leria, com o `CLAUDE.md` reduzido a um stub de 14 linhas contendo `@AGENTS.md`. A premissa era que mais de uma ferramenta consumiria o repositório.

Essa premissa caiu em **2026-07-31**, quando o dono do repo decidiu que **o Claude Code é o único agente suportado** — decisão já materializada na remoção de `.zed/` e `.agents/` (commit `722b0371`). Sem uma segunda ferramenta, a indireção passou a custar sem pagar: dois arquivos para uma verdade, e a doc canônica fora do arquivo que a ferramenta efetivamente lê.

O custo não foi só estrutural. A auditoria de 2026-07-31 e a verificação desta decisão encontraram no `AGENTS.md`:

| Afirmação | Realidade |
| --------- | --------- |
| "Fase 1 entrega apenas o **módulo Contratos**" | 8 módulos em `src/modules/` |
| "CLI como UX primária (**nenhum servidor HTTP ainda**)" | contradiz o próprio documento cinco linhas abaixo, que lista Fastify como ativo (ADR-0025/0037) |
| `ADR-0012` no topo da seção `IMPORTANTE` | superseded pelo [ADR-0029](./0029-pnpm-11-supply-chain-defaults.md) |
| tabela de roteamento com 25 skills | 44 em disco |
| `.claude/output-styles/erp-contracts.md`, `handbook/domain/` | não existem |

Nenhuma dessas é erro de redação: todas são a mesma causa — **documento normativo sem mecanismo que o confronte com o repositório**. É o mesmo diagnóstico que a spec 040 aplica às `.claude/rules/`.

## Decisão

### 1. O `CLAUDE.md` é a doc canônica — invariante

O contexto canônico do repositório **MUST** viver em `CLAUDE.md`, na raiz. O `AGENTS.md` está **deletado** e **MUST NOT** ser recriado enquanto o Claude Code for o único agente suportado.

### 2. O que sai do texto, e por quê — invariante

Conteúdo que já é garantido por mecanismo **MUST NOT** ser duplicado na doc canônica. Aplicado nesta decisão:

| Removido | Mecanismo que já garante |
| -------- | ------------------------ |
| Tabelas de roteamento de agentes e skills | descoberta nativa do Claude Code em `.claude/agents/` e `.claude/skills/`, com descrição de uso em cada um |
| §"Regras invariantes — sintaxe TS" (`import type`, extensão `.ts`, subpath `#src/*`, strict) | `tsconfig.json` — `verbatimModuleSyntax`, `allowImportingTsExtensions`, `NodeNext`, `strict` e mais cinco flags; `tsc` barra cada regra que o texto pedia |
| "não rode `npm`" | hook `PreToolUse(Bash)` → `block-npm.sh` |

**Permanece** o anti-padrão de **escrever** `npm` em doc, PR ou comentário: o hook barra a execução, não o texto.

### 3. Toda referência de caminho na doc canônica é verificada — invariante

O `CLAUDE.md` **MUST** ter todo caminho relativo que cita existente no disco, cobrado por `tests/cleanup/claude-md-links.test.ts` no gate. As CAs de doc canônica em `tests/cleanup/docs-update.test.ts` **MUST** apontar para o `CLAUDE.md`.

Este item é a razão de a decisão não ser cosmética: a **proposta** que serviu de base a esta substituição (`context/CLAUDE-md-proposta.md`) nasceu com três caminhos mortos. Trocar um documento não-verificado por outro não-verificado apenas reiniciaria o relógio do apodrecimento.

### 4. Errata — como ler as referências ao `AGENTS.md` em ADR aceito

ADR aceito é **imutável** (ver §"Hierarquia de fontes" do `CLAUDE.md`), então os documentos abaixo **não foram editados**. Esta seção é a errata canônica:

| Onde | Como ler |
| ---- | -------- |
| [ADR-0037](./0037-http-first-retire-embedded-cli.md) `:23`, `:49` | `AGENTS.md` → `CLAUDE.md` |
| [ADR-0040](./0040-agent-findings-as-github-issues.md) `:31`, `:65`, `:104` | `AGENTS.md` → `CLAUDE.md`; **e `§Anti-padrões #15` → `§Anti-padrões #7`** (a lista foi reordenada ao perder os itens que viraram mecanismo) |
| [ADR-0054](./0054-ai-assisted-contribution-policy.md) `:6`, `:12`, `:90` | `AGENTS.md` → `CLAUDE.md` |

**O conteúdo normativo dos três permanece integralmente vigente.** Muda o endereço, não a norma.

### 5. Registro histórico não se reescreve — invariante

Referências ao `AGENTS.md` em `.claude/.pipeline/`, `specs/`, `handbook/` e nas **evidências ancoradas** de `context/decisions/` (formato `AGENTS.md:209`) **MUST NOT** ser atualizadas: são registro do que era verdade na data em que foram escritas. Reescrever `AGENTS.md:209` para `CLAUDE.md:209` produziria âncora **falsa**, porque a numeração de linha mudou.

Já os **ponteiros vivos** — `prior_art.applied_to` e `enforced_by` — **MUST** apontar para o artefato atual; foram atualizados no ADR-0040 e no ADR-0054 e são cobrados por `tests/decisions/decision-records.test.ts`.

> Preservado também `handbook/reference/mysql2/AGENTS.md`: é documentação vendored do driver, arquivo distinto e sem relação com esta decisão.

## Consequências

**Positivas.** Uma fonte em vez de duas, sem indireção. 256 linhas (242 + 14 de stub) passam a 110, sem perda de norma — o corte é de duplicação e de afirmação falsa. A doc canônica passa a ter gate próprio, o que nenhuma versão anterior teve.

**Negativas, declaradas.** (1) Três ADRs aceitos citam um arquivo inexistente, e a errata acima é a única mitigação possível sem ferir a imutabilidade — quem ler o ADR-0040 isolado ainda encontrará "#15". (2) Uma ferramenta de IA que não seja o Claude Code perde o ponto de entrada convencionado; reintroduzi-lo exige reabrir esta decisão (ver gatilho). (3) O nome `CLAUDE.md` acopla a doc canônica a um fornecedor — custo aceito conscientemente, porque a alternativa era manter dois arquivos para uma verdade.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
| ----------- | --------------------- |
| **Manter o `AGENTS.md` e corrigir só as linhas falsas** | Trata o sintoma. As falsas nasceram da ausência de mecanismo, não de desatenção — e a indireção seguiria custando sem uma segunda ferramenta para pagá-la |
| **Manter os dois, sincronizados** | A mesma verdade em dois lugares é a fábrica de drift diagnosticada no [ADR-0040](./0040-agent-findings-as-github-issues.md). Já havia divergido (25 skills × 44) |
| **Editar os três ADRs para corrigir a referência** | Fere a imutabilidade de ADR aceito. A errata em §4 é a saída que o processo do repo prevê |

## Gatilho de reavaliação

Esta decisão **MUST** ser reaberta por um ADR que a supersede se **qualquer uma** destas condições ocorrer:

1. Uma segunda ferramenta de IA passar a ser **oficialmente suportada** pelo repositório — o que restaura a premissa original do padrão aberto;
2. O Claude Code passar a ler um arquivo canônico de outro nome, tornando `CLAUDE.md` obsoleto por mudança de fornecedor.

**Critério de saída explícito:** enquanto nenhuma das duas ocorrer, a ausência do `AGENTS.md` é o estado correto e não deve ser "consertada" por quem encontrar as referências históricas a ele.
