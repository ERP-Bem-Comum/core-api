# TDD — Feature pendente: Distrato rico (CTR-HTTP-DISTRATO-DOCUMENTO)

> **Tipo:** feature pendente de backend. **DEVE REPROVAR** até `POST /contracts/:id/end` ser enriquecido.
> Fail-first: o vermelho dirige a implementação (W0 RED do ticket CTR-HTTP-DISTRATO-DOCUMENTO).
> **Estado atual:** `endContractBodySchema = { kind: 'Expire'|'Terminate' }` (schemas.ts:171); `endedAt = now`.
> **Seed/tokens:** `contractsOperatorToken` (contract:read+write), `readerToken` (contract:read). Contrato-alvo
> em estado Active criado no setup (encadear `POST /contracts` → ativar, conforme a coleção contracts).

## DIST-1 — distrato com documento + data efetiva + motivo → 200 Terminated

- Pré: contrato Active; PDF assinado (magic bytes `25 50 44 46` = `%PDF`, ≤20 MiB).
- Forma esperada (a definir pelo backend — §3 do binding-map): upload `categoria=signed_termination` + `POST /contracts/:id/end { kind:'Terminate', terminatedAt, reason }`.
- Asserções: status `200`; `contractDetail.status === 'Terminated'`.
- **Hoje: REPROVA** — o body não aceita `terminatedAt`/`reason` (schema só `kind`).

## DIST-2 — endedAt = data efetiva informada (não now)

- Distratar com `terminatedAt = '2026-06-01'` (passada).
- Asserções: `status === 'Terminated'`; o campo de encerramento (`endedAt`/fim de vigência) `=== '2026-06-01'`.
- **Hoje: REPROVA** — `endedAt` é o clock now.

## DIST-3 — documento de distrato vinculado e visível

- Após distrato com upload, `GET /contracts/:id`.
- Asserções: existe documento `categoria === 'signed_termination'` vinculado ao contrato no detalhe/timeline.
- **Hoje: REPROVA** — não há categoria/vínculo de documento de distrato.

## DIST-4 — distrato sem documento assinado → 422 terminate-no-signed-document

- `POST /contracts/:id/end { kind:'Terminate', terminatedAt, reason }` SEM upload prévio.
- Asserções: `status 422`; `error.code === 'terminate-no-signed-document'`.
- **Hoje: REPROVA** — endpoint aceita sem documento e retorna 200.

## DIST-5 — data efetiva futura → 422 terminate-invalid-date

- `terminatedAt` no futuro.
- Asserções: `status 422`; `error.code === 'terminate-invalid-date'`.
- **Hoje: REPROVA** — não há validação de data (campo inexistente).

## DIST-6 — distrato exige contract:write → 403

- `readerToken` (sem contract:write) tenta distratar.
- Asserções: `status 403`.
- **Já PASSA hoje** (a rota já exige `authorize(contract:write)`) — incluído como guarda de regressão do fix.

## Critério de fechamento

Após CTR-HTTP-DISTRATO-DOCUMENTO: DIST-1..5 passam (body aceita terminatedAt+reason; upload signed_termination;
validações 422; endedAt = data informada). DIST-6 permanece verde. Gate W3 + e2e Bruno verdes.
