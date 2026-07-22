# W2 — Code review (#462)

> Agente: `code-reviewer` (read-only, independente) · **Round 1 de 3** · Veredito inicial: **REJEITADO** → corrigido → **APROVADO**.

## Verificações normativas que passaram

- **ADR-0020 / ODKU** — o revisor abriu o ADR e citou literalmente (`0020-…:93`): ODKU é **permitido**.
  Código novo não usa. Ponto morto.
  > Achado colateral: `role-repository.drizzle.ts:246` e `admin-user.ts:300` comentam "ADR-0020: sem ODKU" — **stale**, contradiz o ADR. Pré-existentes, fora deste diff.
- **ADR-0006** — `run.ts` importa só de `public-api/`. A public-api compor adapters do **próprio** módulo é o molde literal do `public-api/migrate.ts:9-13`.
- **`description` → NULL** — a alegação do W1 ("ninguém lê") **se sustenta** na revisão independente: `roleListItemSchema` não expõe; `user-repository.drizzle.ts:133,189` só seleciona para satisfazer o shape do row, e `userFromRows` constrói via `Role.create`, que não tem o campo.
- Gate de teste sem default, exit codes 0/78/1 via `process.exitCode`, `import type`, extensões `.ts`, `#src/*` — conformes.

## Achados e desfecho

| Sev | Achado | Desfecho |
| :--- | :--- | :--- |
| **Major** | `sync-permissions.ts` — `finally { await handle.close() }` sem `.catch` faz rejeição do `pool.end()` **substituir o return** e descartar o `Result` | **CORRIGIDO** |
| Minor | TOCTOU no papel: `list()` fora da transação do `save` | **Documentado no código** |
| Minor | Seed abre um 2º pool (sobreposição transitória) | **Aceito** — ver abaixo |
| Minor | CA6 sem cobertura real — a afirmação do W0 não se sustenta | **CORRIGIDO com teste novo** |
| Minor | `Dockerfile:102-104` cita `pnpm seed:admin`, comando inexistente na imagem | **CORRIGIDO** |
| Minor | Narrativa do #462 recontada em 7 arquivos | **CORRIGIDO** (enxugado) |
| Minor | Hunk do seed mistura acentuação com o ASCII do arquivo | **CORRIGIDO** (hunk consistente) |
| Nota | Job sem serviço no `compose.yaml` | **Fora de escopo** (000-request); vai no PR |

### Major — o `finally` engolia o erro justamente na falha que importa

Cenário do revisor: MySQL cai durante o `save` (failover/restart no deploy) → `save` devolve
`err('role-repo-unavailable')` → o `finally` roda → `pool.end()` rejeita sobre a conexão morta →
**o err é descartado** e a promise rejeita. O operador lê `rejeição não tratada no main: <stack
mysql2>` em vez de `falha ao sincronizar: role-repo-unavailable`. Exit 1 nos dois casos — mas o erro
nomeado some. É a classe de **falha calada** que este ticket existe para matar.

Viola `.claude/rules/adapters.md` ("nunca vazar `Error`"). Precedente local: `mysql-driver.ts:137,147`.
Fix: `await handle.close().catch(() => undefined)`. O `try/finally` **fica** — é melhor que o molde
(`migrate.ts:22` fecha sem `finally` e vaza o pool se algo lançar).

### CA6 — eu declarei coberto no W0 e não estava

O W0 afirmou "CA6 — coberto por teste existente". **Falso**: `tests/scripts/seed/admin-user.test.ts`
cobre só `validateAdminProfile`; não toca `main()` nem o passo 4. A delegação removeu 85 linhas e
moveu a fronteira transacional **sem nenhum teste nesse caminho**.

Optei por **cobrir**, não por reclassificar: `tests/jobs/auth/sync-permissions-seed-delegation.test.ts`
roda o `seed:admin` de verdade contra o descartável e exige usuário + vínculo + catálogo íntegro.
O descoberto era o *wiring* (`roleId` → `auth_user_role`) — poucas linhas, e exatamente onde o
defeito passaria: seed sai 0, usuário existe, admin sem papel. **Outro 403 mudo.** Deixar sem teste
repetiria o padrão que gerou a issue: o que não é exercitado quebra calado.

### Minor aceito conscientemente — o 2º pool no seed

`openAuthMysql` sempre cria pool novo (não há registry), então o seed tem 2 pools abertos entre
`:193` e o retorno do sync. Aceito: conexões são lazy (~1-2 por pool), o pool do sync fecha antes do
passo 5, e o seed é one-shot. **Não** é o padrão do incidente de exaustão em produção (14 pools em
processo longevo). Registrado pela reincidência do tema, não por risco.

## Re-verificação após as correções

`typecheck` ✓ · `lint` ✓ · `format:check` ✓ · `pnpm test` → **4089 testes, fail 0, exit 0**.
Testes do ticket contra MySQL 8.4.10 real (descartável, porta 3307): **17/17**, 7 CAs cobertos.

## Veredito final: **APROVADO** — round 1

Major corrigido com precedente local; todos os Minors endereçados ou aceitos com justificativa
explícita. Nenhum achado pendente.
