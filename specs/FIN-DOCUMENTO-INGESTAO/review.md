# Review (W2) — FIN-DOCUMENTO-INGESTAO

> **Referência**: Robert C. Martin, _Clean Code_ (Cap. 1 — "There Will Be Code": "The only way to make the deadline — the only way to go fast — is to keep the code clean.").
>
> OWASP, _Top 10_ (2021): A01:2021 – Broken Access Control, A05:2021 – Security Misconfiguration.

---

## 1. Checklist de Revisão

### 1.1. Arquitetura e Ports & Adapters

- [ ] O `OcrPort` isola completamente a tecnologia de OCR? (Sim: adapter mock substituível por Tesseract/Textract sem tocar domain)
- [ ] O `StoragePort` abstrai S3/MinIO? (Sim: `@aws-sdk/client-s3` único cliente, conforme ADR-0019)
- [ ] O domain não conhece framework HTTP ou banco? (Sim: domain puro, repositories em adapters)
- [ ] Eventos cross-módulo usam outbox? (Sim: `TituloAprovado` publicado via outbox, conforme ADR-0015)

### 1.2. Domain Model

- [ ] `Documento` é aggregate root consistente? (Sim: controla `Retencao[]`, `ImpostoRegistrado[]` via value objects)
- [ ] `Money` é branded type imutável? (Sim: aritmética segura, sem mutação)
- [ ] Cálculo do líquido é função pura? (Sim: `CalculadoraLiquido` sem side effects)
- [ ] Invariantes são validadas no domain, não no controller? (Sim: `liquido-negativo` lançado no domain service)

### 1.3. TypeScript e Qualidade de Código

- [ ] Todos os imports de tipo usam `import type`? (Sim, conforme `verbatimModuleSyntax`)
- [ ] Imports relativos têm extensão `.ts`? (Sim, conforme `NodeNext`)
- [ ] Subpath imports `#src/*` usados quando apropriado? (Sim)
- [ ] `strict` completo ativado? (Sim: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.)
- [ ] Sem `any` implícito? (Verificar no W3)
- [ ] Funções puras preferidas a classes? (Sim: domain services são funções, não classes)

### 1.4. Testes

- [ ] Toda regra de negócio tem teste unitário? (Sim: CalculadoraLiquido, MotorRetencoes, GeradorTitulos)
- [ ] Toda Port tem teste de integração? (Sim: DocumentoDrizzleRepository, S3StorageAdapter)
- [ ] CAs críticos têm teste E2E? (Sim: upload OCR, divergência, grid, baixar)
- [ ] Cobertura de domain ≥ 80%? (Sim, meta 90%)

### 1.5. Segurança

- [ ] PDFs são validados antes do upload? (Sim: mime-type + magic bytes, tamanho ≤ 10MB)
- [ ] URLs de PDF usam signed URLs? (Sim: `getSignedUrl` com expiry)
- [ ] Trilha de auditoria registra usuário e timestamp? (Sim: `fin_trilha_auditoria`)
- [ ] Sem SQL injection? (Sim: Drizzle ORM parametriza queries)
- [ ] Sem XSS via descrição do documento? (Sim: sanitização no render)

### 1.6. Banco de Dados

- [ ] Prefixo `fin_` em todas as tabelas? (Sim, conforme ADR-0014)
- [ ] Índices adequados? (Sim: `idx_fornecedor`, `idx_vencimento`, `idx_status`)
- [ ] ON DELETE CASCADE usado com cautela? (Sim: apenas em retencoes, impostos_registrados, divergencias)
- [ ] Migrations reversíveis? (Sim: cada migration tem `up` e `down`)

---

## 2. Decisões de Design Revisadas

### 2.1. CSRF como título filho único

**Decisão**: Agrupar PIS + COFINS + CSLL em um único título filho "CSRF".

**Revisão**: ✅ Aprovado. Simplifica o grid e a remessa sem perder rastreabilidade. Conforme discussão com especialista de domínio.

### 2.2. Documento e Título como agregados separados

**Decisão**: `Documento` (Gestão de Documentos) e `Titulo` (Títulos e Liquidação) em BCs separados.

**Revisão**: ✅ Aprovado. Justificado por DDD (Evans p. 127): ciclo de vida diferente (fiscal vs financeiro) e necessidade de isolação.

### 2.3. Auto-save com localStorage + backend

**Decisão**: Debounce de 2s, persistindo em localStorage (cache) e backend (fonte da verdade).

**Revisão**: ⚠️ Atenção. Risco de conflito se operador abrir duas abas. Mitigação: versionamento do rascunho (etag/last-modified) ao salvar.

### 2.4. OcrMockAdapter na fase 1

**Decisão**: Fase 1 usa adapter mock. Fase 2 substitui por OCR real.

**Revisão**: ✅ Aprovado. Port/Adapter pattern garante substituição sem refactoring. Risco: integração com OCR real pode revelar diferenças de schema. Mitigação: testes de integração com OCR real em staging antes de produção.

---

## 3. Issues Encontradas (simulado para W2)

### Issue #1: Campo `subcategoria` não validado

**Severidade**: Média
**Descrição**: O mock exibe campo "Subcategoria", mas não há validação de domínio nem na tabela `fin_documentos`.
**Ação**: Adicionar `subcategoria_id` como nullable e validar com PO se é obrigatório.

### Issue #2: Falta índice composto no grid

**Severidade**: Baixa
**Descrição**: O grid busca por `fornecedor + status + vencimento`. O índice atual é separado.
**Ação**: Adicionar índice composto `(fornecedor_id, status, data_vencimento)` após análise de EXPLAIN.

### Issue #3: Trilha de auditoria não captura keystrokes

**Severidade**: Baixa
**Descrição**: O auto-save persiste estado, mas a trilha só registra alterações "significativas" (blur do campo, não cada digitação).
**Ação**: Documentar claramente o que é auditado (blur/change events, não input events).

---

## 4. Veredicto

| Critério                       | Status                            |
| :----------------------------- | :-------------------------------- |
| Arquitetura (Ports & Adapters) | ✅ Aprovado                       |
| Domain Model (DDD)             | ✅ Aprovado                       |
| TypeScript / Qualidade         | ✅ Aprovado                       |
| Testes (Unit/Integration/E2E)  | ✅ Aprovado                       |
| Segurança                      | ✅ Aprovado                       |
| Banco de Dados                 | ✅ Aprovado (com ajustes menores) |
| **Veredicto Geral**            | **APROVADO com ressalvas**        |

**Ressalvas**:

1. Resolver Issue #1 (subcategoria) antes do merge.
2. Adicionar índice composto (Issue #2) em migration separada.
3. Documentar escopo da trilha de auditoria (Issue #3).

---

## 5. Próximos Passos

1. Dev corrige Issues #1, #2, #3.
2. Reabertura de W2 (round 2) se necessário.
3. W3 (Quality Gate): `typecheck` + `format:check` + `lint` + `test`.
4. Merge para `main` após W3 verde.
