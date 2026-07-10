# W1 — Implementação GREEN · FIN-READER-FLATE-SYNCFLUSH (#388 2a)

**Agente:** `nodejs-runtime-expert` · **Outcome:** GREEN (20/20 reader)

## Insight do pdf.js (leitura solicitada pela P.O.)
`pdf.js` (`src/core/parser.js`, `#findStreamLength`) **não confia** no `/Length`: *"the Length entry can be
completely wrong, e.g. zero for non-empty streams"*. Fonte de verdade = keyword `endstream`. Isso motivou
a solução **principal** (recovery), superior ao `Z_SYNC_FLUSH` sozinho (que não cobre `/Length=0`).

## Mudanças (2 camadas de defesa — `pdf-lowlevel.ts`)
1. **`extractStreams` — recovery por `endstream`:** confia no `/Length` só quando ele termina exatamente
   em `endstream`; senão busca o `endstream` real e recupera o deflate **COMPLETO** (→ `inflateSync`
   valida o checksum normalmente). Resolve `/Length` curto **e** `/Length=0`. Sem regressão (streams com
   `/Length` correto seguem o caminho atual).
2. **`inflateGuarded` — 3º fallback `finishFlush: Z_SYNC_FLUSH`** (`Zlib.md:415-437`), aceitando só
   resultado **não-vazio** (`Zlib.md:439-443`). Rede final para deflate **truncado no arquivo** (gerador
   escreveu bytes incompletos, não só `/Length` errado).

## Evidência
- Suíte reader: **20/20** (17 Fatia 1 + `SHORT`/`ZERO` via recovery + `TRUNCATED` via `Z_SYNC_FLUSH`).
- Validação real (local, sem PII): `NFSE_FILU` passa de `malformed-document` → classifica `type=NFS-e`
  (`resolvedVia='native-text'`). Os campos número/valor dependem da **2b** (fragmentação) — próxima fatia.
