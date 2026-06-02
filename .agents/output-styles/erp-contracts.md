---
name: erp-contracts
description: ERP Bem Comum core-api — idioma PT/EN por camada, citação literal do handbook, commit PT-BR
keep-coding-instructions: true
---

# Regras de comunicação — ERP-CONTRACTS

Estas instruções são complementares ao AGENTS.md raiz. Aplicam-se a TODA resposta nesta sessão.

## Idioma (invariante)

| Onde                                                                            | Idioma                                                                                                      |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Diálogo com o usuário, REPORT/REVIEW.md, STATE.md, ticket files, planning notes | **PT-BR** com acentuação completa (nunca substituir "ção" por "cao", "código" por "codigo")                 |
| Código (tipos, funções, variáveis, paths, identifiers)                          | **EN**                                                                                                      |
| Strings ao humano na CLI (mensagens, erros formatados)                          | **PT-BR** via dicionário em `cli/formatters/`                                                               |
| Erros internos (string literal unions)                                          | **EN kebab-case** — `'contract-not-active'`, `'amendment-already-homologated'`                              |
| Eventos de domínio                                                              | **EN passado** — `ContractCreated`, `AmendmentHomologated`                                                  |
| Tickets / pipeline IDs                                                          | **EN** — `CTR-VO-MONEY`, `CTR-OUTBOX-PUBLIC-API`                                                            |
| Commit messages                                                                 | **PT-BR** com escopo de módulo — `feat(contracts): adiciona VO Money`, `fix(outbox): corrige race em claim` |

## Citação do handbook

Quando referenciar `handbook/architecture/adr/*`, `handbook/reference/<tech>/*` ou qualquer doc do handbook:

- **Abra o arquivo** com Read e cite literalmente o trecho.
- **NUNCA** cite "de memória" — ADRs e referência são imutáveis e específicos.
- Use o formato `path/to/file.md:LINHA` para o usuário navegar.

## Hierarquia de fontes em conflito

Se duas fontes discordarem, vence quem está mais alto:

```
1. handbook/architecture/adr/  ← ADRs aceitos, IMUTÁVEIS
2. handbook/ (domínio, reference/<tech>/, inquiries)
3. AGENTS.md raiz + .agents/rules/*.md
4. .agents/agents/<agent>.md
5. .agents/skills/<skill>/SKILL.md
6. .agents/skills/<skill>/references/* (não-normativo)
```

Nunca contradizer ADR aceito. Para mudar regra de ADR, abrir novo ADR que `supersedes` o anterior e registrar em `handbook/CHANGELOG.md`.

## Pipeline W0→W3

Toda mudança em código de produção passa por ticket em `.claude/.pipeline/<TICKET-ID>/`. Bug fix trivial (1-3 linhas) ou config pode ir direto.

Disciplina invariante:

- W0 RED antes de tocar `src/`
- W1 implementa o mínimo (YAGNI estrito)
- W2 read-only, máximo 3 rounds antes de escalar humano
- W3 = `pnpm run typecheck` + `pnpm run format:check` + `pnpm test` + `pnpm run lint` todos verdes

## Package manager

**NUNCA `npm`. SEMPRE `pnpm`** (ADR-0012). Hook `PreToolUse(Bash)` bloqueia `npm *`. Doc/PR com `npm install` deve ser convertido antes de qualquer outra ação.

## Estilo de resposta

- Respostas concisas. Direto ao ponto. Sem "great question!", sem repetir pergunta do usuário.
- Updates curtos antes de tool calls: uma frase descrevendo o que vai fazer.
- Fim de turn: 1-2 frases sobre o que mudou e qual o próximo passo.
- Comentários em código: padrão é zero. Adicionar SOMENTE quando o "porquê" é não-óbvio (invariante oculta, workaround documentado, decisão de design contraintuitiva).
- Não citar tarefa atual no código (`// adicionado pelo ticket X`, `// para o fluxo Y`).
- Não criar arquivos `.md` de plano/análise a menos que o usuário peça.

## Anti-padrões deste output style

1. Pedir confirmação para tarefas com escopo claro — execute e reporte.
2. Inventar caminho de arquivo do handbook — sempre `Read` antes de citar.
3. Misturar idiomas dentro de uma mesma camada (ex.: variável PT-BR em código).
4. Resumir o que o usuário acabou de pedir antes de agir.
