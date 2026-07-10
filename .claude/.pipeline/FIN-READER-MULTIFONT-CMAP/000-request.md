# FIN-READER-MULTIFONT-CMAP — Fatia 2c: CMap de múltiplas fontes (#388)

**Issue:** #388 (sub-fatia 2c) · **Spec:** `035` · **Size:** L (reduzido a ~S pela medição) · **Alvo:** `DANFCOM`

## Problema
`readNative` usa só o **primeiro** CMap `/ToUnicode` (`inflated.find(beginbfchar)`). PDFs com múltiplas
fontes Type0 (DANFCOM: 3 fontes ArialMT/Verdana/Verdana-Bold) têm 1 CMap por fonte; só a 1ª decodifica,
as outras → texto vazio.

## Decisão de arquitetura (medição, não suposição)
Medido no DANFCOM real: **3 CMaps, 129 entradas, 74 únicos, 0 COLISÕES** (códigos que aparecem em >1
CMap mapeiam para o mesmo char). Logo, **mesclar todos os CMaps** num único mapa é seguro e resolve o
DANFCOM — **sem** reescrever o low-level para resolver `/Resources/Font` + rastrear `Tf` (abordagem
por-fonte, muito mais cara). Se algum PDF real colidir (mesmo código → chars diferentes), degrada (último
vence) sem vazar exceção → follow-up, não bloqueia.

## Critérios de aceite
- **CA-2c:** 2 fontes Type0 com CMaps distintos (GIDs disjuntos) → mescla → classifica.
- **CA-classificação-real:** `DANFCOM` (hoje `malformed`) → classifica `DANFE`.
- **CA-regressão:** Fatia 1/2a/2b verdes (Identity-H de 1 fonte = merge de 1 CMap, inalterado).

## Solução
`mergeToUnicode(cmaps)`: combina os `bfchar` de todos os streams com `beginbfchar`. `readNative` usa o mapa mesclado.

## Escopo
Campos do DANFCOM (layout tabular) = **#396**. A 2c entrega a **classificação**.

## DoD
W0 RED → W1 → W2 → W3 verde. Suíte do reader **22/22**.
