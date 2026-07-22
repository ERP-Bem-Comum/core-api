# W0 — Testes RED · AUTH-EMAIL-LINK-BASE-URLS

**Skill:** tdd-strategist · **Data:** 2026-07-02 · **Resultado: RED ✅ (falha por inexistência da API)**

## Arquivo de teste

`tests/shared/http/email-link-base-urls.test.ts` — 8 casos cobrindo CA1/CA3/CA4/CA5 das issues #331/#332:

| Caso | CA | O que garante |
| --- | --- | --- |
| 3 envs válidas fluem | CA4 | `AUTH_RESET_BASE_URL`/`AUTH_ACTIVATION_BASE_URL`/`PARTNERS_AUTOCADASTRO_BASE_URL` → campos correspondentes |
| Sem protocolo rejeitado | CA1 | O bug real de prod (`erp.abemcomum.org`) falha com o nome da env + "URL absoluta http" |
| `ftp://`, `javascript:`, whitespace | CA3 | Só `http:`/`https:` passam |
| Dev sem envs → `{}` | CA5 | Defaults de dev preservados fora de produção (chaves omitidas, `exactOptionalPropertyTypes`) |
| Prod sem envs → 3 erros | CA5 | Fail-fast em produção, um erro POR env ausente |
| Prod com env vazia | CA5 | String vazia conta como ausente |
| Acúmulo de erros | — | Inválida + ausente aparecem juntas (DX de operação) |
| Base com path/porta | CA2 | Valor aceito como está (use case só concatena `?token=`) |

## Evidência RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/shared/http/email-link-base-urls.ts'
  imported from .../tests/shared/http/email-link-base-urls.test.ts
ℹ pass 0 · ✖ fail 1
```

Falha exclusivamente por inexistência de `src/shared/http/email-link-base-urls.ts` — nenhum `src/` foi tocado. API alvo: `readEmailLinkBaseUrls(env): Result<EmailLinkBaseUrls, readonly string[]>` (usa `Result` de `src/shared/primitives/result.ts`).

## Cobertura deliberadamente NÃO duplicada

- `resetUrl`/`activationUrl`/`autocadastroUrl` com token: já cobertos por `request-password-reset.test.ts:75`, `create-user-by-admin.test.ts:191`, `issue-collaborator-invite-outbox.test.ts:74`.
- Exit code 78 do `server.ts`: composition root imperativo — coberto por revisão no W2 (o comportamento testável vive no helper).

## Nota de baseline

`dev` HEAD `038c7313` já estava vermelha no typecheck ANTES deste ticket (backfill/ETL não-commitado do humano — ver `000-request.md`). Este W0 roda o arquivo de teste isolado, sem depender do typecheck global.
