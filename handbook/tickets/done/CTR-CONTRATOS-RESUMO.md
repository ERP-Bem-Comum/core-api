# Resumo — Contratos (front v2) → Core-API

> Handoff **consolidado** da revisão completa do módulo de **Contratos** (grid, inclusão, detalhe,
> aditivos, distrato) na web-app v2. Verificado em tela (`https://app.localhost`) contra `core-api@dev`
> em 2026-06-09. Cada item tem um ticket detalhado nesta pasta (`CTR-*`). Texto corrido — pronto para
> alinhamento com o tech lead.

---

## 1. O que foi entregue no FRONT (sem depender de backend)

- **Grid**: listagem destravada (correção do schema da paginação), badges de TIPO/STATUS sofisticadas,
  cores por tipo de parceiro (Fornecedor=azul, Colaborador=amarelo, Financiador=verde, ACT=laranja),
  número padronizado `CT/OS 0001/2026`, fontes Nunito/Inter, alinhamento de colunas, scrollbar clara,
  menu de ações exclusivo, e ações **Excluir** (modal) + **Histórico de Pagamento / Termo de Quitação**
  (geram PDF padronizado via `window.print`).
- **Inclusão**: dropdown de contratado com avatar colorido por tipo + badge ao selecionar; topbar
  compacta; títulos de seção padronizados.
- **Detalhe**: número mascarado, campos reordenados, **edição inline do Contato** (PATCH), aside
  refinado (títulos, Composição em mono, timeline com nós coloridos por tipo de aditivo), documentos
  com data de homologação e **paginação (>5 aditivos)**, preview de PDF mais largo.
- **Aditivos**: fluxo unificado (sem arquivo → Pendente; com documento + assinatura → cria e homologa
  no mesmo save; campos interdependentes), modal de leitura, modais refinados.

### Correções de borda feitas no FRONT (registro, sem ação de backend)
- **Listagem do grid voltou a funcionar**: o BFF exigia `meta {page,total,limit}`, mas o core-api
  devolve `{currentPage,itemsPerPage,totalItems,totalPages}` → o `safeParse` falhava e a lista virava
  erro (grid vazio com 13 contratos no banco). Schema passou a aceitar ambos os shapes + normaliza.
- **Preview de PDF (CSP)**: o `<iframe src=blob:>` era bloqueado pelo `default-src 'self'`. Liberado
  `frame-src 'self' blob:` (ADR-0006 atualizado). Preview e download passaram a funcionar.
- **Contato no create**: contornado com **create + PATCH** automático (ver pendência abaixo).

---

## 2. O que o BACKEND precisa fazer (consolidado)

### 2.1. CTR-NUMBER-PROGRAM — Numeração + classificação + metadados  ·  🔴 Alta
O `createContractBodySchema` aceita só `mode, sequentialNumber, title, objective, originalValueCents,
periodStart, periodEnd, contractor`. Consequências:
- **Numeração não é sequencial** — o front gera um `sequentialNumber` **aleatório** no create porque o
  campo é obrigatório. Pedido: o backend gerar/garantir numeração **sequencial por ano**.
- **Classificação CT/OS não é persistida nem retornada** → o número aparece sempre como **CT**.
- **Programa, Plano Orçamentário, Categorização e Centro de Custo não são persistidos nem retornados**
  → aparecem como "—" no grid e no detalhe.

Pedido: persistir e **retornar** (list-item + detalhe) `classification` (CT/OS), `programId`/`program`,
`budgetPlanId`/`budgetPlan`, `categorizacao`, `centroDeCusto`; e gerar a numeração sequencial.

### 2.2. CTR-DELETE-CANCEL — Excluir/cancelar Pendentes  ·  🟧 Média
- `DELETE /contracts/:id` é **recusado por design** (405 `contract-delete-forbidden`). Precisamos
  **descartar contrato que nunca vigorou** (status `Pending`): soft-delete (`Cancelled`) ou `DELETE`
  restrito a Pending; a lista deixa de retorná-lo. Permissão `contract:write`.
- **Aditivo não tem rota de exclusão** (só create/homologate/documents). Precisamos **excluir aditivo
  Pendente** (ex.: `DELETE /contracts/:id/amendments/:amendmentId`), restrito a Pendente.

No front, ambas as ações "Excluir" abrem **modal de confirmação** com o **Confirmar desabilitado**
(aguardando estas rotas).

### 2.3. CTR-HTTP-DISTRATO-DOCUMENTO — Distrato rico  ·  🟧 Média
`POST /contracts/:id/end` aceita só `{ kind }` e usa `endedAt = now`. Precisamos que o distrato
(`Terminate`) receba **documento assinado** (categoria nova, ex.: `signed_termination`), **data efetiva**
(não-futura) e **motivo**. Ideal: um **`kind` próprio de distrato** — hoje escopo/outro/distrato
colapsam em `Misc` e o subtipo se perde na releitura (o front usa uma gambiarra de marcador na descrição).

### 2.4. CTR-HTTP-DOCUMENT-CONTENT — Conteúdo do documento  ·  ✅ aparentemente resolvido
A rota de conteúdo (`GET /contracts/:id/documents/:documentId/content`) está fiada e o **preview/download
funcionam** (após a correção de CSP no front). O detalhe **associa documento ↔ aditivo** (parentType
`Amendment` + parentId) — confirmado em tela. **Validar do lado do backend** se está tudo coberto.

### 2.5. Pendências menores
- **Contato no create**: o `createContractBodySchema` **não aceita** `email`/`telephone`/`observations`
  (só persistem via `PATCH`). Contornado no front com **create + PATCH** automático. Se o backend
  aceitar contato no create, removemos o workaround.
- **`signedAt` por aditivo**: o aditivo só expõe `createdAt`; não há data de assinatura própria. O front
  usa o `uploadedAt` do documento como **data de homologação** na coluna "Assinatura".
- **Numeração sequencial do aditivo**: hoje o front deriva `AD NN-XXXX/ANO` por ordem de criação.
- **Permissão `program:*` no seed de DEV**: a atualização do `dev` trouxe o módulo **Gestão de Programas**
  (`/api/v1/programs`), mas o `AUTH_SEED_JSON` não concede `program:read`/`program:write` ao admin →
  **403**. Incluir no seed (e idealmente torná-lo idempotente — hoje re-subir exige `down -v`).

---

## 3. Prioridade sugerida
1. **CTR-NUMBER-PROGRAM** (destrava numeração real + metadados no grid/detalhe).
2. **CTR-DELETE-CANCEL** (exclusão de Pendentes — contrato e aditivo).
3. **CTR-HTTP-DISTRATO-DOCUMENTO** (distrato rico).
4. Menores (contato no create, `program:*` no seed) conforme a necessidade do próximo módulo.
