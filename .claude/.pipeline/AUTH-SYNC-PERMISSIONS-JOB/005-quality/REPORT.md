# W3 — Gate de qualidade (#462)

> Agente: `ts-quality-checker` · Resultado: **VERDE**.

## Gate

| Comando | Exit |
| :--- | :--- |
| `pnpm run typecheck` | **0** |
| `pnpm run format:check` | **0** |
| `pnpm run lint` | **0** |
| `pnpm test` | **0** |

`pnpm test`: **4089 testes · pass 4066 · fail 0 · skipped 18 · todo 5**.

> Os 5 `todo` aparecem no bloco `✖ failing tests` do reporter, mas **não reprovam** (`fail 0`,
> exit 0). O mais visível é `native-pdf-real.local.test.ts` (CA4 DamISS), anotado `# #388: hex
> Identity-H sem /ToUnicode` — follow-up conhecido, sem relação com este diff (reader de PDF).

## Validação em MySQL real — 8.4.10

Container **descartável** na porta 3307 (`--rm`), **sem tocar a infra dev** (`core-api-mysql` seguiu
up/healthy o tempo todo). Nunca `pnpm test:integration:*` — destrói a infra dev.

**17/17 verdes**, os 7 CAs cobertos:

| CA | Prova |
| :--- | :--- |
| CA1 | ambiente N−2 → job traz a N; as ausentes voltam |
| CA2 | 2ª rodada: mesma role id, mesmo total — idempotente |
| CA3 | usuário **e vínculo** sobrevivem; role reusada, id preservado |
| CA4 | sem env → exit **78**, stderr nomeia `AUTH_DATABASE_URL` |
| CA5 | entrypoint sob `src/` + `package.json` aponta pra lá + Dockerfile copia `src` |
| CA6 | `seed:admin` real: usuário + vínculo + catálogo íntegro; re-rodar não duplica |
| CA7 | banco sem role → cria `admin-sistema` com o catálogo inteiro |

Caminho real do deploy:

```
pnpm job:auth:sync-permissions  → "ok: 44 permissões em 'admin-sistema' (…, reconciliada)"  exit 0
(2ª rodada)                     → mesma role id, 44                                          exit 0
sem AUTH_DATABASE_URL           → "auth-database-url-missing (defina AUTH_DATABASE_URL)"     exit 78
```

Estado final: `permissoes=44 · vinculos_admin=44 · roles_admin=1 · usuarios=2 · atribuicoes=2`.
**44 = o catálogo** — o mesmo que o QA media como 42. É a lacuna do #462 fechada.

## O que muda em produção (não escondido no diff)

1. **`auth_role.description` vira NULL** na role `admin-sistema`. Sem impacto de aplicação — ninguém
   lê o campo (verificado no W1 e confirmado por revisão independente no W2). Vai no corpo do PR.
2. **O job não roda sozinho.** Não há serviço no `compose.yaml` (nem para os outros 3 jobs de
   backfill) — o `000-request` escopou fora ("é decisão de ops"). O secret `auth_database_url` já
   existe (`compose.yaml:551`), então criar o serviço é barato se a decisão for "roda como o migrate".
   Recomendação vai no PR; **taskdef do ERP-INFRA é outro repo**.

## Follow-ups registrados (não corrigidos aqui — ADR-0040)

- `auth_role.description` é **vestigial**: escrito por ninguém, lido por ninguém. Ou o agregado passa
  a modelá-lo, ou a coluna sai.
- Comentários **stale** dizendo "ADR-0020: sem ODKU" (`role-repository.drizzle.ts:246`,
  `admin-user.ts:300`) contradizem o ADR, que **permite** ODKU. Pré-existentes.

## Ticket

Pronto para `pipeline:state close` e PR.
