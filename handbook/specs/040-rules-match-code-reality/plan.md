# Implementation Plan: Reconstrução das rules ancorada no código real

**Branch**: `fix/368-deadman-audit-false-fired` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/040-rules-match-code-reality/spec.md`

## Summary

**Mudança de escopo decidida pelo responsável em 2026-07-30:** a spec 040 foi escrita para auditoria
incremental (corrigir divergência a divergência). O plano executa **reconstrução** — as 12 rules são
arquivadas e reescritas a partir do código, com recorte derivado da árvore real.

A justificativa é que o defeito é **de método, não de linha**. As 12 rules foram destiladas de 44 ADRs
sem jamais confrontar `src/`. A `adapters.md` chegou a afirmar como vigente um read/write split de
pools (ADR-0026) que o código nunca implementou — e, ironicamente, **sobre um diretório que ela nem
governa**: `src/shared/persistence/` não é coberto por rule alguma. Corrigir linha a linha preservaria
o método que produziu o erro.

## Decisões estruturais _(tomadas pelo responsável antes do plano)_

| #   | Decisão                                                          | Consequência para o plano                                                                    |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | **Do zero lendo `src/`**, com as 12 antigas apenas como consulta | Fase 3 escreve rules novas; as antigas são arquivadas na Fase 0 e nunca editadas             |
| 2   | **Normativa, mas toda afirmação verificável tem de passar hoje** | Nenhuma afirmação entra sem comando que a confirme contra `src/`; norma pendente sai da rule |
| 3   | **Recorte por path, derivado da árvore real**                    | O mapa de rules nasce da Fase 1 (inventário), não de categorias abstratas                    |
| 4   | **3 testes da 039 + não ser óbvio lendo o código ao redor**      | Quarto teste corta descrição de estrutura — o que mais envelhece                             |

**Consequência combinada de (2) e (4):** a rule deixa de ser um resumo do handbook e passa a ser o
conjunto mínimo de coisas que **são verdade hoje**, **importam no ponto de edição** e **não se
descobrem lendo o arquivo ao lado**. Isso reduz o texto e elimina a classe inteira de erro que motivou
a feature.

## Technical Context

**Language/Version**: Node.js 24 LTS · TypeScript 6 (ESM, NodeNext)

**Primary Dependencies**: nenhuma nova. O mecanismo de verificação usa apenas `node:test` e `node:fs`

**Storage**: N/A — a feature não toca persistência

**Testing**: `node:test` + `--experimental-strip-types` (runner do projeto)

**Target Platform**: repositório / harness de agente — não é código de produção

**Project Type**: aparato de processo (`.claude/rules/`), com verificação executável em `tests/`

**Performance Goals**: a verificação de cobertura deve rodar em segundos, para caber no gate

**Constraints**: **zero mudanças de comportamento em `src/`** (FR-011, SC-006)

**Scale/Scope**: 1.682 arquivos `.ts` em `src/` + `tests/`; 12 rules a substituir; 44 ADRs já julgados na spec 039

## Constitution Check

_GATE: verificado antes da Fase 0._

> ⚠️ **A constituição está factualmente obsoleta** e isso é registrado, não contornado.
> `.specify/memory/constitution.md:11-17` institui a pipeline W0→W3 e manda rodar
> `pnpm run pipeline:state init`, script **removido** no commit `6362709d`. O Princípio VII e as
> "Technology Constraints" ainda dizem "Fastify reservado", contra os ADR-0025/0037. A spec 038 trata
> a aposentadoria; a 039 decidiu absorver os princípios no `AGENTS.md`. Esta feature **não depende**
> de nenhuma dessas duas fechar.

| Princípio                                | Situação nesta feature                                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **I** — TDD fail-first / pipeline W0→W3  | ⚠️ O princípio cita aparato removido. **TDD como disciplina é respeitado**: o mecanismo da Fase 4 nasce com teste que falha antes (SC-008 exige violação deliberada detectada) |
| **II** — Regressão zero                  | ✅ Respeitado. Gate verde ao fim de cada fase; regressão de código encontrada vira issue (ADR-0040), nunca conserto silencioso                                                 |
| **III** — pnpm único                     | ✅ Nenhum comando `npm`                                                                                                                                                        |
| **IV** — Modular monolith isolado        | ✅ Zero mudanças em `src/`. A feature **reforça** o isolamento ao dar rule à `public-api/`                                                                                     |
| **V** — Domínio puro                     | ✅ Não aplicável — nada de domínio é escrito                                                                                                                                   |
| **VI** — MySQL + Drizzle                 | ✅ Não aplicável                                                                                                                                                               |
| **VII** — HTTP-first                     | ✅ Respeitado (a redação do princípio é que está velha, não a prática)                                                                                                         |
| **VIII** — TS strict + idioma por camada | ✅ Verificação em TS strict; doc em PT-BR, identificadores EN                                                                                                                  |
| **IX** — Citação canônica                | ✅ Cada afirmação de rule cita o ADR de origem **e** o comando que a verifica                                                                                                  |

**Veredito: PASSA.** A única tensão é com o Princípio I, cuja redação depende de aparato já removido — divergência preexistente, tratada pela spec 038, não introduzida aqui.

## Project Structure

### Documentation (this feature)

```text
specs/040-rules-match-code-reality/
├── spec.md                  # feature spec
├── plan.md                  # este arquivo
├── research.md              # Fase 0-1: inventário do código + catálogo de invariantes
├── data-model.md            # Fase 2: o mapa de rules por path
├── contracts/
│   └── verification.md      # contrato de verificação: afirmação → comando → resultado esperado
├── quickstart.md            # como rodar a verificação e ler o resultado
└── checklists/requirements.md
```

### Source Code (repository root)

Árvore real medida em 2026-07-30 — **é dela que o recorte das rules sai** (decisão 3):

```text
src/                                    # 905 arquivos .ts
├── modules/                            # 8 módulos
│   ├── auth/  budget-plans/  contracts/  financial/
│   ├── notifications/  partners/  programs/  reports/
│   └── <m>/
│       ├── domain/                     # ausente em reports/
│       ├── application/
│       ├── adapters/
│       │   └── http/                   # borda HTTP do módulo
│       ├── public-api/                 # 53 arquivos — SEM RULE HOJE
│       └── worker/                     # só em contracts/ e partners/ — SEM RULE HOJE
├── shared/
│   ├── kernel/         http/           # únicos cobertos hoje
│   ├── persistence/                    # pool-registry.ts — SEM RULE (onde a adapters.md errou)
│   ├── outbox/         ports/          adapters/
│   ├── observability/  primitives/     runtime/       utils/
│   └── index.ts
├── jobs/                               # auth, contracts, financial, migrate, partners
├── workers/                            # contract-count-projection, email-dispatch,
│                                       # payable-view-projection, runner, supplier-view-projection
└── server.ts                           # composition root

tests/                                  # 777 arquivos .ts
```

**Structure Decision**: o mapa de rules é derivado desta árvore, e a união dos `paths:` deve cobrir
`src/` inteiro. Cobertura medida hoje: **1.655 de 1.682 arquivos (98,4%)**, com **27 descobertos** e
sobreposição média de **2,3 rules por arquivo** — indicando tanto lacuna quanto redundância.

## Fases

### Fase 0 — Preservar antes de qualquer descarte

1. Arquivar as 12 rules atuais fora do repo, no padrão da spec 038 (`../core-api-rules-archive/`), com o relatório de destilação da 039 junto.
2. Registrar o baseline medido: 1.682 arquivos, 27 descobertos, 2,3 rules/arquivo, 44.177 bytes.
3. **Nada é deletado nesta fase.** As 12 seguem ativas até a Fase 3 entregar substituto verificado.

**Saída**: acervo + baseline em `research.md`. **Reversível**: sim, por definição.

### Fase 1 — Inventário do código (o que cada diretório é)

Ler `src/` diretório a diretório e responder, para cada um: o que vive ali, qual invariante existe de
fato, e o que um agente precisaria saber **ao editar** — sem consultar ADR nesta fase, para não
reintroduzir o viés que gerou o read/write split.

Prioridade nos **10 diretórios sem rule**, com destaque para `shared/persistence/`, `public-api/` e
`modules/*/worker/`.

**Saída**: `research.md` com uma ficha por diretório. **Gate humano:** o responsável revisa antes da Fase 2.

### Fase 2 — Desenhar o mapa de rules por path

Com o inventário pronto, decidir **quantas rules existem e qual path cada uma governa**, com duas
propriedades verificáveis: a união dos `paths:` cobre `src/` inteiro, e nenhum `paths:` aponta para
diretório inexistente. Reduzir a sobreposição de 2,3 rules/arquivo onde ela for redundância — e não
onde for composição legítima (camada + módulo).

**Saída**: `data-model.md` com o mapa. **Gate humano:** o responsável aprova o recorte antes de se escrever qualquer rule.

### Fase 3 — Escrever as rules, com verificação por afirmação

Para cada rule do mapa, escrever as afirmações que passem nos **4 testes** (decisão 4). Cada afirmação
verificável nasce acompanhada do comando que a testa, registrado em `contracts/verification.md`.

**Regra de corte:** afirmação cujo comando não passa **hoje** não entra. Se for norma legítima ainda não
implementada (caso ADR-0026), vira item de backlog — não linha de rule.

As 12 antigas ficam abertas como consulta, para não perder aprendizados que **não são visíveis no
código** — como o aviso do ADR-0027 de que a validação dupla é deliberada.

**Saída**: `.claude/rules/*` reconstruído + `contracts/verification.md`.

### Fase 4 — Mecanismo de detecção contínua

Teste em `tests/` que, a cada execução do gate:

1. roda cada comando de `contracts/verification.md` e falha se alguma afirmação deixar de ser verdade;
2. recalcula a cobertura de `paths:` e falha se surgir arquivo `.ts` sem rule;
3. falha se algum `paths:` declarado não casar com nenhum arquivo real.

**SC-008 exige provar que funciona:** introduzir uma violação de propósito, ver o teste falhar,
reverter. Escrito e não executado é cobertura ilusória — mesma disciplina do ADR-0038.

**Saída**: teste no gate + `quickstart.md`.

### Fase 5 — Fechamento

Diff de cobertura contra o baseline da Fase 0; divergências classificadas como regressão viram issues
(ADR-0040); as 12 antigas são removidas **só aqui**, com o substituto já verificado e verde.

## Complexity Tracking

| Violação                         | Por que é necessária                                                                  | Alternativa simples rejeitada porque                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Reconstruir em vez de corrigir   | O defeito é de método: 12 rules escritas sem confrontar o código                      | Correção incremental preserva o método e o recorte que já deixaram passar 3 lacunas de path |
| Adicionar um teste ao gate       | Sem detecção automática, a divergência volta — foi assim que o handbook envelheceu    | Revisão manual periódica depende de alguém suspeitar, que é exatamente o que falhou         |
| Dois gates humanos (Fases 1 e 2) | O responsável pediu para participar; recorte e inventário definem tudo que vem depois | Plano inteiro de uma vez tira a decisão de quem tem contexto do produto                     |

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] **nenhuma**
- **Prefixo de isolamento**: N/A
- **Outbox**: não
- **Restrições MySQL 8**: N/A — a feature não toca persistência

## Contrato HTTP

**N/A** — nenhum endpoint criado ou alterado. A feature escreve regra _sobre_ a borda, sem tocá-la.

## Estimativa de tamanho

> A seção original do template pede `--size` para `pnpm run pipeline:state`, **script removido** no commit `6362709d` (spec 038). Registrado como tamanho simples, sem ticket de pipeline.

- **Tamanho**: **L** — 1.682 arquivos a cobrir, 12 rules a substituir, mecanismo novo no gate
- **Justificativa**: o volume está na Fase 1 (inventário de ~20 diretórios) e na Fase 3 (uma afirmação por vez, cada uma com comando). As demais fases são pequenas
- **Plano de testes (RED primeiro)**: o teste da Fase 4 nasce **falhando** — escrito contra as afirmações antes de as rules novas existirem. O primeiro verde só vem quando a Fase 3 entrega rule verificada. É TDD aplicado ao aparato, não ao produto
