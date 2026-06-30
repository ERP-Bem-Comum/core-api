# W0 — Testes RED (FIN-PAYEE-KIND)

Skill: `tdd-strategist`. RED por inexistência de `payeeKind`.

## Testes

- `tests/modules/financial/adapters/http/payee-kind.http.test.ts` (novo, 3):
  - CA1 create `payeeKind:'financier'` → GET ecoa — falha: detail não tem `payeeKind`.
  - CA2 create sem `payeeKind` → default `'supplier'` — falha idem.
  - CA4 `payeeKind` inválido → 400 — falha: borda aceita (`201`).
- (use-case + back-compat cobertos no W1 via testes adicionais em save-document.test.ts e na suíte de integração.)

RED: `actual: 201, expected: 400` + `payeeKind` undefined no detail. Próximo: W1.
