# W2 — code review (self, read-only) — FIN-OFX-COMMA-DECIMAL (#531)

**Veredito: APPROVED.**

- Fix mínimo: `raw.trim().replace(',', '.')` antes do regex. Uma linha, sem tocar a lógica de centavos
  (parte inteira × 100 + frac) nem o sinal.
- **Sem regressão do ponto**: `.replace(',', '.')` não altera string com ponto; CA3/CA4 verdes antes e depois.
- **Cobre CSV também**: `csv-parser.ts` usa a mesma `parseAmountCents` — o fix vale para os dois parsers
  sem mudança adicional.
- **Separador de milhar fora de escopo (YAGNI)**: OFX `<TRNAMT>` não agrupa; `replace(',', '.')` troca só a
  1ª vírgula. `1.234,56` → `1.234.56` → segue `null` (não regride; era `null` antes). Documentado no request.
- Regex de validação preservado — entrada malformada segue rejeitada (retorna `null` → `malformed-statement`
  no parser, comportamento correto para lixo real).

Sem Blocker/Major/Minor. 1 round.
