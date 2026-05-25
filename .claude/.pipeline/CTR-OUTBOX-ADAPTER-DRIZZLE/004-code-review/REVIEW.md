# Code Review — CTR-OUTBOX-ADAPTER-DRIZZLE — Round 1 (REJECTED) + Round 2 (APPROVED)

**Reviewer:** code-reviewer  
**Data:** 2026-05-21  
**Escopo revisado:**  
- src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts  
- tests/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.test.ts

---

## Round 1 — REJECTED

### Issues criticas encontradas e corrigidas in-place (Round 1 → Round 2)

#### Issue 1 — adapter:298 — ClassDeclaration proibido

Categoria: A (regras absolutas — no-restricted-syntax em eslint.config.js)  
Problema: class OutboxEventNotFoundError extends Error — ESLint bloqueia ClassDeclaration em todo o projeto.  
Fix aplicado: substituicao por padrao out-param (array [OutboxQueryError | null]) dentro da tx callback.  
Verificado: pnpm exec eslint ... zero erros.

#### Issue 2 — adapter:133 — init-declarations

Categoria: F (ESLint @typescript-eslint/init-declarations always)  
Problema: let inserts: ReturnType<...>[] declarado sem inicializacao, atribuido dentro de try.  
Fix aplicado: removido o try/catch de serializacao (eventToOutboxInsert nao lanca); inserts agora const direto.  
Import outboxAppendSerializationFailed removido (ficou dangling).

#### Issue 3+4 — adapter:240,261 — no-use-before-define

Categoria: F (ESLint @typescript-eslint/no-use-before-define)  
Problema: OutboxEventNotFoundError referenciado em moveToDeadLetterFinal antes de ser declarado.  
Fix: resolvido como consequencia do Issue 1 (classe eliminada).

#### Issue 5 — test:32 — no-unused-vars

Categoria: F (ESLint @typescript-eslint/no-unused-vars)  
Problema: import type OutboxQueryError importado mas nunca usado no corpo do test.  
Fix aplicado: import removido.

---

## Round 2 — APPROVED

### Checklist positivo

- Padrao D correto: factory function, tagged errors flat (OutboxQueryUnavailable, OutboxEventNotFound), construtores free functions, sem class exportado.
- ER_DUP_ENTRY detection: candidates[] cobre e.cause; verifica errno === 1062, code === ER_DUP_ENTRY e msg.includes. Consistente com o padrao dos outros repos.
- FOR UPDATE SKIP LOCKED: .for(update, { skipLocked: true }) presente em findPendingForUpdate. API Drizzle 0.45.x mysql-core confirmada.
- markProcessed idempotente: WHERE ... AND processed_at IS NULL correto. 0 rows affected = ok (nao verifica affectedRows).
- moveToDeadLetter atomico: db.transaction + SELECT FOR UPDATE + INSERT DLQ + DELETE outbox. Out-param pattern elegante e sem class.
- Sem vazamento de schema: OutboxRow retornado como readonly OutboxRow[] (alias de inferSelect). Schema nao vazou para application layer.
- testHelpers claramente marcados como test-only no JSDoc (NOTA sobre testHelpers: buffer apenas para suite contratual. Nunca usar em prod).
- void now / void errorTag em markFailed: documentados com comentario explicando ausencia das colunas no schema atual.
- import type consistente: ContractsModuleEvent, OutboxPort, OutboxAppendError, MysqlHandle, OutboxRow todos como import type.
- Imutabilidade: appendedRows: OutboxRow[] e buffer correto; readonly no retorno dos helpers.

### Observacao menor (nao bloqueia)

- markFailed assina (eventId, now, errorTag, attempt) mas ignora now e errorTag via void. Seria mais limpo se a assinatura do port ja refletisse o schema atual. Porem mudar a assinatura exigiria alterar o 000-request.md e coordenar com ticket #5 — defer para quando o worker precisar.

---

**Veredito final: APPROVED**  
Pipeline pode avançar para W3.
