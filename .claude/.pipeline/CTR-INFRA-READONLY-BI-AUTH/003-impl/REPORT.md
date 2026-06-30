# W1 (GREEN) — Ticket CTR-INFRA-READONLY-BI-AUTH

**Skill:** ports-and-adapters (infra/Docker — diagnóstico + fix mínimo)
**Data:** 2026-05-26T18:40Z
**Resultado:** 🟢 GREEN — suíte `mysql-compose` 21/21 (CA-5 e CA-6 destravados)

## Causa raiz (confirmada empiricamente)

O `mysqld` da imagem `mysql:8.4` roda como user `mysql` (uid **999**). O fluxo do entrypoint
oficial (`/usr/local/bin/docker-entrypoint.sh`, função `_main`) é:

1. **Como root (uid 0):** `docker_setup_env` chama `file_env 'MYSQL_PASSWORD'`, que lê
   `/run/secrets/mysql_app_password` **como root** (lê qualquer `0600`) e exporta na env.
   Em seguida `exec gosu mysql "$BASH_SOURCE"` re-executa o script como `mysql` (999),
   preservando a env já lida.
2. **Como mysql (999):** `docker_setup_db` cria `core_app` usando a senha **já em memória**;
   `docker_process_init_files` roda `docker/mysql/initdb.d/01-databases-and-users.sh`
   **como mysql (999)**, que faz `READONLY_PASSWORD="$(cat /run/secrets/mysql_readonly_password)"`.

Os secrets eram gravados com **`chmod 0600`** (por `scripts/setup-secrets.ts` e pelo
`writeSecrets()` do teste) e, via `secrets.file:` do Compose **standalone** (não-Swarm), o
arquivo é **bind-montado preservando uid/gid/mode do host** — i.e. `-rw------- 1000 1000`.
Logo o `cat` do seed, rodando como uid 999, falhava com `Permission denied`; com `set -eu` o
script abortava e **`readonly_bi` nunca era criado**.

Evidência (log do container, secret em 0600):

```
[Entrypoint]: Creating user core_app                       ← entrypoint, lido como root → OK
[Entrypoint]: running /docker-entrypoint-initdb.d/01-databases-and-users.sh
cat: /run/secrets/mysql_app_password: Permission denied    ← seed, rodando como mysql (999) → FALHA
```

```sql
-- estado resultante: readonly_bi ausente
SELECT user,host FROM mysql.user WHERE user IN ('core_app','readonly_bi');
core_app	%        -- readonly_bi NÃO existe
```

Por isso o sintoma assimétrico: `core_app` (lido pelo entrypoint como root) autentica;
`readonly_bi` (dependente do seed como mysql) dá `ERROR 1045 ... using password: YES`.

## Fix (mínimo, YAGNI)

`0640` não resolve (uid 999 não está no grupo do host-uid); é necessário o **read-bit para
`others`** → **`0644`**. Alinhado ao modo `0444` dos secrets do Docker Swarm e ao próprio CA-16
(que só proíbe world/group **write**).

| Arquivo | Mudança |
| :--- | :--- |
| `scripts/setup-secrets.ts` | `writeAtomic(file, password, 0o600)` → `0o644` + comentário do porquê; mensagem `chmod 0600`→`0644` |
| `tests/infra/mysql-compose.test.ts` | `writeSecrets()`: `chmodSync(..., 0o600)` → `0o644` (3 arquivos) |

Nenhuma mudança no seed `01-databases-and-users.sh`, no `compose.yaml` ou nos GRANTs —
o defeito era de **permissão de arquivo**, não de SQL.

## Validação empírica (antes do teste automatizado)

Com secret em `0644`, subindo o compose à mão:

```
users provisionados	core_app	%
users provisionados	readonly_bi	%          ← agora criado
readonly_bi SELECT 1            → 1
readonly_bi CREATE TABLE ...    → ERROR 1142 (42000): CREATE command denied to user 'readonly_bi'
```

`ERROR 1142` = `ER_TABLEACCESS_DENIED_ERROR` (privilege-denied) — prova que a autenticação
ocorreu e só o privilégio foi negado (CA-6 honesto, sem o falso-positivo de `1045`).

## Saída do gate (suíte mysql-compose, 21/21)

```
✔ CA-5: readonly_bi consegue SELECT
✔ CA-6: readonly_bi recebe privilege-denied (não auth-denied) ao CREATE TABLE
✔ CA-16: /run/secrets/mysql_root_password tem modo restrito (sem world/group write)
✔ CA-17: secrets NÃO aparecem em docker inspect Config.Env
✔ CA-18: volume persiste users após down (sem -v) + up
✔ CA-19: down -v apaga o volume e força init scripts na próxima subida
ℹ tests 21 · pass 21 · fail 0
```

CA-16 e CA-17 (postura de segurança) seguem GREEN: `0644` não tem write para group/world, e
as senhas continuam em `/run/secrets/*` (nunca em env var — ADR-0011 / audit M-3 preservados).

## Critérios de aceite — status

- **CA-1** (diagnóstico documentado): ✅ acima, com `mysql.user` + `cat` permission denied.
- **CA-2** (CA-5 passa): ✅
- **CA-3** (CA-6 anti-falso-positivo, 1142): ✅
- **CA-4** (ADR-0014 GRANT estrito + ADR-0011 secrets em /run/secrets): ✅ inalterados.
- **CA-5** (`pnpm test` verde de ponta a ponta): ⏭️ verificado no W3.
