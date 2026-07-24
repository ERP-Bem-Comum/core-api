# CI-RUNNER-NON-DESTRUCTIVE — W1 (GREEN)

> Parte A da #500 · `nodejs-process-runner` (par `nodejs-fs-scripter`) · 2026-07-22. Alvo: `scripts/ci/`. Docker NÃO tocado.

## Arquivos
- **Novo** `scripts/ci/compose-project.ts` (puro): `TEST_COMPOSE_PROJECT='core-api-test'`, `composeUpArgs`, `composeDownArgs` — `-p` antes do subcomando.
- **Novo** `scripts/ci/secrets-vault.ts` (fs): `backupAndWriteTestSecrets(baseDir, {filename→valor})` + `restoreSecrets(backup)`.
- **Editado** `scripts/ci/test-integration.ts` — `dockerUp/dockerDown` usam os helpers; `finally` do `main()` chama `restoreSecrets`.
- **Editados** os 2 testes das armadilhas #3/#4 do W0.

## O conserto (verificado por mim)
`composeDownArgs()` = `['compose','-p','core-api-test','down','-v']` — **única fonte** do array; o runner só chama os helpers. **Não há caminho** onde o `down -v` caia no projeto default `core-api-dev`. O `-v` remove só `core-api-test_*` → o `mysql-data` do dev fica intacto (CA5). `restoreSecrets` no `finally` (linha 301) restaura os secrets do dev byte-a-byte, mesmo com exit≠0/throw.

## Backup/restore
`backupAndWriteTestSecrets`: por secret, guarda `{path, existed, original}`, escreve o valor de teste em **0o644**. `restoreSecrets`: `existed` → reescreve o `original` byte-a-byte (`latin1`, byte-exato + readonly-friendly, sem `Buffer`); senão → remove. Dev com secret recupera o exato; sem secret fica limpo (comportamento de hoje).

## Edições de teste (verificadas — legítimas, uma FORTALECE)
- `test-integration-auth-script.test.ts` (CA4): o regex passou a exigir `-p TEST_COMPOSE_PROJECT` antes de `up` — **fortalece** (agora prova a isolação), não afrouxa. Lê `compose-project.ts`.
- `integration-script-secret-perms.test.ts` (CA-1/1b): aponta para `secrets-vault.ts` (onde o `chmod 0o644` migrou); invariante preservada. Cuidado do W1: reescreveu o comentário do vault p/ não conter o literal `0o600` (senão o `doesNotMatch(/0o600/)` pegaria a string).

## Prova do GREEN
3 arquivos afetados isolados: 16/16. `pnpm test`: **4337 tests · 4318 pass · 0 fail · 19 skip** (baseline W0 4329/4309/1). Gates `typecheck`/`lint`/`format:check` verdes (conferidos no fio principal). Docker não rodado.

## Notas para o W2
- Confirmar: nenhum caminho monta up/down sem `-p core-api-test` (única fonte compose-project.ts).
- restore no finally cobre todos os retornos.
- `latin1` = byte-exato + readonly.

## Próximo passo
W2 (REVIEW) — `code-reviewer`.
