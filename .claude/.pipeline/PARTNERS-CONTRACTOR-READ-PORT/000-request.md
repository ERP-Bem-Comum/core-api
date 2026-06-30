# PARTNERS-CONTRACTOR-READ-PORT — read do contratado na public-api de Parceiros

> **Size:** M · **Origem:** [ADR-0032](../../../handbook/architecture/adr/0032-transient-http-composition-read-until-bff.md) + [po-feedback/0001 §B](../../../handbook/po-feedback/0001-gap-api-v2-contracts.md). **Pré-requisito** da rota de composição de Contratos.

## Contexto

A rota gorda de Contratos (ADR-0032) precisa ler o **contratado** (supplier / financier / collaborator) com seus dados bancários/PIX para compor a visão rica do `GET /contracts/{id}`. Hoje a public-api de Parceiros só expõe um **write** port (ETL — `buildPartnersEtlPort`). Falta um **read** consumível cross-módulo.

⚠️ **Isolamento (ADR-0014):** Contratos NUNCA lê `par_*` direto. Tudo passa por esta public-api.

## Escopo

Expor em `src/modules/partners/public-api/` um port de **leitura** (read-only) que devolve a projeção do contratado para consumo cross-módulo:

- `getSupplierView(id) : Result<SupplierView | null, E>` — nome, cnpj, email, categoria, **bankAccount/pix read-only** + `updatedAt` (para o placeholder de "última atualização" — R5 do relatório).
- `getFinancierView(id)` e `getCollaboratorView(id)` análogos (campos por entidade).
- Ou um `getContractorView({ type, id })` unificado (discriminated) — decidir em W0/W1 pelo que o consumidor (Contratos) precisa.
- Read port (interface em `application/ports/`) + adapter Drizzle (`adapters/persistence/repos/*-read.drizzle.ts`) + re-export na public-api.

## Critérios de Aceite

- [ ] CA1 — dado um id existente, retorna a `*View` com os campos read-only (incl. bancário/PIX + `updatedAt`); id inexistente → `ok(null)`.
- [ ] CA2 — **somente leitura**: nenhum método de escrita; sem efeito colateral.
- [ ] CA3 — erro de infra → `Result` err tipado (sem throw cruzando a borda).
- [ ] CA4 — consumível por outro módulo SÓ via `public-api` (ADR-0006); nada de `par_*` exposto cru.
- [ ] CA5 — integração gated (`MYSQL_INTEGRATION=1`) provando o round-trip de leitura.

## Fora de escopo

A rota HTTP de composição em si (é o ticket de Contratos, depende deste). Mutação de Parceiros.

## Pipeline

W0 testes RED → W1 read port + adapter + public-api → W2 review → W3 gate. Skill: `ports-and-adapters` + `drizzle-orm-expert`.
