# Code Review — CTR-SWEEPER-CRON

**Veredito round 1:** CHANGES-REQUESTED (2 Major + 2 Minor) · **Veredito round 2:** ✅ APPROVED (ver seção final)
**Reviewers:** `security-backend-expert` (segurança do compose/secret) + `code-reviewer` (qualidade — orquestrador)
**Data:** 2026-06-16
**Escopo:** `compose.yaml` (serviço `contracts-sweeper` + secret), `scripts/setup-secrets.ts`, `handbook/infrastructure/06-contracts-sweeper-job.md`, `tests/infra/contracts-sweeper-compose.test.ts`, contexto `src/jobs/contracts/sweeper/{run,config}.ts`.

---

## Segurança (security-backend-expert)

### 🔴 Major

| ID | Arquivo | Problema | Fix |
| :-- | :-- | :-- | :-- |
| **M1** | `scripts/setup-secrets.ts:274` | `contracts_database_url.txt` gerado `0o644` (**world-readable**) — contém a senha do DB na URL. Os 3 secrets de senha bruta usam 0644 por restrição do initdb (`gosu`/uid 999) — **não se aplica** aqui (único consumidor é o container via `/run/secrets`, montado `0444` pelo Docker) | `0o600` + comentário explicando a distinção |
| **M2** | `compose.yaml:188` | `container_name: core-api-contracts-sweeper` **fixo** → se um disparo ficar sem `--rm` (falha/variante), o próximo aborta com *"container name already in use"* → **o cron para de expirar silenciosamente** (falha de agendamento mascarada). Risco operacional direto: contratos vencidos acumulam | Remover `container_name` (Docker gera nome) + nota de cleanup no runbook |

> **M2 conecta com a discussão de confiabilidade**: é uma 5ª via de "o cron deixa de disparar" — agora detectável, mas evitável de custo zero removendo o `container_name`.

### 🔵 Minor

| ID | Arquivo | Problema | Fix |
| :-- | :-- | :-- | :-- |
| **m1** | runbook `:45` | exemplo com `--build` pode disparar rebuild em **prod** (host sem fonte → falha; ou build de estado não-versionado) | marcar `--build` como **só-dev**; linha de prod sem `--build` |
| **m2** | `compose.yaml:181-204` | falta `cap_drop:[ALL]` + `read_only:true` (+ `tmpfs:[/tmp]`) — hardening proporcional p/ job one-shot que só conecta ao MySQL e sai | adicionar (custo zero; `mysql2` não escreve em disco) |

### ✅ Confirmações positivas (segurança)
Senha **não** vaza em `docker inspect`/env (só o path `_FILE`) nem em log (`run.ts` loga slug opaco); `_FILE` mutuamente exclusivo (`config.ts:57`); não-root (`USER app:app` herdado) + `no-new-privileges:true`; `applyMigrations:false`; `.gitignore`/`.dockerignore` cobrem `secrets/`; `restart:"no"` + `profiles:[jobs]` alinhados ao ADR-0041.

### Fora de escopo (registrar à parte)
`minio-bootstrap:72` — `mc anonymous set download` (bucket público em dev). Pré-existente, não deste diff — candidato a `issue-report` / nota em ADR-0019.

---

## Qualidade (code-reviewer)

Sem novos achados de qualidade — os principais foram pegos e corrigidos **na própria W1**:
- 🐞 **bug do entrypoint** (`command` anexado ao `ENTRYPOINT` rodaria `server.ts`) → corrigido com override `entrypoint:[tini,--,node]` + teste de regressão `CA1g`.
- lint (`init-declarations` no `setup-secrets`; `prefer-includes` no teste) → corrigido.

Teste de config sólido (8 casos, sintaxe sem subir container, skip-guard). Runbook completo (+ seção dead-man's switch → SPIKE #66). Código do bloco contracts em `setup-secrets` limpo (try/catch unificado).

---

## Plano de ação (round 2)

**Bloqueante:** M1 (`0o600`) · M2 (remover `container_name` + nota runbook).
**Mesmo round (barato):** m1 (`--build` só-dev) · m2 (`cap_drop`/`read_only`/`tmpfs`).

---

## Round 2 — Re-revisão (2026-06-16) — ✅ APPROVED

Os 4 achados endereçados, cada fix literal à recomendação + teste de regressão onde aplicável:

| # | Fix aplicado | Arquivo | Teste |
| :- | :- | :- | :- |
| M1 | `0o600` no `contracts_database_url.txt` (+ comentário da distinção vs os 0644 do initdb) | `setup-secrets.ts` | — (o container lê via `/run/secrets` montado `0444`) |
| M2 | `container_name` **removido** (Docker gera nome único) + nota no runbook ("sempre `--rm`") | `compose.yaml`, runbook | **CA1h** (config sem `container_name`) |
| m1 | `--build` marcado **só-dev**; linha de prod sem `--build` | runbook | — |
| m2 | `cap_drop:[ALL]` + `read_only:true` + `tmpfs:[/tmp]` | `compose.yaml` | **CA1i** (cap_drop ALL + read_only) |

**Validação:** config resolvido → `container_name: undefined · cap_drop: ["ALL"] · read_only: true`. Teste **10/10** (CA1a–i + CA3). `typecheck` ✅ · `lint` 0 errors · `format:check` ✅ · `docker compose config` (default + jobs) exit 0.

**Nota de confiabilidade:** o M2 eliminou uma 5ª via de "o cron deixa de disparar" (conflito de nome mascarando falha de agendamento) — alinhado à preocupação do P.O.

## Próximo passo
APPROVED → **W3** (gate final). Inclui validar o **CA-exit** (rodar o container → exit 78 sem URL · exit 0 + `Expired` com URL) via `docker compose --profile jobs run`, gated por `COMPOSE_INTEGRATION`.
