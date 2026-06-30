# W3 — Gate de qualidade · AUTH-ETL-USER-FIELDS

**Outcome**: GREEN ✅ · **Agente**: ts-quality-checker · **Issue**: #277

## Gates canônicos — todos verdes

| Gate | Resultado |
|---|---|
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm run lint` | ✅ `eslint .` sem erros |
| `pnpm test` | ✅ 3248 tests · **3230 pass · 0 fail** · 18 skipped |

Os 6 RED do W0 → GREEN; retrocompat (CA4) preservada; sem regressão.

## W2 — achados não-bloqueantes (registrados)

3 Minor (0 Blocker/Major): M1 `process.stderr.write` na application (espelha read-mapper login-500; follow-up de `Logger` port), M2 `unbound-method: off` em `tests/**` (aceito), M3 `String()` redundante (nit). Nenhum bloqueia.

## Validação E2E na VM (CA5) — ✅ EXECUTADA

Código fix/277 levado à VM (3 arquivos do runtime), `auth_user`/`par_user_profiles` dos migrados limpos, ETL re-rodado:
```
users: read=14 migrated=12 quarantined=2 alreadyExists=0
[provision-legacy-user] legacyId=2..8 degraded invalid telephone to null: telephone-invalid
```
Estado do `auth_user` dos 12 migrados (antes: name 0/12):

| campo | populado | observação |
|---|---|---|
| `name` | **12/12** ✅ | era o bug — `GET /users` agora mostra os nomes (não "—") |
| `cpf` | **12/12** ✅ | todos válidos no legado |
| `telephone` | 4/12 | 8 degradados para null + warning com legacyId (telefones inválidos no legado) — **comportamento correto** (CA2, Evans reconstituição) |
| `collaborator_id` | 0/12 | **legítimo (CA3)**: a coluna `users.collaboratorId` (FK) no legado está NULL para esses 12 (usuários administrativos); o `par_user_profiles.collaborator_ref` (caminho pré-existente) também é 0/12 → consistente, sem regressão |

Conclusão: o conserto popula os campos quando o legado os tem; degrada inválidos sem dropar o usuário; não inventa vínculo ausente. `test:integration:{auth,etl}` (Docker) roda no CI.
