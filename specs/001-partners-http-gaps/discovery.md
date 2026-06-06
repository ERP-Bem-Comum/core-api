# Descoberta: Gaps de borda HTTP do módulo `partners` (épico)

**Feature**: `specs/001-partners-http-gaps/` · **Consultor**: `/acdg-skills:requirements-engineer`

> Fase 0 da pipeline `core-api-sdd`. Elicitação ancorada em Gerenciamento de Requisitos
> (Moraes & Lopes) + Histórias de Usuário. **Entrada primária**: o `api-readiness-report.md` emitido
> pela Arquitetura Frontend v2 (`web-app/specs/008-partners/`), que mapeia, por sub-domínio, o que a
> API já entrega vs. o que falta. Esta descoberta **inverte o fluxo**: os gaps reportados pelo front
> viram requisitos de borda HTTP do core-api. Saída alimenta a SPEC (fase 1).

## Problema / Oportunidade

O frontend (épico `008-partners`) consome o módulo `partners` exclusivamente via BFF, mas **5 capacidades
estão bloqueadas** porque o core-api **não expõe a rota/contrato HTTP** — embora, na maioria dos casos, a
lógica de domínio/aplicação **já exista** (use-cases e exporters órfãos, sem wiring nem rota). Enquanto
isso, o front opera em **mock/fallback** nesses pontos, acumulando dívida e risco de divergência de
contrato. Fechar os gaps na borda HTTP (`/api/v1`) destrava a troca **mock→real no front sem tocar
UI/ViewModel** (SC-005 do front) e entrega paridade funcional com o legado.

## Stakeholders

| Stakeholder             | Interesse / o que espera                                                                           | Decisor?                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Time core-api (nós)     | Donos da borda HTTP; expor capacidades existentes com rigor (RBAC, Zod, envelope)                  | **sim**                                  |
| Arquitetura Frontend v2 | Emitiu o `api-readiness-report`; valida que o contrato exposto casa com os server functions do BFF | não (consumidor / validador de contrato) |
| P.O.                    | Paridade funcional com o legado; entrega progressiva (destravar sub-domínios em mock)              | sim                                      |
| Gestores / ABC          | Usuários finais das capacidades (import em lote, export, abrangência territorial)                  | não                                      |

## Histórias de usuário (INVEST)

<!-- Independent, Negotiable, Valuable, Estimable, Small, Testable -->

- **US-001** (P1): Como gestor, quero **importar colaboradores em lote** via arquivo, para cadastrar muitas
  pessoas de uma vez, com relatório das linhas inválidas.
  - **Valor / prioridade**: P1 do relatório do front; o use-case `import-collaborators.ts` **já existe** mas
    é **órfão** (sem wiring em `PartnersHttpDeps` nem rota). Alto valor, baixo custo.
  - **Critérios de aceitação**: dado um arquivo CSV válido, quando enviado a `POST /api/v1/collaborators/import`,
    então os colaboradores são criados e o corpo retorna `{ created, failed: [{ line, error }] }`; dado um
    arquivo com linhas inválidas, então as válidas são criadas e as inválidas listadas (sem abortar tudo).

- **US-002** (P1): Como gestor, quero **marcar/desmarcar estados e municípios como parceiros**, para definir
  a abrangência territorial das parcerias, com efeito persistente.
  - **Valor / prioridade**: P1 do relatório (decisão **D9** do ADR-0031). Hoje geografia é só catálogo
    read-only (`listStates`, `listMunicipalitiesByUf`) — **sem tabela, sem toggle, sem rota**. Destrava 2
    sub-domínios do front que estão em **mock total**.
  - **Critérios de aceitação**: dado o catálogo de 27 UFs, quando `POST/DELETE` (ou toggle) numa UF, então a
    parceria persiste e é refletida em `GET /api/v1/partner-states`; idem para municípios por UF
    (`GET /api/v1/partner-municipalities?uf=`), com seleção cross-state preservada.

- **US-003** (P2): Como gestor, quero **exportar a listagem de fornecedores** (CSV), respeitando os filtros
  aplicados, para análise externa.
  - **Valor / prioridade**: P2. O exporter `adapters/export/supplier-csv.ts` **já existe** sem rota.
  - **Critérios de aceitação**: dado filtros `search/active/categories[]`, quando `GET /api/v1/suppliers/export`,
    então retorna CSV com os fornecedores que casam os filtros.

- **US-004** (P2): Como consumidor do front, quero um **endpoint de catálogo de categorias de serviço**, para
  popular o filtro de fornecedores a partir da fonte canônica.
  - **Valor / prioridade**: P2. O `ServiceCategory` já é union de **39** códigos legados (com typos
    preservados, ADR-0031 §D2) — **resolve a FR-017 do front** (fonte canônica = 39, não 22). Só falta expor.
  - **Critérios de aceitação**: dado o conjunto fechado de categorias, quando `GET /api/v1/suppliers/service-categories`,
    então retorna a lista canônica (códigos legados) read-only.

- **US-005** (P3): Como gestor, quero clareza sobre os **filtros `programa` e `idade`** de colaboradores, hoje
  inexistentes no domínio — decidir formalmente descartar ou implementar.
  - **Valor / prioridade**: P3. `age` foi adiado (`list-collaborators.ts`); `programa` não é conceito do
    colaborador. Decisão formal (provável: fora de escopo) evita prometer filtro não suportado.
  - **Critérios de aceitação**: a decisão é registrada (ADR ou nota de escopo); o contrato de
    `GET /api/v1/collaborators` não anuncia filtros não suportados.

## Requisitos

### Funcionais

- **RF-001**: O sistema DEVE expor `POST /api/v1/collaborators/import` (multipart) que aciona o use-case
  `import-collaborators`, retornando relatório de criados + linhas inválidas; com wiring em `PartnersHttpDeps`.
- **RF-002**: O sistema DEVE persistir e expor a parceria de **estados** (`par_states`): listar com
  `isPartner` + alternar (add/remove).
- **RF-003**: O sistema DEVE persistir e expor a parceria de **municípios** (`par_municipalities`) por UF, com
  seleção cross-state, listar + alternar.
- **RF-004**: O sistema DEVE expor `GET /api/v1/suppliers/export` (CSV) respeitando filtros, via exporter existente.
- **RF-005**: O sistema DEVE expor `GET /api/v1/suppliers/service-categories` (catálogo read-only canônico).
- **RF-006**: O sistema DEVE registrar a decisão sobre filtros `programa`/`idade` (descartar vs implementar).
- **RF-007**: Toda rota nova DEVE exigir `requireAuth` + `authorize(<perm>)` e usar o envelope de erro
  `{ error: { code, message, requestId } }`, com contrato Zod na borda (ADR-0027).

### Não-funcionais (viram métricas na fase 4)

- **RNF-001** (Segurança): toda rota nova sob RBAC; nenhuma capacidade exposta sem `authorize`.
- **RNF-002** (Contrato): input/output validados por Zod; o contrato casa 1:1 com os server functions do BFF
  descritos em `008-partners/contracts/README.md`.
- **RNF-003** (Isolamento): novas tabelas com prefixo `par_*` (ADR-0014); migrations Drizzle geradas (ADR-0020).
- **RNF-004** (Performance): listagens (estados/municípios/categorias) p95 < 300ms no volume real (≤27 UFs /
  catálogo fechado / municípios por UF).
- **RNF-005** (Auditoria): a decisão D9 (hard vs soft) e a de filtros ficam registradas em ADR da feature.

## Restrições e premissas

- **HTTP já habilitado por ADR** (satisfaz Princ. VII da constituição): o módulo `partners` já expõe Fastify
  (ADR-0025) sob `/api/v1` (ADR-0033, espelho legado — **não** `/api/v2`). Esta feature **estende** a borda
  existente, não inaugura HTTP.
- Modular Monolith com isolamento por Bounded Context (ADR-0006); cross-módulo só via `public-api` (ADR-0006).
- MySQL 8 único + Drizzle; migrations geradas (ADR-0013/0020); isolamento por prefixo `par_*` (ADR-0014).
- Pipeline fail-first W0→W3 (Princ. I); regressão zero (Princ. II); pnpm (ADR-0012).
- **Não** alterar o frontend — apenas entregar a superfície HTTP que o BFF consome.
- "Espelho do legado" (ADR-0033): shapes/códigos herdados são preservados (ex.: `ServiceCategory` com typos).

## Fora de escopo

- Qualquer alteração no frontend (`web-app`) — consumo é do BFF.
- Recursos de `auth`/`contracts` (vivem em `/api/v2`); esta feature é só `partners` em `/api/v1`.
- Dashboards/relatórios de parceiros.
- Variante **PF** de Financiador (FR-018 do front) — fora deste épico salvo decisão explícita (PJ-only hoje).

## Rastreabilidade (inicial)

| Requisito       | História | Critério → BDD                        | Teste (TDD)        |
| --------------- | -------- | ------------------------------------- | ------------------ |
| RF-001          | US-001   | import com relatório parcial          | a definir (fase 7) |
| RF-002 / RF-003 | US-002   | toggle persistente estados/municípios | a definir          |
| RF-004          | US-003   | export CSV respeita filtros           | a definir          |
| RF-005          | US-004   | catálogo read-only canônico           | a definir          |
| RF-006          | US-005   | decisão registrada                    | a definir          |

## Perguntas em aberto

- [ ] [NEEDS CLARIFICATION: **D9 / ADR-0031** — partner-states/municipalities: **hard delete (legado) vs
      soft-delete padronizado**? Será decidido formalmente na Fase 3 (ADR da feature).]
- [ ] [NEEDS CLARIFICATION: **import** — formato aceito (só CSV ou também `.xlsx`?), tamanho máximo, e se o
      parsing fica no adapter HTTP ou num adapter dedicado.]
- [ ] [NEEDS CLARIFICATION: **export** — streaming vs buffer; conjunto e ordem das colunas do CSV.]
- [ ] [NEEDS CLARIFICATION: **US-005** — filtros `programa`/`idade`: descartar (fora de escopo) ou implementar
      `idade` derivada de `birthDate`?]
- [ ] [NEEDS CLARIFICATION: **municípios** — fonte/volume do catálogo por UF (`municipalities.data.ts`) é
      suficiente, ou precisa de tabela própria além de `par_municipalities`?]
