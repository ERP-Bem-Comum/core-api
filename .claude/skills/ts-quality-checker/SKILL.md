---
name: ts-quality-checker
description: >
  Gate de qualidade do core-api. Roda typecheck, format:check, lint e test com pnpm,
  e reporta o veredito com a saída literal de cada comando. Vermelho não fecha turno.
---

# TS Quality Checker

## Persona

Você roda o gate e reporta o resultado **sem interpretar**. Veredito é binário: **VERDE** ou
**VERMELHO**. Não existe "quase verde", "só um teste falhando" nem "isso já estava quebrado".

> **Fronteira:** roda comandos via Bash e relata. **Não** escreve arquivo de relatório e **não**
> corrige código — quem corrige é quem chamou, com a informação que você devolveu.

---

## Os quatro comandos, nesta ordem

```bash
pnpm run typecheck      # tsc --noEmit
pnpm run format:check   # prettier --check .
pnpm run lint           # eslint . --cache
pnpm test               # node --test 'tests/**/*.test.ts'
```

Ordem = mais barato primeiro, para o vermelho aparecer cedo. **Sempre `pnpm`** — `npm` é barrado por
hook e por [ADR-0029](../../../handbook/architecture/adr/0029-pnpm-11-supply-chain-defaults.md);
escrever `npm` ou `npx` em doc, script ou comentário é o anti-padrão nº 1 do `CLAUDE.md`.

**O escopo é o repositório inteiro**, não `src/` e `tests/`. Um `.ts` em `scripts/`, `db/drizzle/`
ou na raiz conta igual: `scripts/ci/*.ts` roda em CI e `db/drizzle/*.ts` decide o que a migration
gera.

Para investigar um teste específico:

```bash
node --test --experimental-strip-types --enable-source-maps --no-warnings \
  --test-name-pattern="<regex>" tests/caminho/do/arquivo.test.ts
```

---

## ⚠️ Ler o SUMÁRIO, nunca o `tail`

O runner do Node imprime testes marcados `todo` **sob o cabeçalho `✖ failing tests:`**, mesmo com
`fail 0`. Quem lê as últimas linhas conclui vermelho onde há verde. A única leitura válida é o
sumário:

```bash
pnpm test 2>&1 | grep -E '^ℹ (tests|suites|pass|fail|skipped|todo)'
```

`fail 0` é verde, com quantos `todo` houver. Um `todo` que ainda aparece é dívida **registrada**,
não regressão.

---

## O que `pnpm test` cobre além do óbvio

`tests/cleanup/` guarda **invariantes estruturais** que varrem o fonte — não são testes de unidade.
Falha ali costuma significar que uma afirmação sobre o repositório deixou de valer, não que uma
função quebrou. Dois exemplos que confundem quem vê pela primeira vez:

- `rules-self-verify.test.ts` — confere o bloco `verify:` das `.claude/rules/`. Falha **tanto na
  piora quanto na melhora**: se o teste que a rule dizia faltar passou a existir, a afirmação tem de
  sair da rule.
- `gate-asserts-property-not-prose.test.ts` — gate assegura **propriedade**, nunca contagem.

Gate estrutural pergunta ao **git** (`git ls-files`, `git check-ignore`), nunca ao disco: resposta
que muda entre a máquina de quem escreve e o runner não verifica nada.

---

## Como reportar

| Comando | Veredito | Evidência |
| :--- | :--- | :--- |
| `typecheck` | ✅ / ❌ | erros `TSxxxx` com `arquivo:linha` |
| `format:check` | ✅ / ❌ | arquivos fora do padrão |
| `lint` | ✅ / ❌ | regra + `arquivo:linha` |
| `test` | ✅ / ❌ | linha `ℹ fail N` do sumário |

Vermelho: cole a saída **literal**, sem resumir. Verde: uma linha por comando basta.

---

## Onde o gate é mecânico (não depende desta skill)

- **Hook `Stop`** — `.claude/hooks/stop-quality-gate.sh` roda o gate ao fim do turno quando o diff
  toca `.ts`, um arquivo de config do gate ou uma `.claude/rules/*.md`, e devolve exit 2 no
  vermelho. Log em `.claude/.last-quality-gate.log`.
- **`.githooks/pre-commit`** — delega para `.claude/hooks/pre-commit-typecheck.sh` sobre o `.ts`
  staged. Exige `git config core.hooksPath .githooks`; o hook `SessionStart`
  (`ensure-git-hookspath.sh`) garante isso a cada sessão.

Esta skill é para quando você quer o veredito **agora**, no meio do trabalho — não substitui os dois.

---

## Política de regressão zero

Norma no [`CLAUDE.md`](../../../CLAUDE.md) raiz, seção "Política de regressão zero" — **não replicada
aqui**. Vermelho não fecha turno; as saídas aceitáveis e seus limites estão lá.

---

## Anti-padrões

| ❌ Errado | ✅ Certo |
| :--- | :--- |
| `npm run` / `npx` em qualquer lugar | `pnpm run` / `pnpm exec` |
| Ler o `tail` da saída de teste | Ler a linha `ℹ fail N` do sumário |
| "Está tudo OK" sem evidência | Saída literal de cada comando |
| Modificar código para "consertar" o vermelho durante o gate | Reportar; a correção é passo separado |
| Tratar `format:check` como cosmético | Faz parte do gate |
| Veredito ambíguo ("quase verde") | Binário: VERDE ou VERMELHO |
| `skip` num teste vermelho | Consertar ou escalar |

---

## Skills relacionadas

Próximo teste do ciclo: [`tdd-strategist`](../tdd-strategist/SKILL.md) · onde um teste deve viver:
[`test-pyramid-engineer`](../test-pyramid-engineer/SKILL.md) · revisão de diff:
[`code-reviewer`](../code-reviewer/SKILL.md).

---

## Changelog

- **2026-08-17:** Reescrita. A versão anterior mandava rodar `npm`/`npx`, escrevia em
  `.pipeline/<TICKET>/005-quality/REPORT.md`, falava em waves W0→W3 e apontava para um diretório
  `ERP-CONTRACTS` que não existe — tudo removido em 2026-08-06. Acrescentado o gotcha do `todo` sob
  `✖ failing tests:` e o papel de `tests/cleanup/`.
- **2026-05-14:** Criação.
