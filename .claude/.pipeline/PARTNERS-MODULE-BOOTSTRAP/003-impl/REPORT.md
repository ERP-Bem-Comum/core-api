# W1 — GREEN · PARTNERS-MODULE-BOOTSTRAP

> Agente: ts-domain-modeler · Resultado: **GREEN** (28/28 testes do W0 passam)

## Arquivos criados/editados

| Arquivo | Mudança |
| :--- | :--- |
| `src/shared/kernel/cpf.ts` (novo) | VO `Cpf` (Padrão D). `parse(raw): Result<Cpf, 'invalid-cpf'>` — normaliza máscara, valida 11 dígitos + DV módulo 11, rejeita sequência repetida. Sem `generate`. |
| `src/shared/kernel/cnpj.ts` (editado) | Adicionado VO `Cnpj` + `parse(raw): Result<Cnpj, 'invalid-cnpj'>`, **reusando** `isValidCnpj` e `onlyDigits` existentes. `isValidCnpj` mantido exportado (sem regressão). |
| `src/modules/partners/public-api/refs.ts` (novo) | `SupplierRef`/`FinancierRef`/`CollaboratorRef` (branded, rehydrate-only, UUID v4). Helper privado `rehydrateAs<B>`; erro `'partner-ref-invalid'`. |
| `src/modules/partners/public-api/index.ts` (novo) | Barrel do public-api — exporta os tipos das refs (eventos/read models virão nos tickets de agregado). |
| `src/shared/kernel/index.ts` (editado) | Barrel do kernel + exemplos de import namespace dos novos VOs. |

## Decisões de design (YAGNI estrito)

- **CPF/CNPJ replicam o algoritmo módulo 11** localmente (não importam de `financial/domain/shared/tax-id.ts`) — isolamento de módulos (ADR-0006), mesma justificativa já documentada no `cnpj.ts`.
- **`Cnpj.parse` reusa `isValidCnpj`** em vez de duplicar a validação — uma fonte só de verdade do DV.
- **Refs como namespace-objetos** (`SupplierRef.rehydrate`) em vez de 3 módulos separados — os três são idênticos (UUID v4); um helper privado evita repetição. `rehydrate`-only honra ADR-0031 §7 (ID nasce em `partners`).
- **`Email` deliberadamente fora** — vive em `auth`; promoção ao kernel é ticket próprio (escopo do 000-request).

## Execução

```
ℹ tests 28
ℹ pass 28
ℹ fail 0
```

Inclui a regressão de `isValidCnpj` (verde) — evoluir o `cnpj.ts` não quebrou o import de contratos legados.
