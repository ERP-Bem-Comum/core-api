# Request — CTR-HTTP-CANCEL-PENDING

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: ação "Excluir" no grid/detalhe de Contratos. Verificado em 2026-06-09.

## Título

Cancelar / soft-delete de contrato **Pendente** (`DELETE /contracts/:id`)

## Size

S/M

## Contexto

No grid e no detalhe, a ação **Excluir** abre um modal de confirmação, mas o botão **Confirmar fica
desabilitado** porque o backend não permite remover contrato algum: `DELETE /contracts/:id` responde
**405 `contract-delete-forbidden`** (imutabilidade — exclusão física proibida).

A regra de negócio desejada: um contrato ainda **Pendente** (nunca ativado/assinado) pode ser
**cancelado** pelo operador — é um rascunho que não vigorou. Contratos já efetivados
(Active/Expired/Terminated) **continuam imutáveis** (sem exclusão).

## Estado atual (verificado)

- `DELETE /contracts/:id` → **405** `contract-delete-forbidden` (`adapters/http/plugin.ts:307-313`),
  incondicional (imutabilidade total — US-002).
- Ciclo de vida (ADR-0023): `Pending → Active → Expired/Terminated`. Não há transição de cancelamento.
- Agregado `Contract` em `domain/contract/` (discriminated union por `status`).

## Gap (o que falta)

- Permitir **cancelar** um contrato **Pendente** (soft-delete — nunca exclusão física, ADR de imutabilidade).
  Decisão de modelagem (no pipeline): novo estado terminal `Cancelled` (5º estado, espelha
  `Terminated`/`Expired` com `endedAt`?) **ou** flag de soft-delete. Recomendado: novo estado `Cancelled`
  na máquina de estados (coerente com a discriminated union e o CHECK de `endedAt`).
- `DELETE /contracts/:id` (ou `POST /contracts/:id/cancel`) passa a: Pending → 200/204 (cancela);
  qualquer outro estado → 409/405 (não-cancelável); inexistente → 404; auth `contract:write` (ou `delete`).

## Critérios de Aceitação

1. Cancelar contrato **Pendente** → sucesso; o contrato fica em estado cancelado (soft) e some dos
   fluxos operacionais (não listado como ativo), sem exclusão física.
2. Tentar cancelar contrato **não-Pendente** (Active/Expired/Terminated) → erro mapeável (409/405).
3. Restrito a `contract:write`/`contract:delete`; inexistente → 404.
4. Evento de domínio de cancelamento publicado (outbox) — auditoria/timeline.

## Fora de Escopo

- Exclusão física (permanece proibida).
- Cancelar contrato já efetivado.

## Notas

- Decisão de modelagem (novo estado `Cancelled` vs flag) deve passar pelo pipeline com especialistas
  (espelha a abordagem do CTR-HTTP-DISTRATO-DOCUMENTO — mudança no ciclo de vida).
- ADR-0023 (ciclo de vida) — eventual novo ADR se introduzir 5º estado.
