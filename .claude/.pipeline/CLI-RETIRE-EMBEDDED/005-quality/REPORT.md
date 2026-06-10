# 005 — W3 (quality gate) — CLI-RETIRE-EMBEDDED

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` | ✅ sem erros |
| Format | `pnpm run format:check` | ✅ Prettier clean |
| Lint | `pnpm run lint` | ✅ sem erros |
| Test (unit) | `pnpm test` | ✅ **2535 pass / 0 fail / 17 skipped** (2552 total) |
| Integração | `pnpm run test:integration` (MySQL real) | ✅ **79/79** (worker CA-I1/I2 intactos) |
| Entrypoint HTTP | `node src/server.ts` (smoke local) | ✅ boota, serve HTTP (404 em `/`), SIGTERM graceful |
| Worker | `node …/worker/run.ts` sem env (smoke) | ✅ exit 78 (EX_CONFIG) + erro no stderr |

## Build da imagem (CA-3) — ✅ executado e verde

`docker compose --profile app build` **rodado** (2026-06-10): `Image core-api:dev Built` —
multi-stage completo (deps → runtime, `COPY src`, user não-root, `ENTRYPOINT ["tini","--","node",
"src/server.ts"]`). Único aviso: `useradd: app's uid 10001 > SYS_UID_MAX 999` — intencional (Dockerfile
escolhe UID fora do range Debian, comentado). CA-3 selado.

Pendente (opcional): smoke `docker run` da imagem (server bootando DENTRO do container) — o boot do alvo
`src/server.ts` já foi provado localmente no W3; a execução do container fica a critério do operador.

## Conclusão

W3 GREEN. CLI embutida arrancada; worker do outbox preservado como entrypoint standalone próprio;
deploy repontado para HTTP. Domínio/application/persistência/HTTP intactos. Ticket pronto para `close`.

Follow-up (não-bloqueante): higiene de doc — refs à CLI/`application-cli-builder` em `.claude/skills/*`
(nodejs-*, ports-and-adapters, modular-monolith) e a própria skill `application-cli-builder`.
