# Mitigação — sub-agent stoppando mid-task (Issue #47936)

> **Status:** Diagnóstico completo + mitigação aplicada (Opus + checklist embutido).
> **Data:** 2026-05-20.
> **Ticket onde apareceu:** [`CTR-DOMAIN-STATE-MACHINE-CONTRACT`](../.pipeline/CTR-DOMAIN-STATE-MACHINE-CONTRACT/) — W0 RED.
> **Próxima validação:** próxima chamada `Agent(contratos-orchestrator)` (W1 GREEN deste mesmo ticket).

---

## Sintoma observado

Sub-agent `contratos-orchestrator` (modelo Sonnet) parou após o último `Edit` em `tests/.../fixtures.ts` **sem**:

- Rodar `pnpm test` (passo do prompt).
- Escrever `002-tests/REPORT.md`.
- Atualizar `STATE.md`.
- Produzir mensagem text de fechamento.

Stats do transcript (`~/.claude/projects/.../subagents/agent-ad9c53adf669a9978.jsonl`):

| Métrica | Valor | Interpretação |
| :--- | :--- | :--- |
| Modelo | `claude-sonnet-4-6` | Frontmatter do agente |
| Tool uses | 20 (12 Read, 3 Write, 2 Edit, 2 Bash, 1 Skill) | Distribuído em ~3.8 min |
| Tokens totais | 97 034 | Bem abaixo dos 200k do Sonnet (não foi context limit) |
| `stop_reason` final | **`null`** (não `end_turn`) | Sinal de **stop externo**, não conclusão natural |
| Última entrada do transcript | Tool `Edit` com tool_result success | Sem follow-up assistente |

---

## Causa raiz confirmada externamente

Bug oficial Claude Code, presente em **14-30% das execuções** de sub-agent:

| Issue | URL | Resumo |
| :--- | :--- | :--- |
| **#47936** [BUG] (Async) Subagents stopping early | https://github.com/anthropics/claude-code/issues/47936 | Sub-agent para mid-task; SDK reporta `completed` mas mensagens finais têm `stop_reason: null`. Sem workaround oficial do mantenedor (recomendação: validar filesystem manualmente). |
| **#6594** Subagent Termination Bug in Claude Code v1.0.62 | https://github.com/anthropics/claude-code/issues/6594 | Mesma família de bug. |
| **#6159** Agent Reliability: Claude Stops Mid-Task | https://github.com/anthropics/claude-code/issues/6159 | Padrão mais amplo — abrange também sessão principal, não só sub-agents. |
| **#19077** Sub-agents can't create sub-sub-agents | https://github.com/anthropics/claude-code/issues/19077 | Anti-pattern documentado: o frontmatter `tools: ..., Agent` é ignorado quando o próprio agent é um sub-agent. |
| **#33049** Subagent (Agent tool) does not fire Stop hook | https://github.com/anthropics/claude-code/issues/33049 | Quando sub-agent para mid-task, o Stop hook do `settings.json` **não dispara** — perdemos rede de segurança. |

### Soluções recomendadas por terceiros

Fonte: [wmedia.es — Why Your Sub-Agents Return Incomplete Results](https://wmedia.es/en/tips/claude-code-subagent-context-loss)

1. **Incluir objetivo** (não só ação) na delegação.
2. **Precarregar contexto via `skills:` no frontmatter** do agent.
3. **Busca iterativa** — reentrar no sub-agent (não aceitar primeira resposta incompleta).
4. **Design focado** — papéis específicos > genéricos.
5. **`maxTurns`, `model`, `tools` allowlist** — controlar superfície.

---

## Mitigações aplicadas neste repo (2026-05-20)

### 1. Trocar modelo do agent: `sonnet` → `opus`

- Arquivo: `.claude/agents/contratos-orchestrator.md` (linha `model:`).
- Justificativa: Opus mantém checklist longo significativamente melhor que Sonnet em prompts com muitas sub-tarefas hierárquicas. Custo maior, mas o ganho de não precisar reexecutar wave compensa.

### 2. Embutir checklist obrigatório no markdown do agent

- Arquivo: `.claude/agents/contratos-orchestrator.md` — nova seção **"Checklist de fechamento de wave (OBRIGATÓRIO antes de retornar)"**.
- Conteúdo: 4 passos invariantes (gate → REPORT → STATE → auto-verificação) + anti-padrão explícito proibindo **último `tool_use` ser fechamento implícito da wave**.
- Justificativa: o checklist faz parte do system prompt do sub-agent, então reforça em **toda** invocação sem depender do prompt cliente.

### 3. Padrão "main session escreve REPORT" como fallback

- Quando o sub-agent for interrompido (detectável: REPORT ausente, STATE não atualizado, último turn é `tool_use` sem follow-up text), a sessão principal:
  1. Inspeciona `git status` + transcript em `~/.claude/projects/.../subagents/agent-<id>.jsonl`.
  2. Roda o gate da wave manualmente.
  3. Escreve REPORT + atualiza STATE.
  4. Documenta no REPORT que houve interrupção (campo "Modo de execução").

→ Feito manualmente em `002-tests/REPORT.md` deste ticket — viraria padrão.

---

## Prompt para perguntar à IA da doc oficial Claude

> Copiar e colar no chatbot da doc Claude (https://docs.claude.com) ou enviar como issue em https://github.com/anthropics/claude-code/issues.

```
Hi! I'm using Claude Code v2.1.145 and running into Issue #47936 (sub-agents stopping mid-task with stop_reason: null in their final messages, no end_turn). Specifically:

CONTEXT:
- Project: TypeScript modular monolith with custom sub-agent (.claude/agents/<name>.md) acting as a pipeline orchestrator.
- The sub-agent runs a 4-wave pipeline (W0 RED → W1 GREEN → W2 REVIEW → W3 QUALITY), and each wave invocation should: (a) do the wave's real work (write tests, implement code, review, run gates), then (b) write a REPORT.md, then (c) update a STATE.md, then (d) return a 5-line summary.
- Observed failure: in one invocation (model sonnet, 20 tool uses, ~97k tokens, well under context limit), the sub-agent stopped after a successful Edit tool call. Transcript shows stop_reason: null on the last assistant turn, no follow-up text, no REPORT written, no gate run. SDK reported "completed" to the parent.

WHAT I'VE ALREADY DONE:
1. Changed `model: sonnet` to `model: opus` in the sub-agent's frontmatter.
2. Embedded an explicit 4-step closing checklist ("run gate → write REPORT → update STATE → self-verify with Read") into the sub-agent's markdown body, plus an anti-pattern rule "never end the turn with a tool_use; always end with a text summary".

QUESTIONS:
1. Beyond #47936's existing diagnostic, are there any *current* (2026) workarounds, env vars, or config knobs that materially reduce the 14-30% interruption rate? Specifically:
   - Does `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` help when context is far below capacity (my case)?
   - Does `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (which unlocks SendMessage) let the parent reliably resume a sub-agent stopped with `stop_reason: null`, or does the resumed agent inherit the same broken state?
   - Are there hidden frontmatter fields (besides `tools`, `model`, `color`, `memory`, `skills`) that influence stop behavior — e.g., maxTurns, timeout, retryPolicy?
   - Is there a way to make the Stop hook (settings.json hooks.Stop) fire for sub-agents (Issue #33049), so I can detect interruption and re-invoke programmatically?

2. Is the "embedded checklist + Opus" combination the strongest *prompt-side* mitigation available today, or is there an architectural pattern Anthropic recommends (e.g., chaining 4 separate sub-agent calls from the main session instead of 1 sub-agent doing 4 waves)?

3. If I want the parent (main Claude Code session) to detect a stopped sub-agent and auto-retry, what's the most robust signal? The wmedia.es article mentions checking filesystem for expected outputs — is there a programmatic way to inspect the sub-agent's transcript JSONL for `stop_reason: null` from the parent's tooling?

Thanks!
```

---

## Próxima ação

Validar a mitigação na **W1 GREEN** deste mesmo ticket (`CTR-DOMAIN-STATE-MACHINE-CONTRACT`). Critérios de sucesso:

1. Sub-agent completa as 4 passos do checklist.
2. REPORT existe em `003-impl/REPORT.md` com saída literal de `pnpm test`.
3. STATE atualizado com W1 ✅.
4. Resumo final tem stats do gate.

Se W1 falhar novamente da mesma forma → escalar para o protocolo "main session escreve REPORT" como permanente.
