# W0 — RED · PARTNERS-MODULE-BOOTSTRAP

> Agente: tdd-strategist · Resultado: **RED** (API nova inexistente)

## Arquivos de teste

| Arquivo | Cobre |
| :--- | :--- |
| `tests/shared/kernel/cpf.test.ts` (novo) | `Cpf.parse` — Padrão D namespace; aceita CPF válido bare/mascarado, normaliza; rejeita DV inválido, comprimento != 11, sequência repetida, não-dígitos. Erro `'invalid-cpf'`. |
| `tests/shared/kernel/cnpj.test.ts` (estendido) | `Cnpj.parse` (VO) — válido bare/mascarado, normaliza, rejeita inválido com `'invalid-cnpj'`; smoke Padrão D; **mantém `isValidCnpj` exportado** (regressão). |
| `tests/modules/partners/public-api/refs.test.ts` (novo) | `SupplierRef`/`FinancierRef`/`CollaboratorRef.rehydrate` — UUID v4 válido aceito; vazio/não-UUID/v1 rejeitados; sem `generate`. |

## Execução

```
ℹ tests 13
ℹ pass 7     ← regressão isValidCnpj (6) + "mantém isValidCnpj exportado" (1)
ℹ fail 6     ← Cpf.* (arquivo não carrega: cpf.ts inexistente)
              + refs.* (arquivo não carrega: partners/public-api/refs.ts inexistente)
              + Cnpj VO (parse não é função: 4)
```

Falhas representativas:
- `TypeError: Cnpj.parse is not a function` — VO ainda não evoluído do predicado.
- Import error em `#src/shared/kernel/cpf.ts` e `#src/modules/partners/public-api/refs.ts` — arquivos inexistentes.

## Veredito

RED legítimo: toda falha decorre da **ausência da API** a implementar, não de teste fraco. Os 7
verdes são exclusivamente a regressão de `isValidCnpj` (garante que evoluir o `cnpj.ts` não quebra
o import de contratos legados). Liberado para W1.
