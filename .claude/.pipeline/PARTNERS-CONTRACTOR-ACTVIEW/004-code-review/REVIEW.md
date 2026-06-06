# Code Review — Ticket PARTNERS-CONTRACTOR-ACTVIEW — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-06T22:55Z
**Escopo revisado:**

- `src/modules/partners/public-api/contractor-view.mapper.ts`
- `src/modules/partners/application/ports/contractor-read.ts`
- `src/modules/partners/adapters/persistence/repos/contractor-read.drizzle.ts`
- `src/modules/partners/public-api/{read,index}.ts`
- testes estendidos (`contractor-view.mapper.test.ts`, `partners-read-port.integration.test.ts`)

---

## Issues encontradas

Nenhuma 🔴 / 🟡.

### 🔵 Sugestão

- `actToView` usa `act.occupationArea as unknown as string` (e `cpf`) — consistente com os casts branded→primitive já presentes em `supplierToView`/`collaboratorToView` na mesma função-borda. Sem ação.

---

## Verificações-chave

- **Sem schema novo → sem pendência de migration** (contraste com o ticket #1): `parActs`, `actFromRow` e `act.mapper.ts` já existiam; este ticket só projeta. Não há `db:generate` pendente.
- **Isolamento (ADR-0014)** — o adapter lê só `schema.parActs`, devolve `ActView` plana (nunca row cru). Zero escrita; `try/catch → Result`; id inexistente → `ok(null)`; erro → `contractor-read-unavailable`. Espelha exatamente os 3 getters existentes.
- **Paridade 4/4 (FR-005)** — `ContractorView` passou a `Supplier|Financier|Collaborator|Act`; `getActView` no port + adapter; reexportado em `read.ts`/`index.ts`.
- **`Act` placeholder (ADR-0036)** — `ActView` espelha `CollaboratorView` (mesmos campos de pré-cadastro), coerente com a decisão da spec.
- **Prova de verde** — unit `contractor-view.mapper.test.ts` 7/7; integração `test:integration:partners` 31/31 (round-trip `getActView` em MySQL real). typecheck/format/lint limpos; default test 2234/0.

## O que está bom

- Diff cirúrgico e 100% aditivo, seguindo o padrão-espelho dos outros 3 contratados — baixo risco.
- Cobertura proporcional: unit (mapper) + integração (read-port real), incluindo o caso `id inexistente`.

## Próximo passo

- **APPROVED:** segue para W3.
