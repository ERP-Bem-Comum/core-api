# W0 — Testes RED (CORE-CNPJ-ALPHANUMERIC)

**Resultado:** 🔴 RED (esperado) — disciplina `tdd-strategist`.

## Testes adicionados (`tests/shared/kernel/cnpj.test.ts`)

`isValidCnpj`:
- aceita alfanumérico bare (`12ABC34501DE35`, `A1B2C3D4E5F668`) — **falha** (CA2).
- aceita alfanumérico mascarado (`12.ABC.345/01DE-35`) — **falha** (CA2).
- normaliza minúsculas antes de validar (`12abc34501de35`) — **falha** (CA3).
- rejeita DV alfanumérico incorreto (`12ABC34501DE34`) — passa (CA4).
- rejeita DV não-numérico (`12ABC34501DEAB`) — passa (CA5).

VO `Cnpj`:
- `parse('12.abc.345/01de-35')` → `'12ABC34501DE35'` — **falha** (CA3).

## RED verificado

```
node --test tests/shared/kernel/cnpj.test.ts
→ 4 fail (aceitação/normalização alfanumérica) / demais pass
```

Os DVs de todos os casos válidos foram **conferidos pela fórmula** (módulo 11, `ASCII−48`):
`12ABC34501DE → 35` bate com o exemplo oficial; `11222333000181` confirma a retrocompat.
Casos numéricos legados (CA1/CA6) seguem verdes — sem regressão introduzida pelo W0.
