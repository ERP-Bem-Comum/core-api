[← Voltar para ADRs](./README.md)

# ADR-0042: Dead-man's switch redundante (S3/R2 ⟂ GitHub Actions, JSONL append-only) para detecção de jobs mortos

- **Status:** Accepted
- **Date:** 2026-06-16
- **Deciders:** Gabriel (tech lead / arquiteto). Origem do desenho: P.O.; revisão de arquitetura: agente assistente.
- **Origem:** SPIKE [#66](https://github.com/ERP-Bem-Comum/core-api/issues/66) — fecha a única camada de confiabilidade ainda aberta do `contracts-sweeper` (issues [#50](https://github.com/ERP-Bem-Comum/core-api/issues/50)/[#39](https://github.com/ERP-Bem-Comum/core-api/issues/39)): **"o scheduler morre e nunca dispara"**.
- **Estende/Relacionado:** [ADR-0041](./0041-specialized-workers-and-oneshot-jobs.md) (jobs one-shot via cron — define o gap) · [ADR-0002](./0002-keep-nodejs-runtime.md)/[ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md) (runtime único) · preferência registrada `no-python-scripts`.

---

## Contexto

Jobs agendados (o `contracts-sweeper` de auto-expire, e futuros) já têm **3 das 4 camadas** de confiabilidade cobertas (ADR-0041 + `handbook/infrastructure/06-contracts-sweeper-job.md`):

1. Job dá erro → **exit code** (1/78) → alerta.
2. Disparo perdido (máquina down) → **`systemd timer Persistent=true`** (catch-up) + **convergência D+1** (predicado por estado).
3. Job morto no meio → **rollback da tx** → próximo run refaz (idempotente).

A **4ª** — o **scheduler/daemon morrer e nunca disparar** — é o ponto cego: *"sem execução = sem erro = sem alerta"*. Exit code só observa execução que **ocorreu**. Precisamos de um **dead-man's switch**: um heartbeat a cada sucesso; **a ausência** do sinal na janela esperada dispara o alerta/payload.

**Decisão do P.O.:** solução **in-house** (controle/custo/privacidade), **sem SaaS** (healthchecks.io, Dead Man's Snitch). Restrições do projeto: **sem Python** (`no-python-scripts`); preferência por Node/TS ou baixo nível (Go/Zig) para utilitários.

---

## Decisão

Padrão **"Cinto e Suspensório"**: dois planos **independentes** de ingestão do sinal de vida, convergindo via **JSONL append-only**, com um Auditor que decide a inatividade e dispara a contingência.

1. **Emissor (ping)** — daemon/dispositivo que emite o sinal periodicamente, com **dual-write**:
   - `PUT`/append no Object Storage (`status.jsonl`);
   - Webhook `repository_dispatch` para o GitHub.
   - **Implementação:** **Deno ou Bun** (TS, alinhado ao stack) ou **Go/Zig** (binário único — ideal para ESP32/RPi). **NÃO Python** (`no-python-scripts`).
2. **Storage primário (S3/R2)** — `status.jsonl`: fonte de verdade de baixa latência, alta disponibilidade.
3. **GitHub Actions — ingestão de fallback** — workflow disparado pelo webhook, commita a nova linha em `history.jsonl` no repo. Garante o registro mesmo se o S3 falhar.
4. **GitHub Actions — Auditor Cron** (diário): baixa `status.jsonl`, compara com `history.jsonl`, decide inatividade pelo **registro mais recente entre as duas fontes** (`last_seen = max(remoto, local)`), faz **self-healing** (merge das linhas faltantes), e o **commit de auditoria** atua como **keep-alive** contra a **suspensão de 60 dias** de workflows agendados do GitHub. Dispara o **payload** (scripts de contingência) se `now − last_seen > limite`.

### Decisões desta ADR (ajustes ao desenho original)

- **D1 — Linguagem do Emissor (e utilitários não-Node): Go.** Sem Python (`no-python-scripts`). Critério do P.O.: _mais leve possível + fácil em Docker + bom em JSONL_ (Node é ruim em binário). **Go** atende: binário **estático único** → imagem `FROM scratch` (~10–15 MB), `encoding/json` + `bufio.Scanner` para JSONL linha-a-linha, `crypto/hmac` na stdlib para a integridade (§contratos), **zero runtime** no container (Dockerfile de 2 linhas, idêntico em `docker run`/compose). Rejeitados: **Deno/Bun** (binário ~90 MB com runtime embutido + ainda JS → não atende leve/binário); **Zig/Rust** (binário menor/seguro, mas JSONL/build menos _fáceis_ — Go é o ótimo leve×fácil×JSONL); self-host do healthchecks.io (Python).
- **D2 — SPOF na detecção.** A redundância do desenho cobre a **ingestão** (S3 ⟂ Actions), mas a **detecção** (Auditor) roda **só** no GitHub Actions → ainda é SPOF: um outage do Actions no dia do disparo = ninguém dispara o payload. **Decisão:** adicionar um **2º auditor independente** (cron no ERP-INFRA cruzando o mesmo `status.jsonl`) — SPOF-free também na **detecção**, não só na ingestão.
- **D3 — SLO explícito.** Definir o objetivo de detecção ("miss detectado em ≤ X") **antes** de fixar a cadência do auditor (cron diário do Actions tem jitter e resolução grosseira). Para o `contracts-sweeper` (sweep diário), detectar em ≤ 24-48h é provavelmente suficiente — mas o número entra no contrato.

### Contratos de dados

`status.jsonl` (S3) e `history.jsonl` (repo) — schema, versionamento, ordenação e dedup em **`handbook/infrastructure/07-deadman-switch-data-contracts.md`**.

---

## Consequências

**Positivas:** sem SPOF na ingestão (e, com D2, na detecção); in-house (sem SaaS, sem custo recorrente externo); histórico imutável e auditável (JSONL append-only); keep-alive resolve a suspensão de 60 dias do Actions; reutilizável para qualquer job futuro.

**Negativas / custos:** mais peças móveis que um simples exit-code-alert (proporcional só se o miss for caro — é, para auto-expire); latência de detecção limitada pela cadência do Auditor (D3); o Emissor é uma nova superfície a manter; assinatura/integridade do ping (anti-spoof) é um item aberto (ver contratos §segurança).

**Reversível?** Sim — é aditivo; remover não afeta o job (que permanece com as 3 camadas). 

---

## Alternativas consideradas

- **SaaS (healthchecks.io / Dead Man's Snitch)** — **rejeitada** (decisão in-house). Self-host do healthchecks.io também (Python — D1).
- **Só exit-code-alert** — **insuficiente**: não detecta ausência de execução.
- **Heartbeat só no S3 (sem Actions)** ou **só no Actions (sem S3)** — **rejeitada**: reintroduz SPOF na ingestão; o ponto do desenho é a redundância.

---

## Próximos passos

1. Validar D1/D2/D3 (fecham o `Proposed → Accepted`).
2. Materializar os contratos JSONL (doc 07) → revisar.
3. Tickets derivados: Emissor (Deno/Bun/Go), workflows (ingestão + Auditor), 2º auditor (ERP-INFRA). Cada um W0→W3.
