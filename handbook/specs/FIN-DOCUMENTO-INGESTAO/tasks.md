# Tasks — FIN-DOCUMENTO-INGESTAO

> **STATUS (reconciliado 2026-06-15): 📋 fatia FUTURA, não iniciada (0/89).** ATENÇÃO: o **backend** do Financeiro
> (agregado `Document`, geração de títulos, borda `/api/v2/financial`, persistência `fin_*`) foi entregue por
> **`FIN-DOCUMENTO-TITULOS`** (PR #38, 2026-06-15) — ver `specs/009-fin-documentos-titulos/`. **Esta** spec (`INGESTAO`)
> é a fatia **complementar** de UI/OCR/Storage/grid (upload de PDF, extração, tela de lançamento, grid de contas a
> pagar) — **não redundante** com TITULOS. Mantida no backlog; abrir ticket quando UI/OCR for priorizada pela P.O.

## Fase 1: Schema + Domain Model (S)

- [ ] **F1.1** Criar migration `fin_documentos`
- [ ] **F1.2** Criar migration `fin_retencoes`
- [ ] **F1.3** Criar migration `fin_impostos_registrados`
- [ ] **F1.4** Criar migration `fin_titulos`
- [ ] **F1.5** Criar migration `fin_divergencias`
- [ ] **F1.6** Criar migration `fin_trilha_auditoria`
- [ ] **F1.7** Implementar VO `Money` (branded type, aritmética segura)
- [ ] **F1.8** Implementar VO `DocumentoId` (branded type)
- [ ] **F1.9** Implementar entidade `Documento` (aggregate root)
- [ ] **F1.10** Implementar entidade `Titulo` (aggregate root)
- [ ] **F1.11** Implementar VO `Retencao`
- [ ] **F1.12** Implementar VO `ImpostoRegistrado`
- [ ] **F1.13** Implementar VO `Identificacao`, `Pagamento`, `Categorizacao`, `Metadados`
- [ ] **F1.14** Rodar `pnpm run db:generate` e validar schemas

## Fase 2: Ports + Infra (S)

- [ ] **F2.1** Definir interface `OcrPort`
- [ ] **F2.2** Implementar `OcrMockAdapter` (retorna dados fixos para testes)
- [ ] **F2.3** Definir interface `StoragePort`
- [ ] **F2.4** Implementar `S3StorageAdapter` (usando `@aws-sdk/client-s3`)
- [ ] **F2.5** Configurar MinIO no `compose.yaml` para dev
- [ ] **F2.6** Definir interface `DocumentoRepositoryPort`
- [ ] **F2.7** Implementar `DocumentoDrizzleRepository`
- [ ] **F2.8** Definir interface `TituloRepositoryPort`
- [ ] **F2.9** Implementar `TituloDrizzleRepository`
- [ ] **F2.10** Testes de integração para repositories (MySQL via Docker)

## Fase 3: Domain Services (M)

- [ ] **F3.1** Implementar `CalculadoraLiquido` (cálculo do líquido)
- [ ] **F3.2** Testar `CalculadoraLiquido` com todos os tipos de documento
- [ ] **F3.3** Implementar `MotorRetencoes` (detectar divergências)
- [ ] **F3.4** Testar `MotorRetencoes` com alíquotas padrão mock
- [ ] **F3.5** Implementar `GeradorTitulos` (gerar pai + filhos)
- [ ] **F3.6** Testar `GeradorTitulos` para NFS-e, RPA, DANFE, Fatura, Boleto, Recibo, Imposto
- [ ] **F3.7** Implementar validação de `liquido-negativo`
- [ ] **F3.8** Testar edge cases: zero retenções, descontos > bruto, juros elevados

## Fase 4: Tela Lançar Documento (L)

- [ ] **F4.1** Criar rota `/financeiro/contas-a-pagar/novo`
- [ ] **F4.2** Implementar componente de upload de PDF
- [ ] **F4.3** Implementar preview do PDF (iframe ou PDF.js)
- [ ] **F4.4** Implementar formulário de Identificação (tipo, número, emissão, vencimento, bruto)
- [ ] **F4.5** Implementar formulário de Retenções (ISS, IRRF, INSS, PIS, COFINS, CSLL)
- [ ] **F4.6** Implementar campos de Impostos Registrados (readonly: CBS, IBS)
- [ ] **F4.7** Implementar formulário de Pagamento (forma, conta, dados bancários fornecedor)
- [ ] **F4.8** Implementar formulário de Categorização (CC, categoria, programa, plano)
- [ ] **F4.9** Implementar sidebar de Composição (bruto, ret, líquido)
- [ ] **F4.10** Implementar sidebar de Títulos Previstos (preview pai + filhos)
- [ ] **F4.11** Implementar sidebar de Validação (checks + alertas)
- [ ] **F4.12** Implementar auto-save (debounce 2s, localStorage + backend)
- [ ] **F4.13** Implementar modal "Salvar como Rascunho" vs "Salvar Documento"
- [ ] **F4.14** Implementar modal de Divergência de Alíquota (3 opções)
- [ ] **F4.15** Implementar modal de Busca de Fornecedor
- [ ] **F4.16** Implementar modal de Cadastro Rápido de Fornecedor
- [ ] **F4.17** Implementar modal de Seleção de Forma de Pagamento
- [ ] **F4.18** Implementar modal de Seleção de Tipo de Documento
- [ ] **F4.19** Implementar atalhos de teclado (⌘K, ⌘N, ⌘S, ⌘↵)
- [ ] **F4.20** Testes E2E para fluxo completo de lançamento

## Fase 5: Grid de Contas a Pagar (M)

- [ ] **F5.1** Criar rota `/financeiro/contas-a-pagar`
- [ ] **F5.2** Implementar grid com colunas (Tipo, Doc, Forn, Contrato, Forma, Emiss, Venc, Bruto, Líq, Status)
- [ ] **F5.3** Implementar busca por fornecedor/número/CNPJ
- [ ] **F5.4** Implementar chips de status (Todos, Rascunho, Aberto, Aprovado, Pago)
- [ ] **F5.5** Implementar filtros avançados (data, valor, forma pagamento)
- [ ] **F5.6** Implementar visões salvas de filtros
- [ ] **F5.7** Implementar ordenação (vencimento, líquido, fornecedor)
- [ ] **F5.8** Implementar paginação (12 por página)
- [ ] **F5.9** Implementar seleção múltipla com checkbox
- [ ] **F5.10** Implementar ação em lote: Mudar Status
- [ ] **F5.11** Implementar ação em lote: Alterar Vencimento (validar status permitidos)
- [ ] **F5.12** Implementar ação em lote: Baixar (marcar como Pago)
- [ ] **F5.13** Implementar ação em lote: Exportar PDF
- [ ] **F5.14** Implementar ação em lote: Exportar CSV
- [ ] **F5.16** Implementar ação em lote: Exportar CNAB 240
- [ ] **F5.17** Implementar drawer de detalhes do pagamento
- [ ] **F5.18** Implementar totalizações no rodapé (bruto, líquido)
- [ ] **F5.19** Testes E2E para grid e ações em lote

## Fase 6: Validações Fiscais + Divergência (M)

- [ ] **F6.1** Integrar `MotorRetencoes` na tela de lançamento
- [ ] **F6.2** Sinalização visual de campos OCR divergentes (borda laranja)
- [ ] **F6.3** Modal de Divergência com comparação lado a lado
- [ ] **F6.4** Persistir decisão do operador em `fin_divergencias`
- [ ] **F6.5** Trilha de auditoria para alterações manuais
- [ ] **F6.6** Testes unitários para todas as combinações de decisão

## Fase 7: Integrações (S)

- [ ] **F7.1** Integrar busca de fornecedores (API existente)
- [ ] **F7.2** Integrar cadastro rápido de fornecedor
- [ ] **F7.3** Integrar busca de contratos (API existente)
- [ ] **F7.4** Integrar plano orçamentário (API existente)
- [ ] **F7.5** Integrar tabela de alíquotas (API existente)
- [ ] **F7.6** Integrar contas bancárias (API existente)

## Fase 8: Quality Gate (W3)

- [ ] **W3.1** `pnpm run typecheck` passa sem erros
- [ ] **W3.2** `pnpm run format:check` passa sem erros
- [ ] **W3.3** `pnpm run lint` passa sem erros
- [ ] **W3.4** `pnpm test` passa (todos os testes unitários e de integração)
- [ ] **W3.5** `pnpm run test:integration` passa (MySQL via Docker)
- [ ] **W3.6** Cobertura de testes ≥ 80% para domain services
- [ ] **W3.7** Documentação atualizada (README, ADRs, handbook)
