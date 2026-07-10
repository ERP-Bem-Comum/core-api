<!--
SPEC (fase spec-driven, pré-W0). Idioma: PT-BR (doc). Erros EN kebab. Eventos EN passado.
Ancorada em ADR-0050 (cascata nativo-first, Accepted). Continuação de 034-fin-documento-reader (#386).
Causas confirmadas byte-a-byte em research.md (2 rodadas). Issue #388 estava imprecisa — ver research.
-->

# SPEC — Reader PDF: extração profunda (`fin-reader-deep-extract`, fatia 2)

> **Tipo:** feature · **Size:** L (3 sub-fatias) · **Módulo:** `financial` · **Épico:** #62 · **Issue:** #388
> **ADRs:** **ADR-0050** (cascata nativo-first, in-house) · ADR-0006 (ports&adapters) · ADR-0011 (evitar-libs)
> **Depende de:** `034-fin-documento-reader` (Fatia 1, #386 — `native-pdf.ts` + `pdf-lowlevel.ts`, em `dev`).
> **Status:** rascunho pós-research (2026-07-09). Causas confirmadas byte-a-byte (`research.md`).

## 1. Problema & contexto (o PORQUÊ)

A Fatia 1 (#386) entregou o reader nativo de PDF de texto. Na amostra real da P.O. (7 PDFs fiscais),
**2 extraem** e **3 não** (2 já eram baseline saudável). Os 3 que faltam **não são imagem/OCR** — são
PDFs de texto que o reader não alcança por **3 defeitos pontuais de parsing**, confirmados byte-a-byte
(`research.md`). Enquanto não os lê, o operador continua **digitando à mão** — o custo que o épico #62
(ADR-0050) existe para eliminar. Objetivo: fechar esses 3 defeitos, **100% in-house** (nenhuma dep nova).

> A issue #388 diagnosticou "Identity-H sem `/ToUnicode`" — **refutado**: nenhum PDF é isso. As causas
> reais estão abaixo (research). `relatorio-2.pdf` **é NFS-e e já funciona**.

## 2. Escopo — 3 sub-fatias por esforço crescente

| Sub-fatia | Defeito (causa real)                                                              | PDF alvo       | Fix in-house                                                                                                |  Esforço   |
| :-------- | :-------------------------------------------------------------------------------- | :------------- | :---------------------------------------------------------------------------------------------------------- | :--------: |
| **2a**    | `/Length` do stream Flate declarado **curto** (PDFsharp) → `inflateGuarded` falha | `NFSE_FILU`    | 3º fallback `finishFlush: Z_SYNC_FLUSH` em `pdf-lowlevel.ts`, **validando o resultado** (`Zlib.md:439-443`) |   Fácil    |
| **2b**    | fragmentação `Td/Tj` ≈1:1 quebra token hifenizado (`NFS-e`→`NFS- e`) no match     | `NFS-e 8`      | reconstruir linha por **delta numérico** de `Td`/`Tm` (não flush cego por operador)                         |   Médio    |
| **2c**    | `/ToUnicode` só da **1ª** fonte; 3 fontes Type0 com CMaps disjuntos → 2/3 vazias  | `DANFCOM` (×2) | rastrear `Tf` (fonte ativa) + resolver `/Resources/Font` → CMap por fonte                                   | Médio-alto |

**OUT (não-objetivos):**

- **D — `DamISS`: título/logo é imagem** (reader já extrai o resto). Ampliar `detectType()` ou OCR →
  **issue separada**, não é bug do reader.
- OCR de imagem/escaneado (adiado — ADR-0050 degrau 3); novos tipos de documento; borda/storage/wiring.
- Decode de fonte embutida sem `/ToUnicode` (`/Differences`/`CIDToGIDMap`) — **não necessário** (nenhum PDF exige).
- Fallback externo `unpdf` — **não acionado** (as 3 causas são resolvíveis nativamente).

## 3. Critérios de aceitação (viram os testes do W0)

> Fixtures **sintéticos por defeito** (commitáveis, dados FALSOS); os 7 reais = prova final local (PII).

- **CA-2a — Flate com `/Length` curto.** Dado um stream `/FlateDecode` cujo `/Length` declarado é menor
  que o deflate real, quando `read(bytes)`, então o low-level infla via `Z_SYNC_FLUSH` (após `inflateSync`/
  `inflateRawSync` falharem), **valida** o resultado, e o texto é extraído — sem aceitar lixo truncado.
- **CA-2b — token hifenizado fragmentado.** Dado um content stream que emite `NFS-e` em dois `Tj` com
  `Td` de avanço-X pequeno entre eles, quando `read(bytes)`, então a reconstrução concatena **sem espaço
  espúrio** e `detectType` casa `NFS-e` (não `NFS- e`).
- **CA-2c — múltiplas fontes Type0.** Dado um PDF com ≥2 fontes `Type0` cada uma com seu `/ToUnicode`
  (espaços de código disjuntos), quando `read(bytes)`, então o texto de **todas** as fontes decodifica
  (o CMap é resolvido por `Tf` ativo, não só o 1º global).
- **CA-real — amostra (prova final, local).** Dado os 7 PDFs reais, quando o reader processa, então
  `NFSE_FILU`, `NFS-e 8` e `DANFCOM` passam a classificar + extrair ≥ tipo + (número ou valor); os já-ok
  seguem ok; `DamISS` resolve como está (título-imagem, fora de escopo — sem valor errado).
- **CA-regressão.** A suíte da Fatia 1 (17 casos de `native-pdf.test.ts`) permanece **17/17 verde**.
- **CA-anti-alucinação (invariante #62).** Documento sem âncora confiável → `err(...)` explícito, nunca chute.
- **CA-robustez.** `/Length` mentiroso extremo, `Td` degenerado, muitas fontes → termina O(n), teto de
  memória, devolve `Result` — sem vazar exceção pela borda (mantém CWE-248/400 fechados). A validação
  pós-`Z_SYNC_FLUSH` **rejeita** deflate genuinamente corrompido (não confundir curto-mas-válido com lixo).

## 4. Plano técnico de alto nível (detalhe em `plan.md`)

```
2a  pdf-lowlevel.ts::inflateGuarded  → inflateSync → inflateRawSync → Z_SYNC_FLUSH(+valida)
2b  native-pdf.ts::extractText       → flush de linha por ΔTd/ΔTm (não por qualquer operador de posição)
2c  native-pdf.ts::readNative        → mapa fonte→CMap (via Tf + /Resources/Font); decodeHex usa o CMap ativo
```

Só o adapter nativo muda; domínio e port intactos. 2c exige o low-level resolver referências indiretas
`N G R` (dicts de página/recursos) — hoje só extrai streams cru.

## 5. Constitution check

| Fonte                       | Exigência                           | Como adere                                          |
| :-------------------------- | :---------------------------------- | :-------------------------------------------------- |
| ADR-0050                    | in-house, cascata nativo-first      | 3 fixes nativos; `unpdf` não acionado               |
| ADR-0011                    | evitar-libs                         | `node:zlib` + parsing próprio; nenhuma dep nova     |
| ADR-0006                    | ports & adapters, isolamento `fin_` | só o adapter muda; port/domínio intactos            |
| `.claude/rules/adapters.md` | adapters nunca vazam `Error`        | fail-closed; `Z_SYNC_FLUSH` valida antes de aceitar |
| `.claude/rules/testing.md`  | node:test; fixtures sintéticas      | W0 sintético por defeito; reais validados local     |

## 6. Riscos & mitigações

| Risco                                                          | Sev   | Mitigação                                                                                              |
| :------------------------------------------------------------- | :---- | :----------------------------------------------------------------------------------------------------- |
| `Z_SYNC_FLUSH` aceitar deflate corrompido como válido          | Média | validação pós-inflate obrigatória (`Zlib.md:439-443`); teste com deflate genuinamente quebrado → `err` |
| 2c (Tf + CMap por fonte) mexer no low-level (resolver `N G R`) | Média | fatia própria, isolada; CA sintético multi-fonte antes dos reais                                       |
| Reconstrução por ΔTd regredir casos WinAnsi já-ok              | Média | CA-regressão (17/17) é gate de cada sub-fatia                                                          |
| Alucinação de valor fiscal                                     | Alta  | métrica objetiva (âncoras batem) + fail-closed; nunca chute                                            |

## 7. Definition of Done (por sub-fatia)

- [ ] CA da sub-fatia + CA-regressão (17/17) + CA-robustez cobertos por teste (W0) e verdes (W3).
- [ ] O PDF real alvo da sub-fatia passa a classificar + extrair ≥ tipo + (número ou valor) — validação local.
- [ ] `DocumentReaderResult` = campos only (minimização); nenhum log de conteúdo.
- [ ] Gate W3 verde (typecheck + format + lint + test).

## 8. Fatiamento & tickets sugeridos

- **2a** → `FIN-READER-FLATE-SYNCFLUSH` (S, trivial) — desbloqueia `NFSE_FILU`.
- **2b** → `FIN-READER-LINE-RECONSTRUCT` (M) — desbloqueia `NFS-e 8`; robustez geral de fragmentação.
- **2c** → `FIN-READER-MULTIFONT-CMAP` (M/L) — desbloqueia `DANFCOM`; introduz resolução de `Tf`/recursos.
- **D** → **nova issue** (`detectType` título-imagem / OCR) — fora do #388.

Ordem: 2a → 2b → 2c (esforço/risco crescente; cada uma fecha com os 17 casos verdes). `/speckit-clarify`
provavelmente **desnecessário** (research eliminou as incertezas); próximo = `/speckit-plan` ou tickets diretos.
