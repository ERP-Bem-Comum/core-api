# W0 — Testes RED · FIN-READER-TABULAR-FIELDS (#396)

**Skill:** `tdd-strategist` · **Outcome:** RED

## POC (fail-first — validou a abordagem antes de implementar)
`unpdf.extractText` contra os reais: lineariza rótulo+valor adjacentes — `"Valor Líquido da NFS-e R$..."`,
`"VALOR TOTAL DO SERVIÇO = R$..."`, `"Número da NFS-e #"`. A extração linear passa a ser viável.

## Testes
- `cascade.test.ts` (novo degrau): nativo classifica SEM campos → fallback consultado e vence; nativo COM
  campos → fallback NÃO consultado; nativo sem campos E fallback falha → devolve o nativo; recurso do
  nativo é terminal → fallback não consultado. (RED: a cascata antiga não tinha `fallback`.)
- `unpdf-reader.test.ts`: extrai texto via unpdf + estrutura (`resolvedVia=unpdf`); bytes vazios →
  `empty-input`; lixo não-PDF → `err` (não vaza exceção do pdf.js).
