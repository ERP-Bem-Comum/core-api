# W0 — Testes RED · CTR-CONTRACT-REGISTRATION-METADATA

> **Wave:** W0 (fail-first) · **Skill:** `tdd-strategist` · **Outcome:** 🔴 RED · **Data:** 2026-06-02

## Objetivo

Estabelecer a rede RED do **núcleo de domínio** da fatia F1: os 4 VOs de enum de cadastro, os 5 campos no agregado `Contract` e a regra **R1** (teto de Ordem de Serviço). Os testes falham por **inexistência da API** (não por lógica), conforme o fail-first.

## Testes criados (6 arquivos, núcleo de domínio)

| Arquivo | Cobre | CA |
| :-- | :-- | :-- |
| `tests/modules/contracts/domain/contract/classification.test.ts` | VO `Classification` (`Contract`/`ServiceOrder`); `parse` válido/ inválido → `'invalid-classification'` | CA2 |
| `…/contract-model.test.ts` | VO `ContractModel` (`Service`/`Donation`) → `'invalid-contract-model'` | CA2 |
| `…/category.test.ts` | VO `Category` (`Evaluation`/`Operational`/`Process`) → `'invalid-category'` | CA2 |
| `…/cost-center.test.ts` | VO `CostCenter` (`HR`/`GeneralServices`/`Events`) → `'invalid-cost-center'` | CA2 |
| `…/registration-metadata-on-contract.test.ts` | `Contract.create`/`createPending` carregam os 5 campos; opcionais aceitam `null` | CA1 |
| `…/service-order-cap.test.ts` | R1: `ServiceOrder` > `999_999` → tagged error `ContractServiceOrderExceedsCap` (payload `cap`/`attempted`); no teto passa; `Contract` sem teto | CA3 |

## Decisões de modelagem ratificadas no W0 (vs. esboço do 000-request)

Ao cruzar com o código existente, dois padrões foram corrigidos no `000-request.md`:

1. **Erro de VO enum** segue `partners/.../occupation-area.ts`: `parse(raw): Result<T, 'invalid-*'>` (string literal), **não** kebab longo (`contract-*-invalid`).
2. **Erro do agregado (R1)** segue o **Padrão D — tagged errors** de `domain/contract/errors.ts` (`{ tag, …payload }` + case constructor free function), com payload de evidência (D§23): `ContractServiceOrderExceedsCap { tag, cap: Money, attempted: Money }`. **Não** é string literal.

Abordagem **A** confirmada: os 5 campos entram em `ContractRegistration` (mesmo lugar do `contractorRef`), presentes em todas as variantes inclusive `Pending`.

## Execução (prova do RED)

```
node --test --experimental-strip-types --no-warnings \
  tests/modules/contracts/domain/contract/{classification,contract-model,category,cost-center,registration-metadata-on-contract,service-order-cap}.test.ts

ℹ tests 6
ℹ pass 0
ℹ fail 6
✖ ERR_MODULE_NOT_FOUND: …/domain/contract/classification.ts
```

RED por inexistência da API (módulos de VO ainda não criados; campos/regra ausentes no agregado) — exatamente o esperado no W0.

## Cobertura adiada para sub-passos do W1 (não-órfã)

O W0 cobre o **núcleo de domínio** (fundação). Os CAs de borda/infra ganham testes RED **acoplados à sua implementação** no W1, na ordem natural de dependência (o domínio precisa existir primeiro):

- **CA4** (mapper round-trip + rejeição de enum do banco) — estender `tests/.../persistence/contract.mapper.test.ts` + `contract-repository.suite.ts`.
- **CA5** (POST aceita / GET devolve; 422 no domínio) — estender `tests/.../http/contracts-*.routes.test.ts` + `schemas`.
- **CA6** (CLI flags + formatter PT-BR) — estender `tests/cli/contracts.cli.*.test.ts`.
- **CA7** (migration limpa + backfill) / **CA8** (integração gated `MYSQL_INTEGRATION=1`) — junto da migration Drizzle Kit no W1.

Esses testes são parte do mesmo ticket; ficam registrados aqui para não serem esquecidos (regressão zero). O W1 (`ts-domain-modeler` → `drizzle-schema-author` → `application-cli-builder`) adiciona cada bloco antes da respectiva implementação.

## Próximo passo

W1 GREEN — começar pelo domínio: criar `classification.ts`/`contract-model.ts`/`category.ts`/`cost-center.ts`, adicionar os 5 campos a `ContractRegistration` + `Create*Input`, threading em `Contract.create`/`createPending`, e a regra R1 + erro `ContractServiceOrderExceedsCap` em `errors.ts`. Rodar os 6 arquivos até GREEN; depois descer para mapper → HTTP → CLI → migration.
