# FIN-DOC-LIST-FILTERS — filtros avançados + ordenação na listagem de documentos

> Feature #164 (parcial). Size **M**. Módulo `financial`. Sprint Backlog · go-live · gap-contrato.
> Entregue junto de FIN-DOC-BULK-DUEDATE (#162) na branch `feat/fin-list-filters-bulk-duedate` → 1 PR.

## Contexto

`GET /api/v2/financial/documents` (= `DocumentRepository.findPaged` / `DocumentListFilter`) só filtra por
`status`, `type`, `supplierRef`, `dueFrom/dueTo`, `issued*`, `q` (#167) e pagina. O menu "Adicionar filtro" do
grid tem dimensões desabilitadas até o backend expor. Falta também **ordenação** configurável.

## Escopo (o que muda)

Filtros adicionais em `DocumentListFilter` + `listDocumentsQuerySchema` + `document-repository.{drizzle,in-memory}`:
- `valorMin` / `valorMax` — faixa de **valor líquido** (`fin_documents.net_value`, bigint cents).
- `contractRef` — filtro por contrato (`fin_documents.contract_ref`).
- `programRef` — filtro por programa (`fin_documents.program_ref`).
- **multi-valor** para `type` e `supplierRef` (hoje single) — aceitar lista (`type=a&type=b` ou CSV), mantendo
  retrocompat com o valor único.
- **Ordenação:** `sort` ∈ {`dueDate`, `netValue`, `supplierName`} + `order` ∈ {`asc`, `desc`}. Default atual
  (`dueDate asc`, desempate `id asc`) preservado quando ausente.

## Fora de escopo
- `numDoc` / `cnpjCpf` — **já entregues** pela busca `q` (#167).
- **Visões Salvas** — rastreada em **#351** (decisão de design pendente: core-api vs BFF; front fora).
- `Competência/Emissão` — já no #163.

## Critérios de aceite

- **CA1** — `?valorMin=&valorMax=` filtra por faixa de `netValue` (inclusiva); combinável com os demais (AND).
- **CA2** — `?contractRef=` e `?programRef=` filtram por igualdade; UUID malformado → 400.
- **CA3** — `?type=NFS-e&type=Boleto` (multi) retorna união dos tipos; valor único segue funcionando.
- **CA4** — `?sort=netValue&order=desc` ordena por líquido desc (desempate `id asc`); `sort` inválido → 400.
- **CA5** (x99) — filtros + ordenação contra MySQL real: `netValue` range + `sort=supplierName` (via LEFT JOIN
  `fin_supplier_view`) sem duplicar linhas nem quebrar o count/paginação.

## Definition of Done
W0 RED → W1 GREEN → W2 APPROVED → W3 (typecheck + format:check + lint + test). CA5 no x99. Sem migration. Parte do #164.
