[← Voltar ao Índice](./INDEX.md)

# Inquiry-0020: Adoção do Temporal API (ES2026) no core-api

- **Status:** Decided
- **Opened:** 2026-05-26
- **Closed/Decided:** 2026-05-26
- **Opened by:** P.O.
- **Asked to:** `nodejs-runtime-expert` (estudo interno)
- **Impact:** estratégico · gatilho de ADR futuro (supersedes [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) em out/2026)

> Estudo completo (com todas as citações `path:linha`): `.claude/.pipeline/CTR-NODE-TEMPORAL-API-STUDY/STUDY.md`. Esta inquiry é o resumo decisório.

---

## 1. Contexto

O Temporal API — substituto moderno de `Date` — atingiu **TC39 Stage 4 em 2026-03-11** (ES2026) e foi disponibilizado como **global unflagged no Node.js 26.0.0 (2026-05-05)**. A P.O. levantou que "vale a pena JÁ usar o Temporal nesse projeto, vai melhorar muita coisa".

O core-api fixa **Node 24 LTS** (`package.json#devEngines.runtime.version: 24.16.0`, `engines.node: ">=24.0.0"`). Node 26 é **Current**; só entra em **Active LTS em 2026-10-28**. Logo "já usar" hoje significa **(a)** polyfill `@js-temporal/polyfill` sobre Node 24, **(b)** bump para Node 26 Current, ou **(c)** abstrair atrás de um VO agora e trocar o backend quando migrarmos ao Node 26 LTS.

---

## 2. Pergunta(s) feita(s)

```
Vale a pena JÁ usar o Temporal API nesse projeto? Vai melhorar muita coisa pra nós.
```

---

## 3. Respostas / Investigação

### 2026-05-26 — Pesquisa web (fatos verificados)

- Temporal → TC39 **Stage 4** em 2026-03-11, parte do **ES2026**.
- **Node 26.0.0** (2026-05-05) traz `Temporal` global, sem flag. Node 26 é **Current**; **Active LTS em 2026-10-28**.

Fontes: [TC39 advances Temporal to Stage 4 — socket.dev](https://socket.dev/blog/tc39-advances-temporal-to-stage-4) · [Node.js v26.0.0 release](https://nodejs.org/en/blog/release/v26.0.0) · [Node 26 ships unflagged Temporal — lilting.ch](https://lilting.ch/en/articles/nodejs-26-current-temporal-undici).

### 2026-05-26 — Estudo `nodejs-runtime-expert` sobre o repositório

A dor real e concreta: o VO `Period` (`src/shared/kernel/period.ts:14`) e a expiração de contrato (`src/modules/contracts/domain/contract/contract.ts:120`) usam `Date` para dados que são **data-calendário** (dia/mês/ano), misturando `.getTime()` (instante, `period.ts:35`) com `.getUTCFullYear()` (campo de data, `period.ts:29`) no mesmo tipo. Há ainda dois formatters de data **duplicados** entre `contracts` e `financial` (`cli/formatters/date.ts`). `Temporal.PlainDate` é exatamente o tipo correto para isso.

Os `Date` que representam **instantes reais** (`occurredAt`, `approvedAt`, `openedAt`, timestamps de outbox) funcionam bem com `Date` — fora do escopo desta adoção.

`handbook/reference/nodejs/` não tem doc de Temporal (espelha Node 24) — confirmado.

---

## 4. Análise interna

### Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| **A — Polyfill `@js-temporal/polyfill` (prod)** | Temporal já; mantido pelos campeões da spec | Nova dep de prod cobrindo API que será nativa em ~5 meses — viola o espírito do ADR-0011 (`0011-supply-chain-hardening.md:107`: "se Node 24 oferece nativamente, adotar"); risco de divergência semântica | ❌ Rejeitada |
| **B — Bump Node 26 Current** | Nativo, zero dep | Rodar runtime **não-LTS** num ERP com auditoria fiscal de 5 anos por ~5 meses (até 2026-10-28); ADR-0009 reserva re-avaliação para o LTS | ❌ Rejeitada (agora) |
| **C — VO `PlainDate` agora (backend `Date`), trocar p/ `Temporal.PlainDate` no Node 26 LTS** | Zero dep; domínio expressa intenção (data-calendário vs instante); migração final vira find-and-replace nos adapters | VO transitório (custo de abstração baixo — 1 arquivo); não elimina bugs de timezone hoje, mas os isola | ✅ Escolhida |

Compatibilidade: a Opção C respeita ADR-0011 (sem nova dep), ADR-0002 (mesmo runtime) e ADR-0009 (Node 24 LTS fixo; "Web Standards-first" — `0009-...:43`). O trigger de troca para Temporal nativo já está previsto em `0009-...:92` ("Quando Node 26 LTS for lançado (outubro/2026)... ADR novo supersedes este").

---

## 5. Decisão final

**Adotar a Opção C.** Capturar o ganho semântico agora via um VO `PlainDate` no shared kernel (backend `Date`, interface de data-calendário), e trocar o backend para `Temporal.PlainDate` nativo quando o projeto migrar para Node 26 **LTS** (out/2026).

**Não fazer agora:** polyfill em produção (ADR-0011); bump para Node 26 Current (risco de compliance, ADR-0009).

---

## 6. Saídas (outputs concretos)

- [ ] Ticket `CTR-VO-PLAIN-DATE` — criar `src/shared/kernel/plain-date.ts`, migrar `Period` + formatters duplicados (escopo S/M). **Aguardando autorização da P.O.**
- [ ] ADR novo (supersedes ADR-0009) incluindo a troca `PlainDate` → `Temporal.PlainDate` — **gatilho: Node 26 Active LTS, 2026-10-28**.
- [x] Estudo registrado: `.claude/.pipeline/CTR-NODE-TEMPORAL-API-STUDY/STUDY.md`.

---

## 7. Referências

- Estudo: `.claude/.pipeline/CTR-NODE-TEMPORAL-API-STUDY/STUDY.md`
- [ADR-0009 — Node 24 + TS 6, roadmap TS 7](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) (gatilho de re-avaliação)
- [ADR-0011 — Supply-chain hardening](../architecture/adr/0011-supply-chain-hardening.md)
- [ADR-0002 — Node.js runtime único](../architecture/adr/0002-keep-nodejs-runtime.md)
- [Node.js v26.0.0 release](https://nodejs.org/en/blog/release/v26.0.0) · [TC39 Temporal Stage 4](https://socket.dev/blog/tc39-advances-temporal-to-stage-4)
