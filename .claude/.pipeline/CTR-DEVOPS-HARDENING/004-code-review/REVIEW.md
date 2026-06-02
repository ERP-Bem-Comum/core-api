# W2 — Code Review (CTR-DEVOPS-HARDENING)

**Data:** 2026-06-02 · Revisão consolidada (orquestrador) sobre as 3 fatias.
**Veredito:** ✅ APPROVED com 2 pontos a validar em build/deploy real (não bloqueiam o gate).

## Conformidade verificada
- **Idioma:** código EN, docs/comentários PT-BR. ✅
- **Supply-chain:** `.npmrc` não duplica o que está em `pnpm-workspace.yaml`; `only-allow` segue via guard TS. `strict-peer-dependencies=true` validado — `pnpm install --frozen-lockfile` passa sem peer issues (INSTALL=0). ✅
- **Secrets:** MinIO sai de env var para `/run/secrets/*` (não vaza em `docker inspect`). `docker compose config -q` → exit 0. ✅
- **Imagens pinadas:** `mc` e `minio` com tag `RELEASE.*` + digest (ADR-0011). ✅
- **Idempotência (código):** `makeShutdownOnce` espelha o padrão da CLI (`main.ts`); guard `running` cobre concorrência. Testado RED→GREEN. ✅
- **Dockerfile `deps-prod`:** runtime não leva devDeps. Confirmado: zero `import 'drizzle-kit'` em `src/`; migrador usa `drizzle-orm/mysql2/migrator` (prod dep). ✅

## Pontos a validar em build/deploy real (follow-up, não bloqueia W3)
1. **`Dockerfile` copia `tsconfig.json` + `drizzle.config.ts` para o runtime** (GAP-D2 da auditoria). Como `drizzle.config.ts` referencia drizzle-kit (agora ausente do runtime), confirmar via `docker build` real que nada em runtime importa esse arquivo. O ENTRYPOINT (CLI) não o importa — risco baixo, mas só um build prova.
2. **Redução de imagem** (~924MB→alvo) — medir com `docker image ls` após build com o estágio `deps-prod`.

## Gate de processo
Mudanças de config/infra: diretas e auditáveis. Código (`shutdown-once`, `last-resort`): fail-first cumprido. Sem violação de ADR/isolamento.
