# W2 — Code Review (CORE-OUTBOX-WORKER-GENERIC)

**Veredito:** ✅ APPROVED · **Disciplina:** code-reviewer (read-only) · **Round:** 1/3
**Blocker:** 0 · **Major:** 0 · **Minor:** 2 (cosméticos, aceitos)

## Escopo

Extração de `src/shared/outbox/` (types + `runOnce<P>`/`runLoop<P>`) e migração dos workers de
contracts/partners para wrappers finos; ports re-exportando o contrato; boundary test atualizado.

## Conformidade canônica (§IX)

A extração aplica **information hiding / modularização por responsabilidade** (Parnas,
`acdg/skills_base/.../criteria-for-modularization--parnas.md:39`):

> "(2) product flexibility — it should be possible to make drastic changes to one module without a
> need to change others; (3) comprehensibility — it should be possible to study the system one
> module at a time."

A lógica de consumo do outbox (claim SKIP LOCKED / retry / DLQ / backoff) passa a viver num único
módulo (`shared/outbox`) que esconde essa decisão; os módulos expõem só o ponto de variação
(`rowToProcessed`). Mudança futura na mecânica de consumo fica confinada a um lugar.

## Verificações

- **Comportamento preservado:** `runOnce`/`runLoop` genérico é cópia fiel da lógica anterior
  (claim na mesma tx → delivery → markProcessed/markFailed/DLQ; throw convertido em err; backoff idle).
  Suíte completa verde (2632) + boundary + 6 testes do genérico. ✅
- **Isolamento (ADR-0006/0014):** `shared/outbox` é camada compartilhada; nenhum módulo importa o
  outro; ports re-exportam; adapters não importam de `worker/` (INV-1) e o worker importa o contrato
  de `shared/outbox`, nunca de adapter (INV-5). ✅
- **Tipagem:** `EventDelivery<P>` genérico; `RowToProcessed<P>` força o tratamento de payload
  corrupto → DLQ; assinatura `WorkerDeps`/`runOnce`/`runLoop` dos módulos inalterada. ✅
- **Boundary test:** atualizado fielmente (contrato canônico em `shared/outbox`, re-exportado),
  mantendo o anti-adapter — supersede parcial documentado de CTR-OUTBOX-CONSUMER-PORT. ✅

## Minors (aceitos)

1. **Formato de log com correlation-id** mudou de `[mod-worker <id>] ` para `[mod-worker] (<id>) `
   (parametrização do `tag`). Cosmético; não-observável em testes. Aceito.
2. **`rowToProcessed` do contracts** mapeia o erro do mapper para `{ tag }` (descarta campos extras
   do erro). O genérico só usa `.tag` na mensagem de DLQ — paridade com o comportamento anterior. Aceito.

## Pendente W3

`pnpm run test:integration:contracts` + `:partners` (não-regressão do comportamento real dos dois
workers contra MySQL, incluindo o do partners que não tem teste unit).
