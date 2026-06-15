# Handoff Front → Core-API — Contratos

> Índice consolidado das pendências de backend e dos achados resolvidos no front durante a **validação
> em tela** do módulo Contratos (web-app v2). Verificado contra `core-api@dev` em 2026-06-09.
> Cada item de backend tem um ticket no padrão `000-request.md` nesta pasta.
>
> 📄 **Resumo único pro tech lead (texto corrido):** [CTR-CONTRATOS-RESUMO](./CTR-CONTRATOS-RESUMO.md).

## 🟥 Pendências de BACKEND (precisam de ação no core-api)

| Ticket | Tema | Resumo | Bloqueia no front |
| --- | --- | --- | --- |
| [CTR-CONTRACT-AUTO-EXPIRE](./CTR-CONTRACT-AUTO-EXPIRE.md) | Expiração automática | Contrato com vigência encerrada continua **Active** para sempre. `Contract.expire` existe mas só é disparado **manualmente** (`POST /contracts/:id/end {Expire}`) — sem cron/sweep nem status derivado por data. Operacionalizar (sweep agendado recomendado) + alinhar borda D+1. Caso: CT 0776/2026. | Status nunca vira **Finalizado** sozinho |

> **✅ Entregues nesta rodada** (movidos para [`../done/`](../done/)): `CTR-CONTRACT-METADATA-E-ADITIVOS`
> (G1 — colunas `classification` CT/OS + `program_id`/`budget_plan_id`/`categorizacao`/`centro_de_custo`,
> persistidas e expostas no DTO; as referências a Financeiro/Orçamento ficam para quando esses BCs
> existirem), `CTR-HTTP-DISTRATO-DOCUMENTO` (+ binding-map), `CTR-HTTP-DOCUMENT-CONTENT`,
> `CTR-NUMBER-PROGRAM` (numeração CT/OS sequencial + classificação + bloco programa),
> `CTR-HTTP-CANCEL-PENDING` (cancelar/soft-delete de pendente — supersede o antigo `CTR-DELETE-CANCEL`)
> e os gaps de aditivo `signedAt` + numeração (G2/G3 via `CTR-AMENDMENT-SIGNEDAT-AND-NUMBER`).

## 🟩 Achados RESOLVIDOS no FRONT (sem ação de backend — registro)

| Achado                                                       | Causa                                                                                             | Correção (front)                                                                                                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aditivo não era criado** (qualquer tipo)                   | `createAmendment`/`update` mandavam `Content-Type` duplicado → core-api **415** → erro genérico   | Removido o header redundante (o `resultFetch` já injeta) — alinhado ao padrão de `create`/`activate`                                                                  |
| **Aditivo de valor SUPRESSÃO falhava**                       | Front mandava `kind: Addition` + valor **negativo** → core-api **`money-negative-value` (422)**   | Sinal decide o kind: negativo→`Suppression` (valor absoluto), positivo→`Addition`. Na leitura, `Suppression`→valor negativo (convenção de sinal). Exibição com "− R$" |
| **Descrição/valor inválidos viravam "erro inesperado"**      | `AmendmentDescriptionRequired` / `AmendmentImpactValueZero` / `money-negative-value` não mapeados | UI exige descrição (e valor > 0); slugs mapeados → `invalid-value`                                                                                                    |
| **Datas 1 dia atrás** (vigência/fim)                         | `YYYY-MM-DD` vira meia-noite UTC → recua em BRT                                                   | Formatação em `timeZone: 'UTC'`                                                                                                                                       |
| **Grid: coluna Aditivos sempre "—"** + vigência não estendia | Lista não propagava `children`/`currentPeriod`                                                    | BFF `list` enriquece itens com `children`, `currentPeriod`, `currentValue`                                                                                            |

## ℹ️ Notas de modelagem (para o tech lead validar)

- **Distrato** é transição de ciclo de vida (`/end`, Terminate), **não** um aditivo. No front, por ora, o
  tipo "Distrato" vive na modal de aditivo (UI/coleta de campos pronta) — a religação correta é via `/end`.
- **Escopo / Outro / Distrato** todos mapeiam para `Misc` no backend → ao reler, perde-se o subtipo
  (aparecem como "Outro"). Se o subtipo importar no backend, precisaria de `kind` próprio ou um campo.

---

# Handoff Front → Core-API — Parceiros

> Pendências de backend levantadas na **adequação ao legado** dos submódulos de Parceiros
> (Colaboradores, Fornecedores, ACTs, Financiadores + Estados/Municípios) — grids, forms e detalhes.
> Verificado em 2026-06-09. **Visão geral consolidada (o que foi feito + o que falta):**
> [PAR-PARCEIROS-RESUMO](./PAR-PARCEIROS-RESUMO.md).

## 🟥 Pendências de BACKEND (core-api)

| Ticket                                                    | Tema                                   | Resumo                                                                                                                                                                                                                                                                                                                                   | Bloqueia no front           |
| --------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| [PAR-GRID-CONTRACTS-COUNT](./PAR-GRID-CONTRACTS-COUNT.md) | Grids: contagem + filtros cross-módulo | **Resíduo** de `PAR-COLLABORATOR-GRID-GAPS` + `PAR-GRID-FILTROS-EXPORT` (≈70% já entregue). Falta: coluna **Contratos/Aditivos** (contagem cross-módulo — exige **read port novo** em `contracts/public-api`) + filtro "Status de contrato" (Fornecedor) + Programa (Colaborador — **bloqueado**: sem vínculo no domínio). Idade adiada. | Coluna `—`; 2 filtros gated |

> **✅ Entregues nesta rodada** (movidos para [`../done/`](../done/)): `PAR-ACT-ACORDO` (ACT → Acordo de
> Cooperação Técnica — agregado/persistência/HTTP/export reescritos), `PAR-SUPPLIER-AVALIACAO`
> (serviceRating + ratingComment) e `PAR-GEO-ADDED-MUNICIPALITIES` (municípios parceiros de todos os estados).
>
> Os cards `PAR-COLLABORATOR-GRID-GAPS` e `PAR-GRID-FILTROS-EXPORT` foram **consolidados** em
> `PAR-GRID-CONTRACTS-COUNT` (só o resíduo real, após verificação em código 2026-06-10).

## 🟩 Achados RESOLVIDOS / em aberto no FRONT (sem ação de backend obrigatória — registro)

| Achado                                                                                            | Causa                                                                                                                                                                                                           | Status                                                                                                                                     |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Salvar/Inativar/Reativar** dos Parceiros mostram "erro inesperado" embora **gravem no backend** | O core-api responde **`200` sem corpo** em PUT/deactivate/reactivate; o BFF `resultFetch` faz `response.json()` direto → estoura → mapeia p/ `'server'`. (PUT direto no core-api = 200 + persiste, confirmado.) | **Fix no FRONT** (tratar 2xx sem corpo como `ok(undefined)`, igual ao 204) — pendente. _Opcional no backend: padronizar `204 No Content`._ |
| Máscaras CPF/CNPJ/telefone                                                                        | —                                                                                                                                                                                                               | ✅ feito no front (átomo `Input` com `mask`)                                                                                               |
| Grids/forms/detalhes alinhados ao legado                                                          | —                                                                                                                                                                                                               | ✅ feito no front                                                                                                                          |

## ℹ️ Notas de modelagem (tech lead + P.O.)

- **ACT**: decisão CPF→CNPJ + migração dos registros + numeração do instrumento (entregue em `PAR-ACT-ACORDO`).
- **`registration` (pré/completo)** é conceito de **Colaborador** — removido do detalhe de ACT no front.
- **Enums do cadastro completo de Colaborador** (gênero/raça/categoria alimentar/escolaridade) ainda são
  texto livre no front por falta de listas canônicas — viram `<select>` quando o backend/legado as definir.

---

# Handoff Front → Core-API — Gestão de Usuários

> Pendências da validação em tela do módulo **Gestão de Usuários** (slices Usuários + Minha Conta),
> web-app v2. Verificado contra `core-api@dev` em 2026-06-09.
>
> 📄 **Resumo único pro tech lead (texto corrido):** [USR-USUARIOS-RESUMO](./USR-USUARIOS-RESUMO.md).

## 🟥 Pendências de BACKEND (core-api)

> **✅ Entregue:** [USR-SEED-PERMISSIONS](../done/USR-SEED-PERMISSIONS.md) — preset canônico
> `adminDevPermissions` (derivado do catálogo, inclui `user:*` + `program:*`) + helper `buildAdminDevSeedUser`
> em `src/modules/auth/adapters/http/dev-seed.ts`. Quickstart 005 atualizado. (closed-green 2026-06-10)

> **✅ Entregue:** [USR-ME-PROFILE-FIELDS](../done/USR-ME-PROFILE-FIELDS.md) — `PUT /api/v1/me` passa a
> aceitar **e-mail** (validação VO 422 + unicidade 409). **Decisão de produto:** CPF é **imutável** no
> autosserviço (só admin via `PUT /users/:id`) — front mantém CPF read-only, libera o e-mail. (closed-green
> 2026-06-10)

> **✅ Entregue:** [USR-ME-PHOTO](../done/USR-ME-PHOTO.md) — `PUT`/`DELETE /api/v1/me/photo` (autosserviço,
> self por construção, sem `user:update`), espelhando as rotas admin. Helper de upload extraído (DRY).
> (closed-green 2026-06-10). _Nota:_ foto no `POST /users` (create) segue fora de escopo — fluxo create → PUT.

> **✅ Entregue:** [USR-PASSWORD-POLICY](../done/USR-PASSWORD-POLICY.md) — política alinhada ao **OWASP
> 2025/NIST 800-63B** (decisão via `security-backend-expert`): **mínimo 8 → 12**, máx 128, **sem
> complexidade** (proposta do legado de máx 15 + complexidade **rejeitada**), blocklist mantida. Novo
> **`GET /api/v2/auth/password-policy`** (`{ minLength, maxLength }`, sem auth) p/ o front sincronizar o
> checklist — **o front segue o backend, não o contrário**. (closed-green 2026-06-10)

## ℹ️ Notas de modelagem (tech lead + P.O.)

- **"Aprovador em Massa"** = `massApprovalPermission`, **read-only** (derivado dos papéis no backend). Não é
  setável na criação nem na edição → exibido somente-leitura (gated no form de inclusão).
- **Troca de senha** (`POST /api/v2/auth/change-password`) **revoga todas as sessões** → o front faz logout
  automático + redirect `/login` ao concluir (204).
