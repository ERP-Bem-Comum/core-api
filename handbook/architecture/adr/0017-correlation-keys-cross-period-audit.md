[← Voltar para ADRs](./README.md)

# ADR-0017: Chaves de correlação cross-período entre `legacy` e `core` (auditoria fiscal sob Strangler Fig)

- **Status:** Proposed
- **Date:** 2026-05-07
- **Deciders:** Banca interna de arquitetura (squad de engenharia) — _pendente_
- **Origem:** [Inquiry-0011 — Auditoria fiscal cross-período em sistema sob Strangler Fig](../../inquiries/0011-auditoria-fiscal-cross-periodo.md), Hipótese D.

---

## Contexto

A política de migração definida em [`01-migration-strategy.md`](../01-migration-strategy.md) §6 estabelece que **dados financeiros históricos não são migrados** — `legacy.*` permanece congelado, `core.*` cresce com dados novos. A retenção fiscal mínima de 5 anos (RFB) impede que `legacy.*` seja apagado quando o legado for desligado em M5.

Esse desenho cria um **gap operacional**: consultas de auditoria fiscal cuja janela atravesse a fronteira temporal entre o mundo legado (CRUD, "título avulso") e o mundo core (Agregado, "Documento Fiscal" como Fato Gerador) **não podem ser respondidas por uma única consulta SQL**. Detalhamento completo das forças, das 4 hipóteses consideradas e da fundamentação canônica em [Inquiry-0011](../../inquiries/0011-auditoria-fiscal-cross-periodo.md), Apêndice C.

A janela de oportunidade para garantir reconciliabilidade futura **se fecha quando o desenho do schema de `core.fin_documentos` começar (entrada de M3)**: depois disso, a ausência de chaves de correlação estáveis entre `legacy.*` e `core.*` torna a reconciliação cara ou impossível.

---

## Decisão

Adotar a **Hipótese D** do Inquiry-0011: **adiar a construção de infraestrutura de reporting cross-período** (Reporting Database de Newman ou Read Model CQRS de Vernon) **até que um gatilho objetivo dispare**, preservando hoje no schema de `core.fin_documentos` as **chaves de correlação** necessárias para qualquer hipótese-alvo futura.

### Componente 1 — Chaves de correlação preservadas no schema do `core`

Toda tabela de `core.fin_documentos` (e correlatas como `core.fin_titulos`) **deve nascer já contendo** os campos abaixo desde o primeiro release que toque o schema:

| Coluna | Tipo | Função |
| :--- | :--- | :--- |
| `numero_documento_original_legado` | `VARCHAR(255) NULL` | Número original do documento no legado, se aplicável. NULL para documentos nascidos nativamente no core |
| `id_legado` | `VARCHAR(64) NULL` | FK **lógica** para o registro correspondente em `legacy.*` (sem FK física — databases isolados, [ADR-0014](./0014-mysql-database-isolation.md)). NULL quando não há contraparte legada |
| `cnpj_emitente` | `VARCHAR(14) NOT NULL` | CNPJ do emitente. Sempre obrigatório por ser pivô de qualquer reconciliação fiscal |

Índice composto recomendado para reconciliação futura:

```sql
INDEX idx_correlacao_legado (cnpj_emitente, numero_documento_original_legado)
```

> **Validação dos campos exatos** (chave NF-e de 44 dígitos, série fiscal, modelo, regime tributário) **fora do escopo deste ADR** — questão de negócio a validar com contabilidade. Os 3 campos acima são o **mínimo necessário** identificado a partir da literatura canônica do Apêndice C do [Inquiry-0011](../../inquiries/0011-auditoria-fiscal-cross-periodo.md). Ajustes finos viriam em **ADR novo que amplia este** — não substitui — porque o mínimo continua válido.

### Componente 2 — Adiar reporting cross-período até gatilho explícito

Atualizar [`architecture/01-migration-strategy.md`](../01-migration-strategy.md) §6 com:

> "Auditoria fiscal cross-período não é tratada nesta fase. A decisão sobre a estratégia (Reporting Database, Read Model CQRS, ou outra) será registrada em ADR próprio quando **um** dos seguintes gatilhos disparar:
>
> 1. **Primeira solicitação fiscal cross-período concreta** chegar (auditor independente, Receita Federal, diligência em fusão/aquisição).
> 2. **Início do planejamento detalhado do marco M3** com requisito explícito de reporting cross-período no escopo.
> 3. **Auditor externo solicitar acesso unificado** a `legacy.*` + `core.*`.
>
> As 3 colunas de correlação preservadas em `core.fin_documentos` (ver [ADR-0017](./adr/0017-correlation-keys-cross-period-audit.md)) garantem que qualquer hipótese-alvo continua viável quando o gatilho disparar."

---

## Consequências

### Positivas

- **Custo agora: XS.** 3 colunas em delta migration script idempotente (Drizzle — alinhado a [ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md), tooling endossado por Newman p. 115). Sem worker novo, sem schema novo, sem ETL.
- **Honra [ADR-0001](./0001-strangler-fig-over-rewrite.md)** ("uma briga de cada vez"): não abre frente arquitetural antes de ter demanda real.
- **Não fecha porta.** Qualquer hipótese-alvo (B Reporting DB, C Read Model CQRS, ou variantes) continua viável quando o gatilho disparar — basta ler as 3 colunas.
- **Fundação canônica completa.** O mecanismo é **Parallel Change / Expand-Contract** de Sadalage, citado por Fowler (_Refactoring_ p. 68); a disciplina de adiar é **Vernon p. 166** ("architecture isn't a coolness factor"); a estratégia de particionamento é **Valente §8.4.5** (PT-BR); o alerta sobre custo de integração é **Evans p. 228** ("integration is always expensive — be sure it is really needed"). 8 citações no Apêndice C do Inquiry-0011.
- **Compatível com [ADR-0014](./0014-mysql-database-isolation.md)** (database isolation) — `id_legado` é FK **lógica**, sem FK física. Respeita "Regra de Ouro" de um único escritor por database.
- **Auditável.** Se o gatilho 1 chegar antes do esperado e a primeira solicitação fiscal precisar ser respondida ad hoc com `readonly_bi` direto (Hipótese A — permitida por [`03-data-architecture.md`](../03-data-architecture.md) §8), as 3 colunas tornam essa resposta tratável.

### Negativas

- **Risco organizacional de esquecimento.** Se a equipe esquecer que a decisão foi adiada, vira débito invisível. **Mitigação:** registro explícito neste ADR + entrada em `CHANGELOG.md` + Apêndice A do Inquiry-0011 com os 3 gatilhos + revisão obrigatória ao iniciar M3.
- **Sob pressão de prazo no gatilho**, escolher B/C terá menos calma do que decidir hoje. **Mitigação:** Inquiry-0011 já documentou as 4 hipóteses com trade-offs (§5 e §6); quando o gatilho disparar, o trabalho de avaliação está ~80% feito.
- **Os 3 campos podem se mostrar insuficientes** quando contabilidade for consultada. **Mitigação:** ADR novo amplia este, sem prejuízo dos dados já capturados — colunas adicionais nascem com NULL em registros antigos.

### Neutras

- A "contract" do parallel change clássico **não se aplica aqui** — as colunas nunca são removidas, porque retenção fiscal de 5+ anos exige que fiquem indefinidamente. Variante operacional: **expand-and-preserve**.
- Documentos nascidos **nativamente no core** (sem contraparte legada) terão `id_legado = NULL` e `numero_documento_original_legado = NULL` — comportamento esperado, não excepção.

---

## Alternativas Consideradas

Detalhes completos com fundamentação literal e tabela comparativa em [Inquiry-0011 §5 e §6](../../inquiries/0011-auditoria-fiscal-cross-periodo.md).

### A. `readonly_bi` direto + UNION ALL manual

Permitido por exceção em [`03-data-architecture.md`](../03-data-architecture.md) §8 (read-only não compromete isolamento). **Rejeitada como solução-alvo final** porque acopla BI ao schema interno do core (cada evolução interna obrigaria revisão de queries BI). **Não rejeitada como hipótese-alvo no gatilho** — pode ser caminho legítimo se o volume de demandas fiscais for muito baixo. Custo S, mas dívida M ao longo do tempo.

### B. Reporting Database dedicado (Newman p. 115)

Rejeitada **agora** por custo L (worker em cada lado + schema dedicado + ETL inicial + tooling de operação) sem demanda real — viola Vernon p. 166. Permanece como **hipótese-alvo mais provável** quando o gatilho disparar, pelas razões em [Inquiry-0011 §5.2](../../inquiries/0011-auditoria-fiscal-cross-periodo.md).

### C. Read Model CQRS dentro do `core-api` (Vernon p. 712)

Rejeitada **agora** por custo XL (worker + schema + ampliação de eventos no legado + ETL de bootstrap) e por risco de o `core-api` virar "Deus do Reporting", extrapolando o escopo de Modular Monolith ([ADR-0006](./0006-modular-monolith-core-api.md)). Permanece como hipótese-alvo se argumentos contra B (terceiro database operacional) prevalecerem no momento do gatilho.

---

## Quando Re-avaliar

Os 3 gatilhos definidos no Componente 2:

1. **Primeira solicitação fiscal cross-período concreta** (auditor, Receita, diligência M&A).
2. **Início do planejamento detalhado de M3** com requisito explícito de reporting cross-período.
3. **Auditor externo** solicitar acesso unificado a `legacy.*` + `core.*`.

Em qualquer dos três, abre-se ADR novo escolhendo entre B / C / A / variante.

Adicionalmente, **revisar os 3 campos de correlação** (Componente 1) caso a contabilidade ou diligência fiscal indique campos faltantes (chave 44 dígitos NF-e, série fiscal, modelo, regime tributário). Esse caso gera **ADR que amplia** este — não substitui.

---

## Referências

### Documentos do projeto

- [Inquiry-0011 — Auditoria fiscal cross-período em sistema sob Strangler Fig](../../inquiries/0011-auditoria-fiscal-cross-periodo.md) — origem desta decisão; Apêndice C contém as 8 citações canônicas literais.
- [ADR-0001 — Strangler Fig sobre Big Bang Rewrite](./0001-strangler-fig-over-rewrite.md) — premissa de coexistência longa.
- [ADR-0006 — Modular Monolith para o `core-api`](./0006-modular-monolith-core-api.md) — escopo do core, alerta contra "Deus do Reporting".
- [ADR-0014 — Isolamento por Database em MySQL](./0014-mysql-database-isolation.md) — Regra de Ouro (um escritor por database) que justifica FK lógica em vez de física.
- [ADR-0015 — MySQL Outbox Pattern](./0015-mysql-outbox-pattern.md) — ponte cross-database (relevante caso a hipótese-alvo no gatilho seja B ou C).
- [`../01-migration-strategy.md`](../01-migration-strategy.md) §6 — "Não migrar" + (a adicionar) parágrafo dos 3 gatilhos.
- [`../03-data-architecture.md`](../03-data-architecture.md) §2 (`readonly_bi`) e §8 (padrões permitidos).

### Literatura canônica (citações literais no Apêndice C do Inquiry-0011)

- Fowler, M. — _Refactoring_, 2ª ed., **p. 68** — Parallel Change / Expand-Contract de Sadalage.
- Newman, S. — _Building Microservices_, 2ª ed., **p. 115** — Reporting Database; tooling de schema migration.
- Vernon, V. — _Implementing Domain-Driven Design_, **p. 166** ("Architecture isn't a coolness factor"), **p. 712** (Read Model Projections + replay).
- Evans, E. — _Domain-Driven Design_, **p. 228** — Anticorruption Layer + "A Cautionary Tale".
- Valente, M.T. — _Fundamentos de Manutenção de Software_, **§8.3.2** (Strangler Fig em PT-BR), **§8.4.5** (Particionamento do banco entre legado e novo, em PT-BR).
