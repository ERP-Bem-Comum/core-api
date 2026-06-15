# CTR-AUTO-EXPIRE-IMPROVEMENTS — Avaliação das melhorias do auto-expire

> **Card complementar** ao [`CTR-AUTO-EXPIRE`](./CTR-AUTO-EXPIRE.md). Reúne as propostas técnicas que
> estavam só no `CTR-CONTRACT-AUTO-EXPIRE` (criado em `da26d91`) e as submete a **avaliação por
> especialista** (2026-06-15) antes de decidir o que incorporar. Não é um ticket de execução — é a base
> de decisão para quando o auto-expire entrar na fila (hoje **adiado**: é `contracts`, e a fila ativa é
> `partners`).

## Resumo

| # | Melhoria proposta | Especialista | Veredito | Aplicar? |
| :--- | :--- | :--- | :--- | :--- |
| M1 | Sweep agendado (A) vs status derivado na leitura (B) | nodejs-runtime | A vale; **B não** | ✅ **Opção A** |
| M2 | Reusar o `outbox-worker` p/ o tick do sweep | nodejs-runtime | Não no loop; `setInterval` próprio ou job dedicado | 🟡 **refinado** |
| M3 | Query do sweep + índice composto | mysql-database | Índice composto + batch 1-a-1 | ✅ **sim** |
| M4 | Borda da data-fim (D+1) | **P.O. (15/06)** | **Confirmado: D+1, finaliza 00h do dia seguinte** | ✅ **decidido** |
| M5 | Emitir `ContractExpired` em lote no outbox | (grep) | Sem consumidor hoje; não afeta `financial` | ✅ **manter** |

## Decisão da P.O. (2026-06-15) — fonte de verdade do negócio

Consulta à P.O. (transcrita), que reforça e **fecha** as pendências de negócio:

1. **Vigência inclusiva → D+1.** "O último dia ainda conta como vigente **até a zero hora do dia seguinte**;
   o auto-expire deve alterar o status para **Finalizado**" — "ao final do último dia da vigência, **zero
   hora do dia seguinte**". (Resolve o **M4**.)
2. **Automático é mandatório (compliance).** "É padrão que a mudança de status seja **automática**, sem
   comando do usuário — ele pode esquecer e gerar **glosa financeira e de compliance**." Comando manual só
   se o cliente tiver setor de contratação dedicado (opcional/futuro). (Confirma a **Opção A** do M1.)
3. **Contrato "Em Andamento" é 100% operável até finalizar.** "Enquanto 'Em Andamento', pode inserir
   documentos e **aditivos — que podem inclusive afetar a vigência**." → o auto-expire considera a vigência
   **atual** (com aditivos homologados aplicados), **não** a original; e o contrato segue totalmente
   utilizável durante todo o último dia.
4. **Distrato (`Terminate`) interrompe de imediato — ≠ expiração.** "Tem o lance de interromper a vigência
   **antes** de acabar, que é o **DISTRATO**. Interrompe a vigência **de imediato**." Já modelado:
   `Terminate` carrega `terminatedAt` (data efetiva, validada não-futura) + `reason` (`end-contract.ts:40`,
   ticket `CTR-HTTP-DISTRATO-DOCUMENTO`), enquanto `Expire` usa o relógio. Confirma que a regra **D+1 é
   exclusiva do `Expire`**; endurecer a guarda do `expire` (M4, opção a) **não** afeta o distrato —
   encerrar antes do fim natural é **distrato** (caminho próprio, data própria, imediato), nunca expiração.

## M1 — Sweep agendado (A) vs status derivado (B) → **Opção A**

A transição `Contract.expire` existe (`contract.ts:239`) mas nada a dispara. Das duas vias:

- **Opção A (sweep):** job periódico aplica `expire` em lote → persiste `Expired` + emite `ContractExpired`
  (mesma transação, ADR-0015). **Recomendada.**
- **Opção B (derivado na leitura):** `GET` recomputa `Expired` sem mutar o banco. **Rejeitada** — bifurca a
  verdade (banco fica `Active`, evento nunca dispara, operações que guardam por status veem `Active`).

**Ressalva (nodejs-runtime):** o sweep precisa de `FOR UPDATE SKIP LOCKED` (ou `UPDATE` atômico filtrando
`status='Active'`) para evitar double-expire se houver mais de uma instância — mesmo padrão do
`outbox-worker.ts`. O tipo `ActiveContract` já barra re-expiração em compile time.

## M2 — Hospedar o tick do sweep → **refinado** (não no loop do outbox)

A proposta original ("pendurar no loop do `outbox-worker`") foi **rejeitada na forma proposta**: o loop do
outbox tem cadência de ~500ms (`run.ts` `pollMs`); o sweep é horário/diário. Embutir mistura
responsabilidades e cadências, e um pode atrasar o outro.

**Recomendação:** `setInterval` independente no **mesmo processo** (`run.ts`), compartilhando o
`controller.signal` de graceful shutdown já existente (`run.ts:41-44`) — cadência própria, `runLoop`
intacto. Alternativa mais limpa: job/cron dedicado (custo: infra extra, talvez prematuro na Fase 1).

## M3 — Query + índice do sweep → **sim**

- **Índice composto** `(status, current_period_kind, current_period_end)` — igualdades antes do range
  (Refman 8.4 §10.2.1.2). O índice atual `ctr_contracts_status_idx` (monocolunar, `mysql.ts:151`) deixa
  `kind`/`end` como filtro residual (`Using where`). Não é over-engineering: `status='Active'` perde
  seletividade com o tempo.
- **Batch:** `SELECT … LIMIT 100` (pré-fetch, sem lock) → loop **1-a-1** com `FOR UPDATE` + `Contract.expire`
  + outbox na mesma transação. **Nunca** `UPDATE` bruto (bypassa o domínio e o ADR-0015).
- **Cutoff:** `current_period_end` é `DATE` puro (`mysql.ts:76`); calcular o cutoff (D+1) na **timezone do
  negócio** (`America/Sao_Paulo`), nunca `NOW()` cru num servidor UTC.

## M4 — Borda da data-fim (D+1) → ✅ **DECIDIDO pela P.O. (15/06/2026)**

**Regra de negócio:** o último dia de vigência **conta inteiro** — o contrato permanece "Em Andamento" até
a **zero hora do dia seguinte**, quando o status muda para **"Finalizado"**. Ex.: vigência até 10/06 → "Em
Andamento" todo o dia 10 → "Finalizado" a partir de 11/06 00h.

**Implementação recomendada:** opção **(a) — guarda do domínio em D+1** (`expire` só quando `at > end`), e
não apenas o cutoff do sweep. "O último dia conta" é **invariante de negócio** do que significa expirar —
deve viver no domínio (regra única), não duplicada. Não há expiração legítima no próprio dia (encerrar
antes do fim = **distrato/`Terminate`**, não expiração). Qualquer via (automática ou `/end {kind:Expire}`)
passa a respeitar a mesma regra.

**Cadência:** como o status vira à 00h do dia seguinte, o sweep deve rodar na virada do dia (ex.: diário
pouco após a meia-noite) para o "Finalizado" aparecer no dia certo.

## M5 — `ContractExpired` em lote → **manter (sem impacto no `financial`)**

Grep (2026-06-15): **`ContractExpired` não tem consumidor algum hoje**, e o módulo `financial` **não
referencia eventos de `contracts`**. Logo, emitir o evento no sweep é consistência preventiva (ADR-0015) —
**não afeta o trabalho do Financeiro em paralelo**. Quando um consumidor existir, o evento já estará lá.

## Conclusão (para quando o auto-expire for priorizado)

Incorporar ao `CTR-AUTO-EXPIRE`: **Opção A** (sweep) com **índice composto** + **batch 1-a-1 com
FOR UPDATE/SKIP LOCKED + outbox**, hospedado num **`setInterval` próprio** (não no loop do outbox), sobre a
vigência **atual** (com aditivos). **D+1 decidido pela P.O.** — guarda do domínio em `at > end` (opção a);
status muda à 00h do dia seguinte; automático é mandatório (compliance). Sem impacto no `financial`.
Depois, **consolidar** os dois cards de auto-expire (`CTR-AUTO-EXPIRE` + `CTR-CONTRACT-AUTO-EXPIRE`) num só.
