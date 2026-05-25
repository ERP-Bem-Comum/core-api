# 🤖 Claude Code Reference

Documentação espelho da [doc oficial do Claude Code](https://code.claude.com/docs/en/overview), copiada offline para servir como source of truth do projeto sobre a CLI / Agent SDK / IDE integrations que rodam em cima do projeto.

A doc cobre 4 superfícies do produto:

- **Terminal CLI** (`claude`) — UX primária do projeto hoje, invocada como `pnpm run cli:contracts -- ...` e como executor do pipeline W0→W3.
- **VS Code / JetBrains** (extensões) — usadas pelo time durante desenvolvimento.
- **Desktop app + Web** (`claude.ai/code`) — sessions remotas, scheduled routines.
- **Agent SDK** — biblioteca para construir agentes customizados em cima do mesmo engine que a CLI usa.

---

## Arquivos nesta pasta (137 `.md` + 1 índice)

### 📌 Início rápido

| Arquivo | Cobre |
| :--- | :--- |
| [`overview.md`](./overview.md) | Visão geral do produto + matriz de instalação por surface |
| [`quickstart.md`](./quickstart.md) | Primeira sessão real — explorar codebase, fazer commit, abrir PR |
| [`setup.md`](./setup.md) | Instalação detalhada (Homebrew, WinGet, apt/dnf/apk, troubleshooting) |
| [`features-overview.md`](./features-overview.md) | Tour de features por categoria |
| [`how-claude-code-works.md`](./how-claude-code-works.md) | Modelo mental de como o agente opera |
| [`glossary.md`](./glossary.md) | Glossário oficial |
| [`changelog.md`](./changelog.md) | **336 KB** — histórico completo de releases |
| [`whats-new/index.md`](./whats-new/index.md) + 8 weekly notes | Highlights semanais (W13–W20 2026) |

### 🛠️ CLI — UX primária

| Arquivo | Cobre |
| :--- | :--- |
| [`cli-reference.md`](./cli-reference.md) | Referência completa de comandos e flags |
| [`interactive-mode.md`](./interactive-mode.md) | Modo interativo (REPL) |
| [`headless.md`](./headless.md) | `-p` / pipe mode para CI e scripts |
| [`commands.md`](./commands.md) | Built-in slash-commands |
| [`keybindings.md`](./keybindings.md) | Configuração de keyboard shortcuts |
| [`fullscreen.md`](./fullscreen.md) | Modo fullscreen |
| [`terminal-config.md`](./terminal-config.md) | Tuning do terminal hospedeiro |
| [`voice-dictation.md`](./voice-dictation.md) | Entrada por voz |
| [`statusline.md`](./statusline.md) | Customizar barra de status |
| [`fast-mode.md`](./fast-mode.md) | Modo rápido (Opus com output otimizado) |
| [`auto-mode-config.md`](./auto-mode-config.md) | Configuração do "auto mode" (no-ask) |

### 🧠 Memória, contexto, sessões

| Arquivo | Cobre |
| :--- | :--- |
| [`memory.md`](./memory.md) | `CLAUDE.md` + auto memory + memory file format |
| [`context-window.md`](./context-window.md) | Limites de janela + compaction |
| [`prompt-caching.md`](./prompt-caching.md) | Como caching funciona, TTL de 5 min |
| [`sessions.md`](./sessions.md) | Lifecycle de sessions |
| [`checkpointing.md`](./checkpointing.md) | Checkpoints automáticos (rollback de file edits) |
| [`output-styles.md`](./output-styles.md) | Estilos de output do agente |
| [`model-config.md`](./model-config.md) | Escolha e config de modelo |

### 🔌 Skills, hooks, sub-agents, plugins, MCP

| Arquivo | Cobre |
| :--- | :--- |
| [`skills.md`](./skills.md) | **Slash-commands customizados** — formato canônico usado em `.claude/skills/` |
| [`hooks.md`](./hooks.md) | **188 KB** — `PreToolUse`, `PostToolUse`, `Stop`, etc. usados em `.claude/hooks/` |
| [`hooks-guide.md`](./hooks-guide.md) | Guia prático |
| [`sub-agents.md`](./sub-agents.md) | Como agentes especialistas funcionam — formato `.claude/agents/*.md` |
| [`agents.md`](./agents.md) | Agentes built-in |
| [`agent-teams.md`](./agent-teams.md) | Coordenação de múltiplos agentes |
| [`agent-view.md`](./agent-view.md) | Painel multi-sessão (background agents) |
| [`plugins.md`](./plugins.md) | Plugin system |
| [`plugins-reference.md`](./plugins-reference.md) | Referência do plugin format |
| [`plugin-dependencies.md`](./plugin-dependencies.md) | Dependências entre plugins |
| [`plugin-hints.md`](./plugin-hints.md) | Hints que plugins podem expor |
| [`plugin-marketplaces.md`](./plugin-marketplaces.md) | Marketplaces de plugins |
| [`discover-plugins.md`](./discover-plugins.md) | Como descobrir plugins instalados |
| [`commands.md`](./commands.md) | (slash-commands — também em "CLI") |

### 🤖 Agent SDK (subpasta `agent-sdk/`)

| Arquivo | Cobre |
| :--- | :--- |
| [`agent-sdk/overview.md`](./agent-sdk/overview.md) | Visão geral do SDK |
| [`agent-sdk/quickstart.md`](./agent-sdk/quickstart.md) | Primeira agent em < 5 min |
| [`agent-sdk/typescript.md`](./agent-sdk/typescript.md) | **156 KB** — Bindings TS canônicos |
| [`agent-sdk/typescript-v2-preview.md`](./agent-sdk/typescript-v2-preview.md) | Preview da v2 (breaking changes futuras) |
| [`agent-sdk/python.md`](./agent-sdk/python.md) | **156 KB** — Bindings Python |
| [`agent-sdk/migration-guide.md`](./agent-sdk/migration-guide.md) | Migração entre versões |
| [`agent-sdk/agent-loop.md`](./agent-sdk/agent-loop.md) | Modelo de execução do loop do agente |
| [`agent-sdk/sessions.md`](./agent-sdk/sessions.md), [`session-storage.md`](./agent-sdk/session-storage.md) | Persistência de sessão |
| [`agent-sdk/streaming-output.md`](./agent-sdk/streaming-output.md), [`streaming-vs-single-mode.md`](./agent-sdk/streaming-vs-single-mode.md) | Modos de output |
| [`agent-sdk/user-input.md`](./agent-sdk/user-input.md) | Como o SDK recebe input |
| [`agent-sdk/structured-outputs.md`](./agent-sdk/structured-outputs.md) | JSON schema enforcement |
| [`agent-sdk/tool-search.md`](./agent-sdk/tool-search.md) | Deferred tool loading |
| [`agent-sdk/custom-tools.md`](./agent-sdk/custom-tools.md) | Criar custom tools |
| [`agent-sdk/subagents.md`](./agent-sdk/subagents.md) | Spawn de subagents via SDK |
| [`agent-sdk/skills.md`](./agent-sdk/skills.md), [`slash-commands.md`](./agent-sdk/slash-commands.md), [`hooks.md`](./agent-sdk/hooks.md), [`plugins.md`](./agent-sdk/plugins.md) | Skills/commands/hooks/plugins via SDK |
| [`agent-sdk/mcp.md`](./agent-sdk/mcp.md) | MCP integration |
| [`agent-sdk/permissions.md`](./agent-sdk/permissions.md) | Permission model do SDK |
| [`agent-sdk/modifying-system-prompts.md`](./agent-sdk/modifying-system-prompts.md) | Custom system prompts |
| [`agent-sdk/claude-code-features.md`](./agent-sdk/claude-code-features.md) | Features expostas pela SDK |
| [`agent-sdk/file-checkpointing.md`](./agent-sdk/file-checkpointing.md) | Checkpoints de arquivo |
| [`agent-sdk/todo-tracking.md`](./agent-sdk/todo-tracking.md) | Task tracking via SDK |
| [`agent-sdk/observability.md`](./agent-sdk/observability.md), [`cost-tracking.md`](./agent-sdk/cost-tracking.md) | Telemetria + custos |
| [`agent-sdk/hosting.md`](./agent-sdk/hosting.md), [`secure-deployment.md`](./agent-sdk/secure-deployment.md) | Deploy em produção |

### 🔧 Settings, permissões, segurança, sandboxing

| Arquivo | Cobre |
| :--- | :--- |
| [`settings.md`](./settings.md) | `.claude/settings.json` — formato completo |
| [`server-managed-settings.md`](./server-managed-settings.md) | Configs gerenciadas pelo lado servidor (enterprise) |
| [`permissions.md`](./permissions.md) | Sistema de permissões (allow/deny lists) |
| [`permission-modes.md`](./permission-modes.md) | `default`, `acceptEdits`, `plan`, `bypassPermissions` |
| [`sandboxing.md`](./sandboxing.md) | Sandbox de execução |
| [`security.md`](./security.md) | Modelo de segurança |
| [`authentication.md`](./authentication.md) | Login, API keys, OIDC |
| [`zero-data-retention.md`](./zero-data-retention.md) | ZDR para enterprise |
| [`legal-and-compliance.md`](./legal-and-compliance.md) | Licença + compliance |
| [`data-usage.md`](./data-usage.md) | O que sai do seu disco |
| [`env-vars.md`](./env-vars.md) | **176 KB** — variáveis de ambiente reconhecidas |
| [`network-config.md`](./network-config.md) | Proxy, allowlist de hosts |
| [`debug-your-config.md`](./debug-your-config.md) | Diagnóstico de config |
| [`claude-directory.md`](./claude-directory.md) | Layout de `~/.claude/` e `.claude/` |

### 🛠️ Tools, comandos, workflows

| Arquivo | Cobre |
| :--- | :--- |
| [`tools-reference.md`](./tools-reference.md) | Tools built-in (`Bash`, `Read`, `Edit`, `Write`, `Grep`, etc) |
| [`common-workflows.md`](./common-workflows.md) | Padrões recorrentes (TDD, refactor, bug-fix) |
| [`best-practices.md`](./best-practices.md) | Práticas recomendadas |
| [`worktrees.md`](./worktrees.md) | Git worktrees para isolation de Agent |
| [`computer-use.md`](./computer-use.md) | Computer use (UI automation) |
| [`prompt-library.md`](./prompt-library.md) | Biblioteca de prompts |

### 🔗 MCP, integrações externas, CI/CD

| Arquivo | Cobre |
| :--- | :--- |
| [`third-party-integrations.md`](./third-party-integrations.md) | Anthropic, AWS Bedrock, Vertex AI |
| [`amazon-bedrock.md`](./amazon-bedrock.md), [`google-vertex-ai.md`](./google-vertex-ai.md), [`microsoft-foundry.md`](./microsoft-foundry.md) | Configuração por provider |
| [`llm-gateway.md`](./llm-gateway.md) | Anthropic LLM gateway (corporate proxy) |
| [`claude-platform-on-aws.md`](./claude-platform-on-aws.md) | Claude no AWS Marketplace |
| [`github-actions.md`](./github-actions.md) | CI: review/triage automático |
| [`github-enterprise-server.md`](./github-enterprise-server.md) | GHE self-hosted |
| [`gitlab-ci-cd.md`](./gitlab-ci-cd.md) | CI no GitLab |
| [`code-review.md`](./code-review.md) | Code review automático no GitHub |
| [`slack.md`](./slack.md) | Integração Slack (@Claude → PR) |
| [`channels.md`](./channels.md), [`channels-reference.md`](./channels-reference.md) | Channels para webhooks externos |
| [`chrome.md`](./chrome.md) | Chrome DevTools + browser automation |
| [`devcontainer.md`](./devcontainer.md) | Dev Containers + GitHub Codespaces |

### 🖥️ IDE integrations

| Arquivo | Cobre |
| :--- | :--- |
| [`vs-code.md`](./vs-code.md) | Extensão VS Code (inline diffs, @-mentions, plan review) |
| [`jetbrains.md`](./jetbrains.md) | Plugin JetBrains (IntelliJ/PyCharm/WebStorm) |

### 💻 Desktop + Web + Mobile

| Arquivo | Cobre |
| :--- | :--- |
| [`desktop.md`](./desktop.md) | App desktop standalone |
| [`desktop-quickstart.md`](./desktop-quickstart.md) | Primeira sessão no desktop |
| [`desktop-scheduled-tasks.md`](./desktop-scheduled-tasks.md) | Tasks recorrentes locais |
| [`desktop-changelog.md`](./desktop-changelog.md) | Changelog específico do desktop |
| [`claude-code-on-the-web.md`](./claude-code-on-the-web.md) | `claude.ai/code` |
| [`web-quickstart.md`](./web-quickstart.md) | Quickstart web |
| [`remote-control.md`](./remote-control.md) | Controle remoto (mobile → sessão local) |
| [`platforms.md`](./platforms.md) | Matriz de plataformas |

### ⏰ Scheduled tasks, routines

| Arquivo | Cobre |
| :--- | :--- |
| [`routines.md`](./routines.md) | Routines (cron remoto, infra Anthropic) |
| [`scheduled-tasks.md`](./scheduled-tasks.md) | `/loop` — polling dentro de sessão CLI |

### 🚀 Operacional + admin + analytics

| Arquivo | Cobre |
| :--- | :--- |
| [`admin-setup.md`](./admin-setup.md) | Setup de admin enterprise |
| [`analytics.md`](./analytics.md) | Painel de analytics |
| [`monitoring-usage.md`](./monitoring-usage.md) | Monitorar uso |
| [`costs.md`](./costs.md) | Modelo de cobrança |
| [`champion-kit.md`](./champion-kit.md) | Kit para "champion" interno (adoção corporativa) |
| [`communications-kit.md`](./communications-kit.md) | Kit de comunicação para adoção |
| [`ultraplan.md`](./ultraplan.md), [`ultrareview.md`](./ultrareview.md) | Modos premium (multi-agent planning/review) |
| [`deep-links.md`](./deep-links.md) | Deep links cross-surface |
| [`goal.md`](./goal.md) | Conceito de "goal" |

### 🐛 Troubleshooting

| Arquivo | Cobre |
| :--- | :--- |
| [`troubleshoot-install.md`](./troubleshoot-install.md) | Problemas de instalação |
| [`troubleshooting.md`](./troubleshooting.md) | Problemas em runtime |
| [`errors.md`](./errors.md) | Códigos de erro |

### 📰 What's new (weekly notes)

| Arquivo | Cobre |
| :--- | :--- |
| [`whats-new/index.md`](./whats-new/index.md) | Índice geral |
| [`whats-new/2026-w13.md`](./whats-new/2026-w13.md) ... [`2026-w20.md`](./whats-new/2026-w20.md) | Notas semanais |

### 🗂️ Índice canônico do site

| Arquivo | Cobre |
| :--- | :--- |
| [`llms.txt`](./llms.txt) | Índice oficial usado pela própria doc (`https://code.claude.com/docs/llms.txt`) — útil pra refazer o snapshot |

---

## Como o projeto consome esta reference

| Onde | Para quê |
| :--- | :--- |
| [`../../../CLAUDE.md`](../../../CLAUDE.md) | Regras invariantes lidas a cada sessão do agente — formato definido em [`memory.md`](./memory.md) |
| [`../../../.claude/skills/`](../../../.claude/skills/) | 19 skills do projeto — formato definido em [`skills.md`](./skills.md) |
| [`../../../.claude/agents/`](../../../.claude/agents/) | `contratos-orchestrator` + 9 especialistas em tecnologia — formato em [`sub-agents.md`](./sub-agents.md) |
| [`../../../.claude/hooks/`](../../../.claude/hooks/) | `pre-commit-typecheck.sh` — formato em [`hooks.md`](./hooks.md) |
| [`../../../.claude/settings.json`](../../../.claude/settings.json) | Settings do agente — formato em [`settings.md`](./settings.md) + [`permissions.md`](./permissions.md) |
| [`../../../.claude/.pipeline/`](../../../.claude/.pipeline/) | Trail de tickets W0→W3 — formato livre do projeto, inspirado em práticas de [`common-workflows.md`](./common-workflows.md) |

---

## Quando consultar

- Antes de **criar/editar uma skill** (`.claude/skills/<skill>/SKILL.md`) — confirmar formato em [`skills.md`](./skills.md).
- Antes de **criar/editar um agente** (`.claude/agents/<agent>.md`) — confirmar formato em [`sub-agents.md`](./sub-agents.md).
- Antes de **adicionar um hook** — formato + life-cycle em [`hooks.md`](./hooks.md) + [`hooks-guide.md`](./hooks-guide.md).
- Antes de **mexer em settings.json** — checar [`settings.md`](./settings.md) + [`permissions.md`](./permissions.md) + [`permission-modes.md`](./permission-modes.md).
- Antes de **integrar MCP** — [`agent-sdk/mcp.md`](./agent-sdk/mcp.md).
- Antes de **debugar comportamento estranho do agente** — [`debug-your-config.md`](./debug-your-config.md), [`troubleshooting.md`](./troubleshooting.md), [`errors.md`](./errors.md).
- Antes de **propor automação CI** com Claude Code — [`headless.md`](./headless.md), [`github-actions.md`](./github-actions.md), [`gitlab-ci-cd.md`](./gitlab-ci-cd.md).
- Antes de **escolher entre Opção A/B/C/D** do protocolo do projeto — [`sub-agents.md`](./sub-agents.md) + [`agent-teams.md`](./agent-teams.md) + [`agent-view.md`](./agent-view.md).

---

## Versionamento

Snapshot tirado em **2026-05-20** das versões correntes de `code.claude.com/docs/en/`. Para atualizar:

```bash
# 1. Re-baixar índice canônico
curl -fsSL https://code.claude.com/docs/llms.txt -o handbook/reference/claude-code/llms.txt

# 2. Comparar com llms.txt anterior. Para cada URL nova ou removida, ajustar a lista.
diff <(grep '^- https' llms.txt) <(grep '^- https' llms.txt.old)

# 3. Re-baixar tudo:
cd handbook/reference/claude-code
# (Comandos do bash usado em 2026-05-20 estão registrados no CHANGELOG do handbook)
```

A doc oficial muda toda semana (ver [`whats-new/`](./whats-new/)). Recomendação: refazer snapshot quando o projeto for tocar `.claude/skills/`, `.claude/agents/`, ou `.claude/settings.json` de forma não-trivial.

---

## Tamanhos relevantes (top 10)

| Arquivo | Tamanho |
| :--- | ---: |
| [`changelog.md`](./changelog.md) | 336 KB |
| [`hooks.md`](./hooks.md) | 188 KB |
| [`env-vars.md`](./env-vars.md) | 176 KB |
| [`agent-sdk/typescript.md`](./agent-sdk/typescript.md) | 156 KB |
| [`agent-sdk/python.md`](./agent-sdk/python.md) | 156 KB |
| ... | ... |

Total da pasta: **4.2 MB** em 137 arquivos `.md`.
