# W2 — Code Review (FIN-CANCEL-OPTIMISTIC-LOCK)

**Revisor**: agente `drizzle-orm-expert` (read-only) · **Veredito**: ✅ **APPROVED** · **Round**: 1

## Resultado

| Dimensão | Status |
|----------|--------|
| Optimistic lock no DELETE (SELECT FOR UPDATE + DELETE WHERE version + sentinela) fecha o TOCTOU | Sólido — fiel ao padrão do `save` |
| Cascade ON DELETE (filhas + timeline) dispara dentro da tx ao casar a versão | Correto (confirmado na integração) |
| Consistência in-memory vs Drizzle (`affectedRows=0` ≡ ausente OU versão divergente) | Coerente |
| Transação/erro idêntica ao `save`; sem vazamento de exceção | OK |
| ADR-0020 (SELECT FOR UPDATE, DELETE condicional, sem isolation explícito) | Sem violações |
| Blockers / Majors | 0 / 0 |

## Citação canônica (constituição §IX)

Vernon, _Implementing DDD_, ch. 10 (Aggregates), §"Optimistic Concurrency":
> "The Aggregate carries a version number that is incremented when changes are made and checked before they are saved back to the storage mechanism. If the version on the persisted object is greater than the version on the client's copy, the client's copy is considered stale and updates are rejected."

Ramakrishnan & Gehrke, §16.4.1:
> "A lost update occurs when two transactions T1 and T2 both read a data item X and then both update it... Locking X before reading it and holding the lock until after writing prevents this anomaly."

O `SELECT ... FOR UPDATE` antes do `DELETE ... WHERE version=?` elimina o lost-update window entre o `findById` do use case e o `delete` do repositório.

## Minors (2)

- **#1 (dívida, não-blocker)**: o cascade da timeline no in-memory não tem teste de contrato explícito — o cascade real é validado pela integração MySQL (cascade test 13/13). Registrado como dívida; não amplio escopo do ticket.
- **#2 (estilo)**: SELECT FOR UPDATE em `deleteDoc` sem nota de descarte de retorno → **comentário melhorado**.

Suíte do ticket GREEN + integração MySQL 13/13. Segue para W3.
