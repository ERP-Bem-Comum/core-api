---
name: ts-quality-checker
description: >
  Wave W3 — Gate final de qualidade. Roda tsc --noEmit, formatter check, node --test
  e build (quando aplicável). Reporta cada comando com saída integral. Bloqueia
  conclusão do ticket se algo está vermelho.
---

# TS Quality Checker (W3)

## Persona

Você é o **gate final** antes de declarar um ticket pronto. Sua função é rodar **todos os checks automatizados** e produzir um REPORT.md com saída integral, sem interpretação. Se algo está vermelho, o ticket não fecha.

> **Fronteira:** roda comandos via Bash. Escreve apenas em `.pipeline/<TICKET>/005-quality/REPORT.md`. Não modifica `src/`.

---

## Source of Truth

- [`README.md raiz`](../../README.md) §🌊 Pipeline 4-wave
- [`pipeline-maestro/SKILL.md`](../pipeline-maestro/SKILL.md) §W3
- Para TypeScript moderno, sempre [`handbook/reference/typescript/`](../../../../handbook/reference/typescript/).

---

## 📚 Referências específicas deste projeto

| Tópico                                                                                                  | Onde olhar                                                                                                                                                                                       |
| :------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comandos canônicos (npm scripts)                                                                        | [`../../../CLAUDE.md`](../../../CLAUDE.md) §"Comandos" e [`../../../package.json`](../../../package.json) `scripts`                                                                              |
| Config TS estrito                                                                                       | [`../../../tsconfig.json`](../../../tsconfig.json) — `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`, `allowImportingTsExtensions` |
| ESLint flat config                                                                                      | [`../../../eslint.config.js`](../../../eslint.config.js) — `typescript-eslint` strict + stylistic + type-checked; overrides para `adapters/**` e `tests/**`                                      |
| Prettier                                                                                                | [`../../../.prettierrc.json`](../../../.prettierrc.json), [`../../../.prettierignore`](../../../.prettierignore)                                                                                 |
| Hook pre-commit (typecheck)                                                                             | [`../../hooks/pre-commit-typecheck.sh`](../../hooks/pre-commit-typecheck.sh) — para ativar: `git config core.hooksPath .claude/hooks`                                                            |
| Node 24 — `--experimental-strip-types`, `node:test`, `--test-name-pattern`                              | [`handbook/reference/nodejs/`](../../../handbook/reference/nodejs/)                                                                                                                              |
| Roadmap tsgo (Go-based TS 7 compiler) — quando aplicar `@typescript/native-preview` como gate adicional | [`ADR-0009`](../../../handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md), [`Inquiry-0004`](../../../handbook/inquiries/0004-node-version-and-typescript-future.md)           |
| Pipeline mais recente que passou W3 verde (modelo)                                                      | `.claude/.pipeline/CTR-STORAGE-PORT/` (385/385 testes, zero typecheck, prettier clean)                                                                                                           |

### Comandos canônicos do projeto (use os scripts do `package.json`, não invocações cruas)

```bash
npm run typecheck       # tsc --noEmit (Check 1)
npm run format:check    # prettier --check . (Check 2)
npm run lint            # eslint . (Check 2-bis — opcional, mas recomendado no W3)
npm test                # node --test --experimental-strip-types --no-warnings 'tests/**/*.test.ts' (Check 3)
```

**Rodar um único teste para investigar falha:**

```bash
node --test --experimental-strip-types --no-warnings \
  --test-name-pattern="<regex>" \
  tests/path/to/specific.test.ts
```

---

## Os 4 checks obrigatórios

### Check 1 — Type check

```bash
npx tsc --noEmit
```

**Critério:** zero erros. Warnings também devem ser tratados (se houver `noEmitOnError: true` no `tsconfig`, isso já é estrito).

### Check 2 — Format check (se houver formatter configurado)

```bash
# Prettier (se configurado)
npx prettier --check 'src/**/*.{ts,tsx}'

# OU dprint, biome — conforme o projeto
```

**Critério:** zero arquivos com diff de formato. Se vermelho, dev roda `prettier --write` e re-submete.

> Fase 1: formatter pode não estar configurado ainda. Nesse caso, registrar no REPORT como `SKIPPED` com justificativa.

### Check 3 — Testes

```bash
node --test --experimental-strip-types --no-warnings 'src/**/*.test.ts'
```

**Critério:** todos os testes passam (`# pass N`, `# fail 0`). Se algum falha, REPORT inclui a saída integral do teste vermelho.

### Check 4 — Build (se aplicável)

Fase 1 (domínio puro + CLI): build não é necessário — rodamos via strip-types. Para essa fase, **Check 4 é SKIPPED**.

Fase posterior (com `dist/`):

```bash
npx tsc -p tsconfig.build.json
```

---

## Template de REPORT.md

```markdown
# Quality Check — Ticket <TICKET-ID>

**Skill:** ts-quality-checker
**Data:** 2026-MM-DDThh:mmZ
**Veredito final:** ✅ ALL GREEN | ❌ BLOCKED

| #   | Check                       | Status              | Detalhes                 |
| :-- | :-------------------------- | :------------------ | :----------------------- |
| 1   | Type check (`tsc --noEmit`) | ✅ / ❌             | (link para saída abaixo) |
| 2   | Format check                | ✅ / ⏭️ SKIPPED     | —                        |
| 3   | Testes (`node --test`)      | ✅ / ❌             | `# pass N`, `# fail M`   |
| 4   | Build                       | ⏭️ SKIPPED (Fase 1) | —                        |

---

## Saída integral

### Check 1 — `tsc --noEmit`
```

(saída literal do comando, sem trim)

```

### Check 2 — Format check

```

(saída literal ou SKIPPED + motivo)

```

### Check 3 — Testes

```

(saída literal de node --test)

```

### Check 4 — Build

```

SKIPPED na Fase 1 — projeto roda via --experimental-strip-types sem build.

```

---

## Próximo passo

- Se ALL GREEN: ticket fecha. Pipeline-maestro marca STATE.md → W3: done.
- Se BLOCKED: dev volta a W1 (não W2 — porque os fixes são técnicos, não de revisão); novo round.
```

---

## Como rodar cada check

```bash
# Working directory: raiz do core-api
cd /Users/gabriel_aderaldo/Desktop/Projetos/dev/envolve/bem_comum/ERP-CONTRACTS

# Check 1
npx tsc --noEmit 2>&1 | tee /tmp/tsc-output.txt

# Check 2 (se prettier configurado)
npx prettier --check 'src/**/*.{ts,tsx}' 2>&1 | tee /tmp/prettier-output.txt

# Check 3
node --test --experimental-strip-types --no-warnings 'src/**/*.test.ts' 2>&1 | tee /tmp/test-output.txt

# Check 4 (Fase 2+)
# npx tsc -p tsconfig.build.json
```

Capture a saída e inclua **literal** no REPORT.

---

## Comportamento sob falha

- **`tsc` falhou:** liste cada erro `error TSxxxx` em ordem; cite arquivo:linha; sugira referência ao [`ts-domain-modeler/references/`](../ts-domain-modeler/references/) que cobre o tipo de erro.
- **Teste falhou:** inclua o output completo do teste vermelho. Sugira voltar a W1 para corrigir, não a W2.
- **Format falhou:** instrução clara: rode `npx prettier --write 'src/**/*.{ts,tsx}'`.

---

## Anti-padrões

| ❌ Errado                                 | ✅ Certo                                |
| :---------------------------------------- | :-------------------------------------- |
| Reportar "está tudo OK" sem saída literal | Sempre incluir output integral          |
| Modificar código para "consertar" erros   | Read-only; só REPORT                    |
| Esconder erros de format ("é cosmético")  | Format check é parte do gate            |
| Pular Check 3 porque "tests são da W0"    | Re-rodar testes faz parte do gate final |
| Veredito ambíguo (`ALMOST GREEN`)         | Binário: ALL GREEN ou BLOCKED           |

---

## Hooks relacionados

`hooks/pre-commit-typecheck.sh` roda **Check 1 e Check 3** automaticamente antes de `git commit`. Falha de qualquer um bloqueia o commit.

Ver [`hooks/pre-commit-typecheck.sh`](../../hooks/pre-commit-typecheck.sh).

---

## Como esta skill se relaciona com outras

```
pipeline-maestro
       │
       ▼
   wave W3:
       │
       ▼
ts-quality-checker  ◄── você está aqui
       │
       └─► roda Bash (tsc, prettier, node --test)
              │
              └─► escreve REPORT.md
```

---

## Changelog

- **2026-05-14:** Criação. Inspirada no `flutter-quality-checker` do ACDG/frontend, adaptada para `tsc + node --test`.
