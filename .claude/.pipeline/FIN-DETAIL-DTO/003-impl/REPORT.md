# W1/W3 — FIN-DETAIL-DTO (#95, recortado em `series`)

**Resultado:** GREEN / ALL-GREEN ✅

`documentResponseSchema` += `series`; `documentToDto` (draft + open) += `series: document.series`. `DocumentCore.series` e `fin_documents.series` já existiam → **sem migration**.

- Teste #95 (HTTP): série criada aparece no `GET /documents/:id` ✅.
- Gate: typecheck 0 · format ✅ · lint ✅ · test unit 0 fail.

## Follow-ups (registrar/abrir issue se a P.O. exigir)

- **Rótulos de categorização** (categoria/centro de custo/programa) server-side: os ports só têm `list()`; o **front já resolve** `ref→nome` via os selects que carrega. Server-side só se necessário (exigiria readers no `loadAndSerialize` + list/find).
- **Arquivo do documento** (PDF/link assinado): depende da feature 018 (upload).
- **Dados bancários do favorecido**: cross-módulo (Parceiros).
