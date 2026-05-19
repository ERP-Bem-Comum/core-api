---
entrevista: 0001
bloco: G
pergunta: G1+G2
título: "Modelagem temporal no domínio funcional — tipo, validação, Clock port"
skill: ts-domain-modeler
status: pendente
agrupa:
  - G1  # Date vs Temporal vs branded Instant — qual o tipo canônico do tempo no domínio?
  - G2  # isValidDate no domínio — defesa em profundidade ou paranoia que vira ruído?
---

# Pergunta_G1_G2_tec_lider_using_skill_ts-domain-modeler

> **Status:** pendente — refinamento técnico após blocos arquiteturais fechados.
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## ⚠️ Diretrizes do projeto (lembrete para a resposta)

Os 6 blocos fechados (A, B, C, D, H, I) cravaram decisões que esta pergunta precisa respeitar:

### Decisões fixas do código

1. **ESM puro + NodeNext + `.ts`** em imports relativos.
2. **Padrão D (module-as-namespace)** — free functions, `import * as Money from './money.ts'`.
3. **Result homemade** — `shared/result.ts`, ~50 LOC, sem deps externas.
4. **Tagged errors** — `errors.ts` por agregado com free functions.
5. **State machine in types** — agregados como union refinada.
6. **Brand via `unique symbol` global** em `shared/brand.ts`.
7. **`shared/immutable.ts`** — facade que esconde `Object.freeze`.
8. **Mappers** retornam `Result<Aggregate, RehydrationError>`.
9. **Domínio 100% sync** — Application Layer faz `await`.
10. **Dupla taxonomia mantida** — Amendment ≠ ContractAdjustment.
11. **Exhaustive switch sem `throw`** — return `_exhaustiveCheck` ou omitir default.

### Decisões fixas de organização (Bloco H ✅)

12. **Layout canônico:**
    - `src/shared/kernel/` — VOs puros cross-BC (Evans Shared Kernel).
    - `src/modules/<bc>/domain/shared/` — VOs específicos do BC.
    - `src/modules/<bc>/application/ports/` — ports genéricos (`Clock` está aqui).
    - `src/modules/<bc>/adapters/` — implementações.
13. **Critério port:** ditado por invariância de agregado → `domain/`. Genérico (`Clock`, `EventBus`, `Storage`) → `application/ports/`.

### Decisões do CLAUDE.md raiz + ADRs

14. **Modular monolith** (ADR-0006) — comunicação cross-módulo via eventos.
15. **Zero `throw`, zero `class`, zero `this`, zero `any`**.
16. **Node 24 LTS + TS 6.0** (ADR-0009) — `--experimental-strip-types`.

### Estado atual do código (ponto de partida)

```ts
// src/modules/contracts/domain/shared/period.ts
export const Period = {
  create: (start: Date, end: Date): Result<Period, PeriodError> => {
    if (!isValidDate(start)) return err('period-invalid-start-date');
    if (!isValidDate(end)) return err('period-invalid-end-date');
    // ... mais checks
  },
  // ...
};

// src/modules/contracts/domain/contract/contract.ts:22
const assertValidEventDate = (at: Date): Result<Date, 'contract-invalid-event-date'> =>
  isValidDate(at) ? ok(at) : err('contract-invalid-event-date');

// src/shared/utils/date.ts
export const isValidDate = (d: Date): boolean => d instanceof Date && !Number.isNaN(d.getTime());
```

`Date` aparece em: `Period.start/end`, `Contract.signedAt`, `Contract.endedAt`, `Amendment.createdAt`, `Amendment.homologatedAt`. **A funcionalidade depende de `at: Date` ser semanticamente um instante válido.**

**Use estas diretrizes como restrições da resposta.**

---

## Por que unificar G1+G2?

Os 2 eixos decidem juntos como o domínio fala sobre tempo:

| Eixo | O que decide |
| :---: | :--- |
| **G1.a** | **Qual o tipo canônico de instante temporal** no domínio? `Date` cru, branded `Instant: number`, `Temporal.Instant`, ou outro? |
| **G1.b** | **Assinatura do Clock port** (que H2 cravou em `application/ports/clock.ts`) — retorna o quê? |
| **G2** | **`isValidDate` no domínio — sobrevive ou morre** após smart constructor? |

Decidir um sem decidir os outros gera dissonância:

- **G1.a + G2** — se aceitarmos branded `Instant` (smart constructor única ponto de validação), `isValidDate` morre **por consequência**. Não precisa "defesa em profundidade" — o tipo já prova.
- **G1.b + G1.a** — o `Clock.getNow()` retorna o que? Se `Instant`, o `Clock` casa com o tipo do domínio. Se `Date`, há ponte na borda.
- **G2 + Bloco A4** — A4 cravou que mappers retornam `Result<Aggregate, RehydrationError>` via smart constructors. Isso já mata `isValidDate` no momento de rehydration. G2 só precisa decidir se sobra algum lugar onde a validação ainda faz sentido.

---

## Q (host) — versão formal

### Eixo 1 (G1.a) — Qual o tipo canônico de instante temporal?

**Hoje:** `Date` cru aparece em `Period`, `Contract`, `Amendment`. JS `Date` tem três defeitos:

1. **Mutável** — `d.setHours(0)` muta sem reclamar. Aliasing pode quebrar invariantes.
2. **Timezone implícita** — `new Date('2026-01-15')` vs `new Date('2026-01-15T00:00:00Z')` produzem instantes diferentes dependendo do TZ do servidor.
3. **Comparação irregular** — `d1 === d2` é referência, não valor. Precisa `getTime()`.

**Quatro rotas para o domínio:**

#### Rota α — Manter `Date` cru

Status quo. Continua mutável, continua timezone-aware. Adicionar `ValidDate = Brand<Date, 'ValidDate'>` brandado pra forçar passagem pelo smart constructor.

- **Pró:** zero migração; nativo do JS.
- **Contra:** brand não impede mutação (`Date` é objeto). Aliasing rompe.

#### Rota β — Branded `Instant: number` (epoch ms)

```ts
// src/shared/kernel/instant.ts
export type Instant = Brand<number, 'Instant'>;
export type InstantError = { tag: 'InvalidInstant'; attemptedValue: number } | { tag: 'InstantOutOfRange'; … };

export const fromEpochMs = (ms: number): Result<Instant, InstantError> => {
  if (!Number.isFinite(ms) || Number.isNaN(ms)) return err({ tag: 'InvalidInstant', attemptedValue: ms });
  // … range checks
  return ok(ms as Instant);
};

export const fromISO = (iso: string): Result<Instant, InstantError> => { … };

export const compare = (a: Instant, b: Instant): -1 | 0 | 1 => a < b ? -1 : a > b ? 1 : 0;
export const before = (a: Instant, b: Instant): boolean => a < b;
export const after = (a: Instant, b: Instant): boolean => a > b;
```

- **Pró:** primitivo imutável (number). Sem timezone (epoch ms é universal). Compatível com Padrão D. Zero deps.
- **Contra:** perde algumas conversões ergonômicas (formatar para humano exige conversão pra `Date` ou `Temporal` na borda do CLI).

#### Rota γ — Migrar pra Temporal API

```ts
import { Temporal } from '@js-temporal/polyfill';

export type Instant = Temporal.Instant;
// Já é imutável, comparável, timezone-aware ou universal.
```

- **Pró:** API rica, imutável por design, timezone explícita (`ZonedDateTime`), comparação semântica.
- **Contra:** Temporal está em **Stage 3 TC39** desde 2022 — sem implementação V8 nativa em 2026. Precisa polyfill (`~30KB`). Dependência externa no domínio (fere Bloco I, fere Padrão D).

#### Rota δ — Tipos múltiplos por significado de negócio

Em vez de um tipo único, modelar o que o negócio realmente usa:

- `Instant` — momento exato (signedAt, homologatedAt, createdAt) — branded `number`.
- `PlainDate` — data civil (data de início de período fiscal, sem hora) — branded `{ year, month, day }`.
- `Period` — já é tipo nosso, modela `{ start: Instant; end: Instant | null }`.

Cada um com smart constructor próprio em `src/shared/kernel/`.

**Perguntas:**

- **G1.a.1** — Qual rota você defende?
- **G1.a.2** — Especificamente sobre Temporal (γ): em 2026, vale aguardar Stage 4 + implementação V8 nativa, ou adotar polyfill agora? O Bloco I defendeu zero deps no domínio — Temporal contradiz?
- **G1.a.3** — Sobre δ (tipos múltiplos): vale a pena modelar `PlainDate` separado de `Instant`? No nosso caso, `signedAt: Date` é instante; `originalPeriod.start: Date` também é instante (data de início do contrato com hora 00:00 UTC implícita). Tem caso real de `PlainDate`?

### Eixo 2 (G1.b) — Assinatura do `Clock` port

H2 cravou `Clock` em `application/ports/clock.ts` (port genérico, não invariância de agregado). Falta a assinatura.

**Candidatos:**

```ts
// Opção A — retorna o tipo canônico do domínio (β)
export type Clock = Readonly<{
  now: () => Instant;
}>;

// Opção B — retorna Date e a conversão fica nos consumidores
export type Clock = Readonly<{
  now: () => Date;
}>;

// Opção C — múltiplos métodos por granularidade
export type Clock = Readonly<{
  instant: () => Instant;
  plainDate: () => PlainDate;
}>;
```

**Perguntas:**

- **G1.b.1** — Qual assinatura?
- **G1.b.2** — Como `Clock` é injetado nos use cases? Hoje a SKILL prescreve "ports passadas como argumentos das factories" — o `Clock` segue o mesmo pattern (recebido via `deps: Readonly<{ clock: Clock; … }>`)?
- **G1.b.3** — Em testes, `Clock` é mockável. Como deve ser o adapter de teste? `MemoryClock.fixed(instant)` ou `MemoryClock.advanceBy(duration)`?

### Eixo 3 (G2) — `isValidDate` no domínio — sobrevive ou morre?

**Hoje em `contract/contract.ts:22`:**

```ts
const assertValidEventDate = (at: Date): Result<Date, 'contract-invalid-event-date'> =>
  isValidDate(at) ? ok(at) : err('contract-invalid-event-date');
```

Replicado em `amendment/amendment.ts:19` (`assertValidEventDate`). Aparece em 5+ lugares.

**Após G1.a:** se aceitarmos β (branded `Instant`), o tipo de entrada `at: Instant` **já prova** que passou por `Instant.fromEpochMs` ou `Instant.fromISO`. Não há `Instant` inválido no domínio — o smart constructor é o único portão.

**Logo, `isValidDate` morre por consequência.** O domínio confia no tipo.

**Perguntas:**

- **G2.a** — Confirma que `isValidDate` morre no domínio após G1.a ser resolvido com branded type?
- **G2.b** — Onde sobrevive (se sobreviver)? Resposta esperada: apenas em `src/shared/kernel/instant.ts`, dentro de `fromEpochMs` e `fromISO`. **Um único ponto de validação** por VO temporal.
- **G2.c** — `src/shared/utils/date.ts` (que hoje exporta `isValidDate`) tem destino qual? Mantém como helper interno do smart constructor, ou deleta inteiro?
- **G2.d** — Para parâmetros que **necessariamente** chegam como `Date` cru (CLI parser que recebe string e converte; mapper do Drizzle que lê `DATETIME` do MySQL): a validação acontece **na borda**, antes de virar `Instant`. Isso é coerente com Bloco A4 (mappers retornam `Result<Aggregate, RehydrationError>`)?

### Pergunta unificadora

Existe um **template canônico de modelagem temporal em domínio funcional TS** — articulando tipo (G1.a), Clock (G1.b) e validação (G2) num conjunto coerente com tudo que foi decidido nos 6 blocos fechados?

Se há, manda o snippet completo de `src/shared/kernel/instant.ts` + assinatura do `Clock` port + exemplo de uso em um agregado refatorado. Se case-by-case, manda a heurística.

---

## Q (host) — versão narrativa (para colar em chat externo)

Cara, antes da pergunta, lembrete das diretrizes do projeto pra você responder com as restrições em mente:

1. **Padrão D** (module-as-namespace, free functions).
2. **Result homemade** (~50 LOC, sem deps externas).
3. **Tagged errors** em `errors.ts` por agregado.
4. **State machine in types**.
5. **Brand via `unique symbol` global** em `shared/brand.ts`.
6. **Domínio sync puro**, Application Layer faz `await`.
7. **Zero `throw`, zero `class`, zero `this`, zero `any`**.
8. **Layout cravado pelo Bloco H:** `src/shared/kernel/` (cross-BC), `src/modules/<bc>/domain/shared/` (específico), `application/ports/` pra `Clock`.

Agora a pergunta: como o domínio fala sobre **tempo**? 3 eixos coladas:

**Eixo 1 — Tipo temporal canônico.** Hoje `Date` cru aparece em `Period.start/end`, `Contract.signedAt`, `Amendment.createdAt`. `Date` tem 3 defeitos:
1. **Mutável** (`d.setHours(0)` muta).
2. **Timezone implícita** (`new Date('2026-01-15')` depende do TZ do servidor).
3. **Comparação irregular** (`d1 === d2` é referência, precisa `getTime()`).

Quatro rotas:

- **α — Manter `Date` cru + `ValidDate` brandado.** Zero migração. Mas brand não impede mutação (Date é objeto).
- **β — Branded `Instant = Brand<number, 'Instant'>` (epoch ms).** Primitivo imutável, universal (sem TZ), zero deps. Smart constructor `Instant.fromEpochMs(ms)` ou `Instant.fromISO(iso)`. Perde ergonomia de formatação (conversão na borda).
- **γ — Temporal API** (`@js-temporal/polyfill`). API rica, imutável por design, TZ explícita. Mas Temporal está em **Stage 3 TC39 desde 2022** — sem implementação V8 nativa em 2026. Polyfill ~30KB, dependência externa no domínio (fere zero deps do Bloco I).
- **δ — Tipos múltiplos por significado:** `Instant` (momento), `PlainDate` (data civil), `Period` (já temos). Cada um com smart constructor.

Qual rota defende? Sobre Temporal: vale adotar polyfill agora ou aguardar Stage 4 + V8 nativo? E sobre δ: vale separar `PlainDate` de `Instant` no nosso caso?

**Eixo 2 — Assinatura do `Clock` port.** H2 cravou que `Clock` mora em `application/ports/clock.ts` (genérico). Falta a assinatura:

```ts
// A — retorna o tipo canônico do domínio (β)
export type Clock = Readonly<{ now: () => Instant }>;

// B — retorna Date cru
export type Clock = Readonly<{ now: () => Date }>;

// C — múltiplos métodos por granularidade
export type Clock = Readonly<{ instant: () => Instant; plainDate: () => PlainDate }>;
```

Qual? E como deve ser o adapter de teste — `MemoryClock.fixed(instant)` ou `MemoryClock.advanceBy(duration)`?

**Eixo 3 — `isValidDate` no domínio.** Hoje:

```ts
const assertValidEventDate = (at: Date): Result<Date, 'contract-invalid-event-date'> =>
  isValidDate(at) ? ok(at) : err('contract-invalid-event-date');
```

Aparece em 5+ lugares. **Minha intuição:** se aceitarmos β (branded `Instant`), o tipo `Instant` no parâmetro **já prova** que passou pelo smart constructor. `isValidDate` morre por consequência — o domínio confia no tipo, e validação fica concentrada em **um único ponto** (`Instant.fromEpochMs` / `Instant.fromISO`).

Confirma? Onde sobrevive (se sobreviver)? `src/shared/utils/date.ts` que hoje exporta `isValidDate` — deletado ou vira helper interno do smart constructor?

---

**Pergunta unificadora:** existe **template canônico** de modelagem temporal em domínio funcional TS — articulando tipo + Clock + validação — coerente com as 16 diretrizes que listei? Se sim, manda snippet completo de `src/shared/kernel/instant.ts` + assinatura do `Clock` port + exemplo de uso num agregado. Se case-by-case, manda heurística.

## R (PhD)

_pendente — colar aqui_

## Rules emergentes (a destilar após resposta)

| Eixo | Resolução esperada |
| :--- | :--- |
| G1.a | Rota canônica (α/β/γ/δ) + critério de decisão sobre Temporal (aguardar V8 nativo ou polyfill agora). |
| G1.b | Assinatura final do `Clock` port + pattern de injeção em use cases + adapter de teste. |
| G2 | `isValidDate` no domínio — morre ou sobrevive, e onde. Destino de `src/shared/utils/date.ts`. |
| Unificação | Template canônico de `src/shared/kernel/instant.ts` + integração com `Period`, `Contract`, `Amendment`. |

## Cross-refs

| Pergunta | Conexão |
| :--- | :--- |
| [B1+B2+B3 (followup)](./Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md) | `Instant` segue o template do Smart Constructor canônico (Padrão D, free functions). |
| [B1+B2+B3 (followup) — brand novo](./Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md) | Brand via `unique symbol` global — `Instant` usa o helper centralizado. |
| [D2+D3+D4+D5 (followup)](./Pergunta_D2_D3_D4_D5_followup_tec_lider_using_skill_ts-domain-modeler.md) | Tagged errors — `InstantError` segue o shape `{ tag, …payload }`. |
| [H1+H2+H3](./Pergunta_H1_H2_H3_tec_lider_using_skill_ts-domain-modeler.md) | Layout: `Instant` em `src/shared/kernel/`; `Clock` em `application/ports/`. |
| [A4](./Pergunta_A4_tec_lider_using_skill_ts-domain-modeler.md) | Mapper do Drizzle lê `DATETIME` do MySQL e converte pra `Instant` via smart constructor. |
| [E3+I1+I3+A4](./Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md) | Domínio 100% sync — `Clock` é sync (não `Promise<Instant>`). |

## Tickets que vão sair (provisório)

- **CTR-SHARED-INSTANT** — cria `src/shared/kernel/instant.ts` (branded number + smart constructors `fromEpochMs`/`fromISO` + comparadores + tagged errors).
- **CTR-DOMAIN-DATE-REPLACE** — substitui `Date` por `Instant` em `Period`, `Contract`, `Amendment` + remove `assertValidEventDate` + remove `src/shared/utils/date.ts` (ou reduz para helper interno do `Instant`).
- **CTR-APPLICATION-CLOCK-PORT** — define assinatura final de `Clock` em `application/ports/clock.ts` + cria `adapters/system-clock.ts` (real) e `adapters/memory-clock.ts` (test).
- **CTR-SKILL-REFRESH-G** — `.claude/skills/ts-domain-modeler/SKILL.md §3.G — Modelagem Temporal` com template canônico.

## O que esperar da resposta

1. Veredito sobre Eixo 1 (rota α/β/γ/δ) com critério de decisão sobre Temporal.
2. Assinatura final do `Clock` port + pattern de injeção + adapter de teste.
3. Decisão sobre `isValidDate` (morre/sobrevive/migra) + destino de `src/shared/utils/date.ts`.
4. (Bônus) Snippet completo de `src/shared/kernel/instant.ts` no template canônico (Padrão D, branded via `unique symbol`, tagged errors, free functions).

Se a resposta vier completa, **Bloco G fecha** e libera 4 tickets. Faltarão apenas E1/E2, F, J/K/L como blocos abertos — todos refinamentos pequenos.
