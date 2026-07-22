# W2 — REVIEW (read-only) · FIN-PAYABLE-ACCOUNT-ACTIVE

Skill: **`code-reviewer`**. Round 1. Escopo: diff em `src/` (5 arquivos, +30/−4).

## Veredicto: **APPROVED**

## Checklist por regra

| Regra | Resultado |
| :-- | :-- |
| Domínio puro | OK — nenhum domínio novo; reusa o predicado puro `isActive`. |
| Application (factory `(deps) => (input) => Result`) | OK — `listCedenteAccountsWithBalance` mantém a forma; novo param opcional `{ onlyActive }`. |
| "`if` de negócio mora no domínio" | OK — a decisão "é ativa" está em `isActive` (domínio); o use-case só aplica o filtro. |
| Sequência validar→fetch→domain no `save-document` | OK — guard logo após o fetch da conta, antes de prosseguir. |
| Borda não vaza `Error` | OK — erro é slug; `sendDomainError` mapeia status/PT. |
| Idioma por camada | OK — código EN; erro interno `cedente-account-closed` (EN kebab); mensagem PT no dicionário; comentários PT. |
| Sintaxe TS (`import {}` valor, `.ts`, `import type`) | OK — `isActive` importado como valor; tipos como `type`. |
| Backward-compat | OK — `onlyActive` ausente = comportamento atual; único caller (plugin) passa a flag; dep via `ReturnType<typeof>` herda assinatura. |
| Status HTTP | OK — `cedente-account-closed` fora dos sets → default 422 (coerente com `cedente-account-not-found` e com CA6). |

## Observações (não-bloqueantes)

- **Guard só no caminho de save/create.** Editar um documento já vinculado a conta depois encerrada **não** é coberto — fora de escopo declarado no `000-request.md`. Se virar requisito, abrir issue (não scope-creep aqui).
- **N+1 na listagem** (uma query de extrato por conta) é pré-existente (#89c F1), não introduzido aqui; aceitável dada a baixa cardinalidade de contas-cedente.

## Testes (W0/W1)

6/6 GREEN (CA1–CA6), com 2 guards de regressão (CA2/CA5). `typecheck` verde. Nada a corrigir.
