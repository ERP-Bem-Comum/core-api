# CI-RUNNER-NON-DESTRUCTIVE — W0 (RED)

> Parte A da #500 · `tdd-strategist` · 2026-07-22. Alvo: `scripts/ci/`. `src/` intocado.

## Teste (1 novo, 8 it, fs-puro + inspeção de args — roda em `pnpm test` puro)
`tests/scripts/test-integration-non-destructive.test.ts`:
- **Frente 1 (secrets, fs com `mkdtemp`):** CA2 (secret de dev existente sobrevive byte-a-byte), CA3
  (inexistente nasce e é removido), CA2+CA3 combinados, CA-perm (0o644).
- **Frente 2 (args):** CA1 (`TEST_COMPOSE_PROJECT==='core-api-test'`; `composeUpArgs` põe `-p core-api-test`
  antes de `up`), CA5 (`composeDownArgs` põe `-p` antes de `down` e mantém `-v`).
- **Wiring** (text-match no runner): usa `composeUpArgs`/`composeDownArgs` + `backupAndWriteTestSecrets`/`restoreSecrets` no `finally`.

## Prova do RED
`ERR_MODULE_NOT_FOUND` de `scripts/ci/compose-project.ts` (inexistente) → arquivo colapsa em 1 fail.
`pnpm test`: 4328→4329 tests, **pass 4309→4309 (não caiu)**, fail 0→1. Reconferido no fio principal.

## Assinatura para o W1
`scripts/ci/compose-project.ts`:
```ts
export const TEST_COMPOSE_PROJECT = 'core-api-test';
export const composeUpArgs = (services): readonly string[] => ['compose','-p',TEST_COMPOSE_PROJECT,'up','-d',...services,'--wait'];
export const composeDownArgs = (): readonly string[] => ['compose','-p',TEST_COMPOSE_PROJECT,'down','-v'];
```
`scripts/ci/secrets-vault.ts` (fs, baseDir parametrizável):
```ts
export const backupAndWriteTestSecrets = (baseDir, testSecrets: Record<string,string>): SecretBackup; // backup do preexistente + escreve 0o644
export const restoreSecrets = (backup): void; // restaura byte-a-byte; remove os sem original
```
`main()`: `TEST_SECRETS` vira `{filename→valor}` (sem prefixo `secrets/`), baseDir `'secrets'`; up via `composeUpArgs`; down+restore no `finally` (mesmo se o teste falhar).

## Armadilhas para o W1
1. **`-p` nos DOIS comandos** — `down -v` sem `-p` cai no projeto default e apaga o dev (o bug, CA5).
2. **Restore no `finally`** — roda mesmo com exit≠0/throw.
3. **Atualizar `tests/scripts/test-integration-auth-script.test.ts`** — casa `/'compose', 'up'/` e `/'compose', 'down', '-v'/`; com `-p core-api-test` inserido, os regexes deixam de casar. Atualizar para o novo formato (comportamento preservado — permitido).
4. **Atualizar `tests/infra/integration-script-secret-perms.test.ts`** — casa `chmodSync(...0o644)` lendo só `test-integration.ts`. Se o `chmodSync` for para `secrets-vault.ts`, apontar o teste para lá (a invariante 0o644 já está no novo CA-perm).
5. `pass` não cai: alvo pós-W1 fail=0, pass ≥ 4316 (8 novos + os 2 das armadilhas #3/#4).

## Próximo passo
W1 (GREEN) — `nodejs-process-runner` + `nodejs-fs-scripter`.
