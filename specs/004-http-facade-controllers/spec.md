# Feature Specification: Fachada OO (objeto-fachada de arrow-functions) na borda HTTP

**Feature Branch**: `004-http-facade-controllers`

**Created**: 2026-06-06

**Status**: Planejado — **repriorizado 2026-06-15** (`/speckit-plan` + `/speckit-tasks` gerados). Escopo **ampliado** para incluir o módulo `programs` (criado após a redação original; spec 008). Contagens reais reconciliadas pelo recon — ver tabela em `plan.md`. Board: `.claude/.planning/HTTP-FACADE-CONTROLLERS.md`.

**Input**: User description: "Adotar o padrão objeto-fachada de arrow-functions em toda a borda HTTP (auth + contracts + partners), dando aparência de controller OO mantendo 100% da semântica funcional. Restrito a `adapters/http/` + composition root. Sem mudança de comportamento."

> **Épico de REFACTOR (Size L) — zero mudança de comportamento.** Ganho é **legibilidade/organização** da borda
> HTTP, não funcionalidade. Os handlers hoje são arrow-functions inline soltas dentro de `scope.route({...})`;
> passam a ser **membros nomeados de um objeto-fachada** criado por uma factory que fecha sobre `deps`/`hooks` —
> lê-se como um controller. **Não toca** `domain/` nem `application/`; não altera contratos HTTP, ADRs nem env.
> Incremental, **módulo a módulo, nunca big-bang**. Rede de segurança: os testes de rota já existentes
> (`fastify.inject`), reaproveitados como **caracterização**.

## Glossário / Linguagem ubíqua

| Termo                   | Significado                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Borda HTTP**          | `src/modules/*/adapters/http/` — plugins Fastify + composition. Única camada afetada.                                |
| **Handler**             | A função `async (req, reply) => {...}` que atende uma rota.                                                          |
| **Objeto-fachada**      | Objeto cujas propriedades são os handlers nomeados (`{ list, getById, create }`), criado por uma factory.            |
| **Factory da fachada**  | `makeXController(deps, hooks) => ({...})` — fecha sobre dependências; sem `class`, sem `this`.                       |
| **Closure de rotas**    | A função `xRoutes(scope)` onde o `scope` decorado com o type-provider Zod vive. A fachada é montada **dentro** dela. |
| **Caracterização**      | Teste que fixa o comportamento atual antes do refactor (aqui: os testes de rota que já existem).                     |
| **Semântica funcional** | `Result<T,E>`, ports/adapters, domínio sem framework — invariante do projeto, preservada integralmente.              |

## User Scenarios & Testing _(mandatory)_

> O "usuário" deste épico é quem **mantém e lê** a borda HTTP (desenvolvedores do core-api). O valor é
> legibilidade e consistência de estilo; nenhum comportamento observável por clientes da API muda.

### User Story 1 - Padrão de fachada no módulo `auth` (piloto) (Priority: P1)

Como mantenedor do core-api, quero os handlers HTTP de `auth` agrupados como membros nomeados de um
objeto-fachada (em vez de arrow-functions inline soltas), para ler a borda como um controller e ter um
**padrão de referência** validado antes de propagar.

**Why this priority**: P1 — é o **piloto**. `auth` é o módulo de borda de **referência** — 4 plugins
(`plugin`/`users`/`roles`/`me`, 33 rotas) com a suíte de caracterização mais densa (21 arquivos `fastify.inject`);
exercitar o padrão em múltiplos plugins de um mesmo módulo de uma vez dá mais confiança antes de propagar. Fixa o
padrão canônico que os demais módulos copiam. Bloqueia (como referência) US-002, US-003 e US-004.

**Independent Test**: Rodar a suíte de rotas de `auth` (a mesma de hoje, sem alterá-la) e o gate W3 — tudo
verde após o refactor; nenhuma resposta/headers/status muda.

**Acceptance Scenarios**:

1. **Given** os handlers de `auth` hoje inline em `scope.route`, **When** o refactor agrupa-os num objeto-fachada por factory, **Then** os testes de rota de `auth` passam **sem alteração** e o comportamento é idêntico.
2. **Given** o objeto-fachada, **When** o reviewer inspeciona o código, **Then** não há `class`, não há `this`, e a semântica funcional (`Result`/ports) está intacta.
3. **Given** o type-provider Zod no `scope`, **When** um handler acessa `req.query`/`params`/`body`, **Then** a inferência tipada é preservada (a fachada vive dentro da closure de rotas).

---

### User Story 2 - Padrão de fachada no módulo `contracts` (Priority: P2)

Como mantenedor, quero o plugin único e mais denso (`contracts`, 16 rotas: leituras + escritas + aditivos +
documentos) convertido ao padrão já validado no piloto, para uniformizar a borda do módulo de maior densidade por arquivo.

**Why this priority**: P2 — maior densidade num só plugin; aplica o padrão de referência depois que ele está provado.

**Independent Test**: Suíte de rotas de `contracts` (incl. detalhe composto, aditivos, documentos) verde
sem alteração + gate W3.

**Acceptance Scenarios**:

1. **Given** as 16 rotas de `contracts` inline, **When** convertidas ao objeto-fachada, **Then** todos os testes de rota de `contracts` passam sem alteração.
2. **Given** rotas com composição na borda (ADR-0032: contractor/children/files), **When** refatoradas, **Then** a composição e os headers `Deprecation`/`Sunset` permanecem idênticos.

---

### User Story 3 - Padrão de fachada no módulo `partners` (Priority: P3)

Como mantenedor, quero os 6 plugins de `partners` (collaborator, supplier, financier, act, geography,
aggregator) convertidos ao padrão, fechando a uniformização da borda inteira.

**Why this priority**: P3 — maior número de arquivos; vem por último. Os tickets `PARTNERS-AGGREGATOR-HTTP`
e `PARTNERS-EXPORT-PARITY-HTTP` já fecharam (closed-green), então `partners` não está mais congelado.

**Independent Test**: Suítes de rotas dos 6 plugins de `partners` (listas/detalhe/export/agregador/territorial)
verdes sem alteração + gate W3.

**Acceptance Scenarios**:

1. **Given** os 6 plugins de `partners` inline, **When** convertidos ao objeto-fachada (1 por plugin), **Then** todas as suítes de rota de `partners` passam sem alteração.
2. **Given** o `partners-plugin` agregador e as rotas de export, **When** refatorados, **Then** AND-4-reads, cap→503, headers CSV e projeção permanecem idênticos.

---

### User Story 4 - Padrão de fachada no módulo `programs` (Priority: P4)

Como mantenedor, quero o plugin de `programs` (1 plugin `programsRoutes`, 8 rotas — CRUD + ciclo de vida +
upload/display de logo) convertido ao padrão, **fechando 100% da borda HTTP** sob o objeto-fachada.

**Why this priority**: P4 — o módulo `programs` foi criado **depois** da redação original deste épico (spec 008)
e nasceu com handlers inline; entra no escopo para que SC-001/SC-002 (100% dos plugins / zero inline) sejam
verdadeiros de fato. Menor blast radius (1 plugin, 8 rotas, 5 arquivos de teste); vem por último porque o padrão
já está provado em auth/contracts/partners. Independente dos demais (pode ser paralelo).

**Independent Test**: Suíte de rotas de `programs` (lista/criar/detalhe/editar/desativar/reativar/logo) verde
sem alteração + gate W3.

**Acceptance Scenarios**:

1. **Given** as 8 rotas de `programs` inline, **When** convertidas ao objeto-fachada `makeProgramsController`, **Then** todos os testes de rota de `programs` passam sem alteração.
2. **Given** a rota de upload/display de logo (multipart), **When** refatorada, **Then** o transporte de arquivo, headers e status permanecem idênticos.

### Edge Cases

- **Inferência de tipo quebrada**: se a fachada for extraída para FORA da closure de rotas, `req` vira `FastifyRequest` cru e a inferência Zod some → **proibido**; a fachada MUST viver dentro de `xRoutes(scope)`.
- **Teste acoplado a detalhe interno**: se algum teste de rota referenciar a estrutura interna do plugin (não o comportamento HTTP), ele pode precisar de ajuste mínimo — registrar explicitamente no ticket (exceção, não regra).
- **`class` acidental**: qualquer `class`/`this`/parameter property reprova o gate (lint + strip-types) — barreira mecânica.
- **Helper compartilhado entre handlers**: funções auxiliares locais (ex.: `sendWriteError`) permanecem no escopo do módulo; a fachada agrupa só os handlers de rota.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Cada plugin da borda HTTP MUST expor seus handlers como **membros nomeados de um objeto-fachada** criado por uma factory `makeXController(deps, hooks)`, em vez de arrow-functions inline em `scope.route`.
- **FR-002**: O objeto-fachada MUST ser construído **dentro da closure** `xRoutes(scope)` (onde o `scope` está decorado com o type-provider Zod), preservando a inferência tipada de `req.query`/`params`/`body`.
- **FR-003**: O refactor MUST NOT usar `class`, `this`, parameter properties ou decorators (barreira do `no-restricted-syntax` + `--experimental-strip-types`). Apenas `type Readonly<{}>` + funções/arrow-functions.
- **FR-004**: O refactor MUST NOT alterar comportamento observável: status, body, headers, ordem de `preHandler`, envelope de erro, contratos Zod — tudo idêntico.
- **FR-005**: O refactor MUST NOT tocar `domain/` nem `application/` de nenhum módulo; restrito a `adapters/http/` + composition root.
- **FR-006**: Cada módulo refatorado MUST manter **verdes e sem alteração** os testes de rota existentes (`fastify.inject`), salvo teste acoplado a detalhe interno (exceção registrada no ticket).
- **FR-007**: O épico MUST ser entregue **incremental, um módulo por ticket** (auth → contracts → partners → programs), nunca num único big-bang.
- **FR-008**: Cada ticket MUST fechar com o gate W3 (`typecheck` + `format:check` + `lint` + `test`) verde (regressão zero).

### Key Entities

- **Objeto-fachada (controller)**: agrupamento nomeado dos handlers de um plugin; DTO de organização de código, sem estado, sem identidade de domínio.
- **Factory da fachada**: `makeXController(deps, hooks)` — função pura que devolve o objeto-fachada fechando sobre dependências injetadas.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos plugins HTTP (auth + contracts + partners + programs, **12 plugins / 97 rotas**) usam o objeto-fachada; **zero** arrow-function de rota inline remanescente em `scope.route`.
- **SC-002**: **Zero** ocorrência de `class`/`this` na borda HTTP após o refactor (verificável por busca).
- **SC-003**: 100% dos testes de rota existentes passam **sem alteração de asserção** (exceto exceções de teste acoplado a detalhe interno, contadas e justificadas).
- **SC-004**: Gate W3 verde em cada ticket (typecheck/format/lint/test), com contagem de testes **igual ou maior** que a baseline (nenhum teste perdido).
- **SC-005**: Nenhuma mudança em `domain/`, `application/`, contratos HTTP, ADRs ou env — diff restrito a `adapters/http/` + composition root.

## Impacto Arquitetural (core-api)

- **Bounded Contexts afetados**: [x] auth · [x] contracts · [x] partners · [x] programs — **apenas a camada `adapters/http/`** de cada um. Sem cross-BC, sem mudança de fronteira.
- **Novos agregados / Value Objects?**: nenhum. O objeto-fachada é organização de adapter (não domínio).
- **Novos eventos de domínio (outbox)?**: não.
- **Novos subcomandos de CLI?**: não.
- **Borda HTTP envolvida?**: **SIM, e é o único alvo.** Já habilitada (ADR-0025/0028/0033). Não inaugura nada; reorganiza handlers existentes.
- **Possíveis violações da constituição (I–IX)?**: nenhuma. Reforça V (domínio puro intocado) e VIII (TS estrito, sem `class`). O padrão é o já recomendado pela mensagem do `no-restricted-syntax`.

## Assumptions

- O padrão objeto-fachada é puramente **estético/organizacional**; o ganho de legibilidade é subjetivo, aceito pelo solicitante como justificativa suficiente para o churn (~2–3k linhas; 97 handlers em 12 plugins).
- A restrição de inferência (fachada dentro da closure) é **inegociável** — sem ela o refactor regride a tipagem; é critério de revisão (W2).
- Cada plugin vira **uma** fachada (1:1 plugin↔controller). Plugins com sub-recursos (ex.: contracts com amendments/documents) podem agrupar por sub-objeto se melhorar a leitura, a critério do W1 — sem mudar comportamento.
- Helpers locais não-handler (formatadores, mapeadores de status) permanecem como estão; só os handlers de rota entram na fachada.
- Decisão `class` (Opção B) está **fora de escopo** — exigiria ADR próprio + exceção de lint; este épico é explicitamente a Opção A.
- Ordem dos tickets (auth → contracts → partners → programs) é fixa: o piloto valida o padrão antes da propagação.
