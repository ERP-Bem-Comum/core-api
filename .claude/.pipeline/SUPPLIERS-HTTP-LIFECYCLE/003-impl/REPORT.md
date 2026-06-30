# W1 — GREEN — SUPPLIERS-HTTP-LIFECYCLE (S3)

> Skill: `ports-and-adapters`. Soft-delete de fornecedor via dois endpoints (deactivate sem body).

## Arquivos editados
- `adapters/http/composition.ts` — expõe `deactivateSupplier` + `reactivateSupplier` (writer pool).
- `adapters/http/supplier-plugin.ts` — `POST /:id/deactivate` + `POST /:id/reactivate` (sem body); reusa `sendWriteError` (sets já incluíam os códigos).

## Decisões
- Dois endpoints (decisão do épico v1), não toggle-active.
- Supplier não tem `disableBy` → deactivate sem body.

## Saída literal do gate (encadeado, exit 0)
```
$ tsc --noEmit            (zero)
$ prettier --check .      All matched files use Prettier code style!
$ eslint .                (zero)
ℹ tests 2065
ℹ pass 2048
ℹ fail 0
ℹ skipped 17
```
Teste S3 isolado: 7 · pass 7 · fail 0.
→ GREEN: zero regressão (2048 = 2041 + 7 novos).

## Próximo passo
W2 (REVIEW).
