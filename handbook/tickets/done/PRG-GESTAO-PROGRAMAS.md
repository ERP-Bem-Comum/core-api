# Request — PRG-GESTAO-PROGRAMAS

> Handoff do **front (web-app legado)** para o **core-api**. Card de feature (kanban `doing/`).
> Origem: tela `/programas` (Next.js em produção), reconstruída por engenharia reversa.
> Em implementação nesta bateria (spec-kit completo + pipeline). Verificado em 2026-06-09.

## Título

Novo módulo `programs` — CRUD + ciclo de vida de Programa (backend)

## Size

L (Bounded Context novo)

## Contexto

A feature de **Gestão de Programas** existe hoje **apenas no frontend** (Next.js legado, `/programas`).
O core-api **não tem** o módulo — o front consome a API legada. Esta bateria entrega o backend
(domínio + persistência + borda HTTP) que serve aquela UI.

Documentação completa (spec-kit) em **`specs/008-gestao-programas/`**:
`spec.md` · `research.md` · `data-model.md` · `contracts/programs-http.md` · `tasks.md` (62 tarefas).
Research de origem: `handbook/research/feture_propose/gestao_programas/`.

## Estado atual (verificado)

- Não há `src/modules/programs/`. Programa é referenciado por `ProgramaID` no Financeiro
  (`handbook/domain_questions/financeiro/bounded-contexts/conciliacao.md:130`,
  `gestao-documentos.md:184`) — confirma que é um BC próprio, referenciado por ID.

## Gap (o que falta no backend)

Módulo `programs` (`prg_*`) expondo, sob **`/api/v1/programs`** (port legado — ADR-0033):

- `GET /programs` (paginado 5/10/25 + busca nome/sigla case-insensitive)
- `POST /programs` (criar — nome+sigla obrigatórios; sigla única; nasce ATIVO)
- `GET /programs/:id` (detalhe)
- `PUT /programs/:id` (editar — optimistic-lock por `version`)
- `POST /programs/:id/deactivate` · `POST /programs/:id/reactivate` (ciclo de vida)
- `POST /programs/:id/logo` (upload imagem ≤ 5 MB — S3/MinIO)

Identidade dupla: `id` UUID v4 (PK/contrato) + `program_number` sequencial interno (UNIQUE).

## Escopo

Ver `specs/008-gestao-programas/tasks.md`. Pipeline de implementação: ticket **`PRG-PROGRAMS-MODULE`**
em `.claude/.pipeline/` (W0→W3, size L). MVP = US1 (criar) + US2 (listar).

## Fora de Escopo

- Vínculo formal Programa↔Contrato/Orçamento (desativação não checa dependências na v1).
- Endpoint de auditoria dedicado (eventos vão ao `prg_outbox`).
- Reformulação de domínio que promoveria a borda a `/api/v2` (port legado fica em `/api/v1`).

## Critérios de Aceitação

Os 8 Success Criteria + 26 FR da `spec.md`. Em resumo:

1. Criar programa válido e vê-lo na listagem; sigla duplicada/campo faltando → rejeição com campo ofensor.
2. Busca por nome/sigla (substring, case-insensitive); paginação 5/10/25.
3. Transições de status válidas/inválidas corretas; desativação soft (preserva histórico).
4. optimistic-lock no `PUT`; toda operação exige auth + permissão (`program:read|write|deactivate`).
5. Escritas retornam o recurso no corpo (nunca 200 vazio — lição do handoff de Parceiros).

## Notas

- **Resposta-com-corpo**: `PUT`/`deactivate`/`reactivate` retornam o programa atualizado (200) — evita o
  bug "200 sem corpo" registrado no handoff de Parceiros (ver README deste kanban).
- Habilita futuramente o metadado **`programa`** do contrato (ver `CTR-CONTRACT-METADATA-E-ADITIVOS`),
  via referência `program_id` (cross-módulo por ID/evento — ADR-0014).
