[← Voltar para ADRs](./README.md)

# ADR-0009: Node.js 24 LTS + TypeScript 6 com plano de migração para TS 7.0

- **Status:** Accepted (`supersedes` parcialmente [ADR-0002](./0002-keep-nodejs-runtime.md) — apenas a seção de versão)
- **Date:** 2026-04-28
- **Deciders:** Arquiteto técnico

---

## Contexto

[ADR-0002](./0002-keep-nodejs-runtime.md), aprovado em 2026-04-27, estabeleceu "Node.js 20 LTS" como runtime. Desde então:

- **Node 20 entrou em maintenance em outubro/2025** e está em **EOL em abril/2026** (este mês).
- **Node 24.15.0 LTS ("Krypton")** foi lançado em **15/abril/2026** — atual LTS, suporte ativo até outubro/2026 e maintenance até abril/2028.
- **Node 25.9.0 Current** foi lançado em 1/abril/2026 — não é LTS (linha ímpar), com breaking changes.
- **TypeScript 7.0 Beta** foi anunciado em **21/abril/2026**: compilador reescrito em Go (Project Corsa), 10× mais rápido, comportamento "estruturalmente idêntico" ao 6.0.

Necessidade: substituir a referência a Node 20 e definir estratégia de adoção para o salto TS 6.0 → 7.0.

Análise completa: [Inquiry-0004](../../inquiries/0004-node-version-and-typescript-future.md).

---

## Decisão

### Runtime

**Node.js 24 LTS** em todos os serviços novos (`bff-gateway` e `core-api`).

### Linguagem

**TypeScript 6.0 estável** como linguagem inicial, com `tsgo` (compilador TS 7.0 Beta) rodando em CI **em paralelo** ao `tsc`, validando compatibilidade desde o dia 1.

### Plano de migração TS 6.0 → 7.0

1. **Codificar com TS 6.0 estável** durante toda a fase 1 da migração.
2. **`tsconfig.json` em modo strict total** desde o dia 1 (minimiza incompatibilidades futuras).
3. **CI roda `tsc` (tipo-check estável) e `tsgo --noEmit` (validação 7.0) em paralelo**.
4. **Migração completa para 7.0** quando o stable for lançado (estimado Q3/Q4 2026).
5. **Como port é estrutural**, espera-se troca de comando + ajustes mínimos.

### Estilo de código alinhado

- Web Standards-first onde o ecossistema permite (`fetch`, Web Crypto, `URL`, `URLPattern`, `structuredClone`).
- Capabilities específicas do runtime (`fs`, `env`, signals) **isoladas em adapters** — facilita futura agnosticidade.

---

## Consequências

### Positivas

- **Suporte ativo até abril/2028** (2 anos de horizonte).
- **`require(esm)` estável** — facilita uso de libs ESM-only sem tooling extra.
- **Module compile cache estável** — melhor cold start.
- **Time aprende padrões TS modernos desde o dia 1**.
- **Migração TS 7.0 não vai pegar de surpresa** — `tsgo` em CI alerta cedo.

### Negativas

- **Paralelo `tsc` + `tsgo` em CI** adiciona ~10-30s ao tempo de pipeline (irrelevante).
- **TS 6.0 é a última JS-based** — comunidade pode focar atenção em 7.0 e libs antigas podem ficar pra trás.
- **Risco de adopção precoce de feature 7.0-only** se desenvolvedor confundir tsgo com tsc — mitigado por CI quebrar `tsc` se feature não-padrão usada.

### Neutras

- O legado já tem `@typescript/native-preview ^7.0.0-dev.20260329.1` instalado — sinal positivo de proatividade da equipe.

---

## Justificativa para Node 24 (não 22 ou 25)

### Node 22 LTS
Active LTS até outubro/2026 (mesmo horizonte do 24). Maintenance até abril/2027 (1 ano a menos que 24). **Sem ganho proporcional para escolher 22 sobre 24.**

### Node 25 Current
Linha **ímpar**, **não é LTS**. Tem breaking changes em test runner. **Nunca em prod financeira.**

### Node 24 LTS
- Active LTS até outubro/2026.
- Maintenance até abril/2028.
- Features importantes: `require(esm)` estável, module compile cache estável, raw key formats, http2 `http1Options`, fs `throwIfNoEntry`, net TOS methods.
- npm 11.12.1.
- ✅ **Escolhida.**

---

## Quando Re-avaliar

- Quando Node 26 LTS for lançado (outubro/2026) e Node 24 entrar em maintenance.
- Quando TypeScript 7.0 estável for lançado (estimativa Q3/Q4 2026).
- Em ambos os casos: ADR novo `supersedes` este.

---

## Referências

- [Inquiry-0004](../../inquiries/0004-node-version-and-typescript-future.md) — análise completa.
- [ADR-0002](./0002-keep-nodejs-runtime.md) — decisão original sobre Node.js (mantida em essência).
- [Node.js v24.15.0 Release Notes](https://nodejs.org/pt-br/blog/release/v24.15.0)
- [Announcing TypeScript 7.0 Beta — Microsoft DevBlogs](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/)
- [`../05-runtime-decisions.md`](../05-runtime-decisions.md) — atualização correlacionada.
