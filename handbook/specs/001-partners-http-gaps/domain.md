# Modelo de Domínio: Gaps de borda HTTP do módulo `partners`

**Feature**: `specs/001-partners-http-gaps/` · **Consultor**: `/acdg-skills:ddd-architect`

> Fase 2 da pipeline `core-api-sdd` (máximo rigor). Cada decisão de fronteira/agregado exige **citação
> canônica ≥4 linhas** (Evans/Vernon) via `skills_citar` — princípio IX. Ancorado no `recon.md` (padrões
> reais do módulo). A maior parte do épico é **borda HTTP** sobre domínio já modelado; a única novidade de
> **domínio** é a **parceria territorial** (US-002) — o foco deste documento.

## Bounded Contexts afetados

- [ ] Contratos (`ctr_*`) · [ ] Financeiro (`fin_*`) · [ ] Auth (`auth_*`) · [x] **Parceiros (`par_*`)**

Apenas o BC `partners` é tocado (respeita o isolamento do ADR-0014). Nenhuma fronteira de contexto nova é
criada — a parceria territorial nasce **dentro** do contexto `partners`, ao lado de Colaborador/Fornecedor/
Financiador, como uma nova dimensão (territorial) do mesmo contexto. As demais frentes (import, export,
catálogo, filtros) **não introduzem conceito de domínio** — são adaptações de borda sobre agregados/funções
existentes.

**Justificativa da fronteira** (por que a parceria territorial é Entity, não Value Object) — a decisão Q1
(soft-delete) deu à associação um **ciclo de vida** (Active↔Inactive) e **continuidade** identificável (a
mesma UF/município alternando estado ao longo do tempo), o que a torna uma **Entity** no sentido de Evans:

> Modeling ENTITIES
> It is natural to think about the attributes when modeling an object, and it is quite important to think about its behavior. But the most basic responsibility of ENTITIES is to establish continuity so that behavior can be clear and predictable. They do this best if they are kept spare. Rather than focusing on the attributes or even the behavior, strip the ENTITY object's definition down to the most intrinsic characteristics, particularly those that identify it or are commonly used to find or match it.
> — *(Linha 1081, p. 49, Eric Evans, *Domain-Driven Design*)*

A "característica mais intrínseca que identifica" a parceria de estado é a **UF** (`StateAbbreviation`); a de
município, o **código IBGE** (`IbgeCode`). Mantemos a Entity _spare_: só identidade (UF/IbgeCode) + estado de
ativação. **Contraste consciente com o front**: o `domain.md` de `008-partners` modelou Estado/Município como
_Value Object de referência_ (imutável), porque lá não há persistência — a seleção é substituída. No backend,
com soft-delete (D9=B), a associação **persiste e transiciona**, logo é Entity. O catálogo geográfico em si
(`State`/`Municipality` em `domain/geography/`) **permanece** read-only/imutável (Value Objects de lookup) —
a parceria é uma camada à parte que os referencia.

## Linguagem ubíqua

| Termo (PT)             | Significado (negócio)                                      | Tipo no código (EN)                               |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| Estado parceiro        | UF marcada como abrangência de parceria, com ciclo de vida | Entity `PartnerState`                             |
| Município parceiro     | Município (IBGE) marcado como parceria; cross-state        | Entity `PartnerMunicipality`                      |
| Marcar parceria        | Criar/reativar a associação (Active)                       | comando `togglePartnerState`/`...Municipality`    |
| Desmarcar parceria     | Inativar a associação (soft-delete)                        | idem (lado off)                                   |
| Catálogo geográfico    | Conjunto read-only das 27 UFs / municípios IBGE            | VO de lookup `State` / `Municipality` (existente) |
| Relatório de import    | Resultado de import em lote (criados + falhas por linha)   | `ImportCollaboratorsOutput` (existente)           |
| Catálogo de categorias | Conjunto fechado canônico (39) de categorias de serviço    | union `ServiceCategory` (existente)               |

## Agregados e Value Objects

### Aggregate `PartnerState` (novo — US-002)

- **Raiz**: `PartnerState`. **Identidade**: `uf: StateAbbreviation` (única — uma parceria por UF).
- **Invariantes**: `uf` ∈ catálogo das 27 (validada por `State.parse`); soft-delete coerente — `active=false ⟺ deactivatedAt preenchido` (espelha o CHECK de `parSuppliers`); toggle idempotente (marcar já-ativa = no-op; desmarcar já-inativa = no-op).
- **Value Objects**: reusa `StateAbbreviation` (branded, smart constructor `State.parse → Result<StateAbbreviation, StateError>`); `ActivationStatus` implícito em `active`+`deactivatedAt`.

### Aggregate `PartnerMunicipality` (novo — US-002)

- **Raiz**: `PartnerMunicipality`. **Identidade**: `ibgeCode: IbgeCode` (única). Carrega `uf` (derivada do catálogo) para suportar listagem por UF e **cross-state**.
- **Invariantes**: `ibgeCode` ∈ catálogo IBGE (validada por `Municipality.parse`/`findMunicipalityByCod`); mesma coerência de soft-delete; cross-state — a listagem de parceiros não filtra por UF (a UF é só atributo de organização, não fronteira).
- **Value Objects**: reusa `IbgeCode` + `StateAbbreviation` (branded existentes).

**Justificativa do boundary do agregado** (cada associação é seu próprio agregado, não um "agregado
territorial" único) — não há invariante transacional que ligue duas UFs ou dois municípios entre si; marcar
SP não tem regra de consistência imediata com marcar RJ:

> Rule: Model True Invariants in Consistency Boundaries
> When trying to discover the Aggregates in a Bounded Context (2), we must understand the model's true invariants. Only with that knowledge can we determine which objects should be clustered into a given Aggregate.
> An invariant is a business rule that must always be consistent. There are different kinds of consistency. One is transactional consistency, which is considered immediate and atomic. There is also eventual consistency. When discussing invariants, we are referring to transactional consistency.
> — *(Linha 8985, p. 450, Vaughn Vernon, *Implementing Domain-Driven Design*)*

Como o único invariante é **interno a cada associação** (coerência do soft-delete + pertencimento ao
catálogo), cada `PartnerState`/`PartnerMunicipality` é um **agregado pequeno** (Aggregate Rule of Thumb de
Vernon: prefira agregados pequenos). Toggles são transações independentes — escala e contenção mínimas.

### Frentes SEM novo domínio (borda apenas)

- **US-001 (import)**: reusa o agregado `Collaborator` e o use-case `importCollaborators` (existe). Novidade é só borda: parsing CSV (`shared/utils/csv.ts`) + mapeamento record→`RegisterCollaboratorCommand`.
- **US-003 (export)**: reusa `Supplier` + `suppliersToCsv` (existe). Novidade: rota.
- **US-004 (catálogo)**: reusa a union `ServiceCategory` (39 literais). Novidade: função `listServiceCategories()` read-only + rota.
- **US-005 (filtros)**: nenhuma mudança de domínio — decisão de não-anunciar `programa`/`idade`.

## Eventos de domínio (outbox)

| Evento (EN-passado) | Quando ocorre | Payload | Consumidor(es) cross-BC |
| ------------------- | ------------- | ------- | ----------------------- |
| —                   | —             | —       | **Nenhum nesta fase**   |

Nenhum evento cross-BC é necessário: a parceria territorial é consumida (por ora) só pelo front via leitura;
import/export/catálogo não produzem fatos de interesse de outros módulos. Reavaliar se Financeiro/Contratos
passarem a reagir à abrangência territorial (aí um `PartnerStateActivated` entraria no outbox, ADR-0015).

## Mapa de contexto

- `partners` **consome** `auth` (sessão/RBAC) via `requireAuth`/`authorize` (já estabelecido).
- `contracts` é **downstream** de `partners` (lê dados bancários/PIX de Fornecedor) — inalterado por esta feature.
- A serialização/parsing CSV é **Shared Kernel técnico** em `src/shared/utils/csv.ts` (não é domínio; função pura) — consumível por qualquer módulo sem violar ADR-0006 (que proíbe importar de `<module>/` alheio, não de `shared/`).
- Catálogo geográfico (`domain/geography/`) é um **lookup imutável** referenciado pelas Entities de parceria — relação de referência por valor (UF/IbgeCode branded), não associação de agregado.
