# 06 — Job one-shot `contracts-sweeper`: disparo, agendamento e alertas

> Materializa a peça de infra descrita em [ADR-0041](../architecture/adr/0041-specialized-workers-and-oneshot-jobs.md)
> para o job de auto-expire de contratos (Issue #50 / #39).

---

## Visão geral

O `contracts-sweeper` é um **processo one-shot** que conecta ao MySQL, expira contratos
vencidos em lote (transação única — ADR-0015), fecha o pool e sai com um exit code
observável. Não há loop interno nem restart automático — cada execução é um disparo
independente do scheduler externo.

Citando o ADR-0041 §2 literalmente:

> Jobs periódicos = processos one-shot disparados por cron externo (systemd timer /
> container `ofelia` no Compose) — **não** `setInterval` long-running, **não** acoplados
> ao loop do outbox. O job: conecta → `UPDATE` em lote + `INSERT` outbox (**1 transação**
> — ADR-0015) → fecha o pool → `exit 0`.

---

## Pré-requisitos

1. **Migration aplicada** antes do primeiro disparo: o schema `ctr_contracts` deve existir
   com a coluna `status` e o valor `'expired'` suportado. O job usa `applyMigrations: false`
   (prod-safe — CA6) e falha com exit `1` se o schema não existir. Aplique as migrations
   via release antes de habilitar o cron.
2. **Secret `contracts_database_url.txt`** gerado: `pnpm secrets:setup` (dev) ou injetado
   pelo Secrets Manager (produção).
3. **Imagem `core-api` buildada** com o serviço `app` do compose ou pipeline CI.

---

## Comando canônico

**Produção (ERP-INFRA)** — usa a imagem já publicada pela pipeline CI, **sem `--build`**:

```bash
docker compose --profile jobs run --rm contracts-sweeper
```

**Desenvolvimento** — com rebuild local. O `--build` é **só-dev**: em prod o host pode não
ter o código-fonte presente, e buildar de um working tree não-versionado é risco de release.

```bash
docker compose --profile jobs run --rm --build contracts-sweeper
```

> **Sempre `--rm`.** O serviço **não** tem `container_name` fixo (Docker gera nome único por
> run), então disparos repetidos/concorrentes nunca colidem por nome — o cron não para
> silenciosamente. Sem `--rm`, containers parados apenas se acumulam (lixo, não bloqueio):
> `docker container prune` limpa.

O container executa `tini -- node src/jobs/contracts/sweeper/run.ts` (ENTRYPOINT da
imagem), lê `CONTRACTS_DATABASE_URL_FILE=/run/secrets/contracts_database_url`, faz o
sweep e sai. O flag `--rm` remove o container ao final (sem acúmulo de containers parados).

---

## Agendamento em ERP-INFRA

**Cadência:** 1×/dia às **00:05 America/Sao_Paulo** (ADR-0041 §"Aplicação imediata").
O horário 00:05 garante que o dia D já virou completamente antes do sweep — o cutoff D+1
é calculado internamente no job em `America/Sao_Paulo` (não confiar apenas no horário do cron).

### Opção A — systemd timer (VPS/bare-metal)

```ini
# /etc/systemd/system/contracts-sweeper.timer
[Unit]
Description=Disparo diário do job contracts-sweeper (ERP Bem Comum)

[Timer]
OnCalendar=*-*-* 00:05:00 America/Sao_Paulo
# Persistent=true → CATCH-UP de boot: se a máquina estava down às 00:05, o timer
# dispara imediatamente no próximo boot. Cron simples NÃO recupera o disparo perdido.
# Combinado com a convergência do job (cutoff D+1 por estado, não por evento), nenhum
# contrato vencido fica preso por uma janela perdida — só atrasa até o próximo run.
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/contracts-sweeper.service
[Unit]
Description=Job one-shot contracts-sweeper
After=docker.service

[Service]
Type=oneshot
ExecStart=docker compose --profile jobs run --rm contracts-sweeper
WorkingDirectory=/opt/erp-infra/core-api
StandardOutput=journal
StandardError=journal
```

Ativar: `systemctl enable --now contracts-sweeper.timer`

### Opção B — ofelia (scheduler Docker-native em dev/homologação)

```yaml
# No compose de ERP-INFRA (não no compose.yaml do core-api):
ofelia:
  image: mcuadros/ofelia:latest
  command: daemon --docker
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
  labels:
    ofelia.job-run.contracts-sweeper.schedule: "5 0 * * *"
    ofelia.job-run.contracts-sweeper.command: >
      docker compose --profile jobs run --rm contracts-sweeper
```

---

## Exit codes e política de alertas

| Exit code | Significado | Ação em ERP-INFRA |
|-----------|-------------|-------------------|
| `0` | Sucesso (mesmo `expired=0` é válido) | Nenhuma |
| `1` | Erro de runtime (conexão, I/O, repositório) | **Alerta imediato** |
| `78` | `EX_CONFIG` — secret ausente ou URL mal-formada | **Alerta imediato** |

**Sem restart loop** (`restart: "no"` no compose — ADR-0041 §2). O retry é o próximo tick
do cron. Se o job falhar 2× consecutivas, escalar para investigação manual (o sweep é
idempotente — o próximo disparo bem-sucedido expira todos os contratos pendentes).

---

## Dead-man's switch — detecção de AUSÊNCIA de execução (pendente — SPIKE #66)

A tabela de exit codes acima cobre apenas **falha de execução** (o job rodou e deu erro). O
ponto cego é o **scheduler/daemon morrer e nunca disparar**: "sem execução = sem erro = sem
alerta". A defesa é um **dead-man's switch** — um heartbeat a cada sucesso; se o monitor não
recebe o ping na janela esperada, **ele alerta**.

**Decisão do P.O.:** a solução será **in-house** (sem SaaS tipo healthchecks.io). O *como*
está em investigação no **SPIKE [#66](https://github.com/ERP-Bem-Comum/core-api/issues/66)**
(monitor próprio Node/TS vs. self-host vs. daemon Go/Zig vs. via outbox/Prometheus). O envio
do ping será um `ExecStartPost` no systemd service (dispara **só** em sucesso, mantendo o job
puro — ADR-0041); o **alvo** do ping é o que o SPIKE define.

### Camadas de confiabilidade (estado atual)

| Modo de falha | Quem detecta / recupera | Estado |
| --- | --- | --- |
| Job roda e dá erro (exit 1/78) | exit code → alerta imediato | ✅ |
| Disparo perdido (máquina down no horário) | `Persistent=true` (catch-up no boot) + convergência D+1 do job | ✅ |
| Job morto no meio (SIGTERM) | rollback da tx → próximo disparo refaz (idempotente — ADR-0041) | ✅ |
| **Scheduler/daemon morto (nunca dispara)** | **dead-man's switch (in-house)** | ⏳ SPIKE #66 |

---

## Observabilidade

O job emite em stdout (consumível por pipes e log collectors):

```
[contracts-sweeper] expired=<N> scanned=<M>
```

Erros vão para stderr:

```
[contracts-sweeper] configuração inválida: sweeper-missing-connection-string
[contracts-sweeper] falha ao abrir MySQL: ...
[contracts-sweeper] erro no sweep: ...
```

O `correlationId` (via `withNewCorrelation`) está disponível em todos os logs estruturados
emitidos dentro da execução — útil para correlacionar com o outbox worker e o HTTP server
no agregador de logs.

---

## Referências

- [ADR-0041](../architecture/adr/0041-specialized-workers-and-oneshot-jobs.md) — workers especializados e jobs one-shot.
- [ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md) — outbox pattern (transação única sweep + eventos).
- `src/jobs/contracts/sweeper/run.ts` — entrypoint do job.
- `src/jobs/contracts/sweeper/config.ts` — leitura de config (`CONTRACTS_DATABASE_URL_FILE`).
- Issue [#50](https://github.com/ERP-Bem-Comum/core-api/issues/50) — CTR-SWEEPER-CRON.
- Issue [#39](https://github.com/ERP-Bem-Comum/core-api/issues/39) — CTR-AUTO-EXPIRE.
