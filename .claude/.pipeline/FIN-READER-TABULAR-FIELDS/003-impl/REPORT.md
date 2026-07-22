# W1 — Implementação GREEN · FIN-READER-TABULAR-FIELDS (#396)

**Agente:** `nodejs-runtime-expert` · **Outcome:** GREEN

## Mudanças
- `unpdf` 1.6.2 (MIT) adicionado (lockfile passa supply-chain; ADR-0011).
- `unpdf-reader.ts`: `createUnpdfDocumentReader` — `extractText(bytes, {mergePages:true})` → `structureText(text,'unpdf')`; adapter converte exceção do pdf.js → `Result` (`.claude/rules/adapters.md`).
- `cascade.ts`: degrau `fallback` + `hasFields` (número OU valor). `create-document-reader.ts`: monta o unpdf.
- `structureText` exportado/parametrizado; `resolvedVia` += `'unpdf'` (types + use-case + schema Zod de resposta).
- Regexes conservadores: `VALOR TOTAL DO SERVIÇO = R$`, `Valor a Pagar R$`.

## Evidência (validação real, local, sem PII)
Antes: `NFSE_FILU`/`NFS-e 8`/`DANFCOM` davam `malformed`/só-tipo. Agora: **todos classificam + ganham ≥1
campo** — `NFSE_FILU` (tipo+valor via nativo), `NFS-e 8` (tipo+número via unpdf), `DANFCOM` (tipo via unpdf).
Baselines seguem via `native-text` (in-house-first). Suíte reader 23/23 + cascade 10/10 + unpdf-reader 3/3.
