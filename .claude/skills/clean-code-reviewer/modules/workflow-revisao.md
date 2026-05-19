# Workflow de Revisão de Código

Aplica-se quando o usuário pede code review, revisão de PR, ou análise de qualidade.

---

## Passo 1 — Entender o código

Leia o código com atenção. Identifique a linguagem, o domínio aparente e o propósito.

## Passo 2 — Mapear os achados

Para cada problema potencial:
- **Qual princípio** está sendo violado?
- **Em qual livro** esse princípio está descrito?
- **Em qual linha do .md** posso achar a defesa?

## Passo 3 — Buscar a citação ANTES de escrever a crítica

Use `shared-tools/buscar.py` com palavras-chave do princípio. **Não escreva a crítica antes de ter a citação em mãos.**

## Passo 4 — Estruturar o output

Sempre nesta ordem:

```
## Achado N — [Severidade] Título do problema

**Onde:** linha X-Y do código revisado
**Princípio violado:** [nome]

**Defesa do princípio (do livro):**

> [citação literal com 4+ linhas]
> — *(Linha XXX, p. YY, AUTOR, *LIVRO*)*

**Análise:**
[Sua explicação aplicando ao código revisado]

**Sugestão:**
```código refatorado```
```

## Passo 5 — Resumo final

```
| # | Severidade | Achado | Linha |
|---|---|---|---|
| 1 | Crítico | God function | 12-89 |
| 2 | Maior | Naming inadequado | 14, 22 |
```

---

## Severidades

- **Crítico** — bug em potencial, viola contrato do código, ou torna manutenção inviável.
- **Maior** — degrada legibilidade ou flexibilidade significativamente.
- **Menor** — convenção ou polimento.
- **Sugestão** — opcional, oportunidade de melhora.

---

## Entregável

Uma revisão objetiva, com 5–15 achados (depende do tamanho do código), cada um justificado por citação literal do livro pertinente, terminando com quadro consolidado de severidades.
