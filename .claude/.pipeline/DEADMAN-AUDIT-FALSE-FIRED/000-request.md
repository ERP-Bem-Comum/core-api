# DEADMAN-AUDIT-FALSE-FIRED — auditor do dead-man dispara em falso no bootstrap

> **Issue:** [#368](https://github.com/ERP-Bem-Comum/core-api/issues/368) · **Size:** M · **Módulo:** `tooling/deadman` (fora de `src/`)
> **ADR:** [ADR-0042](../../../handbook/architecture/adr/0042-deadman-switch-redundant.md) (dead-man switch redundante) · **Épico:** #67 (CLOSED)

## Problema

`.github/workflows/deadman-audit.yml` trata **ausência de qualquer ping** como **morte** e abre uma issue `priority:p1` a cada execução do cron. Já produziu 14 issues idênticas — #314, #325, #340, #344, #345, #346, #347, #366 (fechadas em 2026-07-08) e #527, #564, #576, #583, #584, #594 (fechadas em 2026-07-28) — todas com o título autocontraditório `sem sinal há 0h (limite 3d)`.

Evidência em `deadman/audit.jsonl`, idêntica em toda execução:

```json
{"v":1,"run_at":"...","emitter":"*","last_seen":"","age_h":0,"status":"DEAD","merged":0,"threshold_days":3,"payload_fired":true}
```

## Causa — 3 defeitos localizados no YAML

| # | Linha | Defeito |
| --- | --- | --- |
| D1 | `deadman-audit.yml:83-85` | `else status=DEAD  # nenhum sinal jamais visto` — bootstrap (nenhum ping **jamais**) é indistinguível de morte. `age_h` fica no valor inicial `0` (`:79`), e o título compõe `0h` contra `limite 3d`. |
| D2 | `deadman-audit.yml:56` | Lê só `.default_threshold_days` de `deadman/emitters.json`. Não itera `.emitters[]` — o `sweeper-vps-qa`, que declara `threshold_days: 2`, é auditado com 3d. |
| D3 | `deadman-audit.yml:88-92` | `gh issue create` roda **toda execução** com `status=DEAD`. Sem dedup por estado → 1 issue p1 por rodada do cron, não 1 por transição `alive→dead`. |

Defeito adjacente, não-bloqueante: `emitter:"*"` hardcoded no registro de auditoria (`:101`) — o log não identifica **qual** emissor morreu.

## Fundamentação normativa — o YAML atual viola o ADR-0042

O ADR define a condição de disparo literalmente (`0042-deadman-switch-redundant.md:37`):

> Dispara o **payload** (scripts de contingência) se `now − last_seen > limite`.

Sem `last_seen`, a diferença é **indefinida** — logo a condição **não é satisfeita**. O `else status=DEAD` do `:83-85` dispara sem avaliar a régua do ADR. **CA1 não afrouxa o auditor: restaura o que o ADR já normatiza.**

O CA4 cumpre a decisão **D3** do mesmo ADR (`:43`):

> **D3 — SLO explícito.** Definir o objetivo de detecção ("miss detectado em ≤ X") **antes** de fixar a cadência do auditor (…) — mas o número entra no contrato.

`deadman/emitters.json` é a materialização desse contrato; ignorar o `threshold_days` por emissor esvazia o D3.

## Decisão de design (contestável — registrada para o humano)

A lógica de decisão **sai do YAML** para `scripts/ci/deadman-audit.ts`, e o workflow passa a invocá-la.

**Por quê:** o DoD do #368 exige *"teste cobrindo `last_seen=nunca`"*. Asserção de estrutura sobre o texto do YAML (molde de `tests/scripts/semgrep-workflow.test.ts`) prova que o texto mudou, **não** que a decisão está correta — o defeito é de lógica, não de configuração. O precedente do repo para lógica de CI testável é `scripts/ci/test-integration.ts` + `tests/scripts/test-integration-non-destructive.test.ts`.

Isto também paga o débito que o #368 aponta: o `audit.sh` (#71) foi **fechado sem implementar**, e foi essa lógica órfã inline que permitiu o bug passar sem teste.

**Fora de escopo:** o passo de download do S3 (`:36-50`) e o self-heal (`:64-75`) permanecem no YAML. Só a **decisão** (idade → status → payload) migra.

## Critérios de aceite

Herdados de #368, com o CA4 acrescentado por D2.

- **CA1 (bootstrap) — Dado** que nenhum ping foi registrado (`last_seen` vazio), **Quando** o auditor roda, **Então** o status **não** é `DEAD` com `age_h=0`: é um estado próprio de bootstrap que **não abre issue** e grava `status:"bootstrap"` em `audit.jsonl`.
- **CA2 (vivo) — Dado** um ping há menos que o threshold do emissor, **Quando** o auditor roda, **Então** nenhum alerta é criado e o status é `alive`.
- **CA3 (dedup) — Dado** que o estado morto **já** foi alertado, **Quando** o auditor roda de novo sem sinal novo, **Então** **não** cria issue duplicada — dedup por transição de estado, persistida (não `gh issue list | grep`).
- **CA4 (threshold por emissor) — Dado** o `sweeper-vps-qa` com `threshold_days: 2` em `emitters.json`, **Quando** o auditor decide, **Então** usa **2**, não o `default_threshold_days: 3`; e `audit.jsonl` registra o `emitter` real, não `"*"`.
- **CA5 (morte real preservada) — Dado** um ping mais antigo que o threshold, **Quando** o auditor roda, **Então** dispara o payload normalmente. *O ticket não pode transformar o auditor em algo que nunca alerta.*

## Definition of Done

- Gate W3 verde: `pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test`.
- Teste em `tests/scripts/` cobrindo os 5 CAs, com **CA1 e CA3 obrigatoriamente RED em W0**.
- `deadman-audit.yml` sem escape (`|| true`) no caminho de decisão — hoje o `gh issue create || true` engole falha (ADR-0011, mesma regra do gate Semgrep).
- Workflow SHA-pinado se ganhar `uses:` novo (ADR-0011).

## Observação operacional — NÃO é escopo deste ticket

`deadman/history.jsonl` está **vazio (0 bytes)**: nenhum ping jamais chegou, embora `tools/deadman-emitter/` exista e o `contracts-sweeper` esteja no `compose.yaml`. Com o CA1, isso deixa de gerar ruído p1 — mas **não responde** se o emissor deveria estar ativo no QA. Se a verificação de deploy confirmar que deveria, abrir issue própria via skill [`issue-report`](../../skills/issue-report/SKILL.md) (ADR-0040 — não consertar fora de escopo).
