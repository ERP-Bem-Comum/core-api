# CTR-CONTRACT-REGISTRATION-METADATA — metadados de cadastro no agregado `Contract` + teto de OS (R1)

> **Size:** M · **Fatia F1 de** [`EPIC-CONTRACTS-V2-PARITY-GAP`](../../.planning/EPIC-CONTRACTS-V2-PARITY-GAP.md) · **Origem:** [ADR-0032](../../../handbook/architecture/adr/0032-transient-http-composition-read-until-bff.md) ("atributo do próprio contrato → evolui o agregado", `:42`) + [`po-feedback/0001`](../../../handbook/po-feedback/0001-gap-api-v2-contracts.md) (Bucket C #1, R1).

## Contexto

A v1 mantinha no formulário de contrato campos de **cadastro** que o agregado novo não modela: classificação (Contrato/Ordem de Serviço), modelo (Serviço/Doação), categoria, centro de custo e observações. A ADR-0032 fixa que esses são **atributos do próprio contrato** (não dado de outro módulo) e portanto **evoluem o agregado** — modelagem legítima. Sem `classification` não há como aplicar a regra **R1** (teto de Ordem de Serviço ≤ R$ 9.999,99), que o `po-feedback/0001` lista como bloqueada justamente por isso.

`email`/`telefone`/banco/PIX do contratado **não** entram aqui (são de Parceiros, compostos na borda pelo `CTR-HTTP-CONTRACT-DETAIL-CONTRACTOR`).

## Escopo (domínio + persistência + borda + CLI)

1. **Enums (VOs) com smart constructor `Result<T,E>`** — literais EN; rótulo PT-BR só no formatter/DTO:
   - `classification`: `'Contract' | 'ServiceOrder'`
   - `contractModel`: `'Service' | 'Donation'`
   - `category`: `'Evaluation' | 'Operational' | 'Process'` (PT: Avaliação/Operacional/Processo)
   - `costCenter`: `'HR' | 'GeneralServices' | 'Events'` (PT: RH/Serviços Gerais/Eventos)
2. **Agregado.** Os 5 campos entram em `ContractRegistration` (`domain/contract/types.ts`) — abordagem A, mesmo lugar do `contractorRef`. `classification`/`contractModel` obrigatórios; `category`/`costCenter`/`observations` (`string | null`) opcionais. Presentes em todas as variantes, inclusive `Pending`.
3. **R1 (teto de OS).** Em `Contract.create`/`createPending`: `classification === 'ServiceOrder' && originalValue.cents > 999_999` → tagged error `ContractServiceOrderExceedsCap` (Padrão D em `domain/contract/errors.ts`, com payload de evidência `cap`/`attempted` — D§23). Nunca persiste.
4. **Inputs.** `CreateContractInput` e `CreatePendingContractInput` ganham os 5 campos; `createContract`/`createPendingContract` repassam.
5. **Persistência (`ctr_*`).** Colunas `classification`/`contract_model`/`category`/`cost_center` (`varchar` curto, **sem `ENUM` nativo** — ADR-0020) + `observations` (`varchar`/`text`). Mapper row↔domínio rejeita valor fora do conjunto com `Result` err. **Migration** Drizzle Kit; obrigatórios com backfill (ver Decisão).
6. **Borda HTTP (ADR-0027).** `createContractBodySchema` aceita os campos (strings cruas → 422 via smart constructor, padrão do `contractorType`); `registrationShape` (response) ganha os 5 → aparecem em list, detalhe e respostas de escrita.
7. **CLI.** Comandos de criação ganham `--classification`/`--contract-model`/`--category`/`--cost-center`/`--observations`; formatter PT-BR exibe os rótulos.

## Decisão (resolver em W0)

**Obrigatoriedade + migration sobre dados existentes.** `classification`/`contractModel` são semanticamente obrigatórios. Há contratos já persistidos sem eles. **Recomendado (padrão do `contractorRef`):** colunas `NOT NULL` com backfill explícito na migration — em dev/test trivial; se houver dado real, definir sentinela com a P.O. antes de W1. `category`/`costCenter`/`observations` nuláveis. Confirmar antes de W1.

## Critérios de Aceite

- [ ] **CA1** — `Contract` (todas as variantes, inclusive `Pending`) carrega os 5 campos; criar sem `classification`/`contractModel` é **erro de compilação** (não runtime).
- [ ] **CA2** — cada enum VO valida via smart constructor `parse(raw): Result` (padrão `occupation-area.ts`): valor fora do conjunto → err string literal (`'invalid-classification'`, `'invalid-contract-model'`, `'invalid-category'`, `'invalid-cost-center'`).
- [ ] **CA3** — **R1:** `classification = 'ServiceOrder'` com `originalValue.cents > 999_999` → tagged error `ContractServiceOrderExceedsCap` (payload `cap`/`attempted`); no teto exato (`999_999`) passa; `> 999_999` falha. `classification = 'Contract'` não tem teto.
- [ ] **CA4** — round-trip de persistência preserva os 5 campos (save→findById devolve igual); mapper rejeita `classification`/`contract_model`/`category`/`cost_center` inválido vindo do banco com `Result` err.
- [ ] **CA5** — `POST /api/v2/contracts` aceita os campos; `GET /contracts` (list) e `GET /contracts/:id` (detalhe) os devolvem; valor/tipo inválido → 422 (domínio), não 400 (Zod), espelhando o tratamento de `contractorType`.
- [ ] **CA6** — ~~CLI de criação aceita as flags e o detalhe exibe os rótulos PT-BR (formatter).~~ **DESCOPADO (decisão Gabriel, 2026-06-02):** o canal primário dos metadados é a **borda HTTP** (CA5). A CLI recebe defaults (`Contract`/`Service`/null) só para manter o comando funcional; a UX de flags vira follow-up. CA5 (HTTP) substitui o CA6 como prova de exposição.
- [ ] **CA7** — migration aplica limpa em base nova; estratégia de backfill para linhas existentes conforme a Decisão.
- [ ] **CA8** — integração gated (`MYSQL_INTEGRATION=1`) provando o round-trip real das colunas.

## Fora de escopo

- `PATCH` de metadados (edição) — é a fatia **F2** (`CTR-CONTRACT-METADATA-PATCH`).
- Download de documento — fatia **F3** (`CTR-HTTP-DOCUMENT-DOWNLOAD`).
- `email`/`telefone`/banco/PIX do contratado — composição na borda (`CTR-HTTP-CONTRACT-DETAIL-CONTRACTOR`).
- `program`/`budgetPlan` (BC Orçamentário inexistente); `derivedStatus`/status PT/"distrato"→`terminate` (BFF); hard-delete (proibido).

## Pipeline

W0 testes RED (enums VO + R1 + campos no agregado + mapper + DTO + CLI) → W1 implementação mínima (VOs + campos + inputs + migration + Zod/DTO + CLI) → W2 review (isolamento ADR-0014, idioma EN/PT, R1, invariante CA1) → W3 gate (`typecheck` + `format:check` + `lint` + `test`, integração gated não-órfã). Skills: `ts-domain-modeler` (enums + agregado + R1) · `drizzle-schema-author` (colunas + migration) · `application-cli-builder` (flags + formatter).
