# W0 — Teste RED · FIN-READER-LINE-RECONSTRUCT (#388 2b)

**Skill:** `tdd-strategist` · **Outcome:** RED

## Fixture
`FRAGMENTED_HYPHEN`: `(Documento Auxiliar NFS-) Tj 25 0 Td (e Servico) Tj` — o token `NFS-e` fica em 2
`Tj` com um `Td` de avanço horizontal (ty=0) entre eles; campos `Numero da Nota: …` e `Valor Total: …`
em linhas próprias.

## Evidência RED
Hoje o `flushLine()` cego quebra a linha no `Td` ty=0 → o colapso de whitespace vira `NFS- e` →
`detectType /NFS-e/` não casa → `err('malformed-document')` (o `assert ok=true` falha).
