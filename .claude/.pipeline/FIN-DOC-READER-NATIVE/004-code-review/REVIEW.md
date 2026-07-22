# Code Review — Ticket FIN-DOC-READER-NATIVE — Round 1

**Veredito:** REJECTED

**Reviewer:** code-reviewer (contrato) + agente `security-backend-expert` (segurança de parsing binário, PoCs reais)
**Data:** 2026-07-09
**Escopo:** `pdf-lowlevel.ts`, `native-pdf.ts`, `cascade.ts` (impacto), fixtures/testes.

## Parte A — contrato (code-reviewer): sem achado
EN + VOs canônicos, camada adapter (tudo via `Result`), minimização LGPD (texto extraído é local, não vai no result — confirmado). Parsing correto (29/29 testes funcionais verdes).

## Parte B — segurança (`security-backend-expert`): CHANGES-REQUESTED (DoS explorável)

### 🔴 F1 — ReDoS catastrófico no tokenizer `Tj` (`native-pdf.ts:60`, CWE-1333)
`/(\((?:[^\\)]|\\.)*\)|<[0-9A-Fa-f]+>)\s*Tj/g` — um `(` sem fechamento força backtracking super-linear (~n^2.3). **PoC 588 bytes → `read()` não retorna em 25s** (Node single-thread trava o processo inteiro). Atacante controla 100% dos bytes pós-inflate.
**Fix:** tokenizer char-a-char O(n) com paridade de parênteses + limite por operando.

### 🔴 F2 — O(n²) em `extractStreams` (`pdf-lowlevel.ts:65-67`, CWE-407)
`lastIndexOf('>>', i)` + `lastIndexOf('<<', …)` para CADA `"stream"` → O(i) para trás por ocorrência. **PoC 680KB (`"stream endstream"` ×40k) → 6.5s**, pré-inflate.
**Fix:** limitar a busca do dict a uma janela fixa antes do `stream` → O(n).

### 🟠 F3 — sem teto agregado de inflate (`native-pdf.ts:151-155`, CWE-409)
`MAX_INFLATE` limita cada stream, não a SOMA nem a contagem. **PoC 80KB / 10 streams → 80MiB out, +167MiB RSS**.
**Fix:** acumular total + contar streams; abortar `decompression-limit-exceeded`.

### 🟠 F4 — sem `MAX_BYTES` no input + cascade não-terminal (`pdf-lowlevel.ts`/`cascade.ts`, CWE-770)
Nativo não limita tamanho de entrada (2× `Buffer.from().toString('latin1')` do buffer inteiro). E `cascade.ts` só checa `.ok` → após `source-too-large` do XML, empurra os mesmos bytes gigantes ao nativo.
**Fix:** `MAX_BYTES` no `readNative` (espelha `xml.ts`); no cascade, `source-too-large` é terminal.

### 🟡 F5 — cascade engole o motivo do erro (`cascade.ts:26`, CWE-390)
Bomba detectada (`decompression-limit-exceeded`) vira `scanned-unsupported` — perde telemetria de abuso.
**Fix:** propagar erros de recurso (`decompression-limit-exceeded`/`source-too-large`) do nativo.

### 🔵 Nits
Dupla conversão latin1 em `detectStructure`+`extractStreams`; `decodeLiteral` não cobre escape octal `\ddd` (corretude, não segurança).

## Vetores SEM achado (confirmados)
Minimização LGPD ✔; overflow/NaN barrado por `Money.fromCents` ✔; `/Length` absurdo → `subarray` clampa com segurança ✔.

## Próximo passo
REJECTED → fixes F1–F5 (mesmos arquivos) + **testes de regressão com budget de tempo** por finding. Depois W2 round 2.

---

# Code Review — Round 2

**Veredito:** APPROVED

**Data:** 2026-07-09

| Finding | Correção aplicada | Regressão travada |
| :-- | :-- | :-- |
| 🔴 F1 ReDoS | Tokenizer **char-a-char O(n)** (`native-pdf.ts` `extractText`), sem regex de backtracking; `MAX_OPERAND=4096` por operando | `F1: parênteses sem fechar … O(n) < 2s` |
| 🔴 F2 O(n²) | `extractStreams` busca o dict numa **janela fixa** (`DICT_WINDOW=2048`) + cap `MAX_STREAMS=512` | `F2: muitas ocorrências de "stream" … O(n) < 2s` |
| 🟠 F3 amplificação | Acumulador de bytes inflados; aborta ao passar `MAX_TOTAL_INFLATE=16MiB` | `F3: N streams somando … decompression-limit-exceeded` |
| 🟠 F4 input+cascade | `MAX_BYTES=8MiB` no `readNative` (espelha `xml.ts`); `cascade.ts` trata `source-too-large` como **terminal** | `F4: input > MAX_BYTES → source-too-large` + `F4 (cascade): terminal, nativo não consultado` |
| 🟡 F5 telemetria | `cascade.ts` **propaga** erros de recurso do nativo (`decompression-limit-exceeded`/`source-too-large`) | `F5: erro de recurso do nativo é propagado` |
| 🔵 Nit octal | `decodeLiteral` segue sem `\ddd` — **corretude, não segurança**; registrado para refinamento (não bloqueia) |

**Gates pós-fix:** `node --test` document-reader → **35 pass / 0 fail** (11 port + 10 xml + 14 native incl. F1–F4 + cascade F4/F5); `pnpm run typecheck` exit 0; `eslint` 0 erros.

**Próximo passo:** APPROVED → **W3** (gate final). A gramática de escape octal de literal PDF (Nit) fica como issue de refinamento pós-merge.
