# EPIC — Migração da fronteira "Parceiros / Cadastros" (legacy → core-api)

> **Status:** Design consolidado — 4 gates resolvidos (2026-06-01); 5 decisões P.O./ETL pendentes
> **Data:** 2026-06-01

## Decisões fechadas pela banca (2026-06-01)

- **D1 → `collaborator` dentro de `partners/`** (fundido; layout por-agregado deixa corte futuro pronto).
- **D2 → EN kebab + exceções sensíveis** (mantém rótulo legado em `race`/`gender_identity` e `serviceCategory`/`occupationArea`; dicionário PT no formatter).
- **D4 → VOs `Cpf`/`Cnpj`/`Email` promovidos ao `src/shared/kernel/`** (evolui `isValidCnpj` → VO; `auth.Email` migra depois).
- **D5 → agregado de perfil de usuário separado**, referencia `auth.User` por ID via public-api; `massApprovalPermission` vira `Permission` do RBAC.

## Decisões do dono (2026-06-02) — destravam a ETL

- **D6 → reset por e-mail.** NÃO migra o hash legado; cada usuário migrado nasce sem senha utilizável e
  recebe link de definição via EmailPort (ADR-0010). Mais seguro (não carrega hash de custo desconhecido).
- **D7 → seed estático no código, geografia FORA da ETL.** `state`/`municipality` permanecem dados
  embutidos read-only (`geography/*.data.ts`); a ETL não toca geografia (é referência IBGE, não dado do legado).
- **D8 → migrar todos, mapeando o flag.** Ativos e inativos; `active=false` → estado Inactive/Disabled
  (com `disableBy`/`deactivatedAt` quando houver). Preserva histórico completo.

Pendentes restantes: D3 (regra "cadastro completo" — P.O.), D9 (hard vs soft delete — lookup).

---

> **Método:** Sessão multi-agente read-only (5 especialistas) + consolidação
> **Fontes:** `handbook/legacy_docs/{openapi.yaml,database-er.md,database.dbml,README.md}`,
> ADR-0001/0006/0014/0015/0019/0020, `handbook/domain/10-mapeamento-legado-schema.md`,
> `handbook/inquiries/0014-schema-legado-vs-modelo-alvo.md`

---

## 1. Enquadramento

O legacy API (NestJS/TypeORM) expõe 7 grupos de módulos. Excluindo `auth`, `contratos` e
`financeiro` (em curso no core-api), o gap real são **4 fronteiras novas**. Esta epic cobre a
**primeira**: Parceiros / Cadastros — escolhida por ser folha do grafo de FK (não depende de
nenhuma decisão em aberto) e por desbloquear contracts/financial.

Tabelas legadas em escopo: `collaborators`, `collaborator_history`, `suppliers`, `financiers`,
`partner_states`, `partner_municipalities`. (`users` fica em `auth` — ver §5.)

---

## 2. Convergências dos 5 especialistas (baixo risco — adotar)

| Decisão | Conclusão | Âncora |
| --- | --- | --- |
| **Estrutura modular** | UM módulo `src/modules/partners/` com 3 agregados internos (`supplier`, `financier`, `collaborator`). Não fatiar em N módulos (cardinalidade modesta, mesma linguagem ubíqua). | ADR-0006 §granularidade-é-cargo-cult |
| **Geografias** | NÃO são agregados. Lookup / dados de referência (UF + IBGE). Consumidor real é o BC Orçamento (ainda inexistente), não Parceiros. | `10-mapeamento:121` |
| **`users`** | Permanece no módulo `auth` (já tem `identity/credential/session/authorization`). Vínculo `users.collaboratorId` vira referência por ID cross-módulo, não FK. | ADR-0006 |
| **Prefixo de tabela** | `par_*` (`par_suppliers`, `par_financiers`, `par_collaborators`, `par_collaborator_history`). Coerente com `ctr_*`/`fin_*`/`auth_*`. | ADR-0014, ADR-0020 §convenção |
| **PK** | `varchar(36)` UUID v4 gerado no domínio. Legado usa `int AUTO_INCREMENT` — proibido em PK de domínio. | ADR-0020 |
| **Enums** | `varchar(N) + CHECK`. Legado usa `ENUM` nativo — proibido. | ADR-0020 |
| **Embedded** (`bancaryInfo`/`pixInfo`) | Achatar com prefixo snake_case (`banc_info_*`, `pix_*`) no mesmo agregado. Sem tabela separada (cardinalidade 1, sem identidade própria). VOs opcionais no domínio. | ADR-0020 |
| **`collaborator_history`** | Audit log / **projeção de eventos**, NÃO entidade filha do agregado Collaborator. Pares `previous_*`/`new_*` como colunas escalares (sem JSON — proibido). | ADR-0020, padrão `timeline/projection.ts` |
| **Consumo cross-módulo** | Por ID (`PartnerId` branded no public-api) + **snapshot imutável** onde o dado entra em artefato fiscal (Payable já faz isso com `BeneficiaryBankData`) + **evento** via outbox para invalidação/regra. Nunca FK ou import de `domain/` alheio. | ADR-0006, ADR-0014, ADR-0015 |
| **Migração de dados** | Bootstrap one-shot (ETL idempotente), não coexistência longa. Base pequena, chaves naturais existem. `legacy_id INT NULL` como coluna de correlação (não FK). Quarentena explícita para dados sujos. | ADR-0001, `01-migration-strategy.md:70` |
| **`migrate-occupation-area` / `history/import`** | NÃO são features do produto — viram migration/seed script, fora de `src/`. | OpenAPI `:424` "executar uma única vez" |

### Achado importante (muda o enquadramento)
O código novo **ainda não tem** o acoplamento do legado: `contracts` e `financial` **não**
referenciam `supplierId`/`financierId`/`collaboratorId` hoje (grep retornou zero). Payable modela
o destino como VO inline `BeneficiaryBankData` (snapshot), não FK. Logo, a meta ao migrar Parceiros
é **não recriar o acoplamento** — Parceiros nasce como única fonte da verdade do cadastro, e os
demais módulos referenciam por ID + snapshot + evento.

---

## 3. Public-API proposto de `partners/`

```
src/modules/partners/public-api/
├── refs.ts      # PartnerId / SupplierRef / FinancierRef / CollaboratorRef (branded, só rehydrate)
├── events.ts    # PartnersModuleEvent union + decodeV1 + isPartnersModuleEvent (padrão contracts)
├── queries.ts   # read model: SupplierView / CollaboratorView (DTOs flat, read-only)
└── index.ts     # barrel — único ponto de import externo
```

Eventos (EN passado): `SupplierRegistered`, `SupplierDeactivated`, `SupplierBankDataChanged`,
`FinancierRegistered`, `FinancierDeactivated`, `CollaboratorRegistered`,
`CollaboratorRegistrationCompleted`, `CollaboratorRoleChanged`, `CollaboratorDeactivated`.

---

## 4. Fatiamento em tickets W0→W3 (ordem por valor + dependência)

**Fase 0 — fundação**
- `PARTNERS-MODULE-BOOTSTRAP` (S) — criar módulo, prefixo `par_`, padrão de paginação/soft-delete, drizzle.config próprio (atenção ao `migrationsTable` por módulo).

**Fase 1 — dados-mestre (CRUD trivial, define padrões)**
- `PARTNERS-STATE-CRUD` (S) — agregado/lookup mínimo + options + shared.
- `PARTNERS-MUNICIPALITY-CRUD` (S) — +uf/cod IBGE, unique composto `(name, uf)`.

**Fase 2 — financiador (CRUD + soft-delete)**
- `PARTNERS-FINANCIER-CRUD` (M) — CRUD + toggle-active + nameOrCNPJ + options. Define padrão soft-delete e busca single.

**Fase 3 — fornecedor (primeira regra real)**
- `PARTNERS-SUPPLIER-CRUD` (M) — base + invariante "destino de pagamento" (bancaryInfo OU pixInfo).
- `PARTNERS-SUPPLIER-CSV` (S) — export.

**Fase 4 — colaborador (maior; fatiar fino)**
- `PARTNERS-COLLABORATOR-CREATE` (M) — Create em PRE_CADASTRO, enums, unicidade CPF/email/RG.
- `PARTNERS-COLLABORATOR-COMPLETE-REGISTRATION` (M) — transição de estado + fluxo público + check-first-three-numbers-cpf.
- `PARTNERS-COLLABORATOR-TOGGLE-ACTIVE` (S) — soft-delete com `disableBy` obrigatório.
- `PARTNERS-COLLABORATOR-LIST-FILTERS` (M) — listagem multifiltro + nameOrCPF + options.
- `PARTNERS-COLLABORATOR-CSV-EXPORTS` (M) — /csv, /data, /timeline/csv.
- `PARTNERS-COLLABORATOR-BULK-IMPORT` (L) — /import (insert + unicidade + import parcial).

**Fase 5 — perfil de usuário (depende de decisão §5)**
- `PARTNERS-USER-PROFILE` (M) — só campos NÃO cobertos por auth (name/cpf/telephone/avatar/massApprovalPermission/collaboratorId).

**Fora de produto** — `migrate-occupation-area`, `history/import` → migration/seed.
**ETL** — `PARTNERS-ETL-BOOTSTRAP` (L) — script em `scripts/etl/`, idempotente, quarentena, reconciliação.

---

## 5. Decisões em aberto (BLOQUEIAM) — para a banca

| # | Decisão | Recomendação dos especialistas | Bloqueia |
| --- | --- | --- | --- |
| **D1** | `collaborator` fica em `partners/` ou nasce módulo próprio `people/hr`? | Fundido em `partners` por YAGNI; layout por-agregado deixa corte futuro pronto. | Estrutura de pastas, schema |
| **D2** | Enums PT→EN: traduzir ou manter código legado? `race`/`gender_identity` (sensíveis, espelham IBGE) e `serviceCategory` (~40 valores, 1 typo legado `ONGANIZACAO`). | EN kebab + dicionário PT no formatter; **exceção** para race/gender (manter rótulo opaco) e serviceCategory/occupationArea (manter sigla legada). | Domínio (unions), ETL (mapa de tradução), schema (CHECK) |
| **D3** | Definição de "CADASTRO_COMPLETO": quais campos exatos exige a transição PRE_CADASTRO→COMPLETO? Schema legado é quase todo nullable — regra é de negócio. | P.O. precisa declarar. | Modelagem do estado refinado `CompleteCollaborator`, use case |
| **D4** | VOs `Cpf`/`Cnpj`/`Email` no shared-kernel ou dentro de `partners`? `auth` já tem `Email` isolado; kernel já tem `isValidCnpj` (predicado, sem VO). | Promover ao kernel (genuinamente cross-BC); auth migra depois. | Domínio, refactor cross-módulo |
| **D5** | Perfil de `/users` (name/cpf/telephone/avatar/`massApprovalPermission`/collaboratorId): estende agregado `auth.User` ou agregado separado? `massApprovalPermission` vira `Permission` RBAC? | Agregado de perfil separado referenciando `auth/public-api`; massApprovalPermission → Permission RBAC. | Fase 5, fronteira auth |
| **D6** ✅ | Senha legada (`users.password`, provável bcrypt): migrar hash ou forçar reset por email? | **RESOLVIDA (2026-06-02): reset por e-mail** — não migra hash. | ETL de users |
| **D7** ✅ | Geografias: seed estático (27 UF + 5570 municípios IBGE) ou tabela gerenciada (CRUD)? Prefixo `par_*` vs `ref_*`/`geo_*`? | **RESOLVIDA (2026-06-02): seed estático no código, fora da ETL.** | Schema, ETL |
| **D8** ✅ | `active=false` no legado: migrar inativos também (histórico completo) ou só ativos? | **RESOLVIDA (2026-06-02): migrar todos com mapeamento do flag.** | ETL |
| **D9** | Hard delete (partner-states/municipalities usam DELETE físico no legado) vs padronizar soft-delete? | Padronizar soft-delete salvo integridade exigir hard. | Domínio lookup |

### Decisões NÃO-bloqueantes (registrar e seguir)
- `BeneficiaryBankData` (Financial = snapshot de pagamento) ≠ `Supplier.bankData` (cadastro mestre) — papéis distintos, Payable continua com snapshot inline.
- `financier` liga só a `receivables`/`contracts`; Financial atual só tem `Payable` — `financier` "dorme" até Receivables existir (migra cedo por ser folha).
- `RG` sem dígito verificador nacional — validação só estrutural.
- charset `utf8mb4_unicode_ci` por tabela; `utf8mb4_bin` em UUID/cpf/cnpj/cod (manual na migration).

---

## 6. Pré-requisitos de handbook antes de código

1. Abrir **ADR de criação do módulo `partners`** (hoje só Contratos+Auth+Financeiro+Notifications existem).
2. Atualizar `handbook/domain/02-context-map.md` com a fronteira Parceiros (hoje só cobre Financeiro).
3. Resolver D1–D9 (acima) — algumas via banca, algumas via P.O.
4. Abrir `000-request.md` do primeiro ticket (`PARTNERS-MODULE-BOOTSTRAP`) no pipeline.

---

## 7. Agentes da sessão (rastreabilidade)
- Fronteira modular — `a24f845f3f35c3cd9`
- Modelagem de domínio — `a9b4c9028bf93aa58`
- Persistência/schema Drizzle — `a801d7388bde35afc`
- Requisitos/escopo de rotas — `a3522fdedc1a18305`
- Estratégia de migração de dados — `a9d4a9b9e6ec4cd90`
