# CTR-SWEEPER-CRON — containerizar + agendar o job `contracts-sweeper`

> Origem: **GitHub Issue #50** (`contracts:infra:sweeper-cron`). Materializa a peça de infra que o ADR-0041 deixou para ERP-INFRA, ligando a feature #39 (auto-expire) em produção.

## Contexto

O job one-shot `contracts-sweeper` (`src/jobs/contracts/sweeper/run.ts`) já existe e roda via `pnpm run job:contracts:sweep`. Falta a infra que o dispara: **serviço no `compose.yaml`** + **secret** + **doc de agendamento**.

## Já entregue (FORA do escopo deste ticket — não refazer)

- ✅ **CA5** — `CONTRACTS_DATABASE_URL_FILE` (Docker secret) no `readJobConfig` (`config.ts`, mutuamente exclusivo com `CONTRACTS_DATABASE_URL`) — entregue por `CTR-SWEEPER-DBURL-FILE`.
- ✅ **CA2** — exit `78` (EX_CONFIG) em config inválida (`run.ts:28,35`).
- ✅ **CA6** — `applyMigrations: false` (prod-safe; schema migrado pelo release) (`run.ts:42`).

## Escopo (infra — size S)

1. **Serviço `contracts-sweeper` no `compose.yaml`**, modelado no `app` (reusa imagem) + `minio-bootstrap` (one-shot):
   - `profiles: [jobs]` (opt-in — não sobe no `up` default)
   - `restart: "no"` (one-shot puro — ADR-0041; retry = próximo tick do cron)
   - `command: ["src/jobs/contracts/sweeper/run.ts"]`
   - `depends_on: mysql: { condition: service_healthy }`
   - `secrets: [contracts_database_url]` + env `CONTRACTS_DATABASE_URL_FILE: /run/secrets/contracts_database_url`
   - `security_opt: [no-new-privileges:true]` · `networks: [core-api]`
2. **Secret `contracts_database_url`** — declarado em `secrets:` do compose (`file: ./secrets/contracts_database_url.txt`) + gerado por `scripts/setup-secrets.ts`.
3. **Doc de disparo** (ERP-INFRA): `docker compose --profile jobs run --rm contracts-sweeper` agendado 1×/dia 00:05 America/Sao_Paulo; exit 1/78 → alerta, sem restart loop.

## Critérios de aceite

- **CA1 (config)** — o serviço `contracts-sweeper` existe no compose (com `--profile jobs`) com `restart:"no"`, `profiles:[jobs]`, `depends_on mysql:service_healthy`, secret `contracts_database_url`, `security_opt no-new-privileges`. (sintaxe — `docker compose config`)
- **CA3 (opt-in)** — `docker compose config --services` **sem** `--profile jobs` **não** lista `contracts-sweeper`.
- **CA-secret** — secret top-level `contracts_database_url` declarado + `setup-secrets` gera `./secrets/contracts_database_url.txt`.
- **CA-exit (bootstrap, gated `COMPOSE_INTEGRATION`)** — `... run --rm contracts-sweeper` sem URL → exit `78`; com URL válida + contratos vencidos → exit `0` + `Expired`.
- **CA-doc** — fluxo de disparo + alerta documentado.

## DoD

- W0 RED → W1 GREEN → W2 review → W3 gate.
- `docker compose config` válido; `secrets:setup` gera o arquivo; gate W3 verde se tocar `src/`.
- Sem regressão (contagem de testes ≥ baseline). `Closes #50` no PR.
