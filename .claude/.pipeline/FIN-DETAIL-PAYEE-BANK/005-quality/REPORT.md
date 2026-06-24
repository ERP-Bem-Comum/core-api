# W3 — FIN-DETAIL-PAYEE-BANK (#255)

**Resultado:** ALL-GREEN ✅ (`ts-quality-checker`)

```
pnpm run typecheck     → tsc --noEmit, sem erros
pnpm run format:check  → All matched files use Prettier code style!
pnpm run lint          → eslint ., exit 0
pnpm test              → tests 3176 · pass 3158 · fail 0 · skipped 18
```

Baseline anterior: 3172 tests (+4 do ticket). Integração (18 skip) atrás de opt-in `MYSQL_INTEGRATION`.

## Nota de gate (resolvido)
Durante o W3, `eslint .` acusou parsing error em `scripts/projects/stamp-project-dates.mjs` — arquivo **untracked, fora do ticket** (causa: `projectService` não cobre `.mjs` em `scripts/`). Não era regressão do diff (CI não o veria). Decisão do humano: **descartar o script**. Removido → `eslint .` verde. Os 4 erros `require-await` (fakes do teste W0) foram corrigidos com `Promise.resolve` (require-await não está nas regras relaxadas de `tests/**`).

## Encerramento
4 waves done. #255 entregue: `payeeBank` no `GET /documents/:id` via composição síncrona (ADR-0032), só para favorecido `supplier`, com degradação graciosa.
