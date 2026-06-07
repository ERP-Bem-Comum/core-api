# Mapa de camadas — Vocke aplicado ao core-api

A pirâmide do Vocke não é proporção fixa; é heurística de custo/feedback. Cada camada tem
escopo, double e gate próprios neste projeto.

---

## Unit (base — a maioria)

> Vocke: _"The foundation of your test suite will be made up of unit tests. (…) Unit tests
> have the narrowest scope of all the tests in your test suite. The number of unit tests in
> your test suite will largely outnumber any other type of test."_
> (`practical-test-pyramid--vocke.md:171`)

- **No core-api:** domínio puro — VOs (`money.ts`, `period.ts`), agregados (`contract.ts`,
  `amendment.ts`), use cases com ports fakeados.
- **Double:** **fake**, nunca mock de verificação. O projeto fornece `clock-fixed.ts` e
  `*.in-memory.ts`. Um fake é uma implementação real-porém-simplificada do port.
- **O que testar:** interface pública + caminhos não-triviais (happy path + bordas). **Não**
  testar getter trivial nem estrutura interna — comportamento observável.
- **Gate:** `pnpm test` (rápido, sempre roda).

## Integration

> Vocke: _"All non-trivial applications will integrate with some other parts (databases,
> filesystems, network calls to other applications). (…) Integration Tests are there to help.
> They test the integration of your application with all the parts that live outside of your
> application."_ (`practical-test-pyramid--vocke.md:341`)

- **No core-api:** adapter Drizzle/MySQL, S3/MinIO, SMTP — com a dependência **real**.
- **Double:** nenhum na fronteira testada; o ponto é exercitar serialização/IO de verdade.
- **Gate:** opt-in `*_INTEGRATION=1` / `pnpm test:integration` (sobe MySQL via Docker `--wait`).
  **Nunca** roda em `pnpm test` puro — se rodar, é gate mal-classificado (corrigir, ver
  política de regressão zero no AGENTS.md).

## Contract

- **No core-api:** suíte parametrizada `.suite.ts` / `.contract.ts` — **uma** suíte que ambos
  os adapters (in-memory e Drizzle) consomem, provando que respeitam o mesmo port.
  Ex.: `contract-repository.suite.ts` + `…inmemory.test.ts` + `…drizzle-mysql.test.ts`.
- **Não confundir** com o "contract test" de microserviço (Pact/CDC) do Vocke — aqui o contrato
  é entre **port e seus adapters**, não entre serviços HTTP. Mesma ideia, escopo local.
- **Gate:** in-memory roda em `pnpm test`; a instância MySQL da suíte, atrás do opt-in.

## E2E (topo — o mínimo)

> Vocke: empurre testes pirâmide abaixo; no topo, só jornadas críticas.

- **No core-api:** CLI real sem mock — `contracts.cli.test.ts` (driver `memory`) e
  `contracts.cli.mysql.test.ts` (driver `mysql`, integration).
- **Double:** nenhum — exercita o binário de ponta a ponta.
- **Gate:** memory em `pnpm test`; mysql atrás do opt-in.

---

## Heurística de classificação (decisão rápida)

```
Toca IO real (DB/FS/rede/SMTP)?
├── sim → roda atrás de *_INTEGRATION=1?
│         ├── sim → Integration (ou E2E se for o binário inteiro)
│         └── não → ❌ MAL-CLASSIFICADO: mover pro gate de integração
└── não → exercita 1 unidade com fakes? → Unit
          é a mesma suíte para N adapters? → Contract
          dispara o binário/CLI inteiro? → E2E
```
