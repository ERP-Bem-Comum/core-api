# W1 — Implementação GREEN · CTR-CONTRACT-REGISTRATION-METADATA

> **Wave:** W1 · **Skill:** `ts-domain-modeler` (+ persistência/HTTP) · **Outcome:** 🟢 GREEN · **Data:** 2026-06-02

## Resultado

Os 5 metadados de cadastro (`classification`, `contractModel`, `category`, `costCenter`, `observations`) entram no agregado `Contract` (abordagem A — `ContractRegistration`), com a regra **R1** (teto de Ordem de Serviço), persistência completa e exposição na **borda HTTP**. **Suíte completa: 2026 testes, 2009 pass, 0 fail** (17 skipped = integração gated). `typecheck` = 0 erros.

## Camadas implementadas

### Domínio (núcleo)
- 4 VOs de enum em `domain/contract/`: `classification.ts` (`Contract`/`ServiceOrder`), `contract-model.ts` (`Service`/`Donation`), `category.ts` (`Evaluation`/`Operational`/`Process`), `cost-center.ts` (`HR`/`GeneralServices`/`Events`) — padrão `occupation-area.ts` (`parse → Result`, err `invalid-*`). **CA2**
- `types.ts`: 5 campos em `ContractRegistration` + `Create*Input` (presentes em todas as variantes, inclusive `Pending`). **CA1**
- `errors.ts`: tagged error `ContractServiceOrderExceedsCap { cap, attempted }` (Padrão D, payload de evidência). **CA3**
- `contract.ts`: helper `validateServiceOrderCap` (R1: `ServiceOrder` + `> 999_999` → err) + threading nos dois construtores.

### Application
- `contract-input-parse.ts`: helper compartilhado `parseRegistrationMetadata` (string→VO, 422 no domínio) reusado por `createContract`/`createPendingContract`/`importContracts`.

### Persistência
- `schemas/mysql.ts`: 5 colunas (`classification`/`contract_model` NOT NULL; demais nuláveis) + 4 CHECKs `IN (...)` — `varchar`, sem `ENUM` nativo (ADR-0020). **CA4**
- `contract.mapper.ts`: round-trip nos dois sentidos + tagged error `ContractMapperInvalidMetadata` (rejeita enum corrompido do banco). **CA4**
- Migration `0008_true_anita_blake.sql`: **backfill explícito** (`ADD nullable → UPDATE → MODIFY NOT NULL`) — aplica limpa em base nova e não quebra em base com dados. **CA7**

### Borda HTTP (canal primário — CA5)
- `schemas.ts`: `contractWriteShape` (body) aceita os campos como string crua (422 no domínio, espelha `contractorType`); `registrationShape` (response) usa `z.enum` (+`nullable`) → aparecem em list, detalhe e respostas de escrita.
- `contract-dto.ts`: serializa os 5 campos.
- `plugin.ts`: threading do body para `createContract`/`createPendingContract`.
- Testes novos (CA5): metadados round-trip no POST→DTO; **R1 via HTTP → 422**; `classification` inválida → 422.

### CLI / import (mínimo — CA6 descopado)
- `criar-contrato.ts` e `import-contracts.ts`: defaults (`Contract`/`Service`/null) só para manter funcionais. A UX de flags CLI / colunas CSV é **follow-up** (decisão Gabriel: canal primário é HTTP).

## Idioma
Códigos EN no domínio/API (`classification`/`category`/…); a `po-feedback/0001` usa rótulos PT (`categorizacao`/`centroDeCusto`/`Avaliação`) — tradução é responsabilidade do **BFF** (ADR-0032 §vocabulário). Sem PT no core.

## Cobertura dos CAs
| CA | Status |
| :-- | :-- |
| CA1 (campos no agregado, compile-time) | ✅ |
| CA2 (VOs `parse → Result`) | ✅ |
| CA3 (R1 `ContractServiceOrderExceedsCap`) | ✅ |
| CA4 (round-trip + rejeição de enum do banco) | ✅ |
| CA5 (POST aceita / GET retorna; 422 no domínio) | ✅ (HTTP) |
| CA6 (CLI flags) | ⏭️ descopado → follow-up (HTTP cobre a exposição) |
| CA7 (migration limpa + backfill) | ✅ |
| CA8 (integração `MYSQL_INTEGRATION=1`) | ⏳ suite cobre; roda no W3 (Docker) |

## Follow-ups registrados
- UX de flags na CLI (`--classification` etc.) + coluna de classificação no parser CSV do import.
- `import-contracts` hoje força `classification='Contract'` em todo legado — revisar com a P.O. se houver OS no dump.

## Próximo passo
W2 (code-reviewer): revisar isolamento (ADR-0014), idioma EN/PT, invariante CA1, e o backfill da migration. Depois W3 (gate + integração gated).
