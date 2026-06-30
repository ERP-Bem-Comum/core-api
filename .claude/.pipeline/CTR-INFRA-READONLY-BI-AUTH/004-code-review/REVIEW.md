# Code Review — Ticket CTR-INFRA-READONLY-BI-AUTH

> **Veredito final (Round 2): APPROVED.** O histórico do Round 1 (REJECTED) é
> preservado abaixo para auditoria. Ver §"Round 2" no fim do arquivo.

## Round 1

**Veredito:** REJECTED

**Reviewer:** code-reviewer
**Data:** 2026-05-26T18:48Z
**Escopo revisado:**
- `scripts/setup-secrets.ts` (diff W1)
- `tests/infra/mysql-compose.test.ts` (diff W1)
- `scripts/setup-secrets.design.txt` (spec do script alterado)
- `handbook/architecture/adr/0011-supply-chain-hardening.md` (postura de secrets)
- `docker/mysql/initdb.d/01-databases-and-users.sh` (consumidor do secret)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

#### Issue 1 — `scripts/setup-secrets.design.txt:16`, `:47`, `:150`

**Categoria:** G (clareza) + dívida de documentação que reintroduz o defeito.

**Problema:** O W1 corrigiu o **código** (`setup-secrets.ts` → `0o644`), mas o **design doc do
mesmo script** continua dizendo `0600` em três pontos — e a linha 16 declara, como verdade, a
**exata premissa falsa que causou este bug**:

```
:16   - modo = 0600 (apenas owner pode ler — root no host, mysql user dentro do container)
:47   → ./secrets/mysql_{root,app,readonly}_password.txt (modo 0600)
:150  AWAIT fs.chmod(file, 0o600)
```

A afirmação "0600 ... mysql user dentro do container" é **comprovadamente falsa** (W1, REPORT
003): via `secrets.file:` em Compose standalone, o bind-mount preserva o **uid do host (1000)**,
não o `mysql` (uid 999) — por isso o `cat` do seed falhava. Deixar o spec afirmando o oposto da
realidade é uma armadilha de regressão: o próximo a ler o design doc "corrige" o código de volta
para `0600` e o bug retorna.

**Esperado:** sincronizar as 3 linhas com `0644` e reescrever a linha 16 para refletir a razão
real (read-bit para `others`/uid 999 do mysqld, sem write — alinhado ao `0444` dos Swarm
secrets). Pode referenciar `CTR-INFRA-READONLY-BI-AUTH` como o ticket que estabeleceu o modo.

**Fix sugerido (linha 16):**
```
  - modo = 0644 (owner rw; others apenas read). O mysqld roda como uid 999 e o
    initdb script lê /run/secrets/* via `cat` APÓS o step-down gosu — 0600 owned
    pelo uid do host (bind-mount do compose) seria ilegível. Ver CTR-INFRA-READONLY-BI-AUTH.
```

---

## 🔵 Sugestão (não-bloqueia)

#### `scripts/setup-secrets.ts:210` — trade-off world-readable consciente

`0644` torna o secret legível por qualquer usuário do **host** (não só dentro do container).
Para dev local (arquivos gitignored, senhas `--random`/dummy, single-user), é aceitável e
alinhado ao `0444` canônico dos Docker Swarm secrets. Registro apenas para que a decisão seja
**consciente** e não vire dívida silenciosa: em produção o mecanismo de secrets é outro (não
estes `.txt`), então o afrouxamento não se propaga. Nenhuma ação exigida.

---

## Conformidade verificada (OK)

- **ADR-0011** (supply-chain): não normatiza file mode de secret `.txt`; o §6 trata do
  Permission Model do Node, não relacionado. **Sem violação.**
- **Audit M-3 / CA-17** (senhas nunca em env var, só `/run/secrets/*`): inalterado — CA-17
  segue GREEN. O fix não move nada para env.
- **ADR-0014** (GRANT estrito `readonly_bi: SELECT ON core.*`): seed e GRANTs **intocados**.
- **CA-16** (sem world/group write): `0644` = `rw-r--r--` → passa o regex `^0?[0-7][0-4][0-4]$`.
- **Fix mínimo / YAGNI:** correto — o defeito era de permissão de arquivo, não de SQL; nenhuma
  mudança especulativa no seed/compose/GRANT.
- **Teste CA-6 (categoria H):** excelente — asserção dupla (`match /CREATE command denied/` +
  `doesNotMatch /Access denied for user/`) elimina o falso-positivo de forma precisa e legível.
- **Comentários:** aderentes ao output style — explicam o "porquê" não-óbvio (invariante oculta
  do step-down gosu), não o "o quê".

---

## O que está bom

- Diagnóstico de causa-raiz exemplar: distinção entrypoint-como-root vs seed-como-mysql,
  validada empiricamente antes de tocar código.
- Correção cirúrgica (2 arquivos de produção/teste, literais + comentários).
- CA-6 deixou de ser falso-positivo — ganho de qualidade do teste além do fix.

---

## Próximo passo

**REJECTED → volta a W1 (round 1 de 3).** Aplicar **somente** a Issue 1: sincronizar
`scripts/setup-secrets.design.txt` (linhas 16, 47, 150) com `0644` e corrigir a premissa falsa
da linha 16. O código (`setup-secrets.ts` + teste) está aprovado como está — não retocar.
Após o fix, re-submeter para round 2.

---

## Round 2

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-26T18:52Z
**Escopo revisado:** `scripts/setup-secrets.design.txt` (fix do Round 1, Issue 1)

### Verificação da Issue 1 (🔴 do Round 1)

`scripts/setup-secrets.design.txt` agora sincronizado com o código:

- **`:16`** — reescrita: a premissa falsa ("0600 ... mysql user dentro do container") foi
  substituída pela explicação correta — `0644 (owner rw; others apenas read)`, com a razão
  (mysqld uid 999 lê `/run/secrets/*` após o step-down `gosu`; bind-mount do compose preserva o
  uid do host; `0600` seria ilegível). Referencia `CTR-INFRA-READONLY-BI-AUTH`.
- **`:47`** — `(modo 0600)` → `(modo 0644)`.
- **`:150`** — pseudocódigo `fs.chmod(file, 0o600)` → `0o644` + mensagem `chmod 0644`.

O único `0600` remanescente no arquivo é a menção explicativa ("0600 seria ilegível") — correta,
descreve o porquê da escolha, não uma configuração ativa.

### Veredito

**APPROVED.** A dívida documental que bloqueava o Round 1 está resolvida; o spec não contradiz
mais o código nem carrega a premissa-raiz do bug. Código de produção/teste inalterado desde o
Round 1 (permanecia aprovado). Pipeline avança para **W3**.

> **Nota de processo:** o `wave-finish W2 REJECTED` do Round 1 travou a wave em `done` no
> state-cli (forward-only; não modela reabertura). O `rounds` do W2 foi incrementado para 2 via
> `pipeline:state wave-round`, e o `outcome` ajustado para `APPROVED` no STATE.json (canônico),
> seguido de `render`. Limitação a endereçar em ticket de tooling da pipeline.
