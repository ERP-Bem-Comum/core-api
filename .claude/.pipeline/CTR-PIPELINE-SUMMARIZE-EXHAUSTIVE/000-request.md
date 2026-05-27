# CTR-PIPELINE-SUMMARIZE-EXHAUSTIVE — `summarize` do dashboard com switch exaustivo

## Origem

Sugestão 🔵 #1 do W2 de `CTR-PIPELINE-SUPERSEDE-STATUS`
(`.claude/.pipeline/CTR-PIPELINE-SUPERSEDE-STATUS/004-code-review/REVIEW.md`).

## Problema

`scripts/pipeline/dashboard.ts` (`summarize`, ~linha 124) classifica status com cadeia
`if / else if / else`, terminando em `else blocked++`:

```ts
for (const s of snapshots) {
  if (s.state.status === 'open' || s.state.status === 'in-progress') open++;
  else if (s.state.status === 'closed-green' || s.state.status === 'closed-rejected') closed++;
  else if (s.state.status === 'superseded') superseded++;
  else blocked++; // catch-all: qualquer status futuro cai aqui silenciosamente
}
```

Esse `else` é exatamente o defeito que `CTR-PIPELINE-SUPERSEDE-STATUS` corrigiu: um status novo
adicionado ao enum `TicketStatus` sem tocar esta função será contado como `blocked` sem aviso.
Em contraste, `byStatusOf` em `scripts/pipeline/metrics.ts` usa `switch` sem `default` e seria
pego pelo `switch-exhaustiveness-check` do ESLint na próxima adição de status.

## Critérios de aceitação

- **CA1:** `summarize` passa a usar `switch (s.state.status)` exaustivo (sem `default`), de modo
  que adicionar um membro a `TicketStatus` sem atualizar a função quebre o `lint`
  (`switch-exhaustiveness-check`) — não silencie em `blocked`.
- **CA2:** Comportamento de contagem idêntico ao atual para os 6 status existentes (open,
  in-progress, closed-green, closed-rejected, superseded, blocked) — sem mudança observável no
  output do dashboard (markdown e JSON) para snapshots dos status atuais.
- **CA3:** W0 RED demonstra a regressão: um teste que prova que cada status é contado no balde
  certo (incluindo que `superseded` e `blocked` não se confundem).

## Fora de escopo

- Mudar os filtros (`filterMatches`) — já são `switch` exaustivo.
- Adicionar novos status ao enum.

## Notas

- Arquivo: `scripts/pipeline/dashboard.ts` (`summarize`). Testes: `tests/pipeline/dashboard.test.ts`.
- Refactor de comportamento-preservado: o W0 ancora a equivalência; o W1 troca if-chain por switch.
