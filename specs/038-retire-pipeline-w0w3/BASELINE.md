# Baseline de medição — Aposentadoria da pipeline W0→W3

**Feature**: `038-retire-pipeline-w0w3` · **Capturado**: 2026-07-30 · **Tasks**: T003–T007

Números do "antes", congelados **antes de qualquer remoção**. Sem eles, os critérios SC-002 e SC-006
tornam-se inverificáveis de forma permanente — não há como medir uma redução contra um baseline que
já foi destruído.

---

## SHA base da entrega (T006)

```
6408c5ed3aac27885e94cdc522f34b46a5d2ea33
```

Commit `chore(pipeline): preserva o wave-override antes da aposentadoria`. É a âncora dos diffs de
verificação C3.5 (`src/` intocado), C5.3 (commits atômicos), C5.4 (ADRs intactos) e C5.5 (histórico
congelado).

---

## Contexto default (T003) — para SC-002

| Arquivo                                  | Bytes      |
| ---------------------------------------- | ---------- |
| `AGENTS.md`                              | **29.487** |
| `.claude/output-styles/erp-contracts.md` | **3.493**  |
| **Total carregado em toda sessão**       | **32.980** |

`AGENTS.md` entra via `CLAUDE.md` → `@AGENTS.md`; o output style está ativo em
`.claude/settings.json#outputStyle`. Os dois são carregados antes do primeiro caractere digitado.

---

## Acervo de tickets (T004, T005) — para SC-006

| Métrica                         | Valor     |
| ------------------------------- | --------- |
| Arquivos em `.claude/.pipeline` | **3.436** |
| Tamanho em disco                | **16 MB** |
| Arquivos rastreados no git      | **3.435** |
| Tickets (diretórios)            | **544**   |

> ⚠️ **Divergência explicada**: a spec registrou 3.429 rastreados; a medição agora dá **3.435**. A
> diferença de 6 arquivos é o ticket `PIPELINE-STATE-WAVE-OVERRIDE`, que estava **untracked** e foi
> versionado pelo commit `6408c5ed` (T002). O número correto para a verificação C4.3 é **3.435**.
>
> Sobra 1 arquivo não rastreado (3.436 − 3.435): resíduo untracked em
> `.claude/.pipeline/BGP-LEGACY-ID-DUP-ASSERT/004-code-review/`. **A verificação C4.1 usa 3.436**
> (contagem física), não 3.435.

---

## Ferramenta — para referência da US3

| Alvo                | Arquivos | LOC       |
| ------------------- | -------- | --------- |
| `scripts/pipeline/` | 8        | 1.503     |
| `tests/pipeline/`   | 6        | 2.352     |
| **Total**           | **14**   | **3.855** |

> Medido **antes** do commit `6408c5ed`, que adicionou 692 linhas de `wave-override`. O número real
> a ser removido pela US3 é maior — remedir em T045/T046.

---

## Depois (preencher ao concluir cada fase)

| Métrica                      | Antes  | Depois | Δ                  |
| ---------------------------- | ------ | ------ | ------------------ |
| `AGENTS.md` (bytes)          | 29.487 | —      | —                  |
| Output style (bytes)         | 3.493  | —      | —                  |
| Contexto total (bytes)       | 32.980 | —      | —                  |
| Acervo — arquivos            | 3.436  | —      | —                  |
| Acervo — rastreados          | 3.435  | —      | —                  |
| Acervo — disco               | 16 MB  | —      | —                  |
| LOC de ferramenta            | 3.855+ | —      | —                  |
| Hooks lendo estado de ticket | **4**  | —      | —                  |
| Arquivos alterados em `src/` | 0      | —      | **0 (invariante)** |

### US1 — hooks (Phase 3)

Baseline de 4 automações que leem o acervo:

1. `.claude/hooks/inject-ticket-context.sh` — injeta em **100% dos prompts**
2. `.claude/hooks/subagent-stop-validate.sh` — valida fechamento de wave
3. `.claude/hooks/session-start-context.sh` — varre 544 `STATE.md` no boot
4. `.claude/statusline.sh:52-56` — resolve ticket ativo

**Evidência do defeito nesta própria sessão**: o bloco `[ticket-context]` do ticket
`PIPELINE-STATE-WAVE-OVERRIDE` foi injetado em **5 prompts consecutivos**, incluindo aquele em que o
usuário pediu a remoção da pipeline.
