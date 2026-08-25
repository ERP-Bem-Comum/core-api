<!--
RESEARCH (fase spec-driven). Estudo empírico dos 7 PDFs reais da P.O. — 2 rodadas:
(1) poppler (pdffonts/pdfinfo/pdftotext); (2) análise byte-a-byte reusando o pipeline real
(pdf-lowlevel.ts + native-pdf.ts) via scripts Node (node:zlib), pelo nodejs-runtime-expert.
Fixtures em handbook/guidelines/ocr-fixtures-reais/ (PII local, NÃO-versionável). Só ESTRUTURA aqui.
-->

# RESEARCH — extração profunda do reader (035, #388)

## Achado central (corrige DUAS vezes o diagnóstico)

A issue #388 descreveu as causas como "Identity-H sem `/ToUnicode`", "stream não-comprimido", "DANFCOM
com ToUnicode vazio (bfrange?)". A **rodada 1 (poppler)** já refutou "Identity-H sem ToUnicode" (nenhum
PDF é isso) e mostrou que `pdftotext` extrai os 7 → lacuna de _parsing_, não OCR. A **rodada 2
(byte-a-byte, testando o pipeline real)** substituiu **todas** as causas restantes por causas precisas —
e provou que **nenhuma precisa de fallback externo (unpdf)**: as 4 são 100% in-house.

## Causas reais (com evidência de bytes)

### A — `NFSE_00462171_FILU.pdf`: `/Length` do Flate declarado curto

Não é "stream não-comprimido". O gerador `PDFsharp 6.2.2` declara `/Length` **menor** que o deflate real;
`inflateGuarded` (que tenta `inflateSync`→`inflateRawSync`) falha (`unexpected end of file`). Com
`{ finishFlush: zlib.constants.Z_SYNC_FLUSH }` recuperam-se **100% dos 5 streams** (tamanho descomprimido
das fontes TrueType bate exato com `/Length1` → não é corrupção, é `/Length` curto).
Canônico: `handbook/reference/nodejs/Zlib.md:415-437` (suprimir erro de dado truncado via `Z_SYNC_FLUSH`,
**validando o resultado depois** — linha 439-443). Fontes usam WinAnsi puro, **sem `/Differences`**.
→ **Esforço: fácil.** Fix: `Z_SYNC_FLUSH` como 3º fallback em `inflateGuarded`.

### B — `NFS-e 8`: fragmentação `Td/Tj` quebra token hifenizado

Razão `Td/TD/T*/Tm` por `Tj` ≈ **1,0** (um posicionamento por palavra). O `extractText` fecha linha em
todo operador de posição; quando o split cai no meio de `NFS-e` (`NFS-` / `e`), a normalização
(`replace(/\s+/g,' ')`) insere espaço espúrio (`NFS- e`) e quebra o match `/NFS-e/i`. **Não** é
`/Differences` (fontes WinAnsi puras). → **Esforço: médio.** Fix: reconstruir linha pelo **delta numérico**
de `Td`/`Tm` (ΔY grande → nova linha; ΔX pequeno → concatena sem espaço; ΔX médio → espaço).

### C — `DANFCOM`: CMap `/ToUnicode` só da 1ª fonte

`readNative` faz `inflated.find(t => t.includes('beginbfchar'))` — usa **um** CMap global. DANFCOM tem
**3 fontes Type0/CID** (ArialMT, Verdana, Verdana-Bold), cada uma com CMap de **espaço de código
disjunto** (medido: 45/69 códigos de Verdana e 26/36 de Verdana-Bold ausentes no CMap de ArialMT). 2/3
das fontes decodificam para vazio. **Não** é `bfrange` (os 3 CMaps são `bfchar`-only, 0 bfrange).
→ **Esforço: médio-alto.** Fix: rastrear o operador `Tf` (fonte ativa) no tokenizer + resolver
`/Resources/Font` → CMap por fonte (exige resolver referências indiretas `N G R` — hoje o low-level não faz).

### D — `DamISS`: título/logo é imagem (não é bug do reader)

O reader **já extrai** o texto de `DamISS`/`relatorio-2` corretamente; `relatorio-2` já classifica hoje.
Em `DamISS`, `NOTA`/`NFS` não aparecem (nem fragmentados) mas `FISCAL`/`SERVI` sim, distantes — o
título é **imagem** (comum em DAM/ISS municipal). Hipóteses de D descartadas por evidência: único Form
XObject sem texto (`Tj=0/TJ=0`), sem hex strings, `/Contents` objeto único (não array).
→ **Não é bug do reader.** Ampliar `detectType()` ou aguardar OCR (#62). **Fora do escopo do #388.**

## Tabela de decisão

| PDF            | Técnica (causa real)                                | Esforço in-house |         Fatia         |
| :------------- | :-------------------------------------------------- | :--------------: | :-------------------: |
| `NFSE_FILU`    | A — `/Length` Flate curto                           |      Fácil       |        **2a**         |
| `NFS-e 8`      | B — fragmentação Td/Tj em token hifenizado          |      Médio       |        **2b**         |
| `DANFCOM` (×2) | C — `/ToUnicode` só da 1ª fonte (3 CMaps disjuntos) |    Médio-alto    |        **2c**         |
| `DamISS`       | D — logo é imagem (reader OK)                       |       N/A        | fora (issue separada) |
| `relatorio-2`  | já funciona                                         |        —         |           —           |
| `3517…3441`    | já funciona (Fatia 1)                               |        —         |           —           |

**Conclusão:** 100% in-house, sem `unpdf`. Fatiar por esforço crescente: 2a (trivial) → 2b (médio) →
2c (médio-alto). D vira issue própria (imagem/OCR).

## Fontes

- Estudo empírico local (poppler 25.x + scripts Node com `node:zlib`) sobre os 7 PDFs — 2026-07-09.
- `handbook/reference/nodejs/Zlib.md:415-443` (`finishFlush: Z_SYNC_FLUSH` para dado truncado).
- ISO 32000-1: §9.6 SimpleFont, §9.7 Type0/CIDFont, §9.10 `/ToUnicode`; §9.4 text objects (`Tf`/`Td`/`Tm`).
- ADR-0050 (cascata nativo-first; in-house principal, `unpdf` só fallback gated — **não** acionado aqui).
