# Request — PAR-GRID-CONTRACTS-COUNT

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> **Consolida o resíduo** de `PAR-COLLABORATOR-GRID-GAPS` + `PAR-GRID-FILTROS-EXPORT` após verificação
> em código (2026-06-10): ~70% de cada já estava entregue. Este card mantém **só o que falta de fato**.
> Os dois cards originais foram removidos do kanban (substituídos por este).

> ---
> **🧭 Decisão de abordagem (2026-06-15, painel DDD + dados + Clean) — read-model, NÃO port síncrono.**
> A contagem cross-módulo **não** deve ser feita por um read port síncrono `partners → contracts` (criaria
> ciclo `contracts ⇄ partners`, contra ADR-0006). A saída canônica é um **read-model materializado via
> outbox** (ADR-0022), mantido por eventos `ContractCreated`/`AmendmentHomologated`, que a grid de Parceiros
> lê localmente — conforme `handbook/architecture/adr/0032-transient-http-composition-read-until-bff.md:87`.
> As menções a `countByContractor` **síncrono** abaixo ficam substituídas por essa abordagem.
> ---

## Título

Grids de Parceiros — coluna **Contratos/Aditivos** (contagem cross-módulo) + filtros dependentes de vínculo

## Size

M (1 read port cross-módulo novo + propagação aos 3 list items) — fatiável

## ✅ Já entregue (NÃO refazer — verificado em código)

| Item                                                                                                            | Onde                                                         | Evidência                                                                                |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Filtros do colaborador: Escolaridade, Raça, Identidade de Gênero, Desativado por (+ área, vínculo, função, ano) | `application/use-cases/list-collaborators.ts`                | `educations`, `races:72`, `genderIdentities`, `disableReasons:74`                        |
| Filtros do ACT: Tipo (repasse) + Área de Atuação                                                                | `adapters/http/act-list-query.ts` · `use-cases/list-acts.ts` | `hasFinancialTransfer`, `occupationArea`                                                 |
| Export CSV dos 4 submódulos                                                                                     | `adapters/http/*-plugin.ts`                                  | rotas `/collaborators/export`, `/suppliers/export`, `/financiers/export`, `/acts/export` |
| Import CSV de colaboradores                                                                                     | `adapters/http/collaborator`                                 | `POST /collaborators/import`                                                             |

## ❌ Resíduo (o que falta)

### R1 — Coluna **Contratos/Aditivos** (contagem) nos list items — _o grosso do ticket_

Hoje o front exibe `—`: os list items de **Colaborador**, **Fornecedor** e **ACT** não trazem a
contagem de contratos/aditivos que referenciam aquele parceiro **como contratado**.

- Cada list item passa a expor `contractsCount` (e, se o front quiser, `amendmentsCount`).
- **Cross-módulo (ADR-0006/0014):** a contagem é dado do módulo **Contratos**. Partners **não** importa
  `contracts/domain`/`application` — consome via `contracts/public-api`.
- ⚠️ **Achado:** o contrato referencia o contratado por `{ contractorType, contractorId }` (bloco
  `contractor`); falta a **consulta inversa** (quantos contratos/aditivos apontam para um `contractorId`).
  → **Abordagem (painel 2026-06-15): read-model materializado via outbox (ADR-0022)** — projeção de
  contagem por `contractorId` mantida por eventos `ContractCreated`/`AmendmentHomologated` que `contracts`
  publica; a grid de Parceiros lê a projeção **local** (sem chamar `contracts` em tempo de request, sem
  ciclo de dependência). **Não** criar read port síncrono `partners → contracts`.

### R2 — Filtro **"Status de contrato"** no grid de Fornecedor

`list-suppliers.ts` não tem esse filtro. Depende do **mesmo** vínculo fornecedor↔contrato do R1
(reusa o read port cross-módulo). Implementar junto com R1.

### R3 — Filtro **Programa** no grid de Colaborador — _BLOQUEADO_

⚠️ **Achado:** o agregado `Collaborator` **não tem vínculo com programa** no domínio (grep vazio em
`domain/collaborator/`). O filtro **não é só de borda** — exige **modelar o vínculo** colaborador↔programa
antes (coluna + referência por ID ao módulo `programs`, ADR-0014). **Decidir com P.O.** se entra agora
(abre sub-ticket de modelagem) ou fica adiado. Sem o vínculo, o filtro permanece gated no front.

## 🚫 Fora de escopo / adiado

- **Idade** (faixa etária) no colaborador — **adiado por decisão** (`list-collaborators.ts:32`:
  "age adiado: depende de data de referência"). **Não reabrir** aqui.
- Implementar/alterar o módulo `programs` ou `contracts` além do read port de contagem.

## Critérios de Aceitação

1. **R1**: os list items de Colaborador, Fornecedor e ACT expõem `contractsCount` (e `amendmentsCount`)
   reais, obtidos por **batch** via `contracts/public-api` (sem N+1, sem importar `contracts/domain`).
2. **R2**: o filtro "Status de contrato" filtra a lista de Fornecedores de fato.
3. **R3**: o filtro Programa do Colaborador filtra de fato **OU** fica registrado como bloqueado com o
   sub-ticket de modelagem do vínculo colaborador↔programa aberto.

## Riscos / notas técnicas

- **N+1:** contar por parceiro numa página paginada (5–25 itens) deve ser **um** SELECT agregado com
  `WHERE contractor_id IN (...)` `GROUP BY contractor_id` — não uma query por linha.
- **Read port novo** no `contracts/public-api`: este é o item de maior valor e a real dependência
  arquitetural. Tudo o mais (R2, e a borda do R1) pendura nele.
- **Aditivos:** confirmar com o front se a coluna mostra contratos, aditivos ou os dois.
