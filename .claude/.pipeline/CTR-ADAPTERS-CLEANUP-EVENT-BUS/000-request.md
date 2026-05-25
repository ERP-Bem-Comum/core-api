# 000 — Request CTR-ADAPTERS-CLEANUP-EVENT-BUS

> **Cleanup de dead code. Size XS.**
> Remove `src/modules/contracts/adapters/event-bus.in-memory.ts` que tornou-se órfão após a série `CTR-OUTBOX-*` (entregue em 2026-05-21). O `EventBus` port foi superado pelo `Outbox` port; o adapter InMemory ficou esquecido sem nenhum consumer em código de produção.

## Justificativa

Evidência da morte:

- **0 imports** de `InMemoryEventBus` em código de produção (verificado via grep recursivo em `src/` e `tests/`).
- `src/modules/contracts/cli/drivers/mysql.ts:15` carrega comentário literal:
  ```
  // CA-8 (CTR-OUTBOX-INTEGRATION-IN-REPOS): InMemoryEventBus removido.
  ```
  Comentário-fóssil deixado quando o EventBus foi removido do composition root MySQL. O adapter ficou sem ser apagado.
- Apenas 3 menções históricas em `tests/bdd/QA-REPORT.md` (documento de QA antigo — referências textuais, não código que importa).

Não vale o trabalho de aplicar EventEmitter nativo conforme `handbook/inquiries/0016-nodejs-native-eventbus-pubsub-observer.md` porque:

1. Adapter atual é "capture for testing" (array.push manual) — não há subscribers para entregar.
2. Inquiry-0016 está marcada **Deferred** — aplicar EventEmitter sem caso de uso real é over-engineering.
3. Quando o primeiro caso de fan-out intra-módulo aparecer, abrirá ADR específico (referenciado pela inquiry §6).

## Escopo

### Arquivos a remover

| Arquivo | Razão |
| :--- | :--- |
| `src/modules/contracts/adapters/event-bus.in-memory.ts` | 0 imports em produção; superado por `outbox.in-memory.ts` |

### Arquivos a modificar

| Arquivo | Mudança |
| :--- | :--- |
| `src/modules/contracts/cli/drivers/mysql.ts:15` | Remover comentário-fóssil `// CA-8 (CTR-OUTBOX-INTEGRATION-IN-REPOS): InMemoryEventBus removido.` |
| `src/modules/contracts/adapters/storage/in-memory.ts` | Atualizar comentário no header que cita `InMemoryEventBus` como exemplo de "observable test double" — trocar por `InMemoryEventDelivery` (vivo) |

### Tests

Nenhum test novo. Os tests existentes (que rodam o resto do módulo contracts) atuam como rede de segurança: se algum ainda dependesse de `InMemoryEventBus`, falhariam aqui — o que confirma que o adapter é mesmo órfão.

## Critérios de aceitação

- **CA1** — `src/modules/contracts/adapters/event-bus.in-memory.ts` foi deletado.
- **CA2** — Comentário-fóssil em `cli/drivers/mysql.ts:15` removido.
- **CA3** — Comentário do header de `storage/in-memory.ts` atualizado para referenciar `InMemoryEventDelivery` (vivo) em vez de `InMemoryEventBus` (deletado).
- **CA4** — Gates W3 verdes (typecheck/format/lint/test). Suite global excluindo `tests/infra/**` mantém 687 pass / 0 fail / 14 skip (zero regressão).
- **CA5** — `pnpm run typecheck` não reporta erro de import órfão.
- **CA6** — `tests/bdd/QA-REPORT.md` **não** é tocado — é documento histórico, suas referências a `InMemoryEventBus` retratam o estado de 2026-05-15. Documentar isso aqui basta.

## Não-objetivos

- **Aplicar EventEmitter nativo** — fora de escopo. Inquiry-0016 cobre justificativa.
- **Reorganizar pastas de adapters** — ticket separado `CTR-ADAPTERS-FOLDER-REORG` (S).
- **Limpar `tests/bdd/QA-REPORT.md`** — documento histórico de QA da P.O., não código.
- **Remover `EventBus` port** (`src/modules/contracts/application/ports/event-bus.ts`) — verificar se ainda tem uso ou se também é órfão; **fora deste ticket** (escopo cresceria; aplicar em ticket dedicado se confirmado órfão).

## Risco / pontos de atenção

1. **Hipótese de orfãndade pode estar errada** — grep pode ter perdido algum import dinâmico. Mitigação: gates W3 obrigatórios (typecheck + tests). Se alguma quebra aparecer, reverter e fazer auditoria mais cuidadosa.
2. **Comentário do `storage/in-memory.ts`** já entregue em ticket anterior (`CTR-STORAGE-INMEMORY`) — mudança trivial documentada e sem impacto semântico.
3. **Pipeline state W0:** este ticket não tem RED. W0 wave fica registrada como "no new tests needed (refactor cleanup) — suite atual = rede de segurança". Os gates W3 fazem o papel da rede.

## Próximos tickets

| # | Ticket | Status |
| :--- | :--- | :--- |
| **#1 (este)** | **`CTR-ADAPTERS-CLEANUP-EVENT-BUS`** | **open** |
| #2 | `CTR-ADAPTERS-FOLDER-REORG` | pending (depois deste) |
| #3 | W1 do `CTR-STORAGE-S3-ADAPTER` | pending (após #2) |
