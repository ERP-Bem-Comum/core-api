# Handoff Front → Core-API — Contratos

> Índice consolidado das pendências de backend e dos achados resolvidos no front durante a **validação
> em tela** do módulo Contratos (web-app v2). Verificado contra `core-api@dev` em 2026-06-09.
> Cada item de backend tem um ticket no padrão `000-request.md` nesta pasta.
>
> 📄 **Resumo único pro tech lead (texto corrido):** [CTR-CONTRATOS-RESUMO](./CTR-CONTRATOS-RESUMO.md).

## 🟥 Pendências de BACKEND (precisam de ação no core-api)

| Ticket | Tema | Resumo | Bloqueia no front |
|---|---|---|---|
| [CTR-CONTRACT-METADATA-E-ADITIVOS](./CTR-CONTRACT-METADATA-E-ADITIVOS.md) | Metadados (G1 parcial) | Restam **categoria**, **centro de custo** e **plano orçamentário** no contrato (referências a outros BCs). **Programa** e **classificação CT/OS** já entregues via `CTR-NUMBER-PROGRAM`. | Detalhe exibe `—` nessas 3 dimensões |

> **✅ Entregues nesta rodada** (movidos para [`../done/`](../done/)): `CTR-HTTP-DISTRATO-DOCUMENTO`
> (+ binding-map), `CTR-HTTP-DOCUMENT-CONTENT`, `CTR-NUMBER-PROGRAM` (numeração CT/OS sequencial +
> classificação + bloco programa), `CTR-HTTP-CANCEL-PENDING` (cancelar/soft-delete de pendente —
> supersede o antigo `CTR-DELETE-CANCEL`) e os gaps de aditivo `signedAt` + numeração (G2/G3 via
> `CTR-AMENDMENT-SIGNEDAT-AND-NUMBER`).

## 🟩 Achados RESOLVIDOS no FRONT (sem ação de backend — registro)

| Achado | Causa | Correção (front) |
|---|---|---|
| **Aditivo não era criado** (qualquer tipo) | `createAmendment`/`update` mandavam `Content-Type` duplicado → core-api **415** → erro genérico | Removido o header redundante (o `resultFetch` já injeta) — alinhado ao padrão de `create`/`activate` |
| **Aditivo de valor SUPRESSÃO falhava** | Front mandava `kind: Addition` + valor **negativo** → core-api **`money-negative-value` (422)** | Sinal decide o kind: negativo→`Suppression` (valor absoluto), positivo→`Addition`. Na leitura, `Suppression`→valor negativo (convenção de sinal). Exibição com "− R$" |
| **Descrição/valor inválidos viravam "erro inesperado"** | `AmendmentDescriptionRequired` / `AmendmentImpactValueZero` / `money-negative-value` não mapeados | UI exige descrição (e valor > 0); slugs mapeados → `invalid-value` |
| **Datas 1 dia atrás** (vigência/fim) | `YYYY-MM-DD` vira meia-noite UTC → recua em BRT | Formatação em `timeZone: 'UTC'` |
| **Grid: coluna Aditivos sempre "—"** + vigência não estendia | Lista não propagava `children`/`currentPeriod` | BFF `list` enriquece itens com `children`, `currentPeriod`, `currentValue` |

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

| Ticket | Tema | Resumo | Bloqueia no front |
|---|---|---|---|
| [PAR-ACT-ACORDO](./PAR-ACT-ACORDO.md) | **ACT → Acordo** | Reformular o agregado ACT de pessoa-física para **Acordo de Cooperação Técnica** (Nº instrumento, vigência, instituição parceira c/ CNPJ/razão social/nome fantasia, repasse + banco/PIX; remover CPF/vínculo/início). | **Criar ACT não salva**; campos novos são placeholders gated; grid Nº/Parceiro = `—` |
| [PAR-GRID-FILTROS-EXPORT](./PAR-GRID-FILTROS-EXPORT.md) | Filtros / contagem / export | Filtros (Status de contrato; ACT Tipo/Área), coluna **Contratos/Aditivos** (contagem) e **export CSV**. | Filtros gated; coluna `—`; botão Exportar sem wiring |
| [PAR-COLLABORATOR-GRID-GAPS](./PAR-COLLABORATOR-GRID-GAPS.md) | Colaborador: grid | Filtros do painel + coluna Contratos/Aditivos + import/export. | Filtros gated; coluna `—` |

> **✅ Entregues nesta rodada** (movidos para [`../done/`](../done/)): `PAR-SUPPLIER-AVALIACAO`
> (serviceRating + ratingComment) e `PAR-GEO-ADDED-MUNICIPALITIES` (municípios parceiros de todos os estados).

## 🟩 Achados RESOLVIDOS / em aberto no FRONT (sem ação de backend obrigatória — registro)

| Achado | Causa | Status |
|---|---|---|
| **Salvar/Inativar/Reativar** dos Parceiros mostram "erro inesperado" embora **gravem no backend** | O core-api responde **`200` sem corpo** em PUT/deactivate/reactivate; o BFF `resultFetch` faz `response.json()` direto → estoura → mapeia p/ `'server'`. (PUT direto no core-api = 200 + persiste, confirmado.) | **Fix no FRONT** (tratar 2xx sem corpo como `ok(undefined)`, igual ao 204) — pendente. *Opcional no backend: padronizar `204 No Content`.* |
| Máscaras CPF/CNPJ/telefone | — | ✅ feito no front (átomo `Input` com `mask`) |
| Grids/forms/detalhes alinhados ao legado | — | ✅ feito no front |

## ℹ️ Notas de modelagem (tech lead + P.O.)
- **ACT**: decisão CPF→CNPJ + migração dos registros + numeração do instrumento (ver ticket).
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

**[USR-SEED-PERMISSIONS](./USR-SEED-PERMISSIONS.md) — Seed: permissões.** O admin de dev está sem `user:*`
(e `program:*`), então o grid e as ações de Usuários retornam **403** (idem `/programs`). *Bloqueia no
front:* grid/detalhe de Usuários mostram 403 (a Minha Conta funciona, é `/me`).

**[USR-ME-PROFILE-FIELDS](./USR-ME-PROFILE-FIELDS.md) — Minha Conta: campos.** O `PUT /api/v1/me` só aceita
`name` + `telephone` (não cpf/email). *Bloqueia no front:* CPF e E-mail ficam **read-only** no modal
Editar Perfil.

**[USR-ME-PHOTO](./USR-ME-PHOTO.md) — Foto de perfil.** Não há `/api/v1/me/photo` (só `/users/:id/photo`,
admin) e o `POST /users` não recebe imagem. *Bloqueia no front:* "Alterar Imagem" e "Foto de Perfil"
ficam **gated** (avatar usa as iniciais).

**[USR-PASSWORD-POLICY](./USR-PASSWORD-POLICY.md) — Política de senha.** O checklist do design (máx 15 +
complexidade) é mais rígido que o backend (máx 128, sem complexidade, com blocklist). *Bloqueia no front:*
nada — validado no client; senha comum cai em `password-weak`.

## ℹ️ Notas de modelagem (tech lead + P.O.)
- **"Aprovador em Massa"** = `massApprovalPermission`, **read-only** (derivado dos papéis no backend). Não é
  setável na criação nem na edição → exibido somente-leitura (gated no form de inclusão).
- **Troca de senha** (`POST /api/v2/auth/change-password`) **revoga todas as sessões** → o front faz logout
  automático + redirect `/login` ao concluir (204).
