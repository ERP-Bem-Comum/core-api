# W1 — REPORT (GREEN) · BGP-LEGACY-ID-DUP-ASSERT (#520)

## Fix (test-only, 1 asserção → predicado)

`legacy-id.drizzle-mysql.test.ts` CA3 (linha 255): `RegExp /duplicate/i` → predicado que assere
`cause?.errno === 1062` (ER_DUP_ENTRY), reusando o molde canônico
`financial/.../payable-paid-at-check.drizzle-mysql.test.ts:87-92`. Uma edição no corpo do `for`, cobre
as 6 tabelas `bgp_*`.

## RED→GREEN contra MySQL 8.4 real (x99 isolado, mesmo banco)

- ANTES (matcher `/duplicate/i`): CA3 = 6 fail (`expected: /duplicate/i`).
- DEPOIS (predicado `cause.errno===1062`): CA3 = 6 pass · arquivo 37/37.
- Suíte `budget-plans` completa: **109 tests · 109 pass · 0 fail** (era 103/6).

## Não-afrouxamento

`cause?.errno === 1062` é MAIS estrito que o substring `/duplicate/i`: exige o código de erro exato do
MySQL. Se a UNIQUE fosse dropada → sem throw → `assert.rejects` falharia. CA2 (2× NULL, `doesNotReject`)
e CA4 (regressão nativa) intactos.

## Gates estáticos

`typecheck` ✅ · `format:check` ✅ · `lint` ✅. Só o módulo `budget-plans` tocado (ADR-0014).
