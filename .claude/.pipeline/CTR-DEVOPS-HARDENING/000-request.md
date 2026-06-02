# CTR-DEVOPS-HARDENING — hardening de DevOps (CI, container, supply-chain, runtime)

> **Size:** L · **Origem:** pedido do dono (2026-06-02) "fazer todo o DevOps com carinho" + auditoria read-only dos agentes `docker-compose-expert`, `nodejs-runtime-expert`, `pnpm-workspace-expert`.
> **Escopo aprovado:** "tudo aplicável agora" (P0 + P1 + P2 que **não** dependem do servidor HTTP virar entrypoint de produção).

## Contexto

O DevOps do core-api está, no geral, sólido (Dockerfile multi-stage com digest pin, `tini` PID 1, `STOPSIGNAL SIGTERM`, compose MySQL+MinIO com healthchecks reais, `pnpm-workspace.yaml` de supply-chain excelente). A auditoria dos 3 agentes especialistas levantou gaps pontuais mas relevantes — este ticket os fecha.

## Escopo por fatia (arquivos disjuntos → executável em paralelo)

### Fatia PNPM/CI (`pnpm-workspace-expert`)
1. **[P0] Criar `.github/workflows/test-and-quality.yml`** — Node 24 + corepack `pnpm@11.5.0` + cache do store; gates em ordem: `typecheck → format:check → lint → audit → test → test:integration`; trigger push `main` + PR. Espelha o padrão do `deploy-docs.yml`.
2. **[P0] Completar `.npmrc`** — adicionar `audit-level=high`, `strict-peer-dependencies=true` (e demais hardening que **não** conflite com o que já está em `pnpm-workspace.yaml`; `only-allow` já é coberto pelo guard `scripts/only-allow-pnpm.ts`).
3. **[P1] `package.json`** — scripts `audit` (`pnpm audit --audit-level=high`) e `outdated`.

### Fatia DOCKER (`docker-compose-expert`)
4. **[P0] MinIO via secrets** (`compose.yaml`) — `MINIO_ROOT_USER/PASSWORD` → `*_FILE` + bloco `secrets:`; `minio-bootstrap` lê de `/run/secrets/*`. Atualizar `scripts/setup-secrets.ts` para gerar `minio_root_user.txt`/`minio_root_password.txt`.
5. **[P0] Pinar `minio/mc:latest`** com digest (`compose.yaml`).
6. **[P1] `minio/minio`** — tag semântica (`RELEASE.*`) + digest, no padrão do `mysql:8.4@sha256:`.
7. **[P1] Dockerfile** — estágio `deps-prod` (`pnpm install --frozen-lockfile --prod --ignore-scripts`) p/ o runtime não levar devDependencies; **adicionar `--enable-source-maps`** ao `NODE_OPTIONS`.
8. **[P1] `.dockerignore`** — excluir `tests/` por completo.

### Fatia NODE (`nodejs-runtime-expert`) — única fatia com código de produção (exige W0 RED)
9. **[P1] `src/server.ts`** — `shutdownOnce` idempotente (guard booleano), usado nos handlers de sinal e no `installLastResortHandlers`.
10. **[P2] `src/shared/runtime/last-resort.ts`** — preservar stack completo em `uncaughtException` (`cause instanceof Error ? cause.stack : String(cause)`).
11. **[P2] `.env.example`** — variáveis esperadas por `src/server.ts` (sem valores reais).

## Fora de escopo (depende de HTTP virar entrypoint de prod — fica para ADR/ticket futuro)
- Ativar `HEALTHCHECK` no Dockerfile (porta 3000) + target `runtime-http`.
- Healthcheck do serviço `app` no compose / liveness do outbox worker daemon.
- ADR formal para `--experimental-strip-types` em produção (recomendado abrir, mas é doc, não bloqueia).

## Disciplina de waves
- Itens de **config/infra/docs** (1-8, 11): mudança direta auditável (CLAUDE.md §"config pode ir direto"), validada no gate W3.
- Itens de **código de produção** (9, 10): **W0 RED** antes de tocar `src/` (teste de idempotência do shutdown; teste do stack trace).
- W3 final: `typecheck + format:check + lint + test` verdes; CI workflow validado por sintaxe.
