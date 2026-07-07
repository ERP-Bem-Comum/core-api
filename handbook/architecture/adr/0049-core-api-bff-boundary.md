[← Voltar para ADRs](./README.md)

# ADR-0049: Fronteira de responsabilidade core-api ↔ BFF (Domain API + Experience API)

- **Status:** Proposed
- **Date:** 2026-07-07
- **Deciders:** Gabriel Aderaldo (TL) + Product Owner + Arquitetura Frontend v2
- **Relacionado:** [ADR-0006](./0006-modular-monolith-core-api.md) (modular monolith; cross-módulo por public-api), [ADR-0014](./0014-mysql-database-isolation.md) (isolamento por database), [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) (read-models via projeção), [ADR-0025](./0025-http-server-fastify-core-api.md)/[ADR-0028](./0028-http-edge-shell-location.md)/[ADR-0037](./0037-http-first-retire-embedded-cli.md) (HTTP é adapter; borda em `adapters/http/`), [ADR-0027](./0027-zod-openapi-contract-first-http-edge.md) (Zod+OpenAPI contract-first), [ADR-0045](./0045-financial-supplier-read-model.md) (read-model de fornecedor).
- **Relação:** é o **estado-alvo** do [ADR-0032](./0032-transient-http-composition-read-until-bff.md) — quando esta fronteira entra, a "rota gorda transitória" do 0032 é removida.

---

## Contexto

Inversão de responsabilidade decidida no refinement de 2026-07-07: **core-api = System of Record / Domain API** (autoridade de dado, invariante, integração externa, segurança/multi-tenant, agregação no banco) e **BFF = Experience API** (server-side TanStack Start, um por front) que compõe view-models por tela a partir de dados crus já autorizados.

O [ADR-0032](./0032-transient-http-composition-read-until-bff.md) já colocou a composição de leitura numa "rota gorda" no `adapters/http/`, **explicitamente provisória até o BFF v2 assumir**. Este ADR formaliza esse destino: define **o que é cru** (fica no core) e **o que é composição** (vai pro BFF), de modo normativo, para que a fronteira não seja re-negociada card a card.

---

## Decisão

O core-api expõe **dados de domínio crus e já autorizados**; o BFF **compõe e formata** view-models por tela. A linha divisória é uma pergunta única:

> **"O banco precisa fazer isso? → core-api. É montar/formatar o que já veio? → BFF."**

| Fica no core-api | Vai pro BFF |
|---|---|
| Invariante, máquina de estados, cálculo de domínio | Compor várias leituras cruas num view-model de tela |
| Integração externa (CNAB, SMTP, storage/URL assinada, OCR) | Enriquecer itens já paginados com labels/nomes (batch-by-id) |
| Autz de recurso + multi-tenant + minimização LGPD (por escopo) | Renderizar artefato (PDF/CSV) a partir de números já calculados |
| Filtro/where, sort, paginação, full-text, SUM/GROUP-BY/TOP-N | Preferências de UI (visões salvas), i18n, máscara |
| Read-models/projeções que sustentam filtro/sort | Orquestração multi-módulo para uma tela |

A fundamentação de *por que a agregação fica no banco* está no **Apêndice A** (citações literais do MySQL 8.4 Reference Manual).

---

## Contrato core-api ↔ BFF

**O que o core expõe (cru):**

1. **Recursos por agregado** (`/api/v2/<módulo>/<recurso>`) — os campos do próprio agregado, em **unidades canônicas** (ADR-0018/0020): dinheiro em `bigint` cents, IDs em `varchar(36)`, datas em ISO-8601, enums como *union* EN. **Sem** formatação de apresentação (nada de `R$ 1.234,56`, label PT, ou `%` calculado para o widget).
2. **Read-models materializados** ([ADR-0022](./0022-read-models-via-projection-over-event-stream.md)) — quando a leitura precisa de filtro/sort/paginação por campo derivado ou cross-agregado (ex.: `fin_supplier_view`, `par_contract_count_view`, `fin_payable_view`).
3. **Endpoints de resolução em lote (batch-by-id)** — para o BFF resolver refs sem N+1 (ver card #350). Forma canônica:

   ```http
   POST /api/v2/partners/suppliers:batch
   { "refs": ["<uuid>", "<uuid>", ...] }        # teto: 200 refs/chamada

   200 OK
   { "items":  [ { "ref": "<uuid>", "name": "...", "taxId": "..." } ],
     "missing": [ "<uuid-sem-registro>" ] }
   ```

**O que o BFF NÃO recebe pronto:** DTO de tela, campos compostos cross-módulo (exceto os read-models acima), texto formatado, `%`/labels de layout. Isso o BFF monta.

**Contract-first ([ADR-0027](./0027-zod-openapi-contract-first-http-edge.md)):** todo endpoint core↔BFF é definido por schema Zod → OpenAPI; o BFF gera cliente tipado a partir do OpenAPI. O contrato é a fonte de verdade da fronteira — não há acoplamento a implementação.

---

## Autorização e PII na fronteira (as duas correções de rota)

O "cru" do core é cru em **estrutura** (não formatado), **nunca** em **autorização**. Duas regras que a leitura ingênua da inversão ("core cru, BFF protege") violaria:

1. **Authz de recurso, multi-tenant e minimização de dado sensível ficam NO CORE**, aplicadas por **escopo do token** (de serviço/usuário). O BFF **não** é a barreira de PII — é a *última* projeção de conveniência, não a *única*. Provas vivas: **#53** (leitura de `fin_documents` deve filtrar por organização) e **#238** (CPF/RG/salário **não saem** do core sem a permissão `collaborator:read`). Se o core entregasse tudo e "confiasse" no BFF, um bug no BFF vazaria a base inteira.
2. **Enquanto o core for público (topologia híbrida/faseada), os guardrails não relaxam.** O ganho de PII da inversão só se materializa quando o core sai da borda pública — até lá, authz + multi-tenant no core são obrigatórios, não opcionais.

Ou seja: **o core decide *o que aquele principal pode ver*; o BFF decide *como a tela mostra*.**

---

## Exemplos de view-model (antes → depois)

**#95 · Drawer de Detalhe do pagamento**
- **Antes:** engordar `GET /api/v2/financial/documents/:id` com os 6 campos do design (arquivo-fonte, timeline, fornecedor resolvido…).
- **Depois:** o core devolve o documento cru + URL assinada de storage (#256) + timeline; o **BFF compõe** o `DocumentDetailVM`, resolvendo refs via batch-by-id. O endpoint do core não conhece o layout do drawer.

**#172 · Match card da Conciliação**
- **Antes:** o core faz JOIN e devolve `supplierName` + `documentNumber` na resposta de sugestões.
- **Depois:**
  ```
  core → GET /statement-transactions/:id/suggestions
         → [ { payableId, score, band, criteria } ]           (cru)
  BFF  → POST /financial/payables:batch  { refs:[payableId…] } → { documentNumber, type }
       → POST /partners/suppliers:batch  { refs:[supplierRef…] } → { name, taxId }
       → monta MatchCardVM = { fornecedor, nºDoc, score, band }
  ```

**#112 · Dashboard**
- **Antes:** portar o `DashboardStatisticsDto` do legado 1:1 para o core (endpoint de *apresentação* dentro do system-of-record).
- **Depois:** o core expõe **agregações atômicas** (`SUM`/`GROUP-BY`/`TOP-N` indexadas — Apêndice A); o **BFF monta** o DTO de tela (%, top-N, distribuição, layout dos widgets).

---

## Invariantes (normativo)

1. **MUST NOT** — o BFF reimplementar invariante de domínio ou validação de escrita. Regra de negócio é do core, sempre.
2. **MUST NOT** — o core retornar DTO de tela (formatação PT, `R$`, `%` de layout, labels i18n).
3. **MUST** — authz de recurso + isolamento multi-tenant + minimização LGPD no **core**, por escopo do token.
4. **MUST NOT** — componente client falar direto com o core. Todo dado do front passa pelo BFF (habilita a Fase 2 de rede sem refactor).
5. **MUST** — agregação (`SUM`/`GROUP-BY`/`TOP-N`) e filtro/sort/paginação/full-text no **core** (banco). Ver Apêndice A.
6. **MUST NOT** — JOIN cross-módulo ([ADR-0014](./0014-mysql-database-isolation.md)). Composição cross-agregado para tela é feita pelo BFF via batch-by-id; se ficar cara (N+1), materializa-se read-model ([ADR-0022](./0022-read-models-via-projection-over-event-stream.md)).
7. **SHOULD** — todo endpoint core↔BFF é contract-first (Zod → OpenAPI, [ADR-0027](./0027-zod-openapi-contract-first-http-edge.md)).

---

## Topologia (decisão: híbrido/faseado)

Core-api permanece público POR ORA; migra para trás do BFF (rede privada / service-auth) após o go-live. **Enquanto público, os guardrails no core NÃO relaxam** — #53 (multi-tenant) e #238 (RBAC+LGPD) são pré-go-live. Regra de ouro: nenhum front novo fala direto com o core — sempre via BFF, para a Fase 2 ser só configuração de rede.

## Rollout (decisão: só novos + apresentação pura)

Aplicar a régua rigorosamente a budget-plans (#315-320) e aos que migram limpo (#172/#144/#319/#95). Não re-desenhar o que está perto do go-live (#112/#114/#240-243 congelados com débito).

**Cards afetados:**
- **BFF:** #95 #172 #144 #319 (+ frontes quebrados #351 #352 #353)
- **Backend (antes híbrido):** #164 #243 #242 #241 #240 #169 #112 #113 #114 #320
- **Core (guardrail pré-go-live):** #53 #238
- **Fundação:** #349 (camada BFF) · #350 (batch-by-id)

---

## Consequências

### Positivas
- **Núcleo DDD-puro.** O core segue minimalista; apresentação nunca entra no system-of-record.
- **PII minimizada na borda pública.** Quando o core sair da internet (Fase 2), só o BFF expõe dado — e já projetado/minimizado.
- **Cada front sob medida.** View-models por tela, sem over-fetching nem endpoint-por-tela no core.
- **Migração barata do ADR-0032.** A composição muda de casa (adapter → BFF) sem tocar `domain`/`application`.

### Negativas
- **Hop extra de latência** (client → BFF → core). Mitigação: core e BFF na mesma rede; batch-by-id contra N+1.
- **Risco de chattiness/N+1** se o BFF compuser ingênuo. Mitigação: endpoints batch-by-id (#350); materializar read-model ([ADR-0022](./0022-read-models-via-projection-over-event-stream.md)) quando o volume crescer.
- **Duplicação entre BFFs** (cada front recompõe view-models). Mitigação: pacote cliente-do-core compartilhado.
- **Dívida retroativa** nos ~111 cards "Done" (DTOs de exibição e read-models já no core) — mapear e migrar oportunisticamente, não agora.

### Neutras
- O OpenAPI passa a ser o **contrato de serviço interno** core↔BFF, não só doc pública.
- "Server-side" passa a significar **também o BFF** — a Decisão da P.O. de "CSV/agregação server-side" (#319) é satisfeita gerando no BFF.

---

## Alternativas Consideradas

### A. Deixar tudo no core (endpoints de tela, portar o legado 1:1)
**Rejeitada:** re-comete o acoplamento que a inversão corrige — o system-of-record passa a depender do formato de cada tela, e todo redesign de UI vira mudança no core.

### B. Cada front chama o core direto, sem BFF
**Rejeitada:** N+1 no cliente, PII exposta na borda pública sem camada de minimização, e a orquestração que deveria ser centralizada se espalha por cada front.

### C. GraphQL federation em vez de BFF REST
**Rejeitada (por ora):** custo de adoção alto e o stack-alvo é TanStack Start, cujo server-side **já é** o BFF natural. Reavaliar se surgirem múltiplos fronts com necessidades de composição muito divergentes.

---

## Quando Re-avaliar

- **Entrada do BFF v2:** gatilho de remoção da rota gorda transitória do [ADR-0032](./0032-transient-http-composition-read-until-bff.md). Este ADR é o fim-de-vida planejado daquele.
- **Composição no BFF ficar cara (N+1):** materializar read-model ([ADR-0022](./0022-read-models-via-projection-over-event-stream.md)) em vez de empurrar volume para o BFF.
- **Múltiplos fronts divergentes:** reconsiderar GraphQL/federation (alternativa C).
- **Core continuar público além do go-live:** revisar a decisão de topologia (fechar a rede) — o ganho de PII depende disso.

---

## Referências

- [ADR-0032](./0032-transient-http-composition-read-until-bff.md) — composição transitória (este ADR é seu estado-alvo).
- [ADR-0006](./0006-modular-monolith-core-api.md) / [ADR-0014](./0014-mysql-database-isolation.md) — cross-módulo só por public-api; isolamento por database.
- [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) — read-models via projeção (materialização quando composição escala mal).
- [ADR-0027](./0027-zod-openapi-contract-first-http-edge.md) — Zod+OpenAPI contract-first (o contrato da fronteira).
- [ADR-0025](./0025-http-server-fastify-core-api.md) / [ADR-0028](./0028-http-edge-shell-location.md) / [ADR-0037](./0037-http-first-retire-embedded-cli.md) — HTTP é adapter; borda em `adapters/http/`.
- [ADR-0045](./0045-financial-supplier-read-model.md) — read-model de fornecedor (exemplo do padrão).
- Issues: #349 (camada BFF), #350 (batch-by-id), #53/#238 (guardrails), #95/#172/#144/#319 (migram), #351/#352/#353 (frontes quebrados).

---

## Apêndice A — Fundamentação: por que "agregação → core" (MySQL 8.4 Reference Manual)

A régua afirma que agregação (`SUM`/`GROUP BY`/TOP-N) e os read-models que a sustentam ficam no core-api, **no banco** — não em TypeScript. A objeção natural é *"JOIN no MySQL não é caro?"*. Esta seção **testa a hipótese contra a fonte canônica**: o **MySQL 8.4 Reference Manual (Oracle)**, versionado em `handbook/reference/mysql/mysql-refman-8.4--oracle/10-optimization.part01.md`. Citações **literais**, com linha verificável.

> **Veredito:** "JOIN é caro" só vale **sem índice**. Com índice/covering, o custo é ~`log(N)` por linha e a agregação escala com o **número de grupos (K)**, não de linhas (N).

| # | Afirmação testada | Citação literal — `10-optimization.part01.md` |
|---|---|---|
| 1 | JOIN sem índice hoje é **hash join**, não O(N×M) | **L697** — *"By default, MySQL employs hash joins whenever possible."* |
| 2 | O caro real é **varrer a tabela toda** (sem índice) | **L3537** — *"Without an index, MySQL must begin with the first row and then read through the entire table to find the relevant rows. The larger the table, the more this costs."* |
| 3 | **Nested-loop com índice** é o mecanismo barato | **L1089** — *"A simple nested-loop join (NLJ) algorithm reads rows from the first table in a loop one at a time, passing each row to a nested loop that processes the next table in the join."* |
| 4 | **Covering index** devolve valores sem tocar as linhas | **L3560** — *"a query can be optimized to retrieve values without consulting the data rows. (An index that provides all the necessary results for a query is called a covering index.)"* |
| 5 | **GROUP BY** genérico cria temp table; índice evita | **L2154** — *"The most general way to satisfy a GROUP BY clause is to scan the whole table and create a new temporary table... In some cases, MySQL is able to do much better than that and avoid creation of temporary tables by using index access."* |

**Prova do argumento central (K grupos vs N linhas)** — seção *Loose Index Scan*, **L2164**:

> *"a Loose Index Scan reads as many keys as **the number of groups, which may be a much smaller number than that of all keys**."*

Um `GROUP BY` indexado lê ~1 chave **por grupo** (K), não uma por linha (N). É a base literal de *"agregar no banco escala com o resultado, não com a entrada"* — e por que jogar isso para o TS (que puxaria as N linhas cruas pela rede) é uma perda de 1–2 ordens de grandeza.

**Ressalvas (honestidade da fundamentação):**
- A versão exata **"8.0.18"** (quando o hash join entrou) **não aparece literal** no manual 8.4 — o manual só documenta o comportamento *default* atual. É fato histórico da Oracle, mas sem linha citável neste livro.
- O custo do **lado Node** (GC, event loop bloqueado, `RowDataPacket` pesando 2–4× a linha binária, risco de OOM no processo Fastify único de 8 GB) **não é território do Refman** — foi validado à parte pelo runtime Node 24, não por esta fonte.

**Corolário para a régua:** a resposta a "JOIN pode ser caro" é **indexar** (índice composto/covering cobrindo `WHERE` + `GROUP BY` + coluna agregada → `Using index`) ou **materializar** (read-model via projeção, [ADR-0022](./0022-read-models-via-projection-over-event-stream.md)) — **nunca** puxar linhas cruas para agregar em TS. TS/BFF só agrega quando o volume é *bounded* por `LIMIT`/paginação ou por invariante de negócio (coluna "BFF" da régua). Regra-mnemônico: **"SQL calcula, Node orquestra."**

*Método:* hipótese levantada por 3 agentes especializados (`mysql-database-expert`, `nodejs-runtime-expert`, `core-api-consultant`) e **testada por grep literal** contra o Reference Manual. Verificado em 2026-07-07.
