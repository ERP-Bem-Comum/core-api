[← Voltar ao README de Domínio](./README.md)

# 🤝 Bounded Context — Parceiros / Cadastros

> **Status:** vigente | **Criado:** 2026-06-01
> **Decisão estrutural:** [ADR-0031](../architecture/adr/0031-partners-registry-module.md)
> **Origem:** primeira das 4 fronteiras do legacy API a migrar ([`./10-mapeamento-legado-schema.md`](./10-mapeamento-legado-schema.md))

---

## 1. Objetivo

Descrever a fronteira de responsabilidades do módulo **`partners`** — o dono dos cadastros de **counterparties** (fornecedores, financiadores) e de **pessoas** (colaboradores) do ERP Bem Comum. Esta fronteira não existia no mapa de contextos original ([`./02-context-map.md`](./02-context-map.md)), que cobria só o Financeiro.

O `partners` protege o resto do sistema de uma armadilha herdada do legado: lá, Contratos e Financeiro referenciam fornecedor/colaborador/financiador por FK direta (`contracts.supplierId`, `payables.collaboratorId`). No core-api, esse acoplamento **não será recriado** — o cadastro tem um dono único e é consumido por contrato/ID, snapshot e evento.

---

## 2. Tipo de domínio

| Bounded Context | Responsabilidade principal | Tipo de domínio |
| :--- | :--- | :--- |
| **Parceiros / Cadastros** | Dono do cadastro mestre de fornecedores, financiadores e colaboradores. Controla unicidade documental (CPF/CNPJ), ciclo de vida (ativo/inativo, pré-cadastro/completo) e o histórico de mudanças do colaborador. | **Supporting** |

Não é Core (o coração do negócio segue sendo Documento/Título no Financeiro e Contrato em Contratos), mas é **pré-requisito** de ambos — sem fornecedor cadastrado não há contrato nem pagamento rastreável.

---

## 3. Agregados

| Agregado | Raiz | Identidade | Ciclo de vida |
| :--- | :--- | :--- | :--- |
| **Supplier** | `Supplier` | `SupplierId` (UUID) + `cnpj` único | `active` ↔ inativo; invariante "destino de pagamento" (bancário OU pix) |
| **Financier** | `Financier` | `FinancierId` (UUID) + `cnpj` único | `active` ↔ inativo |
| **Collaborator** | `Collaborator` | `CollaboratorId` (UUID) + `cpf` único | `pre-registration → complete`; `active` + motivo de desligamento (`disable_by`) |

**Geografias** (`partner_states`, `partner_municipalities`) **não são agregados** — são lookup read-only (UF + código IBGE), consumidas pelo futuro BC de Orçamento. Modeladas como VOs (`StateAbbreviation`, `IbgeCode`) + tabela de referência.

**`collaborator_history`** **não é entidade filha** do agregado Collaborator — é um **audit log imutável** materializado por projeção dos eventos de mudança (`CollaboratorRoleChanged`, `CollaboratorDeactivated`…), no espírito do ADR-0022.

---

## 4. Relacionamentos com outros contextos

```plaintext
                 ┌─────────────────────────────┐
                 │  Parceiros / Cadastros      │
                 │  (Supplier, Financier,      │
                 │   Collaborator)             │
                 └──────────────┬──────────────┘
                                │ public-api (ID + snapshot + evento)
            ┌───────────────────┼────────────────────┐
            ▼                   ▼                     ▼
     [ Contratos ]      [ Financeiro ]       [ Orçamento (futuro) ]
   supplier/financier/   supplier/             partner_states/
   collaborator por ID   collaborator por ID   municipalities (lookup)
```

| De | Para | Relação | Descrição |
| :--- | :--- | :--- | :--- |
| Contratos | Parceiros | Customer/Supplier | Contrato referencia fornecedor/financiador/colaborador por `PartnerId`; resolve exibição via read model do public-api. |
| Financeiro | Parceiros | Customer/Supplier + snapshot | Payable referencia colaborador/fornecedor por ID, mas **congela** os dados bancários como `BeneficiaryBankData` (snapshot fiscal), distinto do cadastro mestre `Supplier.bankData`. |
| Auth | Parceiros | Shared (por ID) | Perfil administrativo de usuário (agregado separado) referencia `auth.User` por ID; `auth` não conhece Parceiros diretamente. |
| Orçamento (futuro) | Parceiros | Conformist (lookup) | Consome geografias (estado/município) como dados de referência. |

**Regra de ouro:** nenhum módulo lê tabela `par_*` diretamente nem mantém cópia do cadastro. Toda travessia passa por `partners/public-api/` ([ADR-0006](../architecture/adr/0006-modular-monolith-core-api.md), [ADR-0014](../architecture/adr/0014-mysql-database-isolation.md)).

---

## 5. Linguagem ubíqua (núcleo)

| Termo | Definição |
| :--- | :--- |
| **Supplier (Fornecedor)** | Pessoa jurídica que presta serviço/fornece produto; identidade por CNPJ; tem categoria de serviço e destino de pagamento (conta bancária ou chave Pix). |
| **Financier (Financiador)** | Pessoa jurídica que financia/doa; identidade por CNPJ; vinculada a recebíveis e contratos. |
| **Collaborator (Colaborador)** | Pessoa física vinculada à organização (vínculo CLT/PJ); identidade por CPF; tem área de atuação, escolaridade e histórico de mudanças. |
| **Pré-cadastro** | Estado inicial do colaborador — criado pelo admin com o mínimo; o próprio colaborador completa depois via fluxo público. |
| **Cadastro completo** | Estado do colaborador após preenchimento dos campos exigidos (regra de negócio a definir — questão D3). |
| **Counterparty** | Termo guarda-chuva para a contraparte de uma obrigação (fornecedor ou financiador). |
| **Destino de pagamento** | Dado bancário OU chave Pix do fornecedor — invariante: fornecedor pagável tem ao menos um. |
| **Snapshot de pagamento** | Cópia imutável dos dados de destino no momento do título (vive no Financeiro, não é o cadastro). |

---

## 6. Vocabulário técnico (eventos e erros)

- **Eventos** (EN passado): `SupplierRegistered`, `SupplierDeactivated`, `SupplierBankDataChanged`, `FinancierRegistered`, `FinancierDeactivated`, `CollaboratorRegistered`, `CollaboratorRegistrationCompleted`, `CollaboratorRoleChanged`, `CollaboratorDeactivated`.
- **Erros** (kebab EN): `'cpf-already-registered'`, `'cnpj-already-registered'`, `'email-already-registered'`, `'invalid-cpf'`, `'invalid-cnpj'`, `'supplier-payment-target-required'`, `'collaborator-not-in-pre-registration'`, `'partner-inactive'`.

---

## 7. Questões abertas (P.O. / ETL — não bloqueiam o módulo)

Registradas no ADR-0031 e em `.claude/.planning/EPIC-PARTNERS-CADASTROS.md`:

- **D3** — quais campos a transição `pre-registration → complete` exige.
- **D6** — senha legada: migrar hash ou forçar reset.
- **D7** — geografias seed estático vs gerenciado; prefixo.
- **D8** — migrar inativos ou só ativos.
- **D9** — hard delete (legado) vs soft-delete em geografias.

---

## 8. Referências cruzadas

- [ADR-0031](../architecture/adr/0031-partners-registry-module.md) — decisão estrutural do módulo.
- [`./10-mapeamento-legado-schema.md`](./10-mapeamento-legado-schema.md) — mapeamento legado → alvo (§3.5, §4).
- [`./02-context-map.md`](./02-context-map.md) — mapa de contextos (Financeiro).
- [`../inquiries/0014-schema-legado-vs-modelo-alvo.md`](../inquiries/0014-schema-legado-vs-modelo-alvo.md) — achados do schema legado.
- `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` — design consolidado + fatiamento em tickets.
