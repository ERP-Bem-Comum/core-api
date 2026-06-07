[← Voltar para ADRs](./README.md)

# ADR-0037: HTTP-first — aposentadoria da CLI embutida; validação E2E via Bruno

- **Status:** Accepted
- **Date:** 2026-06-07
- **Deciders:** Gabriel Aderaldo + Arquiteto técnico
- **Supersede (parcial):** Princípio VII da constituição (`/.specify/memory/constitution.md` — "CLI-first; HTTP é Fase 2+"). A partir deste ADR, a UX primária do core-api é **HTTP**, não a CLI.
- **Relacionado:** [ADR-0006](./0006-modular-monolith-core-api.md) (ports & adapters — a UX é um adapter de entrada plugável), [ADR-0025](./0025-http-server-fastify-core-api.md) (servidor HTTP Fastify), [ADR-0027](./0027-zod-openapi-contract-first-http-edge.md) (Zod/OpenAPI na borda), [ADR-0028](./0028-http-edge-shell-location.md) (localização da borda), [ADR-0032](./0032-transient-http-composition-read-until-bff.md) (composição HTTP), [ADR-0033](./0033-api-versioning-v1-legacy-mirror.md) (versionamento `/api/v1`), [ADR-0034](./0034-adopt-bruno-api-client-cli.md) (Bruno como ferramenta de teste da borda HTTP)

---

## Contexto

A constituição da Fase 1 elegeu a **CLI como UX primária** (Princípio VII), com o servidor HTTP
"reservado para Fase 2+". Esse enquadramento ficou **desatualizado**: a série de ADRs 0025/0027/0028/
0032/0033 já adotou e endureceu a **borda HTTP** (Fastify + Zod/OpenAPI + versionamento), e o ADR-0034
adotou o **Bruno** como ferramenta oficial de teste E2E dessa borda (coleções `.bru` Git-friendly,
diffáveis em PR). Na prática, **HTTP já é a borda real** do core-api; a CLI embutida (`pnpm run
cli:contracts`, `cli:auth`, …) virou uma segunda UX que **duplica esforço** de manutenção e cuja
fidelidade à produção é menor que a de uma chamada HTTP real.

Há ainda uma mudança de produto já sinalizada no `AGENTS.md` raiz do mono_repo: a **CLI do domínio
migra para o pacote irmão `cli/`** (binário único `bc`, Bun), descrito ali como aquele que **"sucede a
CLI embutida no core-api"** — e que passará a **integrar com IAs**, tornando-se uma aplicação à parte,
com ciclo de vida e dependências próprios, fora do core-api.

Falta o ato formal que: (a) inverte a prioridade CLI→HTTP; (b) aposenta a CLI **embutida** no core-api;
(c) reaponta a validação de regras de negócio — que a CLI servia à P.O. — para **testes de integração
reais via HTTP**.

## Decisão

1. **HTTP/HTTPS é a UX primária do core-api.** Toda capacidade de negócio é exposta e exercitada pela
   borda HTTP (`/api/v1`, Fastify + Zod/OpenAPI — ADR-0025/0027/0033). Isto **supersede o Princípio VII**
   ("CLI-first") da constituição; o "Constitution Check" do `/speckit-plan` passa a tratar HTTP como a
   borda esperada (não mais "Fastify é Fase 2+ e exige ADR").

2. **A CLI embutida no core-api é aposentada.** Não se criam novos subcomandos em `src/modules/*/cli/`
   nem novos scripts `cli:*` no `package.json` do core-api. A remoção do código de CLI existente é
   **faseada** (não-bloqueante): congela-se hoje (sem novos comandos), remove-se quando cada módulo for
   tocado. A skill `application-cli-builder` deixa de ser caminho para novas features do core-api.

3. **A validação de regras de negócio passa a ser feita por testes de integração REAIS via HTTP.** O que
   a P.O. validava na CLB (use cases ponta a ponta) passa a ser validado por **coleções Bruno** (ADR-0034)
   contra a borda HTTP real + testes de borda (`fastify.inject`). A fidelidade é maior: exercita
   serialização, autorização, versionamento e contratos como em produção.

4. **A CLI do domínio é uma aplicação à parte (`cli/`, binário `bc`).** Sucede a CLI embutida (AGENTS.md
   raiz), com PM e deploy próprios (Bun), e integrará com IAs. Ela **consome a borda HTTP** do core-api
   como cliente — não compartilha processo nem importa `src/` do core-api.

5. **Domínio e application permanecem intactos.** Ports & adapters (ADR-0006) garante que a UX é um
   **adapter de entrada (driving) plugável**: trocar a UX primária de CLI para HTTP **não toca**
   `domain/` nem `application/`. As specs em andamento que previam "paridade CLI" (ex.: 005/006) removem
   esse item; as user stories entregam via HTTP + Bruno.

## Citação canônica *(obrigatória — princípio IX)*

> The design rationale behind the Web architecture can be described by an architectural style consisting
> of the set of constraints applied to elements within the architecture. By examining the impact of each
> constraint as it is added to the evolving style, we can identify the properties induced by the Web's
> constraints. (…) This section provides a general overview of REST by walking through the process of
> deriving it as an architectural style.
> — *(Linha 1076, p. 96, Roy T. Fielding, *Architectural Styles and the Design of Network-based Software Architectures*)*

A borda primária do core-api adota o estilo REST/HTTP de Fielding: um conjunto de restrições (interface
uniforme, statelessness, cacheabilidade) cujas **propriedades** (visibilidade, evolutibilidade, fidelidade
de teste E2E) são exatamente as que motivam preferir HTTP à CLI como mecanismo de entrega primário.

## Alternativas consideradas

- **Manter CLI-first, HTTP secundário** — rejeitado: mantém duas UX primárias e a manutenção dupla; ignora
  que a borda HTTP já é a real (ADR-0025+) e que o `cli/` já sucede a CLI embutida.
- **Paridade CLI+HTTP permanente no core-api** — rejeitado: custo de manter dois adapters de entrada para
  cada use case, sem ganho — a validação E2E real é melhor servida por Bruno (ADR-0034).
- **Manter a CLI só para validação da P.O.** — rejeitado: Bruno + `fastify.inject` cobrem a validação com
  fidelidade de produção (autorização, contratos, versionamento) que a CLB in-memory não tem.

## Consequências

- **Positivas**: uma única borda primária; validação E2E que reflete produção (HTTP real via Bruno);
  domínio/application inalterados (ports & adapters); a CLI fica livre para evoluir como app de IA no
  pacote `cli/`; menos superfície de manutenção no core-api.
- **Negativas / trade-offs**: perde-se a conveniência da CLI local para a P.O. (mitigada por coleções
  Bruno + `quickstart.md` de cada spec); a remoção da CLI embutida é trabalho faseado; specs/tasks que
  previam paridade CLI precisam ajustar (remover o item CLI das user stories).
- **Impacto em BCs / outbox / migrations**: **nenhum** no domínio/agregados/eventos/schema — a mudança é
  só na camada de borda (adapter de entrada). Remoção futura de `src/modules/*/cli/` e scripts `cli:*` é
  refactor sem mudança de comportamento de negócio.
- **Governança**: o Princípio VII da constituição deve ser reescrito para "HTTP-first" referenciando este
  ADR; registrar em `handbook/CHANGELOG.md`. O agente `fastify-server-expert` deixa de ser "reservado".
