# `handbook/tickets/` — arquivo de um handoff encerrado

> **Isto não é backlog.** É o registro do handoff **front (web-app v2) → core-api** feito entre junho e
> julho de 2026, durante a validação em tela dos módulos Contratos, Parceiros e Usuários. Trabalho novo
> não abre card aqui: vai para [issues do GitHub](https://github.com/ERP-Bem-Comum/core-api/issues),
> pelo canal do [ADR-0040](../architecture/adr/0040-agent-findings-as-github-issues.md).

## Por que encerrado

O diretório tinha `todo/` e `done/`. Em 2026-08-07, a triagem confrontou **card a card** o que o `todo/`
pedia contra o contrato real da borda HTTP e o código em `src/` — e **os 14 cards descreviam trabalho já
concluído**. O `todo/` era uma fotografia de 2026-06-09 que o repositório deixou para trás:

| O que o card pedia | Onde está hoje |
| :--- | :--- |
| Expiração automática de contrato (3 cards para o mesmo tema) | `src/jobs/contracts/sweeper/` — issues #39 e #50 fechadas |
| Território (UF/município) no colaborador | `territory`, `municipality`, `uf` no DTO |
| Conta bancária em colaborador e financiador | `bankAccount`, `account`, `pixKey` no DTO |
| Campos novos de perfil | `foodCategory`, `education`, `biography`, `maritalStatus`, `isPwd`… |
| Export de histórico em CSV | `GET /collaborators/:id/export?type=history` |
| Contagem de contratos na grid | `contractCount` + worker de projeção |
| Aditivos de contrato | `domain/amendment/` + `amendments` na borda |
| Aprovador em massa definível | `massApprovalPermission` em `users-schemas.ts` |
| Pré-cadastro → autocadastro por link tokenizado | `autocadastroQuerySchema` com token opaco, rota pública e e-mail |

> ⚠️ **Dois desses vereditos quase saíram errados**, e o motivo vale para quem repetir a triagem: a busca
> foi feita por nomes **inventados** (`massApprover`, `preRegistration`) em vez dos nomes que o próprio
> card declarava (`massApprovalPermission`, `autocadastro`), e uma delas foi truncada em 3 resultados
> quando havia 13. Buscar pelo termo do card, e ler a saída inteira antes de concluir ausência.

## O que sobrou vivo

Um único tema segue aberto, e **não** por causa destes cards: a issue
[#426](https://github.com/ERP-Bem-Comum/core-api/issues/426) trata de contrato com vigência encerrada que
permanece `Pendente` — variante que nenhum dos três cards de auto-expire cobria.

## Como ler o que está aqui

Cada arquivo em [`done/`](./done/) segue o padrão `000-request.md` do handoff: contexto, pedido ao
backend, critérios de aceite e o que bloqueava no front. São úteis como **registro de origem** — por que
um campo existe, o que a área pediu, qual comportamento do legado se quis reproduzir.

Os três `*-RESUMO.md` são os índices que o front mantinha por módulo (Contratos, Parceiros, Usuários), e
os links entre cards continuam válidos: a movimentação preservou os caminhos relativos.
