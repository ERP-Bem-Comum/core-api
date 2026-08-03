---
name: w2-review
description: >
  Wave W2 — revisão adversarial do diff em contexto isolado. Um revisor que não
  viu o raciocínio que produziu o código lê apenas o diff e reporta o que afeta
  correção. Invoque com /w2-review antes de fechar uma mudança em src/.
context: fork
agent: w2-reviewer
background: false
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash
---

Revise o diff atual do working tree. Você **não** participou de escrevê-lo e não tem
acesso ao raciocínio que o produziu — julgue o resultado pelos seus próprios termos.

## 1. Obtenha o diff

```bash
git diff HEAD --stat
git diff HEAD
```

Se não houver diff contra `HEAD`, use `git diff origin/dev...HEAD`. Se ainda assim
não houver mudança em `src/` ou `tests/`, responda `SEM DIFF PARA REVISAR` e pare.

## 2. Critérios

As regras do projeto vivem em `.claude/rules/` e carregam por path. Leia as que
correspondem aos arquivos do diff:

| Diff toca | Leia |
| --- | --- |
| `src/modules/*/domain/`, `src/shared/kernel/` | `.claude/rules/domain.md` |
| `src/modules/*/application/` | `.claude/rules/application.md` |
| `src/modules/*/adapters/` | `.claude/rules/adapters.md` |
| `src/modules/*/adapters/http/`, `src/shared/http/` | `.claude/rules/http-edge.md` |
| `src/modules/{auth,partners,financial,contracts}/` | a rule do módulo correspondente |
| `src/jobs/`, `src/workers/` | `.claude/rules/jobs-and-workers.md` |
| `tests/` | `.claude/rules/testing.md` |
| `package.json`, `pnpm-workspace.yaml`, `Dockerfile` | `.claude/rules/supply-chain.md` |

## 3. O que reportar

Reporte **apenas** o que afeta correção ou viola uma regra escrita. Para cada achado:

- **arquivo:linha**
- **o que quebra** — cenário concreto de entrada/estado → saída errada
- **qual regra** — cite a rule ou o ADR, com o trecho

## 4. O que NÃO reportar

Um revisor instruído a achar lacunas encontra alguma mesmo quando o trabalho está
correto — e perseguir toda descoberta leva a over-engineering: camadas de abstração
extras, código defensivo e testes para casos que não podem acontecer.

Não reporte: preferência de estilo, sugestão de refatoração sem defeito associado,
"poderia ser mais genérico", ou qualquer coisa que `eslint`, `tsc`, `prettier` e
`semgrep` já barram — se o gate passa, aquilo não é achado.

## 5. Veredito

Termine com exatamente uma linha:

- `APROVADO` — nenhum achado de correção
- `APROVADO COM RESSALVAS` — achados que não bloqueiam, listados
- `REPROVADO` — pelo menos um achado de correção, listado

Não escreva arquivo de relatório. Seu retorno **é** o relatório: quem invocou recebe
o texto no turno e age sobre ele.
