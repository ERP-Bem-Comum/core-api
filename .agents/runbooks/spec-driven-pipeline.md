# Método Spec-Driven no pipeline W0→W3

> Adiciona uma **fase de especificação rigorosa antes do W0**, capturando o valor do
> [GitHub spec-kit](https://github.com/github/spec-kit) (spec → clarify → plan → analyze) **sem**
> trazer a ferramenta. Decisão de 2026-05-27: método nativo, zero Python/uv — respeita ADR-0011
> (supply-chain) e ADR-0012 (pnpm/Node puro). Ver [[feedback-always-use-pipeline-cli]].

## Por que (não é o spec-kit oficial)

O spec-kit instala via `uv tool install` + Python 3.11 e roda comandos `/speckit.*` que **duplicam** o
pipeline W0→W3 (plan/tasks/implement). Adotar a _ferramenta_ conflitaria com a stack Node/pnpm pura e o
hardening de supply-chain. O _método_ — escrever uma spec auditável antes de codar — é o que dá segurança;
esse runbook o internaliza.

## Onde a spec entra

```
[ÉPICO]  → .claude/.planning/EPIC-<NOME>.md   (spec-mãe; §10 fatia em tickets)
             │
             ▼  (cada linha do fatiamento = 1 ticket)
[TICKET] → .claude/.pipeline/<TICKET>/
             ├── 000-request.md        # pedido bruto (humano) — JÁ EXISTE
             ├── 001-spec/SPEC.md       # spec rigorosa (derivada) — NOVO, gate pré-W0
             ├── 002-tests/  (W0)       # testes RED derivados dos CA da SPEC
             ├── 003-impl/   (W1)
             ├── 004-code-review/ (W2)
             └── 005-quality/ (W3)
```

A SPEC é o contrato entre o pedido e o W0: **o W0 escreve testes a partir dos CA da §3 da SPEC**.
Template canônico: [`../templates/spec.md`](../templates/spec.md).

## Quando é obrigatória

| Caso                                                                           | SPEC formal (`001-spec/SPEC.md`)?              |
| :----------------------------------------------------------------------------- | :--------------------------------------------- |
| Épico (gera múltiplos tickets)                                                 | **Sim** — spec-mãe em `.planning/`             |
| Ticket **M / L / XL** ou risco alto (nova superfície, segurança, cross-módulo) | **Sim**                                        |
| Ticket **XS / S** trivial                                                      | Opcional — pode ser inline no `000-request.md` |
| Bug fix 1-3 linhas / config                                                    | Não                                            |

## Disciplina

1. **Spec antes de código.** Nenhum `src/` é tocado antes da SPEC sair de `draft` → `aprovada` (humano aprova).
2. **Constitution check obrigatório (§7).** Toda SPEC lista os ADRs/regras tocados e como adere. Conflito com
   ADR aceito = bloqueio até resolver (abrir ADR novo que `supersedes`, ou ajustar a spec).
3. **Clarificações resolvidas (§5).** Ambiguidade aberta impede aprovação — pergunta-se ao humano (autoridade
   de regra de negócio) antes, não no meio do W1.
4. **CA testáveis (§3).** Cada CA precisa virar um teste no W0. CA não-testável é mal-escrito.
5. **YAGNI no plano (§6).** O plano é de alto nível e sem código; não antecipa o que os CA não exigem.

## Integração com `pnpm run pipeline:state`

A fase de spec **não altera** o `state-schema` (v1, waves W0–W3) por enquanto — a SPEC é um artefato
convencionado em `001-spec/`. O `init` do ticket pode ocorrer junto da spec; o `wave-start W0` só acontece
**depois** da SPEC aprovada.

> **Follow-up anotado:** ticket futuro `CTR-PIPELINE-SPEC-GATE` pode adicionar `specApproved: boolean` ao
> `STATE.json` (bump schema → v2) para tornar o gate de spec verificável por tooling. Não bloqueia o uso hoje.

## Piloto

`EPIC-HTTP-CORE-API` (borda HTTP de auth + contracts) é o primeiro épico a usar este método.
