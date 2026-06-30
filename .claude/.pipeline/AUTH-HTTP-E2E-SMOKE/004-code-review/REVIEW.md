# Code Review — AUTH-HTTP-E2E-SMOKE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-28
**Escopo:** `tests/e2e/auth-smoke.e2e.ts`, `scripts/e2e-auth.sh`, `package.json` (scripts)

---

## Verificação

| Item | Resultado |
| :-- | :-- |
| Cliente real (Node + fetch, não app.inject) | ✅ `fetch` global contra `E2E_BASE_URL`; espelha o BFF/front |
| Server real + MySQL real (produção-like) | ✅ `AUTH_DRIVER=mysql` via compose; branch mysql do composition exercitado |
| Teardown garantido | ✅ `trap cleanup EXIT` (mata server, `down -v`, rm secrets) — confirmado limpo após o run |
| Isolamento do gate padrão (CA9) | ✅ sufixo `.e2e.ts` fora do glob `tests/**/*.test.ts`; só roda via `test:e2e:auth` |
| Sem segredo hardcoded sensível | ✅ secrets de teste efêmeros (mesmo padrão `test:integration:auth`), removidos no teardown |
| Fluxo cobre o contrato | ✅ register(201)/login(200)/me(200 vs 401)/refresh(200 rotação)/logout(204)/refresh-revogado(401) |
| Sem dep nova | ✅ fetch é global no Node 24 |

## Observações
- Email único por run (`e2e-${Date.now()}`) evita colisão de PK no MySQL entre execuções sem `down -v`.
- `disown` no server: saída limpa (sem "Terminated: 15"); cleanup do `trap` segue funcional via PID.
- `node:test` com fluxo dependente num único `it()` (CA2-CA7) — robusto p/ E2E (sem depender de ordem entre `it()`s).

## O que está bom
- Prova end-to-end real fecha o gap do branch `mysql` do composition (unitários só cobriam memory).
- `trap` garante ambiente limpo mesmo em falha — sem container/processo/secret órfão.

## Issues
Nenhuma. → W3.
