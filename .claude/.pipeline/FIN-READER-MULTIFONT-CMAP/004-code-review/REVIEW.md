# W2 — Code Review (audit read-only) · FIN-READER-MULTIFONT-CMAP (#388 2c)

**Skill:** `code-reviewer` (agente independente) · **Rounds:** 1 · **Veredito:** **APPROVED**

## Verificado
- **RED legítimo** (só-1-CMap): `MULTI_FONT_TYPE0` tem 2 CMaps GID-disjuntos; o `find`-primeiro decodifica
  só a fonte 1 → `"NOTA FISCAL DE"` (âncora incompleta) → `malformed`. Falha pelo motivo certo.
- **Regressão:** `mergeToUnicode([cmap])` ≡ `parseToUnicode(cmap)` → Identity-H de 1 fonte inalterado.
  CA3 (boleto 1-fonte) + #389 (hostil) verdes.
- **Performance:** `mergeToUnicode` O(soma dos bytes de CMap) ≤ `MAX_TOTAL_INFLATE` (teto já no input). OK.
- **Fixture válido**; decisão **merge vs por-fonte** sólida (0 colisões medidas no DANFCOM real).

## Achado 1 (Minor) — colisão de código → **CORRIGIDO nesta wave**
O revisor apontou (com honestidade técnica) que sob colisão real (mesmo código 2-byte → chars diferentes,
possível em subsets Type0 onde o código é o GID) o "último vence" produziria **char errado silencioso** —
alucinação de valor fiscal (viola invariante #62). Recomendou degradar fail-closed.
→ **Endereçado:** `mergeToUnicode` agora **dropa** códigos ambíguos (char faltante > char errado). Teste
`COLLIDING_CMAP` prova: sob "último vence" viraria `BOLETO` (tipo falso); com fail-closed → `malformed`. 23/23.

## Achado 2 (Nit, pré-existente, fora de escopo)
Classificação de CMap por `includes('beginbfchar')` — comportamento pré-existente (não introduzido pela 2c).

## Escopo
Campos do DANFCOM (layout tabular) = **#396**.
