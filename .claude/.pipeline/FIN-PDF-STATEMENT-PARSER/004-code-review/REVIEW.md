# W2 — code review (self, read-only) — FIN-PDF-STATEMENT-PARSER

**Veredito: APPROVED.**

## Conceito (spec "Leitura de Extrato por Gabarito")
O PDF vira **mais uma fonte** do MESMO `ParsedStatement` que o OFX — a conciliação **não muda**. `documento`
(coluna do extrato) → `fitid` (chave de conciliação, == OFX). Camada de texto via `unpdf` (sem OCR de imagem).

## Implementação
- **`parsePdf(text)`** puro/sync (igual ao `parseOfx`): isola a folha 1 (conta-corrente; corta em "Extrato de
  Investimentos"), quebra por data, extrai valor/saldo/documento. **Sinal pelo DELTA de saldo** (texto
  linearizado perde a coluna) + **validação de continuidade** (`saldo_ant + valor == saldo` → divergência =
  `malformed-statement`). Mapeia p/ `ParsedTransaction` (fitid/date/movement/valueCents/balanceAfterCents).
- **Dispatcher** `bankStatementParser.parse` → **async** (o `unpdf` é async): OFX/CSV seguem síncronos por
  dentro; `case 'PDF'` decodifica base64 → `unpdf` extrai texto → `parsePdf`. Exhaustive switch mantido.
- **Ripple async contido**: port (`Promise`), use-case (`await`, +format 'PDF'), `StatementFile.format` +'PDF',
  schema `enum(['OFX','CSV','PDF'])`, `fake-parser` async. 3 testes existentes ajustados p/ o await (spec nova,
  não enfraquecimento).

## Cobertura
- `parsePdf` sobre o texto-gabarito: 23/23 transações, saldos, continuidade, folha 2 excluída (6 CA).
- Caminho completo **base64 → unpdf → parsePdf** com o PDF real fictício (fixture .base64) + caminho de erro
  (base64 não-PDF → `malformed-statement`, sem vazar exceção). Roda no `pnpm test` puro (unpdf in-process).

## Escopo / limites (documentados)
- v1: **layout Bradesco conta-corrente** (folha 1). Investimentos (folha 2) fora. Cada banco novo = um gabarito
  a mais (a detecção por marca do cabeçalho é a extensão natural — spec §"cadastrar novo layout").
- Sinal por delta de saldo (determinístico p/ este layout); a detecção por coluna-x (coordenadas) é
  endurecimento futuro. ADR-0027 (Zod na borda), adapters.md (try/catch → Result; zero throw cruzando a borda).

Sem Blocker/Major/Minor. 1 round.
