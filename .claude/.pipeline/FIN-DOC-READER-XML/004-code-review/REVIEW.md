# Code Review — Ticket FIN-DOC-READER-XML — Round 1

**Veredito:** APPROVED (com 2 endurecimentos de segurança já aplicados)

**Reviewer:** code-reviewer (contrato/pureza) + agente `security-backend-expert` (segurança de parsing)
**Data:** 2026-07-09
**Escopo:** `adapters/document-reader/xml.ts` + `xml.test.ts` + `_fixtures/xml-fixtures.ts`

---

## Parte A — Audit de contrato (code-reviewer)

Sem 🔴/🟡. Confirmado:
- **Aderência de contrato:** campos EN + reuso dos VOs canônicos (`Money`/`Competencia`/`Retention`/`DocumentType`) — sem redefinir/degradar (lição do FIN-DOC-READER-PORT).
- **Camada adapter:** converte `throw`→`Result` via `parseRoot`; não vaza exception; mutação local (`retentions.push`) permitida em `adapters/`.
- **Minimização LGPD:** só campos extraídos, sem texto bruto (CA5 trava com allowlist).
- **Mapeamento path-aware** fiel aos schemas pesquisados (NFS-e `infNFSe`/`DPS/infDPS`; NF-e `infNFe/{ide,emit,total}`).

**🔵 Limitação de escopo registrada:** o reader extrai só a retenção **ISS** (`tribMun`) da NFS-e; as federais (`tribFed`: IRRF/INSS/CSRF) não são mapeadas. Defensável — o `Retention` VO exige `base`+`rateBps`+`value` (nem sempre explícitos nas federais) e o CA1 só exige ISS. Candidato a fatia de refinamento (não bloqueia).

## Parte B — Audit de segurança (`security-backend-expert`)

**Veredito: APPROVED** — nenhum Blocker/Major. Metodologia: **4 POCs reais** contra a config exata + inspeção do código-fonte da lib instalada (não doc externa). Confirmado seguro: XXE (throw incondicional em `SYSTEM`), ReDoS (regexes lineares, `sniffEncoding` limitada a 256 bytes), minimização LGPD, injeção via label de encoding (`TextDecoder` lança → try/catch), e **prototype pollution via nome de tag** (lib bloqueia `__proto__`/`constructor`).

Dois Minor levantados — **ambos endereçados**:

### 🟡 MI1 — proteção anti-billion-laughs era implícita (default de terceiro) → ENDEREÇADO

O agente provou que a lib só resiste ao billion-laughs por defaults internos que **divergem do próprio `.d.ts`** e podem mudar em patch sem quebrar semver. Em vez de configurar os limites instáveis da lib (sugestão original), apliquei defesa **na raiz**, superior:

- **Guarda anti-DOCTYPE** (`xml.ts` no `read`): `if (/<!DOCTYPE/i.test(xml)) return err('malformed-document')` **antes do parse**. Documentos fiscais NF-e/NFS-e usam XSD, nunca DTD → rejeitar DOCTYPE mata **XXE + billion-laughs** de forma determinística, independente da versão da lib.
- **Teste de regressão** `billion-laughs (DOCTYPE) → malformed-document` — transforma o comportamento "de sorte" em contrato testado do projeto.

### 🟡 MI2 — guard `source-too-large` sem teste → ENDEREÇADO

Exportado `MAX_BYTES` + teste `input > MAX_BYTES → err('source-too-large')` (guard aplicado antes do parse).

### 🔵 N1 — comentário overclaim → corrigido (documenta a guarda DOCTYPE + o racional).
### 🔵 N2 — fallback silencioso de encoding → informativo (fail-safe, não vulnerabilidade); sem ação.

---

## Gates pós-hardening

```
node --test xml.test.ts   → tests 10 · pass 10 · fail 0  (8 CAs + billion-laughs + source-too-large)
pnpm run typecheck        → exit 0
eslint (document-reader)  → 0 errors
```

## Próximo passo

**APPROVED → W3** (gate final `ts-quality-checker`: typecheck + format:check + lint + test completo). A limitação de escopo (retenções federais) pode virar issue de refinamento pós-merge.
