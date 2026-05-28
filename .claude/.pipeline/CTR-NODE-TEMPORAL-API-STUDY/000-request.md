# CTR-NODE-TEMPORAL-API-STUDY — Estudo de adoção do Temporal API

> **Tipo:** spike de pesquisa (NÃO é ticket de código W0→W3 — não toca `src/`).
> **Solicitante:** P.O. — "vale a pena JÁ usar o Temporal nesse projeto, vai melhorar muita coisa".
> **Executor:** agente `nodejs-runtime-expert`.

## Fatos verificados (web, 2026-05-26)

- Temporal atingiu **TC39 Stage 4** em 2026-03-11 (parte do ES2026).
- **Node.js 26.0.0** (2026-05-05) traz Temporal **global, unflagged**.
- Node 26 é **Current**; vira **Active LTS em 2026-10-28**.
- O projeto **fixa Node 24.16.0** (LTS) em `package.json#devEngines` e `engines.node >=24`.

Consequência: "já usar" hoje significa **(a)** polyfill `@js-temporal/polyfill` sobre Node 24, **(b)** bump para Node 26 Current (antes do LTS), ou **(c)** abstrair atrás de port/VO agora e trocar quando migrarmos para Node 26 LTS.

## Pergunta a responder

O estudo deve produzir uma recomendação fundamentada (citando handbook + ADRs) sobre se/como adotar Temporal, cobrindo:

1. **Onde o domínio ganha** — mapear o uso atual de datas/períodos (`src/shared/utils/date.ts`, `src/shared/kernel/period.ts`, vigência de contrato, datas de aditivo, timestamps de outbox) e onde Temporal removeria bugs/ambiguidade (timezones, aritmética de datas, `PlainDate`/`ZonedDateTime`/`Duration`).
2. **As 3 opções (a/b/c)** com trade-offs: supply-chain do polyfill (ADR-0011), risco de rodar Node Current num ERP financeiro vs. esperar Out/2026, custo de abstração.
3. **Compatibilidade** com ADR-0009 (Node 24 + TS6, roadmap TS7) e ADR-0002 (Node runtime único).
4. **Recomendação** + se isto merece um **ADR** novo (decisão de estratégia de tempo é arquitetural) e/ou uma **inquiry** em `handbook/inquiries/`.
5. **Custo/risco de migração** se decidirmos adotar.

## Entregável

`STUDY.md` neste diretório, em PT-BR, com citações literais. Sem tocar `src/`. O main-agent decidirá depois se promove a `handbook/inquiries/00XX-temporal-api-adoption.md`.
