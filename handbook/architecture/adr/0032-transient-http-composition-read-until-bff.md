[← Voltar para ADRs](./README.md)

# ADR-0032: Composição de leitura transitória no adapter HTTP (rota gorda) até o BFF v2

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** Gabriel Aderaldo + Product Owner + Arquitetura Frontend v2
- **Relacionado:** [ADR-0006](./0006-modular-monolith-core-api.md) (ports & adapters; cross-módulo via public-api), [ADR-0014](./0014-mysql-database-isolation.md) (isolamento por database), [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) (read models), [ADR-0025](./0025-http-server-fastify-core-api.md) (HTTP é adapter), [ADR-0028](./0028-http-edge-shell-location.md) (HTTP de feature em `adapters/http/`), [ADR-0031](./0031-partners-registry-module.md) (módulo Parceiros). **Origem:** [`handbook/po-feedback/0001`](../../po-feedback/0001-gap-api-v2-contracts.md).

---

## Contexto

O retorno [`po-feedback/0001`](../../po-feedback/0001-gap-api-v2-contracts.md) (Gap API v2 Contracts vs. v1) pede que o `GET /contracts/{id}` devolva uma **visão rica**: o contrato + o **contratado** (fornecedor/financiador/colaborador, com dados bancários/PIX) + **program/budget** + os **aditivos** e **documentos** aninhados — paridade com a v1, onde tudo vivia num documentão de ~30 campos no frontend.

Cruzando com o código (triagem em `0001 §B`), a maioria desses dados **não pertence ao agregado `Contract`**:

- O **contratado** e seus dados bancários/PIX são do módulo **Parceiros** (`par_*`, ADR-0031) — o próprio relatório reconhece (R5: read-only herdado de Parceiros).
- `program`/`budgetPlan` são de um BC de **Planejamento Orçamentário** ainda inexistente (Inquiry-0014).
- Valor/período só mudam por **aditivo homologado** (imutabilidade — princípios #12/#14 do handbook), não por edição livre.

O frontend v2 é BFF-first, mas **o BFF v2 (TanStack Start server functions) ainda não existe**. Sem ele, ou o frontend faz N chamadas e monta a visão no cliente (sem o BFF que deveria orquestrar), ou alguém compõe no servidor. Precisamos destravar o frontend **sem corromper o núcleo**.

---

## Decisão

A **composição da visão rica** vive no **adapter HTTP** do módulo (a borda), como uma **rota de leitura composta transitória** — explicitamente provisória até o BFF v2 assumir.

| Camada                               | O que faz                                                                                                                                                                                                        | O que NÃO faz                                                                              |
| :----------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| **`domain/` + `application/`**       | Permanecem puros e minimalistas. O agregado `Contract` modela só o ciclo de vida.                                                                                                                                | Não conhecem Parceiros, Orçamento, apresentação, nem o formato do frontend. **Intocados.** |
| **`adapters/http/` (rota composta)** | Orquestra a leitura: pega o agregado `Contract` (via use case próprio) + **compõe** o contratado/bancário lendo a **`public-api` de Parceiros** + aditivos/documentos do próprio módulo, e devolve o JSON gordo. | Não tem regra de negócio; não escreve; não lê tabela de outro módulo direto.               |

**Invariantes (inegociáveis):**

1. **Núcleo limpo.** `domain/` e `application/` não ganham nenhum campo de outro módulo nem lógica de apresentação. ESLint/code-review barram import de `partners/*` dentro de `contracts/domain|application`.
2. **Cross-módulo só por `public-api`** (ADR-0006/0014). A rota composta lê Parceiros pela **public-api de leitura** de Parceiros — **nunca** por SELECT em `par_*`. (Parceiros hoje só expõe um _write_ port de ETL; este ADR cria a necessidade de um **read** na public-api de Parceiros.)
3. **Transitoriedade declarada.** A rota composta nasce **marcada como provisória**: comentário-cabeçalho `@deprecated`/`@transient` no handler, header de resposta `Deprecation` / `Sunset` (RFC 8594) e nota no OpenAPI. **Condição de remoção explícita: quando o BFF v2 assumir a composição.** Não é dívida escondida — é dívida com data de validade e dono futuro (o BFF).
4. **As duas opções coexistem por design.** Como a composição está na **borda** (não no núcleo), trocar "API compõe" por "BFF compõe" não toca `domain`/`application`. Hoje a API compõe; amanhã o BFF assume a mesma orquestração e a rota gorda é removida — sem refactor de núcleo.

**Campos do próprio contrato ≠ composição.** Atributos que são intrínsecos ao contrato — `classification` (Contrato/Ordem de Serviço), `contractModel`, `contractType`, `categorizacao`, `centroDeCusto`, `observations` — **não** são composição (não vêm de outro módulo). Eles **entram no agregado `Contract`** quando o produto precisar deles: é **modelagem de domínio legítima**, não corrupção. A linha é clara: **dado de outro módulo → composição na borda; atributo do próprio contrato → evolui o agregado.**

---

## Consequências

### Positivas

- **Frontend destravado sem o BFF.** A visão rica é servida já, sem esperar o BFF v2 nem corromper o núcleo.
- **Núcleo permanece DDD-puro e testável.** O agregado `Contract` segue minimalista; a composição é um detalhe de borda, isolado e descartável.
- **Migração futura barata.** Quando o BFF existir, a composição muda de casa (adapter → BFF) sem tocar `domain`/`application`. A "rota gorda" tem caminho de saída desenhado.
- **Isolamento preservado.** A leitura de Parceiros pela public-api mantém ADR-0014 intacto mesmo com a resposta agregada.

### Negativas

- **Dívida transitória real.** A rota composta é orquestração de apresentação no backend — responsabilidade que pertence ao BFF. **Risco:** virar permanente. **Mitigação:** marcação `Deprecation`/`Sunset` + condição de remoção registrada + revisão na entrada do BFF v2.
- **Exige um read na public-api de Parceiros.** Parceiros hoje só tem write port (ETL). Este ADR cria a necessidade de expor uma leitura (ex.: `getSupplierById`/`getContractorView`) na public-api de Parceiros — ticket próprio.

### Neutras

- O OpenAPI ganha um endpoint marcado como transitório; o frontend consome ciente do `Sunset`.
- `derivedStatus` e mapeamento de vocabulário (status PT, "distrato"→`terminate`) podem ser resolvidos nessa mesma camada de composição/BFF, sem tocar o domínio.

---

## Alternativas Consideradas

### A. Estender o agregado `Contract` com os dados de Parceiros/Orçamento

**Rejeitada:** corrompe o domínio (campos de outro módulo dentro de `contracts/domain`), viola o isolamento (ADR-0014) e o ownership de dados (#4 dos princípios). O contrato passaria a "saber" de fornecedor/banco — acoplamento que o Modular Monolith existe para evitar.

### B. BFF compõe desde já

**Rejeitada (por ora):** o BFF v2 (TanStack Start) ainda não existe. Bloquearia o frontend. É exatamente o **estado-alvo** deste ADR — só não é o estado atual.

### C. Frontend faz N chamadas e monta no cliente

**Rejeitada (por ora):** duplica a orquestração no browser justamente o que o BFF deveria centralizar; e o relatório pede um GET de detalhe coeso. Aceitável só como fallback temporário do próprio frontend.

---

## Quando Re-avaliar

- **Entrada do BFF v2:** gatilho de remoção. Migrar a composição para o BFF, apagar a rota gorda e o header `Sunset`. **Este é o fim de vida planejado do ADR.**
- Se a rota composta acumular **regra de negócio** (não só junção de leitura): sinal de vazamento — parar e revisar (regra pertence ao `application`/`domain`, não à borda).
- Se a leitura de Parceiros via public-api ficar cara (N+1): avaliar um **read model materializado** (ADR-0022, projeção sobre o event stream) em vez de composição síncrona.

---

## Referências

- [`handbook/po-feedback/0001`](../../po-feedback/0001-gap-api-v2-contracts.md) — retorno da P.O. que originou esta decisão (triagem em §B).
- [ADR-0006](./0006-modular-monolith-core-api.md) — ports & adapters; cross-módulo por public-api.
- [ADR-0014](./0014-mysql-database-isolation.md) — isolamento por database (`par_*` só por Parceiros).
- [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) — read models (alternativa se a composição síncrona escalar mal).
- [ADR-0025](./0025-http-server-fastify-core-api.md) / [ADR-0028](./0028-http-edge-shell-location.md) — HTTP é adapter; HTTP de feature em `adapters/http/`.
- [ADR-0031](./0031-partners-registry-module.md) — módulo Parceiros (fonte do contratado/bancário).
