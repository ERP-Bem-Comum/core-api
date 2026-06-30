# Request — CTR-HTTP-DISTRATO-DOCUMENTO

> Handoff do **front (web-app v2)** para o **core-api**. Origem: validação em tela do fluxo de
> Distrato (módulo Contratos). Verificado contra `core-api@dev` em 2026-06-08.
> Testes de feature pendente: `specs/007-integration-test-suite/safety-net/{bdd,tdd}/pending-backend/distrato-documento.*`.

## Título
Distrato com documento assinado, data efetiva e motivo (enriquecer `POST /contracts/:id/end`)

## Size
M

## Contexto
O distrato **já existe** no core-api e funciona ponta-a-ponta — este ticket **não é para criá-lo**, e sim
para **enriquecê-lo** com o que o front precisa capturar na tela: **documento de distrato assinado**,
**data efetiva** e **motivo**. Hoje o endpoint de encerramento aceita apenas `kind`, sem nenhum desses dados.

## Estado atual (verificado em `core-api@dev`)
- **Endpoint:** `POST /contracts/:id/end` — body `{ kind: 'Expire' | 'Terminate' }` (`Terminate` = distrato).
  Auth: `requireAuth` + `authorize(contract:write)`. Resposta: `contractDetail` (200).
  - `src/modules/contracts/adapters/http/plugin.ts:397` (rota `/contracts/:id/end`)
  - `src/modules/contracts/adapters/http/schemas.ts:171` → `endContractBodySchema = z.object({ kind: z.enum(['Expire','Terminate']) })`
- **Domínio/aplicação:** `application/use-cases/end-contract.ts` (`EndContractKind = 'Expire' | 'Terminate'`),
  agregado `TerminatedContract`, `endedAt` definido pelo **clock (now)**.
- **Status:** `Terminated` → rótulo "Distratado". ADR-0023 (ciclo de vida 4 estados).

## Gap (o que falta)
O `POST /contracts/:id/end` com `kind: 'Terminate'` **não captura**:
1. **Documento de distrato assinado** (PDF) — análogo ao documento de ativação e à homologação de aditivo.
   Provável `categoria` nova: `signed_termination`.
2. **Data efetiva do distrato** — hoje `endedAt = now`. O operador precisa informar a data real (não-futura).
3. **Motivo/justificativa** (texto).

## Escopo (proposta)
- Estender o distrato (`kind: 'Terminate'`) para aceitar **documento assinado + data efetiva + motivo**.
  Duas formas (decisão do backend):
  - (a) enriquecer body de `/end` (`{ kind:'Terminate', terminatedAt, reason }`) + upload do documento
    (`POST /contracts/:id/documents?categoria=signed_termination`); **ou**
  - (b) endpoint dedicado de distrato (upload → efetiva), análogo à ativação.
- `endedAt` passa a ser a **data efetiva informada** (obrigatória, não-futura).
- Persistir o **motivo** e vincular o **documento** ao distrato (consultável no detalhe/timeline).
- Erros novos no envelope padrão `{ error: { code } }`: `terminate-invalid-date`,
  `terminate-no-signed-document`, `terminate-document-magic-bytes-mismatch`, `terminate-not-active`
  (ou reuso de `contract-not-active`).

## Fora de Escopo
- Mecanismo base de distrato (já existe). Reversão/cancelamento de distrato. Regras financeiras (módulo Financeiro).

## Critérios de Aceitação
1. O operador distrata um contrato **Em Andamento** anexando o **PDF assinado**, informando a **data efetiva**
   (obrigatória, não-futura) e um **motivo**.
2. Após o distrato, o contrato fica `Terminated` ("Distratado") com `endedAt` = **data efetiva informada** (não `now`).
3. O documento de distrato fica vinculado ao contrato e aparece no detalhe/timeline.
4. Distratar sem documento/data (quando exigidos) → **422** com `code` mapeável.
5. Distrato continua restrito a `contract:write` e a contratos em estado que o permita (ADR-0023).

## Referências
- ADR-0023 — `handbook/architecture/adr/0023-contract-lifecycle-pending-state.md`.
- Código: `src/modules/contracts/adapters/http/{plugin.ts,schemas.ts}`, `application/use-cases/end-contract.ts`.
- Binding-map do front: `CTR-HTTP-DISTRATO-DOCUMENTO.binding-map.md` (nesta pasta).
