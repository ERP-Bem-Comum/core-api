# W1 — Implementação mínima (FIN-CANCEL-OPTIMISTIC-LOCK)

**Resultado**: 🟢 GREEN (incl. integração MySQL real).

## Mudanças de produção

1. `domain/document/repository.ts` — port `delete(id, expectedVersion: number)`.
2. `application/use-cases/cancel-document.ts` — `CancelDocumentCommand` ganha `expectedVersion`; repassa a `repo.delete`.
3. `adapters/persistence/repos/document-repository.drizzle.ts` — `deleteDoc` reescrito: `db.transaction` + SELECT FOR UPDATE + `DELETE ... WHERE id=? AND version=?`; `affectedRows===0` → `makeVersionConflict` → `err('document-version-conflict')` (espelha o `save`). Filhas via ON DELETE CASCADE.
4. `adapters/persistence/repos/document-repository.in-memory.ts` — `delete` checa `entry.version !== expectedVersion` → conflito.
5. `adapters/http/schemas.ts` — `cancelDocumentBodySchema = z.object({ version })`.
6. `adapters/http/plugin.ts` — DELETE ganha `body: cancelDocumentBodySchema`; handler passa `expectedVersion: req.body.version`.

## Testes (RED→GREEN)

- `cancel-optimistic-lock.http.test.ts` — 3/3 (sem version→400; version-ok→204; version-stale→409 + permanece).
- `transitions.test.ts` — +1 caso (version-stale→conflict no use case); 2 existentes ajustados ao novo `expectedVersion`.
- `document-repository.suite.ts` — +1 caso de contrato (delete version-stale→conflict, roda in-memory **e** MySQL).
- `financial-documents.http.test.ts` CA7/CA8 ajustados (DELETE agora envia `version`).

## Execução

```
node --test cancel-optimistic-lock + transitions          → 10/10
node --test tests/modules/financial/**/*.test.ts           → 157/157 (0 fail)
pnpm run typecheck                                         → verde
pnpm run test:integration:financial                       → 13/13 (MySQL real)
  ✔ delete com versão defasada → document-version-conflict (não remove) — #55
```

Mudança de contrato intencional: DELETE passa a exigir `version` no body (coordenado com web-app v2).
