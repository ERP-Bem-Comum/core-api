# CI-RUNNER-NON-DESTRUCTIVE — W2 (REVIEW read-only)

> Parte A da #500 · `code-reviewer` · 2026-07-22 · Round 1 · **READ-ONLY** (nenhum arquivo tocado; Docker não invocado).
> Branch `fix/ci-runner-isolated-project`. Auditoria de **segurança** (bug destrutivo), não de estética.

## Veredicto: ✅ APPROVED (com ressalvas fora de escopo)

Nenhum **Blocker** nem **Major** dentro do escopo declarado (`só scripts/ci/test-integration.ts`).
O conserto está correto e completo para o runner de integração. Há **1 achado Major FORA de escopo**
(mesma classe de bug em `scripts/e2e/*.sh`) que **não bloqueia este ticket** e deve virar issue
(ADR-0040 / anti-padrão #15), além de 2 Minor informativos.

---

## Foco 1 — CA5: `-p core-api-test` em TODO caminho de `up`/`down` do runner → ✅ PASS

- `scripts/ci/compose-project.ts` é a **única fonte** dos arrays de args:
  - `composeUpArgs` → `['compose','-p','core-api-test','up','-d',...services,'--wait']`.
  - `composeDownArgs` → `['compose','-p','core-api-test','down','-v']`.
  - O `-p` vem **antes** do subcomando (`up`/`down`) — posição exigida pelo `docker compose` (senão é ignorado). Correto.
- `scripts/ci/test-integration.ts:255-260`: `dockerUp`/`dockerDown` **só** chamam os helpers; **não há** literal `'compose'`/`'up'`/`'down'` cru no runner. As funções `writeTestSecrets`/`removeTestSecrets` antigas foram removidas (diff confirma).
- **Grep no runner** (`scripts/ci/`): nenhum outro ponto monta `up`/`down` cru. O `down -v` do runner **não tem caminho** que caia no projeto default `core-api-dev`. O bug (`:265` original) está fechado. **CA5 satisfeito.**

## Foco 2 — Restore garantido no `finally` → ✅ PASS

`main()` (`:288-302`): o `backup` é computado **antes** do `try`, e o `finally` chama `restoreSecrets(backup)` em todos os caminhos:
- (a) `up` falha → `return up` dentro do `try` → `finally` roda restore. ✅
- (b) `node --test` sai com exit≠0 → `runNodeTest` retorna e `finally` roda restore. ✅
- (c) qualquer `throw` dentro do `try` → `finally` roda restore. ✅
Não há `return`/exceção entre o backup e o `try` que escape o restore.

## Foco 3 — Backup/restore correto (byte-a-byte) → ✅ PASS

`scripts/ci/secrets-vault.ts`:
- Secret de dev preexistente: `readFileSync(path,'latin1')` no backup + `writeFileSync(path, original,'latin1')` no restore. `latin1` é bijeção byte↔code-point 0..255 → **volta byte-a-byte** para conteúdo arbitrário (incluindo bytes não-UTF8). ✅
- Secret novo (`existed===false`): `restoreSecrets` faz `rmSync(path,{force:true})` → **removido** no fim (comportamento de hoje para quem não tinha secret). ✅
- Permissão: `chmodSync(path, 0o644)` na escrita do secret de teste (invariante de CTR-INFRA-INTEGRATION-SECRET-PERMS — o seed `readonly_bi` roda como uid `mysql` e precisa ler via `cat`). ✅
- **Nenhum caminho** onde o dev perca o secret original: o backup em memória é criado **antes** do `writeFileSync`, secret a secret.

## Foco 4 — As 2 edições de teste → ✅ PASS (uma FORTALECE, a outra preserva invariante)

- `tests/scripts/test-integration-auth-script.test.ts` (CA4): o regex antigo `/'compose', 'up'/` deixaria de casar com o novo formato (`-p` inserido). Foi trocado por `/'compose',\s*'-p',\s*TEST_COMPOSE_PROJECT,\s*'up'/` e o mesmo para `down`, lido de `compose-project.ts`. **Fortalece** — agora o teste **prova a isolação** (exige o `-p TEST_COMPOSE_PROJECT`), não afrouxa. `removeTestSecrets` → `restoreSecrets` reflete o novo fluxo backup→restore. ✅
- `tests/infra/integration-script-secret-perms.test.ts` (CA-1/1b): aponta de `test-integration.ts` → `secrets-vault.ts` (para onde o `chmodSync(0o644)` migrou). Mantém `doesNotMatch(/0o600/)` e `match(/chmodSync([^)]*0o644)/)`. A invariante 0o644 é preservada no novo home. Verificado: o comentário de `secrets-vault.ts` **não** contém o literal `0o600` (senão o `doesNotMatch` pegaria a string). ✅

## Foco 5 — Regressão zero + escopo → ✅ PASS

- O runner sobe **os mesmos serviços, mesma ordem** (`suite.services`), mesmo `--wait`; só mudaram o **projeto** (`-p core-api-test`) e o tratamento dos secrets (write→backup/restore). Fluxo `up→test→down` intacto.
- **Parte B (porta / 68 arquivos `127.0.0.1:3306`) NÃO foi tocada** — confirmado no diff (apenas `compose-project.ts`, `secrets-vault.ts` novos + `test-integration.ts` e 2 testes editados). Sem scope-creep.

---

## Achados

### 🟠 Major — FORA DE ESCOPO (não bloqueia este ticket) — recomendar issue

**`scripts/e2e/*.sh` têm a MESMA classe de bug destrutivo que este ticket conserta.**
`scripts/e2e/auth.sh:14`, `contracts.sh:21`, `collaborators.sh:22`, `bruno-all.sh:19` rodam
`docker compose down -v` **sem `-p`** (projeto default `core-api-dev`) → apagam o `mysql-data` do dev;
e o `cleanup()` faz `rm -f secrets/mysql_*.txt` **sem backup** → apaga os secrets de dev. São invocados
por `pnpm run test:e2e:auth|contracts|collaborators` e `test:integration:all` (package.json:65-68).

- **Por que NÃO é Blocker/Major DESTE ticket:** o escopo declarado do `000-request.md` é explicitamente
  **"só `scripts/ci/test-integration.ts`"**. Os `.sh` de e2e são um runner distinto, o bug é **pré-existente**
  (não introduzido por este diff) e não faz parte de nenhuma das Partes A/B/C declaradas. Corrigir aqui
  seria scope-creep (anti-padrão #15 / ADR-0040).
- **Ação recomendada:** abrir GitHub Issue (skill `issue-report`) — "runners e2e destroem volume + secrets
  de dev (mesmo bug da #500 Parte A, fora do `test-integration.ts`)", com CA: e2e usa projeto isolado
  (ou backup/restore de secrets) e o `down -v` nunca cai no `core-api-dev`. **Não perder o achado**, mas
  seguir o ticket corrente.

### 🟡 Minor 1 — janela não-atômica em `backupAndWriteTestSecrets` (informativo)

Se `writeFileSync`/`chmodSync` lançar **no meio do loop** (após já ter sobrescrito o 1º secret e antes de
`return`), a função lança **antes de o `backup` ser atribuído** em `main()` → o `finally` não roda restore
e o(s) secret(s) já sobrescrito(s) ficaria(m) perdido(s). **Não é regressão:** o código anterior
(`writeTestSecrets`) não tinha backup **nenhum**, então isto é estritamente melhor. Janela exige falha de
fs no meio da escrita (raríssima). Se quiser blindar no futuro: montar o backup em memória (fase read-only)
**antes** de qualquer `writeFileSync`. Não exigido para aprovação.

### 🟡 Minor 2 — modo do secret de dev restaurado fica 0o644 (informativo, provavelmente desejável)

No restore, `writeFileSync(path, original)` reescreve o conteúdo mas não restaura o **modo** original — o
arquivo preexistente teve o modo alterado para `0o644` durante o backup (`chmodSync`). Como `0o644` é o
modo canônico do projeto para esses secrets (alinhado a `setup-secrets.ts` e ao seed do MySQL), o efeito é
**consistente/desejável**, não um defeito. Só registro para transparência — o CA2 cobre conteúdo, não modo.

---

## Gates (read-only — código não modificado)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` sem erros |
| Lint | `pnpm run lint` | ✅ `eslint .` sem erros |
| Test | `pnpm test` | ✅ **tests 4337 · pass 4318 · fail 0 · skip 19** |

> Baseline W1: 4337/4318/0/19 — **estável**, sem regressão. Docker/integração **não** invocados (por design).

## Resumo

**APPROVED.** O conserto fecha o bug destrutivo dentro do escopo: projeto isolado `core-api-test`
(único caminho de `up`/`down`, `-p` antes do subcomando) e backup/restore byte-a-byte dos secrets de dev
no `finally`. As 2 edições de teste são legítimas — a de auth **fortalece** (prova a isolação), a de perms
**preserva** a invariante 0o644 no novo home. Sem Blocker/Major no escopo → segue para W3.
Ressalva registrada: `scripts/e2e/*.sh` carregam o mesmo bug destrutivo (fora de escopo) → abrir issue.

## Próximo passo
W3 (QUALITY) — `ts-quality-checker`. Após W3, registrar a issue do achado e2e antes de encerrar a #500 Parte A.
