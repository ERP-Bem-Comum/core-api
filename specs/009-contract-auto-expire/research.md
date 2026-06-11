# Phase 0 — Research: Expiração automática de contratos

Todas as decisões abaixo já vinham encaminhadas pelo ticket `CTR-CONTRACT-AUTO-EXPIRE.md` + Clarifications;
aqui ficam consolidadas no formato Decisão/Rationale/Alternativas.

## D1 — Sweep agendado vs. status derivado na leitura

- **Decisão**: **Sweep agendado** que persiste `Expired` e emite `ContractExpired`.
- **Rationale**: mantém o estado real no banco e dispara o evento (paridade com o encerramento manual,
  ADR-0015). Operações que guardam por status (ex.: criar aditivo) passam a ver o estado correto.
- **Alternativas**: _derivação por data só na leitura_ — rejeitada: gera **estado divergente** (banco
  segue `Active`, evento nunca dispara), e a UI mostraria algo diferente do que o domínio "é".

## D2 — Reuso da transição de domínio

- **Decisão**: reusar **`Contract.expire(active, at)`** (já existente, `domain/contract/contract.ts:239`),
  via um novo use case de aplicação que itera os elegíveis.
- **Rationale**: não duplica regra (V — domínio puro); `expire` já constrói `ExpiredContract`, popula
  `endedAt` e emite `ContractExpired`. O use case só orquestra (validar→fetch→transição→save).
- **Alternativas**: lógica nova de expiração no use case/adapter — rejeitada (duplicação + risco de
  divergência de invariante).

## D3 — Borda D+1 e fuso (Clarifications 2026-06-11)

- **Decisão**: elegível quando `current_period_end < hoje_BRT`, onde **hoje_BRT** = data-calendário no fuso
  de **Brasília (UTC-3 fixo, `-03:00`, sem DST desde 2019)**. Instantes seguem em UTC.
- **Rationale**: "válido até o fim do último dia" no horário de operação (Brasil). Offset fixo (Brasil
  aboliu DST em 2019) → conversão simples `now − 3h` e extrai a data UTC.
- **Escopo**: apenas a finalização **automática**. A guarda do `Contract.expire` (`at >= end`, UTC)
  permanece — o filtro de elegibilidade (BRT, `end < hoje_BRT`) é mais restritivo, então não conflita: só
  chamamos `expire` em contratos já elegíveis, e a guarda interna aceita. O fluxo **manual** `/end {Expire}`
  fica inalterado.
- **Alternativas**: corte em UTC — rejeitado: poderia finalizar ~3h cedo (percepção BRT). Mudar a guarda do
  domínio para `at > end` universal — rejeitado (alteraria o fluxo manual + testes).

## D4 — Onde hospedar o tick

- **Decisão**: no **worker de outbox existente** (`worker/run.ts`), via um agendador
  (`expire-scheduler.ts`) que chama o use case a cada `CONTRACTS_EXPIRE_SWEEP_MS` (default **3.600.000 ms =
  1 h**), com `AbortSignal` para shutdown limpo. O worker passa a wirar um `ContractRepository` Drizzle
  sobre o mesmo pool.
- **Rationale**: o worker já é um daemon com pool MySQL, loop e graceful shutdown — evita um novo processo/
  cron externo. Cadência horária é folgada para uma borda day-granular (latência ≤ 1 h; SC-005).
- **Alternativas**: cron do SO / job externo — mais infra; rota HTTP de disparo — fora de escopo (pode vir
  depois para ops).

## D5 — Query de elegibilidade

- **Decisão**: novo método `findExpirable(cutoff: PlainDate)` no port `ContractRepository` —
  `WHERE status='Active' AND current_period_kind='Fixed' AND current_period_end < :cutoff`.
- **Rationale**: 1 SELECT indexável por tick (sem N+1). InMemory replica com filtro.
- **Índice**: `(status, current_period_end)` melhora o SELECT; **opcional** (volume modesto) — decidir em
  tasks; se adotado, migration via `pnpm run db:generate`.

## D6 — Idempotência

- **Decisão**: idempotência por construção — após `expire`, o contrato deixa de ser `Active` e some do
  `findExpirable` no próximo tick; nenhum evento duplicado.
- **Rationale**: o próprio predicado de elegibilidade garante "no-op" na 2ª execução (SC-004).
