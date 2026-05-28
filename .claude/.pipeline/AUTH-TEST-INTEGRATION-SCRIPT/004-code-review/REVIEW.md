# Validação cruzada (W2) — AUTH-TEST-INTEGRATION-SCRIPT — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (Claude) · **Data:** 2026-05-28
**Escopo:** `package.json` (script `test:integration:auth`) + `tests/scripts/test-integration-auth-script.test.ts`.

## Conformidade
| Item | Resultado |
| :-- | :-- |
| Script espelha `test:integration` (secrets test-only + `docker compose up -d mysql --wait`) | ✅ |
| `--test-concurrency=1` — evita colisão no `truncateAll` (beforeEach) entre as 4 suites no DB `core` | ✅ |
| Cleanup robusto: captura `rc=$?`, `docker compose down -v`, `rm -f secrets/mysql_*.txt`, `exit $rc` (preserva exit real) | ✅ |
| Globs cobrem exatamente os 4 alvos gated de auth | ✅ |
| Teste de tooling: `JSON.parse` com cast tipado (`Record<string,string>`, sem `any`); `?? ''` cobre `noUncheckedIndexedAccess` | ✅ |
| ADR-0012 (`pnpm`, sem `npm`) · ADR-0020 (MySQL único) · idioma (doc PT / código EN) | ✅ |
| Não toca `src/` — é tooling de teste | ✅ |

## Issues
Nenhuma 🔴/🟡.

🔵 (não-bloqueante):
- **String-matching no teste de config:** os asserts validam propriedades do script via regex (env, concurrency, alvos, cleanup), não comportamento. É frágil a um refactor cosmético do script — mas é exatamente o guard pretendido (script sumir/perder um alvo = regressão detectada). Aceitável para tooling.
- **Duplicação das 3 senhas test-only** entre `test:integration` e `test:integration:auth`. Extrair para um helper (`setup-test-secrets`) reduziria repetição, mas o `test:integration` original já carrega essa duplicação inline — refactor transversal fora do escopo deste ticket.

## Próximo passo
- **APPROVED** → W3 (`ts-quality-checker`): gate completo (`typecheck`/`format:check`/`lint`/`pnpm test`). O comportamento de integração já foi exercido no W1 (29/29 verde); W3 reconfirma que a suíte unit segue verde com o teste novo.
