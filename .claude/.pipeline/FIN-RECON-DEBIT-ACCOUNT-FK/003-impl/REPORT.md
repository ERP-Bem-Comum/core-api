# W1 — Implementação (GREEN) · FIN-RECON-DEBIT-ACCOUNT-FK (#160)

**Data**: 2026-06-19

| Camada | Arquivo | Conteúdo |
| --- | --- | --- |
| Application | `use-cases/import-bank-statement.ts` | Guard endurecido (antes de parsear): `rehydrate` falha → `account-not-found`; `findById === null` → `account-not-found`; `isClosed` → `account-closed`. Antes era lenient (não bloqueava ref inválida/inexistente). `+ 'account-not-found'` no error union. |
| Borda HTTP | `adapters/http/error-mapping.ts` | `+ 'account-not-found'` no dicionário PT → "A conta-cedente informada não existe." Status **default 422** (referência pendente num write, mesma convenção de `cedente-account-not-found`; não é 404 de rota nem 409 de conflito). |
| Testes (fixtures) | `import-bank-statement.test.ts`, `period.use-cases.test.ts`, `financial-bank-statements.http.test.ts` | Passam a seedar um cedente real (3 deles via `POST /cedente-accounts` no `before()`, já que o deps HTTP não expõe o store). |

GREEN: import 6/6, suíte 3003 pass / 0 fail. **Sem mudança de schema/persistência** → integração (`.drizzle-mysql`) intacta (nenhuma usa o use-case). CA1 (ref inexistente → erro) e CA2 (ref existente → ok) cobertos por unit; CA3 (FK no DB) **não se aplica** à abordagem escolhida (guard, não FK).
