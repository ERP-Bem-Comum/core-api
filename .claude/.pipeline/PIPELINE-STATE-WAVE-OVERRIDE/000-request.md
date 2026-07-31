# PIPELINE-STATE-WAVE-OVERRIDE — Request

**Size:** S
**Origem:** `.claude/.pipeline/DEADMAN-AUDIT-FALSE-FIRED/003-impl/REPORT-round4.md` §"Pendência de estado"
**Precedente direto:** [`CTR-PIPELINE-WAVE-REOPEN`](../CTR-PIPELINE-WAVE-REOPEN/000-request.md) — mesma classe de dor, um nível acima.

## Problema

`scripts/pipeline/state-cli.ts:29` fixa `MAX_ROUNDS = 3`, e os dois caminhos de re-trabalho abortam ao atingi-lo:

```
scripts/pipeline/state-cli.ts:219-220  (wave-round)
scripts/pipeline/state-cli.ts:262-263  (wave-reopen)
  → exitFail(2, `wave ${wave} atingiu max rounds (${MAX_ROUNDS}); escalar ao humano`)
```

O gate está **certo** — escalar após 3 rounds é a disciplina do pipeline. O que falta é o **outro lado**: quando o humano escala, decide e **autoriza** uma rodada extra, não existe comando que represente isso. A CLI só sabe dizer "escalar", nunca "escalado, decidido e liberado".

**Caso real que originou este ticket:** em `DEADMAN-AUDIT-FALSE-FIRED`, o W2 chegou a `rounds=3` com `REJECTED`, o dono do repo revisou e autorizou um round 4 restrito a 3 correções verificadas. O trabalho foi feito e está verde (45/45, suíte `fail 0`), mas o `STATE.json` continua em `W2 done (REJECTED) [rounds=3]` — divergente da realidade. O ticket não pode ser fechado como `closed-green` sem mentir ou sem editar o canônico à mão.

É exatamente o que o `CTR-PIPELINE-WAVE-REOPEN` veio evitar: aquele ticket nasceu porque a correção "exigiu **editar o `STATE.json` à mão** — violando a convenção *STATE.json é gerenciado por `pnpm run pipeline:state`*". A mesma violação está de volta, por uma porta diferente.

## Objetivo

Permitir que uma autorização humana explícita destrave uma wave que atingiu `MAX_ROUNDS`, **registrando quem autorizou e por quê no próprio canônico** — de modo que a exceção fique auditável em vez de invisível.

Invariante que **não** pode ser afrouxada: sem autorização explícita, o comportamento atual permanece idêntico. Este ticket não pode virar um bypass silencioso do limite de 3 rounds.

## Proposta (a refinar no W0/W1)

Subcomando **`wave-override <ticket> <Wn> --reason "<motivo>"`**, que:

- **exige** `--reason` não-vazio — é o registro da decisão humana; sem motivo, não há override;
- só aceita wave `status: 'done'`, `outcome: 'REJECTED'` e **`rounds >= MAX_ROUNDS`**. Abaixo do limite o caminho correto continua sendo `wave-reopen` (não duplicar caminho feliz);
- mantém a guarda do `wave-reopen` de **não reabrir wave com wave posterior já iniciada**;
- transiciona para `in-progress`, incrementa `rounds` (agora podendo passar de 3), limpa `outcome`/`finishedAt`, seta `startedAt`;
- **persiste a autorização** no `STATE.json` de forma legível — a decisão de onde (campo `overrides[]` no topo, ou campo na própria `WaveEntry`) fica para o W0/W1, ponderando que `WaveEntry` e `PipelineState` são `Readonly` (`scripts/pipeline/state-schema.ts:18-27`) e que o `STATE.md` é **gerado** (`render`), então o override precisa aparecer lá também.

**Alternativa a avaliar no W0:** flag `--force --reason "<motivo>"` no `wave-reopen` existente, em vez de subcomando novo. Menos superfície de CLI, mas mistura o caminho normal com a exceção — decidir pelo mais simples e testável, como fez o precedente.

## Critérios de aceite

- **CA1 — sem `--reason`, não há override. Dado** uma wave em `rounds=3`/`REJECTED`, **Quando** `wave-override` é chamado sem `--reason` (ou com string vazia/só espaços), **Então** falha com exit 2 e mensagem clara, e o `STATE.json` **não** é alterado.
- **CA2 — o override destrava. Dado** a mesma wave e um `--reason` válido, **Quando** `wave-override` roda, **Então** a wave volta a `in-progress`, `rounds` passa a 4, `outcome`/`finishedAt` são limpos, e o fluxo `wave-finish --outcome APPROVED` volta a funcionar.
- **CA3 — a autorização fica registrada. Dado** um override aplicado, **Quando** se lê o `STATE.json` e o `STATE.md` renderizado, **Então** o motivo e o instante da autorização aparecem em ambos — a exceção é auditável sem consultar histórico do git.
- **CA4 — o limite segue valendo sem autorização. Dado** uma wave em `rounds=3`, **Quando** se chama `wave-reopen` (o caminho normal), **Então** ele continua falhando com `atingiu max rounds; escalar ao humano`, byte a byte como hoje.
- **CA5 — override não é atalho. Dado** uma wave com `rounds < MAX_ROUNDS`, **Quando** `wave-override` é chamado, **Então** falha orientando a usar `wave-reopen` — o override existe para a exceção, não para pular a disciplina.
- **CA6 — guarda de wave posterior. Dado** que W3 já está `in-progress`/`done`, **Quando** se tenta `wave-override W2`, **Então** falha, como o `wave-reopen` já faz.

## Definition of Done

- Gate W3 verde: `pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test`.
- Testes em `tests/pipeline/state-cli.test.ts` (ou arquivo irmão) cobrindo os 6 CAs, com **CA1, CA2 e CA4 obrigatoriamente RED em W0**.
- `pnpm run pipeline:status` e `pipeline:metrics` continuam funcionando com o `STATE.json` novo (campo adicional não pode quebrar leitores existentes) — verificar `tests/pipeline/dashboard.test.ts` e `metrics.test.ts`.
- `AGENTS.md` §"Comandos essenciais" ganha a linha do `wave-override`, junto das outras de `pipeline:state`.

## Fora de escopo

- Aplicar o override ao `DEADMAN-AUDIT-FALSE-FIRED`. Este ticket entrega a **ferramenta**; usá-la naquele ticket é ato separado e deliberado do dono.
- Mudar o valor de `MAX_ROUNDS` ou a disciplina de 3 rounds.
