# Request — CTR-AUTO-EXPIRE

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: grid/detalhe de Contratos + filtro "vencendo". Verificado contra `core-api@dev` em 2026-06-10.

> ---
> **🔄 Estado verificado no core-api — 2026-06-15** · revisão pós-handoff (conteúdo abaixo = visão do front em 2026-06-09/14).
>
> - **Já implementado:** transição de domínio `Active → Expired` existe e está correta — função `expire` em `src/modules/contracts/domain/contract/contract.ts:239`, com a guarda `contractCannotExpireYet` (`PlainDate.isBefore(atDate, contract.currentPeriod.end)`) em `contract.ts:251` e o caso `Indefinite` rejeitado em `contract.ts:246`. O único disparador é **manual/sob demanda**: rota HTTP `POST /contracts/:id/end` com `kind: "Expire"` (`src/modules/contracts/adapters/http/plugin.ts:456`) → use case `endContract` (`src/modules/contracts/application/use-cases/end-contract.ts`). Nenhuma automação por data.
> - **Escopo real restante:** o disparo **automático** por chegada da data-fim. Confirmado que **não existe** scheduler/cron/sweep/job de varredura: o único processo de fundo é o `outbox-worker` (`src/modules/contracts/worker/outbox-worker.ts`, entrega de eventos via outbox — `setTimeout` é só o backoff do loop, não um agendador de expiração). Sem `setInterval`/cron em `src/`. Logo, contrato `Active` com `Fixed` vencido permanece `Active` indefinidamente (caso CT 0776/2026). Falta escolher e implementar uma das duas vias do "Pedido ao backend": (1) sweep agendado chamando `expire` nos elegíveis, ou (2) status derivado por data na leitura (`GET /contracts` e `/contracts/:id`). Decidir também a borda da data-fim (guarda atual permite `at >= end`; convenção do PO é D+1 / inclusiva).
> - **Veredito:** NÃO FEITO (domínio pronto, porém sem qualquer disparador automático — operacionalmente é código morto)
> ---

## Título
Transição automática **Active → Expired** quando a vigência termina (contrato finalizar sozinho)

## Size
M

## Contexto
Um contrato com vigência encerrada deveria aparecer como **FINALIZADO** (status `Expired`). Hoje ele
permanece **Em Andamento** (`Active`) indefinidamente. Caso concreto observado: **CT 0776/2026**,
`currentPeriod.end = 2026-06-10`, retornado pela API como `status: "Active"` no dia 10/06 (e seguirá
`Active` depois disso).

## Estado atual (verificado)
- O domínio TEM a transição `Active → Expired` (`expire`) em
  `modules/contracts/domain/contract/contract.ts`, com guarda `ContractCannotExpireYet`
  (`isBefore(at, currentPeriod.end)` → erro).
- **Porém não há nada que dispare essa transição automaticamente:** sem **scheduler/cron**, sem **rota
  HTTP** que aplique `expire`, sem job de varredura. Ou seja, a transição existe mas é "código morto" do
  ponto de vista operacional.
- O **front confia no status do backend** (`Active` → "Em Andamento") — está correto refletir o que a API
  informa; o problema é a API nunca mudar o status.

## Pedido ao backend
Operacionalizar a expiração automática dos contratos `Active` com vigência `Fixed` encerrada. Opções (a
definir pelo tech lead):
1. **Sweep agendado** (cron/job): periodicamente chama `expire` nos contratos elegíveis; ou
2. **Status derivado por data** na leitura (`GET /contracts` e `GET /contracts/:id`): computar `Expired`
   quando a vigência terminou, sem depender de job.

### ⚠️ Definir a borda da data-fim (convenção)
- **Regra do PO (web-app):** "válido até o **fim do último dia** de vigência" → finaliza **no dia seguinte**
  (data-fim **inclusiva**). Ex.: termina 10/06 → **Em Andamento em 10/06**, **Finalizado em 11/06**.
- **Guarda atual do domínio:** permite `expire` quando `at >= end` (ou seja, já **no próprio dia** da
  data-fim) — **diverge** da convenção do PO em 1 dia. Alinhar para `at > end` (D+1) se a regra inclusiva
  for a oficial.

## Impacto no front (hoje)
- Contratos com vigência encerrada continuam exibidos como **Em Andamento** no grid e no detalhe (reflexo
  fiel do backend). Some do filtro "vencendo" porque a data-fim já passou de `now`, mas **não** entra em
  Finalizado. Nenhuma mudança de front é necessária: ao a API passar a devolver `Expired`/`Finalizado`, a
  UI reflete automaticamente.
