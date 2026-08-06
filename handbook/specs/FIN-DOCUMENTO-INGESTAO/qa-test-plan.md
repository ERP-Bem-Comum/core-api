# Plano de Testes QA — FIN-DOCUMENTO-INGESTAO

> **Referência**: Crispin & Gregory, _Agile Testing_ (Cap. 6 — "The Agile Testing Quadrants": Q1 = Unit tests, Q2 = Story tests, Q3 = Exploratory tests, Q4 = Performance/security).
>
> "The whole-team approach to quality means that testers collaborate with developers and business experts from the start." — Crispin & Gregory, p. 89.

---

## 1. Objetivo do Plano de QA

Garantir que a inclusão de documento com OCR atenda aos critérios de aceitação, regras de negócio e requisitos não-funcionais, com foco em:

1. **Precisão fiscal**: Cálculos de retenções e líquido sempre corretos.
2. **Robustez do OCR**: Fallback manual sempre disponível.
3. **Rastreabilidade**: Toda divergência e alteração auditada.
4. **Usabilidade**: Operador consegue lançar documento em ≤ 2 minutos.

---

## 2. Estratégia de Testes por Quadrante (Agile Testing)

### Q1 — Tests that support the team (Unitários + Técnicos)

| Teste                               | Responsável | Ferramenta    | Frequência       |
| :---------------------------------- | :---------- | :------------ | :--------------- |
| Cálculo do líquido (todos os tipos) | Dev         | `node:test`   | A cada commit    |
| Geração de títulos (pai + filhos)   | Dev         | `node:test`   | A cada commit    |
| Detecção de divergências            | Dev         | `node:test`   | A cada commit    |
| Money VO (aritmética, formatação)   | Dev         | `node:test`   | A cada commit    |
| Schema do banco (migrations)        | Dev         | `drizzle-kit` | A cada migration |

### Q2 — Tests that critique the product (Funcionais)

| Teste                            | Responsável | Ferramenta | Frequência    |
| :------------------------------- | :---------- | :--------- | :------------ |
| Upload de PDF + OCR              | QA + Dev    | Playwright | Sprint review |
| Lançamento manual sem PDF        | QA + Dev    | Playwright | Sprint review |
| Cálculo automático do líquido    | QA + Dev    | Playwright | Sprint review |
| Modal de divergência (3 opções)  | QA + Dev    | Playwright | Sprint review |
| Auto-save e recuperação          | QA + Dev    | Playwright | Sprint review |
| Grid (busca, filtros, paginação) | QA + Dev    | Playwright | Sprint review |
| Ações em lote (baixar, exportar) | QA + Dev    | Playwright | Sprint review |
| Preview de títulos previstos     | QA + Dev    | Playwright | Sprint review |

### Q3 — Business-facing tests that critique the product (Exploratórios)

| Teste                                      | Responsável | Técnica                          | Frequência    |
| :----------------------------------------- | :---------- | :------------------------------- | :------------ |
| OCR com PDFs de layout não padrão          | QA          | Exploratory testing              | Sprint review |
| Divergência fiscal em múltiplos municípios | QA          | Boundary value analysis          | Sprint review |
| Auto-save com queda de conexão             | QA          | Chaos testing (throttle network) | Sprint review |
| Usabilidade: operador novo no sistema      | QA          | User journey mapping             | Sprint review |
| Acessibilidade (teclado, leitor de tela)   | QA          | Screen reader test               | Sprint review |

### Q4 — Technology-facing tests that critique the product (Não-funcionais)

| Teste                                  | Responsável | Ferramenta               | Frequência |
| :------------------------------------- | :---------- | :----------------------- | :--------- |
| Performance do OCR (p95 ≤ 3s)          | Dev         | k6 / Artillery           | Release    |
| Latência do auto-save (p99 ≤ 3s)       | Dev         | k6                       | Release    |
| Tempo de carregamento do grid          | Dev         | Lighthouse / WebPageTest | Release    |
| Segurança: upload de arquivo malicioso | Security    | OWASP ZAP                | Release    |
| Criptografia de PDFs em repouso        | Security    | AWS Config / CLI         | Release    |
| Stress test: 100 uploads simultâneos   | Dev         | k6                       | Release    |

---

## 3. Casos de Teste Detalhados (QA Exploratório)

### 3.1. OCR com PDFs Reais

| ID            | Cenário                      | Passos                             | Resultado Esperado                                              |
| :------------ | :--------------------------- | :--------------------------------- | :-------------------------------------------------------------- |
| **QA-OCR-01** | NFS-e de fornecedor PJ       | Upload de PDF real de NFS-e        | Todos os campos obrigatórios extraídos com confiança ≥ 80%      |
| **QA-OCR-02** | DANFE de compra de materiais | Upload de DANFE com muitos itens   | Valor bruto correto, impostos ICMS/IPI/PIS/COFINS identificados |
| **QA-OCR-03** | RPA de autônomo              | Upload de RPA escaneado            | IRRF e INSS extraídos, campos manuscritos reconhecidos          |
| **QA-OCR-04** | PDF com baixa resolução      | Upload de PDF 72dpi, texto borrado | Sistema sinaliza baixa confiança e permite lançamento manual    |
| **QA-OCR-05** | PDF protegido por senha      | Upload de PDF criptografado        | Mensagem de erro clara: "unable-to-read-pdf-encrypted"          |

### 3.2. Validações Fiscais

| ID            | Cenário                  | Passos                                | Resultado Esperado                                     |
| :------------ | :----------------------- | :------------------------------------ | :----------------------------------------------------- |
| **QA-FIS-01** | ISS correto              | Preencher ISS 5% para Fortaleza       | Sem alerta, campo verde                                |
| **QA-FIS-02** | ISS divergente           | Preencher ISS 3,5% para Fortaleza     | Alerta laranja, modal ao salvar                        |
| **QA-FIS-03** | Aceitar divergência      | Selecionar "Aceitar documento"        | Documento salvo, divergência auditada                  |
| **QA-FIS-04** | Corrigir divergência     | Selecionar "Corrigir para padrão"     | Valor atualizado, trilha registra usuário e timestamp  |
| **QA-FIS-05** | Solicitar nota corrigida | Selecionar "Solicitar nota corrigida" | Documento bloqueado, status "Aguarda Correção"         |
| **QA-FIS-06** | Líquido negativo         | Preencher retencoes > bruto           | Mensagem de erro: "liquido-negativo", salvar bloqueado |

### 3.3. Grid e Ações em Lote

| ID             | Cenário                         | Passos                                            | Resultado Esperado                                                             |
| :------------- | :------------------------------ | :------------------------------------------------ | :----------------------------------------------------------------------------- |
| **QA-GRID-01** | Busca por CNPJ                  | Digitar CNPJ completo no campo de busca           | Grid filtra apenas documentos do fornecedor                                    |
| **QA-GRID-02** | Filtro por status               | Selecionar chip "Aprovado"                        | Grid exibe apenas documentos aprovados                                         |
| **QA-GRID-03** | Ordenação por vencimento        | Clicar no header "Vencimento"                     | Ordenação alterna crescente/decrescente                                        |
| **QA-GRID-04** | Seleção múltipla                | Selecionar 3 documentos com checkbox              | Barra de ações em lote aparece com contador "3 selecionados"                   |
| **QA-GRID-05** | Baixar em lote                  | Selecionar 2 documentos Aprovados + clicar Baixar | Ambos mudam para status Pago                                                   |
| **QA-GRID-06** | Exportar CSV                    | Selecionar 5 documentos + Exportar CSV            | Arquivo baixado com 5 linhas + cabeçalho correto                               |
| **QA-GRID-07** | Exportar CNAB                   | Selecionar 2 documentos TED + Exportar CNAB       | Arquivo gerado no layout 240 com segmentos P, Q, J                             |
| **QA-GRID-08** | Mudar status em lote            | Selecionar 3 Rascunhos + Mudar para Aberto        | Status atualizado, toast de confirmação                                        |
| **QA-GRID-09** | Busca exibe pai e filhos        | Buscar por número de NFS-e com filhos             | Grid exibe título pai + todos os filhos (ISS, IRRF, INSS, CSRF)                |
| **QA-GRID-10** | Redirecionamento pós-salvamento | Clicar "Salvar Documento" em novo lançamento      | Sistema redireciona para grid com ordenação "Mais recente" e documento no topo |
| **QA-GRID-11** | Independência de pagamento      | Pagar (baixar) apenas o título pai de NFS-e       | Status do pai muda para `Pago`; filhos permanecem em `Aprovado`                |

### 3.4. Auto-save e Recuperação

| ID             | Cenário                  | Passos                                | Resultado Esperado                           |
| :------------- | :----------------------- | :------------------------------------ | :------------------------------------------- |
| **QA-SAVE-01** | Auto-save funciona       | Digitar descrição, aguardar 2s        | Status "Auto-salvo" aparece                  |
| **QA-SAVE-02** | Recuperação após refresh | Preencher campos, refresh F5          | Campos recuperados do backend                |
| **QA-SAVE-03** | Recuperação após crash   | Preencher campos, fechar aba, reabrir | Campos recuperados do localStorage + backend |
| **QA-SAVE-04** | Descartar rascunho       | Preencher campos, clicar "Descartar"  | Rascunho deletado, formulário limpo          |

---

## 4. Critérios de Entrada e Saída

### 4.1. Critérios de Entrada (Para iniciar QA)

- [ ] Todos os testes unitários passando (Q1).
- [ ] Tela de lançar documento renderizável em ambiente de staging.
- [ ] Grid de Contas a Pagar listando documentos reais (mesmo que poucos).
- [ ] OCR funcionando com adapter mock (ou serviço real disponível).

### 4.2. Critérios de Saída (Para aprovar release)

- [ ] 100% dos CAs cobertos por teste (Q1 + Q2).
- [ ] Zero bugs críticos ou graves abertos.
- [ ] Performance do OCR ≤ 3s (p95) validada.
- [ ] Todos os testes de segurança (Q4) passando.
- [ ] Documentação de usuário atualizada (prints da tela, fluxos).
- [ ] Aprovação do PO após demo.

---

## 5. Ambientes de Teste

| Ambiente        | Propósito                         | Dados                                                     |
| :-------------- | :-------------------------------- | :-------------------------------------------------------- |
| **Local (dev)** | Testes unitários e integração     | MySQL Docker, MinIO local, dados mock                     |
| **Staging**     | Testes funcionais e exploratórios | MySQL staging, S3 staging, dados anonimizados de produção |
| **Pre-prod**    | Testes de performance e segurança | Réplica de produção (subset de dados)                     |
| **Produção**    | Smoke tests pós-deploy            | Dados reais, monitoramento contínuo                       |

---

## 6. Responsabilidades

| Papel                            | Responsabilidade                                                       |
| :------------------------------- | :--------------------------------------------------------------------- |
| **Dev**                          | Implementar testes Q1 (unitários), corrigir bugs encontrados em Q2-Q4. |
| **QA**                           | Executar testes Q2 (funcionais), Q3 (exploratórios), reportar bugs.    |
| **Security**                     | Executar testes Q4 de segurança, revisar trilha de auditoria.          |
| **PO / Especialista de Domínio** | Validar regras fiscais, aprovar cenários de divergência.               |
| **Tech Lead**                    | Aprovar plano de QA, validar performance e arquitetura.                |
