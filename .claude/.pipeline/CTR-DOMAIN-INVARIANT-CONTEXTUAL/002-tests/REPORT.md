# W0 RED — REPORT
## Ticket: CTR-DOMAIN-INVARIANT-CONTEXTUAL
## Skill: tdd-strategist
## Data: 2026-05-20

---

## Resumo

Wave W0 RED executada. Todos os testes novos falham pelos motivos esperados. Nenhum arquivo em src/ foi tocado.

Estatísticas finais:

  tests 634 / suites 211 / pass 618 / fail 3 / cancelled 0 / skipped 13 / duration_ms 65112

---

## Falhas RED (esperadas)

### 1 — non-zero-money.test.ts (arquivo inteiro)

Motivo: ERR_MODULE_NOT_FOUND — non-zero-money.ts ainda nao existe em src/.

  Error [ERR_MODULE_NOT_FOUND]: Cannot find module
    /src/modules/contracts/domain/shared/non-zero-money.ts

Todos os 8 casos ficaram inacessíveis por este erro.

### 2 — Row Addition + impactValueCents = 0

Arquivo: tests/modules/contracts/adapters/persistence/amendment.mapper.test.ts

Motivo: mapper atual retorna ok(Money.ZERO) sem rejeitar o shape impossível.

  AssertionError: Row Addition + impactValueCents = 0 deve ser rejeitado
    false !== true

### 3 — Row Suppression + impactValueCents = 0

Mesmo arquivo. Motivo idêntico para Suppression.

  AssertionError: Row Suppression + impactValueCents = 0 deve ser rejeitado
    false !== true

---

## Erros de typecheck (RED adicional)

  tests/modules/contracts/domain/amendment/amendment.test.ts(671,5):
    error TS2578: Unused @ts-expect-error directive.

  tests/modules/contracts/domain/shared/non-zero-money.test.ts(19,31):
    error TS2307: Cannot find module non-zero-money.ts

  tests/modules/contracts/domain/shared/non-zero-money.test.ts(136,5):
    error TS2578: Unused @ts-expect-error directive.

CA3 (linha 671): Unused porque Amendment.create ainda aceita Money cru.
Em W1: types.ts muda para NonZeroMoney — @ts-expect-error suprime erro real — verde.

---

## Arquivos tocados (apenas tests/)

| Arquivo | Acao | CAs |
| tests/…/shared/non-zero-money.test.ts | CRIADO | CA1, CA2, CA5 |
| tests/…/amendment/amendment.test.ts | AJUSTADO | CA3 + comentarios |
| tests/…/use-cases/create-amendment.test.ts | AJUSTADO | CA6 (comentario) |
| tests/…/persistence/amendment.mapper.test.ts | AJUSTADO | CA7 (2 novos) |

Nenhum arquivo em src/ tocado.

---

## Cobertura de CAs

CA1 — NonZeroMoney VO: RED (Cannot find module)
CA2 — from() retorna Result: RED (Cannot find module)
CA3 — AmendmentVariant exige NonZeroMoney: RED (TS2578 Unused @ts-expect-error)
CA5 — Polimorfismo Money/NonZeroMoney: RED (Cannot find module)
CA6 — Use case refina via NonZeroMoney.from: ANOTADO (teste existente passa)
CA7 — Mapper rejeita Addition/Suppression+0: RED (false !== true, 2 casos)
CA4, CA8, CA9 verificados em W1/W3.

---

## Proximo passo

W1 GREEN — skill ts-domain-modeler:
1. Criar src/modules/contracts/domain/shared/non-zero-money.ts
2. Atualizar types.ts — impactValue: NonZeroMoney em Addition/Suppression
3. Atualizar amendment.ts — remover if (input.impactValue.cents === 0)
4. Atualizar create-amendment.ts — NonZeroMoney.from na borda (rota gamma)
5. Atualizar amendment.mapper.ts — variantFromRow rehidrata via NonZeroMoney
6. Remover os dois testes rejects impactValue of zero de amendment.test.ts
