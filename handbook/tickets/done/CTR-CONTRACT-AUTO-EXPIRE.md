# Request — CTR-CONTRACT-AUTO-EXPIRE

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: contrato com vigência encerrada permanece **Em Andamento (Active)** indefinidamente.
> **Confirmado em código** (2026-06-10). Caso observado: **CT 0776/2026**, `currentPeriod.end = 2026-06-10`,
> retornado como `status: "Active"` no dia 10/06 (e seguiria Active depois).

## Título

Operacionalizar a expiração automática do contrato (Active → Expired) ao fim da vigência

## Size

M (sweep agendado) — ou S se for derivação por data na leitura (mas ver trade-offs)

## Problema (confirmado em código)

A transição `Active → Expired` **existe** no domínio, mas **nada a dispara automaticamente**:

| Fato | Evidência |
| --- | --- |
| `expire` existe e emite `ContractExpired` | `domain/contract/contract.ts:239` (op) · `:267` (evento `kind:'Expired'`) |
| **Único** gatilho é manual | `application/use-cases/end-contract.ts:77` → `Contract.expire(active, at)`, via `POST /contracts/:id/end {kind:'Expire'}` |
| **Sem** cron/sweep/worker de varredura | grep vazio por `sweep`/`expir*` em `worker/`, `server.ts`, use cases |
| **Sem** derivação de status por data na leitura | `GET /contracts` e `/contracts/:id` devolvem o `status` **persistido** (`contract-dto.ts`), não recalculado |

**Resultado:** depois que a data-fim passa, o contrato continua `Active` até alguém chamar o `/end`
manualmente. É o comportamento relatado.

## Borda da data-fim (⚠️ decisão de P.O.)

A guarda atual é `if (PlainDate.isBefore(at, currentPeriod.end)) → contract-cannot-expire-yet`
(`contract.ts:251`). Ou seja, **permite expirar quando `at >= end`** — inclusive **no próprio dia** da
data-fim. Convenção do P.O.: "**válido até o fim do último dia**" → finalizar só em **D+1** (`at > end`).

→ Decidir se o D+1 vale:

- **(a)** universalmente na guarda do domínio (`isBefore(at,end)` → `!isAfter(at,end)`), afetando também
  o `/end` manual; **ou**
- **(b)** só no **cutoff do sweep** (varre `end < hoje`, mantendo a guarda do domínio como está para o
  fluxo manual). Recomenda-se (b) para não bloquear expiração manual no mesmo dia, se isso for desejável.

## Abordagens (escolher 1)

### Opção A — Sweep agendado (RECOMENDADA)

Job periódico que busca contratos `Active` com `currentPeriod.end < cutoff` (cutoff = ontem, p/ D+1) e
aplica `expire` em lote (reusando a transição do domínio → **persiste `Expired` + emite `ContractExpired`**
no outbox, consistente com o resto do sistema).

- **Prós:** estado real no banco; evento dispara consumidores cross-módulo (ADR-0015); leitura trivial.
- **Contras:** precisa de agendamento (loop no worker de outbox já existente em `worker/run.ts`, ou cron).
- **Onde:** novo use case `expire-due-contracts` (batch) + um tick no worker (ou job dedicado). Query:
  `WHERE status='Active' AND current_period_kind='Fixed' AND current_period_end < :cutoff`.

### Opção B — Status derivado por data na leitura

`GET /contracts` e `/contracts/:id` recomputam `Expired` quando `end < cutoff`, sem mutar o banco.

- **Prós:** simples, sem infra de agendamento.
- **Contras:** **estado divergente** — o banco continua `Active`, o evento `ContractExpired` **nunca
  dispara**, e operações que guardam por status (ex.: criar aditivo) ainda tratam o contrato como Active.
  Inconsistência entre o que a API "mostra" e o que o domínio "é". **Não recomendada** isoladamente.

## Critérios de Aceitação

1. Um contrato `Active` cujo fim de vigência passou (respeitando o D+1 decidido) passa a `Expired`
   **sem ação manual** — refletido em `GET /contracts` e `/contracts/:id`.
2. A transição reusa `Contract.expire` (emite `ContractExpired`; popula `endedAt`) — não duplica regra.
3. `Indefinite` (sem `end`) nunca expira; `Pending`/`Terminated`/`Cancelled` não são afetados.
4. O caso **CT 0776/2026** (`end = 2026-06-10`) fica `Expired` a partir de 2026-06-11 (se D+1).

## Fora de escopo

- Front: **nenhuma mudança** — ele reflete fielmente o status do backend; assim que a API devolver
  `Expired`, a UI atualiza sozinha.
- Alterar o fluxo manual de distrato (`Terminate`) — este card é só sobre **expiração** (`Expire`).

## Notas

- O worker de outbox (`src/modules/contracts/worker/run.ts`, ADR-0015) já roda em loop — candidato natural
  a hospedar o tick do sweep (Opção A) sem novo processo.
- `expire` rejeita `Indefinite` (`contract.ts:246`) e exige `at >= end` (hoje) — alinhar o cutoff do sweep
  ao D+1 sem quebrar essa invariante.
