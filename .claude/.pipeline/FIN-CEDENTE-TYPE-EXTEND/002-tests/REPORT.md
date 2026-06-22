# W0 — Testes RED · FIN-CEDENTE-TYPE-EXTEND (#206)

**Outcome:** RED · **Data:** 2026-06-22

**Teste:** `tests/modules/financial/domain/cedente/cedente-account.test.ts` (estendido, no-Docker).

Casos #206:
- `create({ type: 'cartao' })` → esperado ok.
- `create({ type: 'outro', typeLabel })` → esperado ok com `typeLabel` refletido.
- `create({ type: 'salario' })` → segue `invalid-account-type` (não relaxar demais).

**RED confirmado:** os dois primeiros falham — `create` devolvia `invalid-account-type` (cartao/outro fora
do `ACCOUNT_TYPES`) e `typeLabel` não existia no agregado. O caso `salario` já passava (segue inválido).
