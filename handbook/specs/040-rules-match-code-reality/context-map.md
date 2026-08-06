# Context Map do `core-api` — estado real

**Extraído de `src/` em 2026-07-31** · 8 Bounded Contexts · 905 arquivos · 5.034 imports
**Diagrama**: [`context-map.d2`](./context-map.d2) → [`context-map.svg`](./context-map.svg)

> **Método:** os fatos foram **extraídos** por análise de imports, não desenhados à mão. A
> nomenclatura vem de Evans (cap. 14) e Vernon (p. 142), consultados via MCP `acdg-skills` com
> grounding verificado. Onde há **inferência** minha, está marcado como tal.

---

## Fundamento canônico

Vernon consolida as definições que nomeiam as relações deste mapa:

> - **Shared Kernel**: Sharing part of the model and associated code forms a very intimate interdependency […] Designate with an explicit boundary some subset of the domain model that the teams agree to share. **Keep the kernel small.**
> - **Customer-Supplier Development**: When two teams are in an upstream-downstream relationship, where the upstream team may succeed interdependently of the fate of the downstream team […]
> - **Conformist**: When two development teams have an upstream/downstream relationship in which the upstream team has no motivation to provide for the downstream team's needs […] The downstream team eliminates the complexity of translation between bounded contexts by slavishly adhering to the model of the upstream team.
> - **Anticorruption Layer**: […] As a downstream client, create an isolating layer to provide your system with functionality of the upstream system in terms of your own domain model.
> - **Open Host Service**: Define a protocol that gives access to your subsystem as a set of services. Open the protocol so that all who need to integrate with you can use it.
>
> — _Vaughn Vernon, Implementing Domain-Driven Design, p. 142 (linha 2331)_

E Evans sobre quando o OHS se justifica:

> When a subsystem has to be integrated with many others, customizing a translator for each can bog down the team. There is more and more to maintain, and more and more to worry about when changes are made.
> […] If there is any coherence to the subsystem, it is probably possible to describe it as a set of SERVICES that cover the common needs of other subsystems.
>
> — _Eric Evans, Domain-Driven Design, p. 230 (linha 5101)_

---

## Os 8 Bounded Contexts

| BC              | domain | application | adapters | public-api | worker | Posição no mapa         |
| --------------- | -----: | ----------: | -------: | ---------: | -----: | ----------------------- |
| `financial`     |     61 |          67 |       82 |         12 |      — | intermediário           |
| `partners`      |     52 |          58 |       78 |         14 |      3 | intermediário           |
| `auth`          |     29 |          37 |       48 |          6 |      — | **upstream puro**       |
| `budget-plans`  |     25 |          33 |       37 |          6 |      — | intermediário           |
| `contracts`     |     25 |          27 |       41 |          6 |      3 | intermediário           |
| `programs`      |      8 |          12 |       17 |          6 |      — | **upstream puro**       |
| `reports`       |  **0** |           9 |       21 |          1 |      — | **downstream puro**     |
| `notifications` |      3 |           1 |       13 |          2 |      — | downstream (assíncrono) |

**Upstream puro** = não importa a `public-api` de ninguém. **Downstream puro** = ninguém importa a sua.

`reports` **não tem `domain/`** e `notifications` tem 3 arquivos — são contextos de **leitura** e de
**entrega**, não de regra de negócio. Um Context Map honesto precisa registrar isso: nem todo BC
carrega modelo de domínio.

---

## Padrão 1 — SHARED KERNEL _(explícito e pequeno, como Evans exige)_

`src/shared/kernel/` — 7 Value Objects cross-BC: `Money`, `NonZeroMoney`, `Period`, `PlainDate`,
`UserRef`, `Cpf`, `Cnpj`.

| BC                                     | arquivos que usam o kernel |
| -------------------------------------- | -------------------------: |
| `partners`                             |                         46 |
| `contracts`                            |                         29 |
| `financial`                            |                         26 |
| `budget-plans`                         |                         14 |
| `auth`                                 |                          2 |
| `programs`, `reports`, `notifications` |                          0 |

**Avaliação:** o kernel tem **7 arquivos** e nenhuma regra de negócio de BC específico — cumpre o
"keep the kernel small" de Evans. É Shared Kernel legítimo, não um god-module disfarçado.

---

## Padrão 2 — OPEN HOST SERVICE _(a `public-api/` de cada BC)_

Cada BC publica um protocolo de acesso em `public-api/` — 53 arquivos no total. É a materialização
literal do padrão: um conjunto de serviços que cobre as necessidades comuns dos demais.

**Fato mais forte do mapa:** dos 5.034 imports, **zero** alcançam `domain/` ou `application/` de outro
BC. **100% do consumo cross-BC passa pela `public-api`.** A fronteira do ADR-0006 é respeitada
integralmente — e sem nenhum enforcement mecânico, apenas disciplina.

Superfície publicada por BC:

| BC                                              | arquivos em `public-api/` | O que expõe                                                                        |
| ----------------------------------------------- | ------------------------: | ---------------------------------------------------------------------------------- |
| `partners`                                      |                        14 | `refs`, `read`, `etl`, `http`, `permissions`, `email-events`, mappers, projections |
| `financial`                                     |                        12 | `index`, `http`, `permissions`, `migrate`, projections                             |
| `auth`, `budget-plans`, `contracts`, `programs` |                    6 cada | `index`, `read`/`events`, `http`, `permissions`, `migrate`                         |
| `notifications`                                 |                         2 | `index`, `migrate`                                                                 |
| `reports`                                       |                         1 | `http` — só isso, coerente com ser downstream puro                                 |

---

## Padrão 3 — PUBLISHED LANGUAGE _(eventos versionados via outbox)_

Seis BCs têm outbox próprio (`auth`, `budget-plans`, `contracts`, `financial`, `partners`,
`programs`). O contrato de evento é versionado (`schema_version`, decoder v1) e vive em
`public-api/events.ts` — Published Language no sentido de Evans.

Integrações assíncronas reais, com o worker que as executa:

| Produtor    | Evento                                | Consumidor      | Worker                      | ADR         |
| ----------- | ------------------------------------- | --------------- | --------------------------- | ----------- |
| `contracts` | `ContractCreated`/`Ended`/`Cancelled` | `partners`      | `contract-count-projection` | 0046        |
| `partners`  | `SupplierRegistered`/`SupplierEdited` | `financial`     | `supplier-view-projection`  | 0043 → 0045 |
| `auth`      | `PasswordResetRequested`              | `notifications` | `email-dispatch`            | 0047        |
| `partners`  | `CollaboratorInvited`                 | `notifications` | `email-dispatch`            | 0047        |
| `financial` | _(interno)_                           | `financial`     | `payable-view-projection`   | 0022        |

**Detalhe estrutural relevante:** os workers vivem em `src/workers/`, **fora dos BCs** — nenhum módulo
importa o outro para projetar. A ligação é feita no composition root. É o que preserva a possibilidade
de extração futura.

---

## Padrão 4 — ANTICORRUPTION LAYER _(tradução no consumidor)_

Evidências concretas de ACL no código:

| Local                                           | Tradução                                                                                                                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `partners/public-api/contractor-view.mapper.ts` | Traduz o agregado de `partners` para a visão que `contracts` consome (2 usos)                                                                                                     |
| `financial` ← `budget-plans`                    | ADR-0051: _"Open Host Service do lado do owner e Anticorruption Layer do lado do consumidor"_ — o `financial` traduz a árvore do plano para o modelo próprio, e **não a espelha** |
| `financial` ← `partners` via `refs.ts`          | 5 usos de `refs.ts` — consome **apenas referências**, não o modelo. É o "Think Minimalistic" de Vernon (p. 2494)                                                                  |

O caso `financial` ← `partners` é o mais maduro do mapa: consumo minimalista por referência (`refs.ts`)
no caminho síncrono, mais read-model local (`fin_supplier_view`) alimentado por evento no assíncrono.

---

## Relações Customer/Supplier — quem depende de quem

Fluxo síncrono completo (contagem de imports de `public-api`):

```
auth ────────┐
programs ────┤
             ├──→ financial ──→ reports
partners ────┤        ↑
contracts ───┘   budget-plans
```

| Downstream      | Upstream consumidos                                              | Total |
| --------------- | ---------------------------------------------------------------- | ----: |
| `reports`       | `financial`(8), `partners`(5), `budget-plans`(4), `contracts`(2) |    19 |
| `financial`     | `partners`(7), `contracts`(4), `auth`(3), `programs`(2)          |    16 |
| `budget-plans`  | `financial`(2), `programs`(1), `partners`(1)                     |     4 |
| `contracts`     | `programs`(2), `partners`(2)                                     |     4 |
| `notifications` | `partners`(1), `auth`(1)                                         |     2 |
| `partners`      | `contracts`(1)                                                   |     1 |

### A única relação bidirecional — e ela é deliberada

`partners ↔ contracts` é o único par que se consome nos dois sentidos. Inspecionando os imports reais
(descartando menções em comentário), as duas direções usam **mecanismos diferentes**, cada uma com ADR
próprio — não é Partnership simétrica nem acidente de evolução:

| Direção                  | Import real                                                              | Onde                                                        | Natureza                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contracts` → `partners` | `partners/public-api/index.ts` (2×)                                      | `adapters/http/composition.ts`, `contractor-composition.ts` | **Síncrona, na borda HTTP.** É a rota composta do **ADR-0032** — explicitamente **transitória**, marcada `Deprecation`/`Sunset`, morre quando o BFF v2 assumir a composição |
| `partners` → `contracts` | `decodeContractContractorRefV1` de `contracts/public-api/events.ts` (1×) | `application/use-cases/apply-contract-count-event.ts`       | **Assíncrona, via Published Language.** Decodifica evento do `ctr_outbox` para projetar a contagem de contratos — **ADR-0046**                                              |

**Leitura:** o "ciclo" é o encontro de duas decisões independentes e conscientes. Uma delas
(`contracts → partners`) **tem data de validade declarada em ADR**. Quando o BFF v2 assumir, o ciclo
se desfaz sozinho e resta apenas a direção assíncrona.

> **Correção de análise:** minha primeira leitura classificou isto como Partnership ("succeed or fail
> together") e sugeriu investigar se era acidente. Estava errada — a contagem bruta de imports não
> distingue **borda síncrona transitória** de **projeção assíncrona por evento**. Só a inspeção do
> import real revelou que são mecanismos, camadas e ADRs distintos. É o mesmo erro de método que
> produziu a afirmação falsa sobre pools na `adapters.md`: **contar sem ler**.

**Inferência a validar:** `reports` consome 4 BCs e não tem `domain/` — pelo cânone isso é
**Conformist** (adere ao modelo upstream sem traduzir). Se for deliberado, é a escolha certa para um
BC de leitura. Se for acidente, é dívida: mudança em qualquer upstream quebra `reports` diretamente.

---

## O que este mapa diz sobre as rules _(ligação com a spec 040)_

1. **A fronteira mais respeitada do sistema é a menos coberta.** 100% do cross-BC passa por
   `public-api/`, e nenhuma rule tem `public-api` em `paths:`.
2. **O Shared Kernel é pequeno e legítimo**, mas `src/shared/primitives/` (onde vivem `result.ts`,
   `brand.ts`) não é coberto por rule — e é o que sustenta o kernel.
3. **Os BCs não são uniformes.** `reports` sem domínio, `notifications` quase sem. Rule que assume
   `domain/` em todo módulo está errada para 2 dos 8.
4. **A integração assíncrona tem casa própria** (`src/workers/`, fora dos BCs) e regra específica
   (idempotência, guard de recência) — hoje espalhada entre `adapters.md` e `jobs-and-workers.md`.

---

## Fontes

- Eric Evans, _Domain-Driven Design_, cap. 14 — "Relationships Between BOUNDED CONTEXTS" (linha 4893), "Open Host Service" (p. 230, linha 5101), "Open Host Service ⟶ Published Language" (linha 5409).
- Vaughn Vernon, _Implementing Domain-Driven Design_, p. 142 (linha 2331) — definições dos padrões; p. 2494 — "Think Minimalistic".
- Consultados via MCP `acdg-skills` (`mcp-server.tailf5e6ca.ts.net`), com grounding verificado (6/6 e 4/4 termos).
- ADRs do repo: 0006, 0014, 0022, 0043, 0045, 0046, 0047, 0051.
