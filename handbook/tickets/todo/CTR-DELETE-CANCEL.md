# Request — CTR-DELETE-CANCEL

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: grid de contratos (Tela 1) — menu de **Ações → Excluir**. Verificado contra `core-api@dev`
> em 2026-06-09.

## Título
Permitir **cancelar / excluir (soft-delete)** contratos em rascunho/pendentes

## Size
M

## Contexto
No grid, contratos **Pendentes** (rascunho/sem efetividade) têm a ação **Excluir**. O front já tem o
**modal de confirmação** pronto (`delete-contract-modal.component.tsx`), porém o botão de confirmar fica
**desabilitado com aviso** porque não há suporte no backend.

## Estado atual (verificado)
- `DELETE /contracts/:id` é **recusado por design**: responde **HTTP 405** com envelope
  `contract-delete-forbidden`. Comentário no core-api: *"DELETE de contrato é RECUSADO (imutabilidade —
  exclusão física proibida)"*.
- Não há rota de **cancelamento** nem de **soft-delete**. `POST /contracts/:id/end` é **distrato**
  (encerramento de contrato vigente, status `Terminated`) — não serve para descartar um rascunho/pendente.

## Pedido ao backend
Disponibilizar uma forma de **descartar contratos que nunca entraram em vigência** (status `Pending`/
rascunho), preservando a imutabilidade dos contratos efetivados. Sugestões (a definir pelo tech lead):
1. **Soft-delete** (`deletedAt`/status `Cancelled`) restrito a `Pending`, com rota dedicada
   (ex.: `POST /contracts/:id/cancel`) e permissão `contract:write`; ou
2. `DELETE /contracts/:id` permitido **apenas** quando `Pending` (demais status seguem 405).
- Em ambos os casos: a lista deve **deixar de retornar** o contrato cancelado (ou expor filtro).

## Impacto no front (hoje)
- A ação **Excluir** abre o modal de confirmação, mas o **Confirmar** está **desabilitado** com aviso
  ("Exclusão ainda não disponível… aguardando suporte de cancelamento/soft-delete").
- Ao existir a rota, basta habilitar o confirmar + ligar a um binding de exclusão (mutation → invalidar
  `['contracts','list']`).

## Adendo (2026-06-09) — Excluir ADITIVO Pendente
- **Estado atual**: também **não há rota para excluir/cancelar aditivo**. As rotas de aditivo no core-api
  são apenas `POST /contracts/:id/amendments`, `.../:amendmentId/homologate` e `.../:amendmentId/documents`
  — **sem `DELETE`**.
- **Necessidade do front**: um aditivo **Pendente** (criado sem documento/assinatura, sem efeito) deve poder
  ser **excluído** pelo usuário direto no modal do aditivo (operação aderente: criar pendente → revisar →
  excluir se necessário). Restringir a exclusão a `Pendente` (Homologado é imutável).
- **Pedido**: `DELETE /contracts/:id/amendments/:amendmentId` (ou `.../cancel`) permitido **só** quando o
  aditivo está Pendente; permissão `contract:write`. Resposta ideal: o contrato atualizado (sem o aditivo).
- **Impacto no front hoje**: o botão "Excluir aditivo" (modal, quando Pendente) fica pendente desta rota.
