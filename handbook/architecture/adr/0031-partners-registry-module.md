[← Voltar para ADRs](./README.md)

# ADR-0031: Módulo `partners` — fronteira de Cadastros/Counterparties (supplier, financier, collaborator) migrada do legado

- **Status:** Accepted
- **Date:** 2026-06-01
- **Deciders:** Gabriel Aderaldo + Arquiteto técnico
- **Decide:** primeira das 4 fronteiras do legacy API ainda não migradas (ver [`../../domain/10-mapeamento-legado-schema.md`](../../domain/10-mapeamento-legado-schema.md))
- **Relacionado:** [ADR-0001](./0001-strangler-fig-over-rewrite.md) (strangler fig), [ADR-0006](./0006-modular-monolith-core-api.md) (modular monolith, módulo extraível), [ADR-0014](./0014-mysql-database-isolation.md) (isolamento, prefixo por módulo), [ADR-0015](./0015-mysql-outbox-pattern.md) (eventos cross-módulo), [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) (sem JSON/ENUM nativos, UUID, bigint cents), [ADR-0024](./0024-identity-and-rbac-auth-module.md) (módulo `auth` — fronteira de identidade)

---

## Contexto

O legacy API (NestJS/TypeORM) expõe 7 grupos de módulos. Excluindo `auth`, `contratos` e `financeiro` (em curso no core-api), restam **4 fronteiras novas** mapeadas em [`../../domain/10-mapeamento-legado-schema.md`](../../domain/10-mapeamento-legado-schema.md): **Parceiros/Cadastros**, **Planejamento Orçamentário**, **Relatórios/Estatísticas** e **Arquivos**.

Esta decisão cobre a **primeira** — Parceiros/Cadastros — escolhida por:

- Ser **folha do grafo de FK** do legado (`10-mapeamento-legado-schema.md:175`): counterparties e cadastros não dependem de nenhuma outra tabela em escopo, então migram sem decisão em aberto bloqueante.
- **Desbloquear** Contratos e Financeiro, que no legado referenciam `supplierId`/`financierId`/`collaboratorId`.

Tabelas legadas em escopo: `collaborators`, `collaborator_history`, `suppliers`, `financiers`, `partner_states`, `partner_municipalities`.

**Achado que muda o enquadramento:** o código novo **ainda não tem** o acoplamento do legado — `contracts` e `financial` não referenciam supplier/financier/collaborator hoje; Payable modela o destino de pagamento como VO inline `BeneficiaryBankData` (snapshot), não FK. A migração de Parceiros é, portanto, a oportunidade de **não recriar** o acoplamento estrutural do legado.

A decisão foi precedida de sessão de design multi-agente read-only (5 especialistas), consolidada em `.claude/.planning/EPIC-PARTNERS-CADASTROS.md`.

---

## Decisão

Criar o **módulo `partners`** no core-api, seguindo o modular monolith ([ADR-0006](./0006-modular-monolith-core-api.md)), com as escolhas abaixo.

### 1. Um módulo, três agregados internos

`src/modules/partners/` com três agregados raiz: **`supplier`**, **`financier`**, **`collaborator`**. Não fatiar em N módulos — cardinalidade modesta (`10-mapeamento-legado-schema.md:196`), mesma linguagem ubíqua de "cadastro de contraparte/pessoa", e ADR-0006 rejeita granularidade abaixo do Bounded Context. O layout por-agregado deixa o corte futuro pronto **se** `collaborator` crescer para um BC de RH/Pessoas (candidato natural à primeira extração).

### 2. `collaborator` permanece em `partners` (não vira módulo `people/hr` agora)

Decisão da banca (2026-06-01): por YAGNI, fundido com os demais. Reavaliar se RH ganhar regras próprias (remuneração, jornada, avaliação de desempenho).

### 3. Geografias são lookup, não agregado

`partner_states`/`partner_municipalities` são dados de referência (UF + código IBGE), sem ciclo de vida nem regra de negócio (`10-mapeamento-legado-schema.md:121`). O consumidor real é o futuro BC de Orçamento, não Parceiros. Modelados como tabela read-only/seed e VOs (`StateAbbreviation`, `IbgeCode`). Prefixo e modo de gestão (seed estático vs gerenciado) ficam como questão aberta (não bloqueia o módulo).

### 4. VOs `Cpf`/`Cnpj`/`Email` promovidos ao Shared Kernel

Decisão da banca: `src/shared/kernel/{cpf,cnpj,email}.ts` como VOs brandados com smart constructor `Result<T,E>`. Evolui o `isValidCnpj` (predicado já existente em `src/shared/kernel/cnpj.ts`) para VO completo. São genuinamente cross-BC (Parceiros, Auth, Financeiro). `auth.Email` (hoje isolado no módulo) migra para o kernel num passo posterior, sem bloquear Parceiros.

### 5. Enums do legado → string literal unions EN, com exceções sensíveis

Decisão da banca: traduzir para **EN kebab-case** com dicionário PT-BR no `cli/formatters/`, **exceto**:

- `race` e `gender_identity` — espelham categorias oficiais do IBGE; manter rótulo legado opaco evita distorção semântica.
- `serviceCategory` (~40 valores, com typo legado `ONGANIZACAO_DE_EVENTOS`) e `occupationArea` (`PARC|DDI|DCE|EPV`, siglas internas da organização) — manter código legado literal para fidelidade no ETL.

### 6. Perfil de usuário é agregado separado, não extensão de `auth.User`

Decisão da banca: o perfil administrativo de `/users` (campos `name`, `cpf`, `telephone`, `imageUrl`/avatar, `massApprovalPermission`, `collaboratorId`) que o módulo `auth` ([ADR-0024](./0024-identity-and-rbac-auth-module.md)) **não** cobre vira **agregado de perfil separado**, que referencia `auth.User` por ID via `auth/public-api`. O `massApprovalPermission` vira uma `Permission` do RBAC (`contract:mass-approve`), não um boolean solto. `users` (login/credencial/sessão) **continua no módulo `auth`**.

### 7. Consumo cross-módulo por ID + snapshot + evento

Contratos e Financeiro consomem Parceiros **exclusivamente** via `partners/public-api/` ([ADR-0006](./0006-modular-monolith-core-api.md)):

- **Referência por ID** (`PartnerId`/`SupplierRef`/`CollaboratorRef` branded, espelhando o `UserRef` existente).
- **Snapshot imutável** onde o dado entra em artefato fiscal — Payable mantém `BeneficiaryBankData` inline (snapshot do destinatário), distinto do cadastro mestre `Supplier.bankData`.
- **Evento** via outbox ([ADR-0015](./0015-mysql-outbox-pattern.md)) para invalidação/regra (ex.: bloquear vínculo a fornecedor inativo).

Sem FK física cross-módulo, sem import de `domain/`/`application/` alheio.

### Modelo de dados (`par_*` dentro do database `core`)

Prefixo `par_*` (convenção de `ctr_*`/`fin_*`/`auth_*`), respeitando [ADR-0014](./0014-mysql-database-isolation.md) (escritor único: `core_app`) e [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md).

| Tabela | Observações |
| :--- | :--- |
| `par_collaborators` | PK `varchar(36)` UUID; `email`/`cpf` unique, `rg` unique nullable; enums → `varchar+CHECK`; `status` (`pre-registration`/`complete`); `active` + `disable_by` consistentes via CHECK |
| `par_collaborator_history` | Audit log / projeção de eventos — colunas escalares `previous_*`/`new_*` (sem JSON); FK intra-módulo para `par_collaborators` |
| `par_suppliers` | `cnpj` unique; `serviceCategory`/`pixKeyType` → `varchar+CHECK`; embedded `banc_info_*`/`pix_*` achatado; invariante "destino de pagamento" (bancário OU pix) |
| `par_financiers` | `cnpj` unique; campos obrigatórios (`corporateName`, `legalRepresentative`, `address`) |
| `par_states` / `par_municipalities` | Lookup; `(name)`/`(abbreviation)` e `(cod)`/`(name,uf)` unique — prefixo/modo a confirmar |

> Conversões obrigatórias vs legado (ADR-0020): `int AUTO_INCREMENT` → `varchar(36)` UUID; `ENUM` nativo → `varchar(N)+CHECK`; `timestamp` → `datetime(3)`; `decimal(10,2)` (remuneração) → `bigint` cents. Coluna `legacy_id INT NULL` como correlação do ETL (não FK).

### Vocabulário do módulo

- **Eventos** (EN passado): `SupplierRegistered`, `SupplierDeactivated`, `SupplierBankDataChanged`, `FinancierRegistered`, `FinancierDeactivated`, `CollaboratorRegistered`, `CollaboratorRegistrationCompleted`, `CollaboratorRoleChanged`, `CollaboratorDeactivated`.
- **Erros** (kebab EN): `'cpf-already-registered'`, `'cnpj-already-registered'`, `'email-already-registered'`, `'invalid-cpf'`, `'invalid-cnpj'`, `'supplier-payment-target-required'`, `'collaborator-not-in-pre-registration'`, `'partner-inactive'`.

---

## Consequências

### Positivas

- Zero infra nova — reusa o database `core` (MySQL já provisionado).
- Desbloqueia Contratos e Financeiro (counterparties passam a ter dono).
- Não recria o acoplamento estrutural do legado: Parceiros é a única fonte da verdade do cadastro, consumo desacoplado por ID/snapshot/evento.
- VOs documentais (`Cpf`/`Cnpj`/`Email`) no kernel eliminam duplicação cross-módulo futura.
- Domínio puro (sem framework), conforme ADR-0006.

### Negativas

- 5ª fronteira no core-api aumenta a superfície de manutenção (schema, migrations, public-api, CLI).
- Promover VOs ao kernel exige refactor posterior do `auth.Email` (dívida assumida, agendada).
- ETL de carga do legado é trabalho próprio (idempotência, quarentena, reconciliação) — fora de `src/`.

### Neutras

- Geografias ficam como lookup com modo de gestão a definir; não bloqueia o restante do módulo.
- `financier` liga só a `receivables`/`contracts`; como Financeiro atual só tem `Payable`, `financier` "dorme" até Receivables existir (mas migra cedo por ser folha).

---

## Alternativas Consideradas

### A. `collaborator` como módulo `people/hr` próprio desde já

**Rejeitada nesta fase porque:** YAGNI — não há regra de RH no escopo atual. O layout por-agregado preserva o corte futuro sem custo de fragmentar agora.

### B. Estender o agregado `auth.User` com os campos de perfil

**Rejeitada porque:** misturaria identidade/credencial com dado cadastral, acoplando `auth` a cadastro. Perfil separado referenciando `auth.User` por ID mantém as fronteiras limpas.

### C. Referência por FK física cross-módulo (como o legado)

**Rejeitada porque:** viola ADR-0014 (isolamento) e ADR-0006 (módulo extraível). Recria o acoplamento que a migração quer eliminar.

### D. Coexistência longa (legado readonly + core só para cadastros novos)

**Rejeitada para este sub-grafo porque:** base pequena e chaves naturais existentes tornam o bootstrap one-shot mais barato que o roteamento dual. Coexistência longa segue válida para fronteiras ambíguas (ex.: `contracts` mãe+aditivos).

---

## Quando Re-avaliar

- Se `collaborator` ganhar regras de RH (remuneração, jornada, avaliação) → extrair módulo `people/hr` (gera ADR).
- Se surgir o BC de Orçamento → revisitar o dono e o prefixo das geografias.
- Se um cadastro precisar de cardinalidade >1 hoje achatada (ex.: múltiplas contas bancárias por supplier) → separar em tabela própria via migration.

---

## Invariantes normativas

- `partners` é a **única fonte da verdade** do cadastro de supplier/financier/collaborator; nenhum outro módulo mantém tabela de counterparty.
- Cross-módulo **só** via `partners/public-api/` (ID + snapshot + evento) — nunca FK física nem import de `domain/` alheio.
- Sem `ENUM`/`JSON` nativos, sem `AUTO_INCREMENT` em PK de domínio (ADR-0020).
- `Supplier` ativo com dado bancário/pix preenchido respeita a invariante "destino de pagamento" (bancário OU pix).
- `collaborator_history` é imutável (audit log) — materializado por projeção de eventos, não entidade filha mutável.

---

## Questões abertas (não bloqueiam a criação do módulo — P.O./ETL)

- **D3** — definição de "CADASTRO_COMPLETO" (quais campos a transição `pre-registration → complete` exige). Regra de negócio da P.O.
- **D6** — senha legada (`users.password`): migrar hash bcrypt ou forçar reset via EmailPort.
- **D7** — geografias como seed estático vs tabela gerenciada; prefixo `par_*` vs `ref_*`/`geo_*`.
- **D8** — migrar registros inativos (`active=false`) ou só ativos.
- ~~**D9** — partner-states/municipalities: hard delete (legado) vs soft-delete padronizado.~~ → **RESOLVIDA** pelo [ADR-0035](./0035-partner-territory-soft-delete.md): Entity persistida com **soft-delete** (`active` + `deactivated_at` + CHECK), espelhando o padrão dos demais `par_*`.

---

## Referências

- [`../../domain/10-mapeamento-legado-schema.md`](../../domain/10-mapeamento-legado-schema.md) — mapeamento legado → módulos alvo (fonte da decisão).
- [`../../domain/11-parceiros-cadastros-context.md`](../../domain/11-parceiros-cadastros-context.md) — contexto detalhado desta fronteira.
- [`../../inquiries/0014-schema-legado-vs-modelo-alvo.md`](../../inquiries/0014-schema-legado-vs-modelo-alvo.md) — achados que exigem decisão da banca.
- `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` — design consolidado da sessão multi-agente.
- [ADR-0001](./0001-strangler-fig-over-rewrite.md), [ADR-0006](./0006-modular-monolith-core-api.md), [ADR-0014](./0014-mysql-database-isolation.md), [ADR-0015](./0015-mysql-outbox-pattern.md), [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md), [ADR-0024](./0024-identity-and-rbac-auth-module.md).
