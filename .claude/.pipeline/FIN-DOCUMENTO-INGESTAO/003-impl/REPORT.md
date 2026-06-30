# W1 (GREEN) — FIN-DOCUMENTO-INGESTAO

> Agente: `requirements-engineer` + `ddd-architect` + `software-architect` + `database-engineer` + `tdd-strategist` · Outcome: **GREEN**

## O que foi implementado (documentação)

### `specs/FIN-DOCUMENTO-INGESTAO/discovery.md`
- Stakeholders (Operador, Aprovador, Contador, Fornecedor, Sistema OCR)
- 20 requisitos funcionais (RF1–RF20) e 5 não-funcionais (RNF1–RNF5)
- 5 riscos com mitigações

### `specs/FIN-DOCUMENTO-INGESTAO/spec.md`
- 6 user stories alinhadas com personas
- **17 critérios de aceitação (CA1–CA17)** com regras de negócio quantificáveis
- 6 itens fora-de-escopo explicitados
- Constitution check mapeando aderência a ADR-0019, ADR-0020, ADR-0014, ADR-0015

### `specs/FIN-DOCUMENTO-INGESTAO/domain.md`
- 3 Bounded Contexts (Gestão de Documentos, Títulos e Liquidação, Ingestão & OCR)
- Aggregate `Documento` com 8 VOs (`Identificacao`, `DadosFinanceiros`, `Retencao`, `ImpostoRegistrado`, `Pagamento`, `Categorizacao`, `Metadados`)
- Aggregate `Titulo` separado com ciclo de vida próprio
- 3 Domain Services (`CalculadoraLiquido`, `MotorRetencoes`, `GeradorTitulos`)
- 7 eventos de domínio (`DocumentoCriado`, `TituloAprovado`, etc.)
- 11 invariantes de negócio (R1–R11)
- Context Map com relações ACL, Customer/Supplier, Published Language

### `specs/FIN-DOCUMENTO-INGESTAO/adr/0001-ocr-port-adapter.md`
- Decisão: Port/Adapter Pattern para OCR
- Alternativas rejeitadas: OCR direto no domain, OCR apenas SaaS, OCR apenas Tesseract
- **Promovido a `handbook/architecture/adr/0034-ocr-port-adapter.md`** (Status: Accepted)

### `specs/FIN-DOCUMENTO-INGESTAO/metrics.md`
- 6 KPIs de negócio (tempo médio de lançamento, taxa de correção OCR, etc.)
- 11 NFRs organizados em Performance, Confiabilidade, Segurança, Usabilidade
- SLIs/SLOs com janelas de medição
- Decisões de escalabilidade (OCR assíncrono, cache de alíquotas, paginação obrigatória)

### `specs/FIN-DOCUMENTO-INGESTAO/plan.md`
- 7 fases de implementação (F1–F7) + W3
- DDL completo das 6 tabelas (`fin_documentos`, `fin_retencoes`, `fin_impostos_registrados`, `fin_titulos`, `fin_divergencias`, `fin_trilha_auditoria`)
- Port contracts (`OcrPort`, `StoragePort`, `DocumentoRepositoryPort`)
- Quickstart para dev (docker, migrations, seed, CLI)

### `specs/FIN-DOCUMENTO-INGESTAO/research.md`
- Matriz comparativa OCR (Tesseract vs Textract vs Google Vision)
- Storage (MinIO vs S3)
- Decisão CSRF (PIS+COFINS+CSLL agrupados)
- Auto-save vs Event Sourcing
- Expand-Contract para schema migration
- CNAB Bradesco (TED/Transferência vs PIX/Boleto)

### `specs/FIN-DOCUMENTO-INGESTAO/data-model.md`
- 6 tabelas SQL com tipos, constraints, índices, FKs
- Diagrama ER simplificado
- **Correções aplicadas em W2**: `ENUM` → `VARCHAR + CHECK`, `AUTO_INCREMENT` → `VARCHAR(36)`

### `specs/FIN-DOCUMENTO-INGESTAO/quickstart.md`
- Setup local (docker compose, migrations, seed)
- Testar upload + OCR (adapter mock)
- CLI de criação e listagem
- Portas e endpoints locais

### `specs/FIN-DOCUMENTO-INGESTAO/contracts/*.ts` (5 ports)
- `ocr-port.ts` — `OcrPort` + `OcrResult` (Readonly, readonly arrays)
- `storage-port.ts` — `StoragePort` (Uint8Array, signed URLs)
- `documento-repository-port.ts` — `DocumentoRepositoryPort` + `PaginatedResult`
- `titulo-repository-port.ts` — `TituloRepositoryPort` + filhos/pai
- `aliquota-repository-port.ts` — `AliquotaRepositoryPort`
- **Correções aplicadas em W2**: `interface` → `type Readonly<{}>`, method signatures → function properties, `Buffer` → `Readonly<Uint8Array>`

### `specs/FIN-DOCUMENTO-INGESTAO/bdd/documento-ingestao.feature`
- 14 cenários Gherkin cobrindo: upload OCR, cálculo líquido, divergência, lançamento manual, auto-save, grid, baixar, alterar vencimento, exportar CSV, cancelamento, DANFE, independência de pagamento, busca pai/filhos, redirecionamento

### `specs/FIN-DOCUMENTO-INGESTAO/tasks.md`
- 56 tasks organizadas em 8 fases (F1–F7 + W3)

### `specs/FIN-DOCUMENTO-INGESTAO/tdd/plano-de-testes.md`
- Estratégia por nível (unitário, integração, E2E)
- Exemplos de testes para `CalculadoraLiquido`, `MotorRetencoes`, `GeradorTitulos`, `Money`
- Testes de integração para repositories e adapters
- Matriz de rastreabilidade CA → Teste
- **Correções aplicadas em W2**: `assert.throws` → `Result<T,E>`, `new Adapter()` → `createAdapter()`

### `specs/FIN-DOCUMENTO-INGESTAO/qa-test-plan.md`
- Estratégia por quadrante Agile Testing (Q1–Q4)
- 31 casos de teste QA exploratório detalhados
- Critérios de entrada/saída e ambientes de teste

## Evidência GREEN

Todos os 15 documentos exigidos pelo Goal.md estão presentes em `specs/FIN-DOCUMENTO-INGESTAO/`.
A pipeline pode avançar para W2 (code-review).
