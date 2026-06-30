[← Voltar para ADRs](./README.md)

# ADR-0036: `Act` — novo tipo de parceiro PLACEHOLDER, espelhando Collaborator (provisório, regras pendentes)

- **Status:** Accepted (provisório — ver "Natureza provisória")
- **Date:** 2026-06-06
- **Deciders:** Gabriel Aderaldo + P.O. (pedido de produto)
- **Relacionado:** [ADR-0031](./0031-partners-registry-module.md) (módulo `partners`), [ADR-0014](./0014-mysql-database-isolation.md) (prefixo `par_*`), [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md), [ADR-0033](./0033-api-versioning-v1-legacy-mirror.md) (`/api/v1`).

---

## Contexto

A P.O. pediu um **novo tipo de parceiro** com o label **`ACT`**. A decisão de produto está, no momento,
**genérica**: as regras de negócio reais (campos, invariantes, fluxos) **ainda não foram definidas**. A
instrução foi: criar o tipo já, **copiando o parceiro com mais possibilidades** (o **Collaborator** — PF,
o mais rico), para destravar o front; as regras próprias do ACT virão depois.

> ⚠️ O significado exato da sigla **ACT** ainda não foi fornecido — registrado como pendência. O
> identificador técnico provisório é `act`.

## Decisão

1. Criar o agregado `Act` no módulo `partners` como **clone ENXUTO do núcleo** do Collaborator (não o
   Collaborator completo):
   - **PF** (identidade `Cpf`, reusa o VO do kernel) + os 7 campos de pré-cadastro
     (`name, email, cpf, occupationArea, role, startOfContract, employmentRelationship`);
   - **status duplo**: `registrationStatus` (`PreRegistration` → `Complete`) + `status`
     (`Active`/`Inactive`) com **soft-delete** padrão `par_*` (`active` + `deactivated_at` + CHECK);
   - **CRUD + lista**: `POST/GET/PUT /api/v1/acts`, `GET /acts/:id`, `POST /acts/:id/{deactivate,reactivate}`;
   - RBAC `act:read`/`act:write`; tabela `par_acts` (ADR-0014); migration gerada (ADR-0020).
2. **Fora do escopo até as regras reais** (deliberadamente): import em lote, complete-registration de ~27
   campos, filtros avançados, eventos de domínio. Quando as regras do ACT forem definidas, evoluem por
   épico próprio.

## Natureza provisória (NÃO tratar como definitivo)

Este ADR é **provisório**. O `Act` é um **placeholder** que espelha o Collaborator por falta de regras
próprias — **não** porque o ACT *é* um Collaborator. Quando as regras reais chegarem:
- campos/invariantes podem mudar (inclusive deixar de ser PF, ou ganhar campos próprios);
- um **novo ADR** substituirá este, e a migração de schema correspondente será planejada.
Até lá, evitar acoplar outros módulos ao shape atual do `Act` (ele vai mudar).

## Consequências

- **Positivas**: destrava o front (tipo ACT com CRUD real) sem mock divergente; segue o padrão consolidado
  do módulo (soft-delete, plugin, RBAC); reversível por evolução.
- **Negativas / custo**: dívida consciente — `par_acts` nasce espelhando Collaborator e provavelmente mudará
  (migração futura). Mitigado pelo escopo **enxuto** (núcleo, não os 27 campos) e por este ADR sinalizar a
  provisoriedade.

## Alternativas consideradas

| Alternativa | Por que rejeitada |
|---|---|
| Só label/UI no front (mock), sem backend | P.O. pediu backend já (rota real). |
| Clonar o Collaborator **completo** | Máximo retrabalho/descarte quando as regras (diferentes) chegarem; fere YAGNI. |
| Stub mínimo (só id/name/cpf) | Menos parecido com o Collaborator do que o pedido ("mais possibilidades"). |
| Adiar até regras definidas | Bloquearia o pedido de produto; o placeholder enxuto atende com dívida controlada. |
