# CTR-PIPELINE-SUPERSEDE-NO-SELF — `supersede` recusa auto-referência (`--by` == ticket)

## Origem

Sugestão 🔵 #2 do W2 de `CTR-PIPELINE-SUPERSEDE-STATUS`
(`.claude/.pipeline/CTR-PIPELINE-SUPERSEDE-STATUS/004-code-review/REVIEW.md`).

## Problema

`scripts/pipeline/state-cli.ts` (`cmdSupersede`) não impede que um ticket seja marcado como
superado por **si mesmo**:

```bash
pnpm run pipeline:state supersede CTR-X --by CTR-X
```

Hoje isso gravaria `status: 'superseded'`, `supersededBy: 'CTR-X'` — uma auto-referência sem
sentido (o ticket aponta para si como vencedor). O comando só valida: flag `--by` presente, alvo
não-terminal (`closed-green`/`superseded`), e existência do ticket vencedor (que, sendo o próprio,
existe). Falta a guarda de identidade.

## Critérios de aceitação

- **CA1:** `supersede <ticket> --by <ticket>` (mesmo id) falha com `EXIT=2` (violação de
  invariante) e mensagem clara; o `STATE.json` do ticket **não** é alterado (segue `open`/etc.).
- **CA2:** Caso normal (`--by` != ticket) segue funcionando — sem regressão nos testes existentes
  de `supersede` (CA-S1/S2/S3 em `tests/pipeline/state-cli.test.ts`).
- **CA3:** W0 RED cobre a auto-referência.

## Fora de escopo

- Detecção de ciclos transitivos (`A --by B`, depois `B --by A`) — YAGNI; só a auto-referência
  direta é tratada aqui.
- Validar que o vencedor não seja, ele próprio, um ticket `superseded` (cadeia) — não é defeito.

## Notas

- Arquivo: `scripts/pipeline/state-cli.ts` (`cmdSupersede`). Testes: `tests/pipeline/state-cli.test.ts`.
- Guarda mínima: `if (winner === ticket) exitFail(2, ...)` antes de aplicar o novo estado.
