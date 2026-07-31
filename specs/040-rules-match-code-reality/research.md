# Research — baseline medido e inventário inicial

**Feature**: [040-rules-match-code-reality](./spec.md) · **Plano**: [plan.md](./plan.md)
**Medido em**: 2026-07-30

Este documento cobre a **Fase 0** (baseline) e abre a **Fase 1** (inventário). O inventário completo
depende do gate humano previsto no plano — o que está aqui é o levantamento que sustenta o recorte.

---

## Baseline quantitativo

| Métrica                             | Valor                                   |
| ----------------------------------- | --------------------------------------- |
| Arquivos `.ts` em `src/` + `tests/` | **1.682**                               |
| Cobertos por ao menos uma rule      | 1.655 (98,4%)                           |
| **Sem nenhuma rule**                | **27** (1,6%)                           |
| Sobreposição média                  | **2,3 rules/arquivo**                   |
| Rules ativas                        | 12                                      |
| Bytes de rule                       | 44.177 (era 15.305 no início da sessão) |

Reproduzível por `scratchpad/rule-coverage.mjs`, que faz glob matching real (`**` recursivo, `*` não
atravessa `/`) em vez de comparação de prefixo.

### Cobertura por rule

| Rule                  | Arquivos                            |
| --------------------- | ----------------------------------- |
| `testing.md`          | 777                                 |
| `adapters.md`         | 729                                 |
| `financial-module.md` | 614                                 |
| `application.md`      | 380                                 |
| `domain.md`           | 339                                 |
| `partners-module.md`  | 314                                 |
| `http-edge.md`        | 264                                 |
| `auth-module.md`      | 237                                 |
| `contracts-module.md` | 223                                 |
| `jobs-and-workers.md` | 51                                  |
| `api-collections.md`  | 0 (`.bru`, fora do escopo `.ts`)    |
| `supply-chain.md`     | 0 (manifesto, fora do escopo `.ts`) |

**Leitura:** a soma passa de 3.900 para 1.682 arquivos — sobreposição de 2,3×. Parte é composição
legítima (camada + módulo); parte é redundância a reduzir na Fase 2.

---

## Os 27 arquivos sem cobertura

Dois grupos, e ambos apontam para o mesmo defeito de método.

### Grupo A — `public-api/` dos módulos sem rule própria _(9 arquivos)_

| Módulo          | Arquivos |
| --------------- | -------- |
| `programs`      | 6        |
| `notifications` | 2        |
| `reports`       | 1        |

Verificado: os 6 de `programs` são **exatamente** os de `public-api/` — `domain/`, `application/` e
`adapters/` são cobertos pelos globs de camada (`src/modules/*/domain/**`, etc.).

**`public-api/` só é coberto por acidente**, nos 4 módulos que ganharam rule própria (`auth`,
`contracts`, `partners`, `financial`+`budget-plans`), cujo glob é `src/modules/<m>/**/*.ts`. Nenhum
`paths:` menciona `public-api` deliberadamente.

Isso é grave porque `public-api/` é **a fronteira do modular monolith** (ADR-0006): 53 arquivos que
definem o único canal legítimo de consumo cross-módulo. A regra "cross-módulo só por `public-api`"
existe em três rules — e nenhuma carrega quando se edita a própria `public-api`.

### Grupo B — `src/shared/*` _(18 arquivos)_

| Diretório               | Arquivos | Conteúdo real                                                         |
| ----------------------- | -------- | --------------------------------------------------------------------- |
| `shared/utils/`         | 5        | `csv.ts`, `date.ts`, `hash.ts`, `id.ts`, `string.ts`                  |
| `shared/primitives/`    | 4        | `brand.ts`, `exhaustive.ts`, `immutable.ts`, `result.ts`              |
| `shared/persistence/`   | 3        | `pool-registry.ts`, `mysql-pool-config.ts`, `module-driver-config.ts` |
| `shared/adapters/`      | 2        | `clock-fixed.ts`, `clock-real.ts`                                     |
| `shared/index.ts`       | 1        | barrel                                                                |
| `shared/observability/` | 1        | `correlation.ts`                                                      |
| `shared/ports/`         | 1        | `clock.ts`                                                            |
| `shared/runtime/`       | 1        | `last-resort.ts`                                                      |

---

## O padrão por trás dos dois grupos

As rules **falam sobre** esses diretórios sem **cobrir** nenhum deles. Dois casos simétricos provam:

| A rule afirma…                                                                  | …sobre um diretório que ela não governa                                                        |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `adapters.md`: "dois pools, `writer` e `reader`; o reader nunca escreve"        | `src/shared/persistence/` — onde vive `pool-registry.ts`, que **não** implementa split         |
| `domain.md`: "`Result<T,E>`", "branded types", "switch exaustivo", "`Readonly`" | `src/shared/primitives/` — onde vivem `result.ts`, `brand.ts`, `exhaustive.ts`, `immutable.ts` |

O primeiro caso produziu uma **afirmação falsa**; o segundo, uma afirmação verdadeira que **não chega
a quem edita o arquivo**. Mesma causa: o recorte foi derivado de categorias do handbook (camada,
módulo, tema), não da árvore. Um diretório que não corresponde a nenhuma categoria simplesmente não
existe para as rules — mesmo sendo citado por elas.

É a evidência mais direta a favor da **decisão 3** (recorte por path derivado da árvore real).

---

## Estruturas reais que as rules não previam

| Estrutura                      | Realidade                                                                           | Consequência                            |
| ------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------- |
| Módulo sem `domain/`           | `reports` tem só `adapters/`, `application/`, `public-api/`                         | "todo módulo tem domínio" é falso       |
| `worker/` dentro do módulo     | `contracts/worker/`, `partners/worker/` (`config.ts`, `outbox-worker.ts`, `run.ts`) | `jobs-and-workers.md` não os alcança    |
| `public-api/` como camada      | 53 arquivos, 14 só em `partners`                                                    | Fronteira do ADR-0006 sem rule dedicada |
| `shared/` com 10 subdiretórios | Só `kernel/` e `http/` cobertos                                                     | 8 subdiretórios invisíveis às rules     |

---

## Divergências ADR ↔ código _(a raiz do problema)_

| ADR    | Descreve                                        | Realidade                                      | Classificação             |
| ------ | ----------------------------------------------- | ---------------------------------------------- | ------------------------- |
| `0026` | Read/write split de conexão (`writer`/`reader`) | `pool-registry.ts` — 1 pool por URL, sem split | **Norma pendente**        |
| `0006` | `src/contexts/{documentos,titulos,banco,ocr}`   | `src/modules/{auth,budget-plans,…}`            | **Descrição envelhecida** |
| `0010` | `packages/shared-kernel/`, `apps/core-api/`     | Caminhos inexistentes                          | **Descrição envelhecida** |
| `0002` | Node 20                                         | Node 24 (superseded parcialmente pelo `0009`)  | **Descrição envelhecida** |

A distinção importa porque os tratamentos são opostos: **descrição envelhecida** não entra na rule e
não muda o código; **norma pendente** vira backlog; **norma violada** viraria issue de regressão
(ADR-0040). Nenhuma das quatro é regressão.

---

## O que já está conforme _(não refazer o que funciona)_

| Afirmação                                      | Comando                                                              | Resultado                            |
| ---------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| Sem `class` no domínio e no kernel             | `grep -rln "^export class" src/modules/*/domain/ src/shared/kernel/` | ✅ zero                              |
| Zod só na borda                                | `grep -rln "from 'zod'" src/ \| grep -v adapters/http`               | ✅ zero                              |
| CLI embutida removida                          | `ls -d src/modules/*/cli/`                                           | ✅ inexistente                       |
| 5 estados do `Contract`                        | `grep -n "status:" .../contract/contract.ts`                         | ✅ presentes                         |
| Shell HTTP em `src/shared/http/`               | `ls -1 src/shared/http/`                                             | ✅ `app.ts`, `reply.ts`, `errors.ts` |
| Job com `run.ts` + `config.ts`                 | `ls -1 src/jobs/*/*/`                                                | ✅ conforme                          |
| 4 use cases do `auth` com `authorize` embutido | arquivos em `application/use-cases/`                                 | ✅ existem                           |

**Sinal mais forte:** `src/modules/auth/domain/authorization/permission-catalog.ts` traz o comentário
_"Dominio e puro: sem throw (rule domain.md)"_ — o código **cita a rule**. Elas são consultadas de
fato, o que eleva o custo de uma rule errada.

---

## Pendente de gate humano

- **Fase 1** — inventário completo dos ~20 diretórios (o que vive ali, qual invariante existe **de fato**, o que importa no ponto de edição). Prioridade: `shared/persistence/`, `public-api/`, `modules/*/worker/`, `shared/primitives/`.
- **Fase 2** — o mapa de rules por path. **Não escrever nenhuma rule antes desta aprovação.**
