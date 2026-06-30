# CTR-NODE-TEMPORAL-API-STUDY — Estudo de Adoção do Temporal API

> **Tipo:** spike de pesquisa — não contém código de produção.
> **Data:** 2026-05-26
> **Executor:** `nodejs-runtime-expert`

---

## Veredito

Temporal API chegou ao Stage 4 em março/2026 e está disponível como global unflagged no Node 26 (Current desde maio/2026), mas o projeto fixa **Node 24 LTS** por razões operacionais bem fundamentadas nos ADRs 0002 e 0009. Adotar Temporal *hoje*, em produção, exige ou um polyfill com custo de supply-chain real (ADR-0011) ou rodar Node Current num ERP financeiro por até 5 meses antes do LTS — nenhuma das duas é recomendável agora. A recomendação é a **Opção C**: abstrair o conceito de data calendário atrás de um VO `PlainDate` hoje, usando `Date` como backend interno, e trocar para `Temporal.PlainDate` quando migrarmos para Node 26 LTS em outubro/2026. Isso captura o valor semântico de Temporal imediatamente (sem dependência nova, sem runtime experimental) e torna a migração real um `find-and-replace` concentrado em adapters, não em domínio.

---

## Onde o domínio ganha — mapeamento do uso atual

A inspeção do repositório revela três padrões distintos de uso de datas, com dores específicas em cada um.

### Tabela de impacto

| Lugar atual (path:linha) | Padrão hoje | Dor com `Date` | Ganho com Temporal |
| :--- | :--- | :--- | :--- |
| `src/shared/kernel/period.ts:14` | `start: Date; end: Date` dentro do VO `Period` | `Date` carrega hora+timezone implícita — um `Period` de vigência de contrato é calendário, não instante | `PlainDate` elimina o horário: `{ start: Temporal.PlainDate; end: Temporal.PlainDate }` — serialização `YYYY-MM-DD`, sem ambiguidade de timezone |
| `src/shared/kernel/period.ts:29` | `d.getUTCFullYear() >= MIN_YEAR` | Mistura `.getTime()` (ms desde epoch) com `.getUTCFullYear()` (campo de data) — operação acidental em dois espaços conceptuais | `Temporal.PlainDate.from(d).year >= 2000` — operação semântica única |
| `src/shared/kernel/period.ts:35-37` | `end.getTime() < start.getTime()` e `end.getTime() === start.getTime()` | Comparação por ms epoch para datas-calendário: `new Date('2026-05-26')` é `2026-05-26T00:00:00.000Z`, sensível ao timezone local onde `new Date` for chamado | `Temporal.PlainDate.compare(end, start) < 0` — comparação calendário pura |
| `src/modules/contracts/cli/formatters/date.ts:2-4` | `getUTCDate() / getUTCMonth()+1 / getUTCFullYear()` | Código duplicado entre `contracts` e `financial` (comentado em `financial/cli/formatters/date.ts:9`: "cópia direta") — manual, propenso a erro com meses 0-indexed | `plainDate.toLocaleString('pt-BR', { dateStyle: 'short' })` ou `plainDate.toString()` — sem aritmética manual |
| `src/modules/contracts/domain/contract/contract.ts:120` | `at.getTime() < contract.currentPeriod.end.getTime()` | Expiração de contrato compara instante com data-calendário; se `at` for criado em timezone local, o resultado pode diferir em até 24h do esperado | `Temporal.PlainDate.compare(at, periodEnd) < 0` — sem ambiguidade |
| `src/modules/financial/domain/payable/payable.ts:104,138,174,218,249,294,348,399` | `approvedAt.getTime() < payable.openedAt.getTime()` (7 comparações de estado) | Timestamps de máquina de estados comparados corretamente por ms epoch — aqui `Date` funciona bem, pois são instantes reais | `Temporal.Instant` seria equivalente; troca limpa mas não resolve um bug real |
| `src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts:77,163` | `const now = new Date()` — timestamp outbox sem Clock port | Outbox bypassa o `Clock` port — testabilidade comprometida; acoplamento a `Date.now()` real | Qualquer tipo (`Date` ou `Temporal.Instant`) — a dor aqui é ausência do Clock port, não o tipo |
| `src/modules/notifications/adapters/email/nodemailer.ts:77` | `new Date().toISOString()` | Idem — fora do Clock port; ok em adapter, mas inconsistente com padrão do projeto | `Temporal.Now.instant().toString()` se já em Node 26 |
| `src/modules/contracts/adapters/persistence/mappers/outbox.mapper.ts:325-331` | `new Date(obj['start'])` → validação com `isNaN(startDate.getTime())` | `new Date('lixo')` produz `Invalid Date` silencioso; a validação funciona mas é indireta | `Temporal.PlainDate.from(obj['start'])` lança `RangeError` com mensagem descritiva; capturável em `try/catch` → `Result` |

### Síntese das dores

A dor dominante no domínio de Contratos é a **mistura de `Date`-como-instante com `Date`-como-data-calendário**. O VO `Period` e as operações de expiração/vigência são inteiramente sobre datas de calendário — dia, mês, ano — mas usam `Date` que armazena um instante UTC com hora. Isso cria três riscos concretos:

1. **Ambiguidade de timezone no parse**: `new Date('2026-01-15')` é `2026-01-15T00:00:00.000Z` — correto em UTC, mas `new Date(string)` sem `T` produz comportamento dependente de implementação em alguns runtimes históricos.
2. **Aritmética de datas manual e duplicada**: os dois formatters de data (`contracts` e `financial`) repetem a mesma lógica de extração de dia/mês/ano com `getUTCDate` / `getUTCMonth() + 1`.
3. **Comparações híbridas**: `period.ts:35` usa `getTime()` (correto para instantes) e `period.ts:29` usa `getUTCFullYear()` (correto para datas) — no mesmo arquivo, para o mesmo tipo `Date`, sem indicação visual de qual semântica está em uso.

`Temporal.PlainDate` resolve exatamente este problema: é um tipo de data-calendário puro, sem hora, sem timezone, com API que expressa a intenção (`compare`, `add`, `until`, `since`).

---

## As 3 opções — trade-offs honestos

### Opção A — Polyfill `@js-temporal/polyfill` sobre Node 24

**Como funciona:** instalar `@js-temporal/polyfill` como dependência de produção e usar `import { Temporal } from '@js-temporal/polyfill'` em todo o domínio.

**Prós:**
- Temporal API disponível imediatamente, sem mudar versão do Node.
- O polyfill é mantido pelos próprios campeões da proposta TC39 — fidelidade à spec é alta.
- Permite iniciar a modelagem semanticamente correta desde já.

**Contras — ADR-0011 aplica diretamente:**

O ADR-0011 (`handbook/architecture/adr/0011-supply-chain-hardening.md:79`) lista o critério explícito: *"Toda nova dependência adicionada exige no PR: Justificativa, alternativas, verificação de mantenedor, última publicação dentro de 6 meses, versão pinada."*

O polyfill adiciona ~500 KB ao bundle (a verificar — marcado como "a verificar" pois não foi medido aqui). Mais importante: o ADR-0011 foi motivado por um incidente de supply chain em pacote com 70M downloads/semana — e o princípio central do mesmo ADR (`handbook/architecture/adr/0011-supply-chain-hardening.md:107`) é: *"se Node 24 oferece nativamente, adotar. Cada dep removida é uma surface de ataque a menos."* Adicionar um polyfill de uma API que o Node **vai oferecer nativamente em 5 meses** viola o espírito desse princípio.

Há também o risco de divergência semântica: o polyfill pode ter edge cases que diferem sutilmente do comportamento nativo do Node 26 — um ERP financeiro não pode tolerar isso sem extensiva validação.

**Recomendação sobre a opção A:** não adotar como dependência de produção. Pode ser útil como devDependency para exploração e testes durante o spike.

---

### Opção B — Bump para Node 26 Current (antes do LTS)

**Como funciona:** alterar `package.json#engines.node` para `>=26.0.0` e `devEngines.runtime.version` para `26.x`, e usar `Temporal` global diretamente.

**Prós:**
- Temporal nativo, zero dependência nova.
- API exatamente conforme spec (nenhum delta de polyfill).
- Pode ser feito agora — Node 26.0.0 foi lançado em 2026-05-05.

**Contras — críticos para ERP financeiro:**

O ADR-0009 (`handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md:79`) rejeitou explicitamente linhas ímpares (Current): *"Node 25 Current — Linha ímpar, não é LTS. Tem breaking changes em test runner. Nunca em prod financeira."* Node 26 é **linha par** (diferente do Node 25), então tecnicamente não viola esse ponto literal — mas o raciocínio se aplica: "Nunca em prod financeira" referia-se a runtimes não-LTS, não apenas a linhas ímpares.

O período de risco concreto é de **2026-05-05 até 2026-10-28** (~5 meses e 24 dias). Durante esse período, o Node 26 recebe patches mas sem os critérios formais de estabilidade que um LTS garante. Num ERP com **auditoria fiscal de 5 anos** (citado no ADR-0011: *"ERP financeiro com auditoria fiscal de 5 anos"*), qualquer incidente de runtime num período não-LTS é um risco de compliance — não apenas técnico.

Adicionalmente, manter um runtime Current implica: tracking de releases frequentes (possivelmente mensais com breaking changes menores), ausência de suporte estendido de segurança até o Active LTS, e possíveis incompatibilidades com `@types/node` e ferramentas de build antes da estabilização da linha 26.

**Recomendação sobre a opção B:** não adotar antes de outubro/2026. Reavaliar com ADR novo quando Node 26 entrar em Active LTS — exatamente o que o ADR-0009 (`handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md:92`) já prescreve: *"Quando Node 26 LTS for lançado (outubro/2026) e Node 24 entrar em maintenance... ADR novo supersedes este."*

---

### Opção C — Abstrair atrás de VO/port agora, trocar quando Node 26 LTS chegar

**Como funciona:** introduzir um branded type `PlainDate` no shared kernel com as mesmas regras de validação que `Period` já aplica, mas com semântica explicitamente de data-calendário (sem hora, sem timezone). Internamente, `PlainDate` usa `Date` como storage, forçando UTC (`new Date(year, month-1, day)` com UTC). Quando migrarmos para Node 26 LTS, trocamos o backend de `Date` para `Temporal.PlainDate` em um único arquivo.

```
src/shared/kernel/
├── period.ts        (já existe — usa Date internamente)
└── plain-date.ts    (novo VO — semântica PlainDate, backend Date hoje)
```

**Prós:**
- Zero nova dependência — supply chain não muda.
- O domínio passa a expressar sua intenção: `Period` com `PlainDate` vs. `Date` (instante) é distinção semântica clara.
- A migração real para Temporal nativo será cirúrgica: `plain-date.ts` + adapters de serialização — domínio não muda.
- Já aplicável hoje em `Period` (vigência), `contract.ts` (expiração), `document.ts` (retentionUntil), e nos formatters duplicados.
- Compatível com o Clock port existente: o Clock continua retornando `Date` (instante), e o código que compara instante com data-calendário faz a conversão explícita — tornando a mistura visível.

**Contras:**
- Cria um VO transitório que será substituído — cost of abstraction real, mas baixo (um arquivo, poucas funções).
- A conversão `Date → PlainDate` na borda (mappers, parsers, CLI state) exige cuidado com UTC vs. local — mas esse cuidado já é necessário hoje, e o VO força explicitá-lo.
- Não elimina bugs de timezone hoje — apenas os isola e os torna visíveis para correção futura.

**Recomendação sobre a opção C:** adotar. É a única opção que avança a modelagem semanticamente correta sem violar ADR-0011 (supply chain) nem ADR-0009 (Node 24 LTS fixo).

---

## Compatibilidade com ADRs vigentes

### ADR-0009 — Node 24 + TS 6, roadmap TS 7

O ADR-0009 (`handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md:43`) prescreve: *"Web Standards-first onde o ecossistema permite."* Temporal API é um Web Standard (TC39 Stage 4, ES2026) — a Opção C é compatível porque prepara a codebase para adotá-lo quando disponível nativamente no LTS. O mesmo ADR define o trigger de re-avaliação: *"Quando Node 26 LTS for lançado (outubro/2026)"* — exatamente o momento de trocar o backend do VO PlainDate para `Temporal.PlainDate`.

O `@types/node` ^22.10.0 (devEngines atual) **não** inclui tipos para `Temporal` ainda — isso seria necessário na migração para Node 26 e exigirá atualização dos types. Marcar como **"a verificar"**: confirmar quando `@types/node` ^26.x incluir typings para `Temporal` global.

### ADR-0002 — Node.js como runtime único

A Opção C não muda o runtime. As opções A e B também não mudam o runtime em si (ainda Node), então ambas são compatíveis com ADR-0002. A restrição relevante do ADR-0002 é sobre risco operacional — que recai mais sobre a Opção B (Current).

### ADR-0011 — Supply chain hardening

A Opção A adiciona `@js-temporal/polyfill` como dep de produção — viola o espírito do ADR-0011 (`handbook/architecture/adr/0011-supply-chain-hardening.md:107`): *"se Node 24 oferece nativamente, adotar. Cada dep removida é uma surface de ataque a menos."* Uma dep que cobre uma API que estará nativa em ~5 meses é exatamente o cenário que a política quer evitar.

A Opção C não adiciona nenhuma nova dependência. Totalmente compatível com ADR-0011.

### TS 6→7 (roadmap)

`Temporal.PlainDate` como tipo global aparecerá nas typedefs do `lib.dom.d.ts` / `lib.esnext.d.ts` no TypeScript 7 (a verificar data exata — marcado como "a verificar"). A Opção C, usando branded type interno, não conflita com isso: quando os tipos globais chegarem, a anotação de tipo do VO pode ser atualizada sem mexer na semântica.

---

## Referência do handbook/reference/nodejs/

O diretório `handbook/reference/nodejs/` (documentação do Node 24 oficial, 66 arquivos `.md`) **não contém nenhum arquivo sobre Temporal**. Isso é esperado: o handbook espelha a documentação do Node 24, e Temporal não existe no Node 24. `Timers.md` é o único arquivo de tempo disponível — cobre `setTimeout`, `setInterval`, `setImmediate`, não calendário.

---

## Custo e risco de migração (Opção C + upgrade para Node 26 LTS em out/2026)

### Fase 1 — agora (sobre Node 24)

Criar `src/shared/kernel/plain-date.ts` com:
- Smart constructor `PlainDate.from(isoString): Result<PlainDate, PlainDateError>`
- Comparadores `compare`, `isBefore`, `isAfter`, `equals`
- Formatter `toDisplayString(): string` (elimina os dois formatters duplicados)
- Serializer `toISOString(): string` (para mappers)

Migrar `Period` para usar `PlainDate` em vez de `Date` para `start`/`end`.
Atualizar mappers, CLI state deserializers, e formatters.

Escopo estimado: 1 ticket médio (S/M no pipeline). Arquivos afetados: `period.ts`, `contract.ts`, `document.ts`, `outbox.mapper.ts`, `state.ts` (contracts + financial), `formatters/date.ts` (ambos os módulos).

**Risco:** baixo. Nenhuma nova dep. A lógica de validação já existe em `period.ts` — está sendo reorganizada, não reescrita.

### Fase 2 — outubro/2026 (ao migrar para Node 26 LTS)

1. Remover a implementação interna de `PlainDate` (`Date` como backend).
2. Substituir por `Temporal.PlainDate` como backend: a interface pública do VO permanece igual.
3. Atualizar `@types/node` para ^26.x.
4. Rodar `pnpm test` — testes existentes validam o comportamento sem reescrita.

Abertura de ADR novo que `supersedes` ADR-0009 (Node 26 LTS + TS 7 estável).

**Risco:** baixo-médio. A troca de backend é localizada. O único risco real é divergência semântica entre o comportamento atual (UTC-forced `Date`) e `Temporal.PlainDate` em edge cases de parsing — que será capturado pelos testes de regressão do VO.

### Fora do escopo da migração

Os `Date` que representam **instantes reais** (`occurredAt`, `approvedAt`, `openedAt`, `processedAt`, timestamps do outbox) não precisam migrar para Temporal na Fase 1 nem obrigatoriamente na Fase 2. `Temporal.Instant` seria semanticamente mais preciso, mas `Date` funciona corretamente para instantes e não apresenta as dores de timezone que afetam datas-calendário. A migração de instantes pode ser avaliada em um estudo separado — o ganho é menor e o risco de regressão em mais alto.

---

## Recomendação formal

**Adotar a Opção C imediatamente**, com a seguinte sequência:

1. Abrir ticket `CTR-VO-PLAIN-DATE` para criar `src/shared/kernel/plain-date.ts` e migrar `Period` + formatters.
2. Registrar uma **inquiry** em `handbook/inquiries/0020-temporal-api-adoption.md` documentando o resultado deste estudo e o gatilho de re-avaliação (Node 26 LTS, outubro/2026).
3. Não abrir ADR ainda — a decisão arquitetural relevante (migração para Node 26) já está prevista como trigger no ADR-0009 (`handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md:92`). O ADR novo será aberto em outubro/2026 e incluirá Temporal como item positivo da migração.
4. Quando Node 26 entrar em Active LTS (2026-10-28): abrir ADR novo que `supersedes` ADR-0009, incluindo a troca do backend de `PlainDate` para `Temporal.PlainDate` como item da migração.

**Não fazer:**
- Adicionar `@js-temporal/polyfill` como dep de produção (ADR-0011).
- Fazer bump para Node 26 Current antes de outubro/2026 (ADR-0009, risco de compliance financeiro).
- Rubber-stamp no entusiasmo da P.O. — o ganho semântico é real, mas o timing importa.

---

## Notas "a verificar" (requerem validação futura)

- Tamanho de bundle de `@js-temporal/polyfill` — não medido neste estudo.
- Data exata em que `@types/node ^26.x` incluirá typings para `Temporal` global.
- Confirmar se TypeScript 7.0 estável (roadmap Q3/Q4 2026) incluirá `Temporal` nas `lib.esnext.d.ts` por padrão.
- Verificar se `@js-temporal/polyfill` 1.x tem divergências conhecidas do Node 26 nativo — relevante se a Opção A for reconsiderada no futuro.

---

## Referências citadas

- `handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md:43` — "Web Standards-first onde o ecossistema permite."
- `handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md:79` — "Node 25 Current — Linha ímpar, não é LTS. Nunca em prod financeira."
- `handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md:92` — trigger de re-avaliação: "Quando Node 26 LTS for lançado (outubro/2026)."
- `handbook/architecture/adr/0011-supply-chain-hardening.md:13` — incidente axios supply chain, motivação do ADR.
- `handbook/architecture/adr/0011-supply-chain-hardening.md:107` — "se Node 24 oferece nativamente, adotar. Cada dep removida é uma surface de ataque a menos."
- `handbook/architecture/adr/0011-supply-chain-hardening.md:75` — checklist para nova dep: justificativa, mantenedor, versão pinada.
- `src/shared/kernel/period.ts:14` — `Period` shape usa `Date` para `start`/`end`.
- `src/shared/kernel/period.ts:29` — `getUTCFullYear()` — operação de data-calendário sobre `Date`.
- `src/shared/kernel/period.ts:35-37` — comparações por `getTime()` para dados de calendário.
- `src/modules/contracts/cli/formatters/date.ts:2-4` — formatter manual de data BR com `getUTCDate/Month/FullYear`.
- `src/modules/financial/cli/formatters/date.ts:9` — comentário explícito "cópia direta" do formatter de contratos.
- `src/modules/contracts/domain/contract/contract.ts:120` — `at.getTime() < contract.currentPeriod.end.getTime()` — comparação instante vs. data-calendário.
- `src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts:77` — `new Date()` fora do Clock port.
- `src/modules/contracts/adapters/persistence/mappers/outbox.mapper.ts:325-326` — `new Date(obj['start'])` com validação por `isNaN`.
