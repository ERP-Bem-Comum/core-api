# Phase 0 — Research: `004-http-facade-controllers`

> Decisões consolidadas do épico de **refactor** (objeto-fachada na borda HTTP — zero mudança de comportamento).
> **Fonte das citações canônicas (princípio IX):** o MCP `acdg-skills` está **offline** nesta sessão (headless),
> então as citações foram extraídas do **fallback LOCAL** `envolve/acdg/skills_base/shared-references/` — agora
> registrado em [`.mcp.json#_fallback`](../../.mcp.json) — **literalmente via `grep -n`** (anti-padrão #12: nunca
> citar de memória). Nenhum `NEEDS CLARIFICATION` remanescente.

## R1 — Objeto-fachada (Opção A, sem `class`) como agrupamento de handlers

- **Decision**: cada plugin expõe seus handlers como **membros nomeados de um objeto** criado por factory
  `makeXController(deps, hooks)` — `type Readonly<{ register, login, ... }>` + arrow-functions que fecham sobre
  `deps`/`hooks`. **Sem `class`, sem `this`** (Opção B descartada).
- **Rationale**: é a aplicação do padrão **Facade** (GoF) à borda — um objeto que dá interface legível ("controller")
  a um conjunto de handlers **sem introduzir comportamento novo**. O "controller" é açúcar organizacional, não um objeto
  com estado/identidade — preserva a semântica funcional (Princ. V/VIII). A barreira `no-restricted-syntax` +
  `--experimental-strip-types` já proíbe `class`/`this`: a Opção A é o caminho que o próprio lint recomenda.
- **Citação canônica**:

  > O Facade é um padrão de projeto estrutural que fornece uma interface simplificada para uma biblioteca, um framework, ou qualquer conjunto complexo de classes. [...] O Facade define uma interface simplificada para um subsistema de objetos, mas ele não introduz qualquer nova funcionalidade. O próprio subsistema não está ciente da fachada. Objetos dentro do subsistema podem se comunicar diretamente.
  > — GoF / A. Shvets, _Mergulho nos Padrões de Projeto_ (`shared-references/clean-code/padroes-de-projeto--shvets.md:2773,2899`)

  A frase "**não introduz qualquer nova funcionalidade**" é literalmente a meta do épico (SC-001/SC-005); "**o próprio
  subsistema não está ciente da fachada**" mapeia em FR-005 (domínio/application intocados).

- **Alternatives considered**:
  - _Opção B — `class XController`_: rejeitada — exige ADR próprio + exceção de lint, quebra `--experimental-strip-types` (parameter properties/decorators) e introduz `this` (bugs de binding). Fora de escopo (Assumption do spec).
  - _Manter arrow-functions inline_: é o status quo que o épico elimina (SC-001/SC-002).

## R2 — Fachada construída **dentro** da closure de rotas (preserva inferência Zod)

- **Decision**: `makeXController(deps, hooks)` é instanciado **dentro** do corpo `async (scope) => {...}` do plugin (onde
  o `scope` está decorado com o type-provider `FastifyZodOpenApiTypeProvider`); cada `scope.route({ handler: controller.x })`. **Nunca** extrair a fachada para fora da closure.
- **Rationale**: confirmado em `auth/plugin.ts:40-42` — a inferência tipada de `req.query`/`params`/`body` vem do `scope`
  decorado. Se a fachada nascer fora, `req` degrada para `FastifyRequest` cru e a inferência Zod **some** (Edge Case do
  spec; FR-002). É restrição **de ferramenta** (TS + `fastify-zod-openapi`), não decisão de design com cânone — daí sem
  citação canônica. Operacionaliza o invariante de Fowler (R3): o refactor preserva o observável, **tipos inclusive**.
- **Alternatives considered**:
  - _Fachada como símbolo top-level (fora do plugin)_: rejeitada — perde inferência; viraria `as`-casting manual (regressão de tipo, viola Princ. VIII).

## R3 — Testes de rota existentes como **caracterização** (molda o W0 do refactor)

- **Decision**: os **64 arquivos** de teste de rota (`fastify.inject`) são a **rede de caracterização**. O **W0** de cada
  ticket **não** escreve "teste RED por inexistência" (não há API nova) — **confirma a suíte do módulo verde** e **congela
  a contagem** como baseline; o W1 refatora mantendo tudo verde **sem alterar asserção** (SC-003/SC-004).
- **Rationale**: rede de testes é a precondição canônica do refactor. A suíte já existe e é densa (auth 21, contracts 15,
  partners 23, programs 5) → precondição satisfeita; o disciplinado é **provar o verde antes de tocar `src`** e **não
  perder testes**. Reconcilia o Princ. I (fail-first) com a natureza do refactor (ver Complexity Tracking do `plan.md`).
- **Citação canônica**:
  > Whenever I do refactoring, the first step is always the same. I need to ensure I have a solid set of tests for that section of code. The tests are essential because even though I will follow refactorings structured to avoid most of the opportunities for introducing bugs, I'm still human and still make mistakes. The larger a program, the more likely it is that my changes will cause something to break inadvertently-in the digital age, frailty's name is software.
  > — M. Fowler, _Refactoring_ 2ª ed. (`shared-references/clean-code/refactoring--martin-fowler.md:208`)
- **Alternatives considered**:
  - _Escrever testes "RED" novos para o refactor_: rejeitada — teatro de processo; duplicaria a caracterização sem cobrir comportamento novo (não há). Registrado em Complexity Tracking.
  - _Refatorar sem rodar a suíte antes_: rejeitada — remove a rede de segurança (anti-Fowler; viola Princ. II).

## R4 — Incremental, **um módulo por ticket**, nunca big-bang (auth → contracts → partners → programs)

- **Decision**: 4 tickets, um por BC, ordem fixa com auth como piloto. **Jamais** um PR único convertendo a borda inteira.
  `programs` incluído (decisão do solicitante, 2026-06-15) para fechar SC-001/SC-002 de fato.
- **Rationale**: incrementalismo limita o blast radius e permite **aprender o padrão no piloto** antes de propagar; alinha
  ao isolamento por BC (ADR-0014: nunca misturar módulos numa sessão). Modularização permite testar/rastrear cada parte
  independentemente — o que casa com "1 ticket = 1 módulo, com seu próprio W0→W3".
- **Citações canônicas**:

  > If you do a big-bang rewrite, the only thing you're guaranteed of is a big bang. [...] If you get to the point of deciding that breaking apart your existing monolithic system is the right thing to do, I strongly advise you to chip away at the monolith, extracting a bit at a time. An incremental approach will help you learn about microservices as you go and will also limit the impact of getting something wrong (and you will get things wrong!).
  > — S. Newman, _Building Microservices_ 2ª ed. (`shared-references/architecture/building-microservices--sam-newman.md:1323,1327`)

  > Each task forms a separate, distinct program module. (...) At checkout time the integrity of the module is tested independently; there are few scheduling problems in synchronizing the completion of several tasks before checkout can begin. Finally, the system is maintained in modular fashion; system errors and deficiencies can be traced to specific system modules, thus limiting the scope of detailed error searching.
  > — D. Parnas, _On the Criteria To Be Used in Decomposing Systems into Modules_ (`shared-references/architecture/criteria-for-modularization--parnas.md:28`)

- **Alternatives considered**:
  - _Big-bang (1 PR para 12 plugins)_: rejeitada (anti-Newman; review inviável; viola FR-007).
  - _1 ticket por plugin (12 tickets)_: aceitável como **sub-fatiamento** se o W2 do `partners` (6 plugins) julgar o diff grande demais; o default é 1/módulo.

## Premissas validadas no recon (código real, 2026-06-15)

- **12 plugins, 97 rotas, 64 arquivos de teste**; **zero** `class`/`this` na borda (já 100% funcional).
- Factory `xRoutes(deps, hooks?): FastifyPluginAsyncZodOpenApi => async (scope) => {...}` — `scope` decorado **dentro** do plugin (`auth/plugin.ts:40-42`).
- `deps`/`hooks` chegam por **parâmetro** da factory (capturados por closure); o wiring em `server.ts` (`routes: [authHttpPlugin(deps), ...]`) **não muda de assinatura**.
- Helpers locais não-handler (`sendDomainError`, `writeErrorStatus`, `magicBytesMatch`, `sanitizeFilename`, `sendWriteError`, mapeadores de status) **permanecem fora** da fachada.
