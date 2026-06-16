[← Voltar para ADRs](./README.md)

# ADR-0040: Achados de agente viram GitHub Issues testáveis (tracker primário); contrato OpenAPI/`oasdiff` como evolução

- **Status:** Accepted
- **Date:** 2026-06-15
- **Deciders:** Gabriel (tech lead / arquiteto).
- **Origem:** Diagnóstico nesta sessão — os índices/resumos de `handbook/tickets/` vivem desatualizados (3 cópias da verdade mantidas à mão) — e a decisão de simplificar (YAGNI) em vez de construir broker/VPS.
- **Relacionado:** [ADR-0027](./0027-zod-openapi-contract-first-http-edge.md) (Zod/OpenAPI) · [ADR-0034](./0034-adopt-bruno-api-client-cli.md) (Bruno) · [ADR-0006](./0006-modular-monolith-core-api.md)

---

## Contexto

O backlog de pendências nasce no **front** (`web-app`) e do **agente** codando, e chega como **cards markdown** em `handbook/tickets/`. Os cards de trabalho ficam fiéis (pasta = estado), mas os **índices/resumos em prosa** (`README`, `*-RESUMO`) **apodrecem** — listam como pendente o que já está em `done/`. Causa-raiz: a mesma verdade em 3 lugares, mantida manualmente.

Dois fatos mudam a melhor solução:

- **O melhor detector de problemas do projeto é o próprio agente, codando** — ele acha **qualquer** coisa (bug, smell, gap de contrato, débito, risco), não só gap de API. O `gh` já está autenticado e o repo tem **issues habilitado** (e **0 issues** hoje — greenfield).
- Ferramentas mais pesadas para isso (broker OpenAPI + [`oasdiff`](https://github.com/oasdiff/oasdiff), tracker [Beads](https://ianbull.com/posts/beads/), broker always-on em VPS) foram avaliadas e são **boas**, mas **prematuras** para o tamanho atual (solo + front) — ver Alternativas.

**Cânone (princípio IX):** schema explícito serve a dois fins — _"an explicit representation of what an endpoint exposes"_ **e** _"catching accidental breakages"_ (Newman, `building-microservices:2399-2401`). Vale para a evolução (OpenAPI), mas não exige construir tudo agora.

---

## Decisão (proposta)

**O agente registra cada achado diretamente como GitHub Issue padronizada e testável. GitHub Issues é o tracker primário; as camadas pesadas (OpenAPI/`oasdiff`, Beads, VPS) ficam como evolução aditiva.**

1. **GitHub Issues é o tracker primário** do backlog de achados. Os índices/resumos em prosa de `handbook/tickets/` deixam de ser mantidos à mão; os cards existentes viram **histórico** (não se deletam).
2. **O agente é o produtor.** Ao encontrar um problema **fora do escopo do ticket atual**, registra via a skill **[`issue-report`](../../../.claude/skills/issue-report/SKILL.md)**, que preenche o template **[`.github/ISSUE_TEMPLATE/agent-finding.md`](../../../.github/ISSUE_TEMPLATE/agent-finding.md)** com **critérios de aceite testáveis** (Dado/Quando/Então + caminho de erro) e **Definition of Done** amarrada ao gate W3. Reforçado pela regra **AGENTS.md §Anti-padrões #15** (scope-creep → issue, não conserto no meio do caminho).
3. **Idempotência por `dedup-key`** (`<modulo>:<area>:<slug>`): a skill busca (`gh issue list --search`) **antes** de criar — reincidência → comentário; regressão (issue fechada que voltou) → `reopen`. **Nunca duplica.**
4. **Notificação no Discord** pelo **webhook nativo do GitHub** (`…/webhooks/ID/TOKEN/github`) — issue aberta/fechada cai no canal, **zero código**.
5. **Detecção sistemática de gap de contrato** (`openapi:emit` + `oasdiff` no CI), **tracker git-backed agent-native** (Beads) e **broker always-on** (VPS-QA + Watchtower + Caddy) ficam como **evolução futura (F-Plus)** — cada um vira só **mais um produtor de issues**, sem reescrever o resto.

---

## Consequências

### Positivas

- Resolve a dor com **quase zero infra**: `gh` autenticado, issues habilitado, Discord trivial. O achado é registrado **no momento certo** (o agente está ali).
- Cobre **mais** que um diff de contrato (bug/smell/débito/segurança), não só API.
- A "capa" deixa de existir como doc à mão — **o GitHub Issues É o índice** (labels, filtros, busca, `closes #N`).
- Critérios de aceite **testáveis** ancorados no cânone (INVEST / Histórias de Usuário) → "saber que consertamos certo".

### Negativas / custos

- **Oportunística, não sistemática:** cobre o que o agente topa codando; gap de contrato que ninguém visita só entra quando a F-Plus(a) (`oasdiff`) ligar.
- **Depende de disciplina** (o agente lembrar de registrar) — mitigada pela regra #15 + a skill fácil + (opcional) hook `Stop` que lembra de drenar achados.
- GitHub Issues **não é git-backed/offline** — aceitável; se virar limite, **Beads** é a saída (F-Plus(b)).

### Riscos e mitigação

- Duplicata → `dedup-key` + busca antes (na skill).
- Issue fraca → o template **proíbe abrir sem critério de aceite testável**; checklist de qualidade na skill.
- Ruído → labels `agent-found`/`needs-triage` + triagem humana.

---

## Faseamento

| Fase | Escopo | Estado |
| --- | --- | --- |
| **F1 — agora** | skill `issue-report` + template `agent-finding.md` + regra AGENTS.md #15 + Discord webhook nativo | **Pronto nesta sessão** (falta plugar o webhook do Discord — passo manual seu) |
| **F-Plus(a)** | `openapi:emit` + `oasdiff` no CI → emite issues de gap de contrato | Adiada — ligar se a borda crescer |
| **F-Plus(b)** | Beads (`bd`) como tracker git-backed agent-native | Adiada — se precisar offline/grafo de dependências |
| **F-Plus(c)** | Broker always-on na VPS-QA (Watchtower/Caddy/webhook) | Adiada — só com (a)/(b) ligada ou agente autônomo |

---

## Veredito de ROI

Vale a pena, na **versão enxuta (F1)** — melhor custo-benefício para o tamanho atual: resolve "não perder achado" + "saber consertar certo" + "índice não desatualiza", reaproveitando GitHub + `gh` + Discord. As camadas pesadas (`oasdiff`/Beads/VPS) ficam **desenhadas mas adiadas** — ligamos quando a dor justificar, cada uma como produtor de issues a mais.

---

## Alternativas consideradas

### A. Cards markdown + índice gerado (`tickets:index`) à mão

**Rejeitada:** é a própria dor (apodrece). O GitHub Issues já é o índice — não precisa gerar um.

### B. Broker OpenAPI + `oasdiff` como tracker primário (versão anterior deste ADR)

**Adiada (F-Plus a):** mais robusto para gap de contrato sistemático, porém pesado. O agente cobre **mais tipos** de problema com **menos** infra. `oasdiff` entra como **produtor adicional** quando a borda HTTP crescer/multi-consumidor.

### C. Beads (`bd`) — tracker git-backed agent-native

**Adiada (F-Plus b):** excelente (grafo de dependências, offline, versionado, feito p/ agentes), mas adiciona Go + daemon + migração dos cards. GitHub Issues + `gh` é mais simples **agora**. Reavaliar se precisar de offline real ou dependências em grafo.

### D. VPS + webhook + Docker (broker always-on)

**Adiada (F-Plus c):** a infra existe (`ERP-INFRA/platform/vps-qa` + Watchtower + Caddy), mas só compensa com a F-Plus(a/b) ligada — ou com agente autônomo (alternativa E).

### E. Agente autônomo na VPS consertando sozinho

**Adiada:** alto custo de tokens + risco; exige gate W3 + **PR sempre revisado por humano** (nunca push direto). Evolução distante.

---

## Referências

- [`.claude/skills/issue-report/SKILL.md`](../../../.claude/skills/issue-report/SKILL.md) · [`.github/ISSUE_TEMPLATE/agent-finding.md`](../../../.github/ISSUE_TEMPLATE/agent-finding.md) · `AGENTS.md` §Anti-padrões #15.
- `src/shared/http/app.ts:148-162` (`/docs/json`) · `ERP-INFRA/platform/vps-qa` (infra p/ F-Plus).
- [`oasdiff`](https://github.com/oasdiff/oasdiff) · [Beads](https://ianbull.com/posts/beads/) (Steve Yegge).
- _Histórias de Usuário_ (INVEST / critérios de aceite) · Newman, _Building Microservices_ (schema explícito).
- ADR-0027 (Zod/OpenAPI) · ADR-0034 (Bruno) · ADR-0006 (modular monolith).
