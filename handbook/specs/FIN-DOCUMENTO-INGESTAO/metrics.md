# Métricas/NFRs — FIN-DOCUMENTO-INGESTAO

> **Referência**: Newman, _Building Microservices_, p. 115 — "A reporting database can be updated in real time or at regular intervals."
>
> Fowler, _Refactoring_, p. 68 — "Parallel Change / Expand-Contract pattern for safe schema evolution."

---

## 1. Métricas de Negócio (KPIs)

| Métrica                            | Definição                                                        | Meta                      | Como Medir                                                            |
| :--------------------------------- | :--------------------------------------------------------------- | :------------------------ | :-------------------------------------------------------------------- |
| **Tempo Médio de Lançamento**      | Tempo entre upload do PDF e salvamento do documento.             | ≤ 2 min (ajustes mínimos) | Timestamp no evento `DocumentoCriado` vs `DocumentoSalvo`             |
| **Taxa de Correção OCR**           | % de documentos onde o operador alterou ≥ 1 campo extraído.      | ≤ 15%                     | Comparar `valorOriginalOcr` com valor final em `DivergenciaResolvida` |
| **Taxa de Divergência Fiscal**     | % de documentos com alíquota divergente detectada.               | ≤ 5%                      | Contagem de eventos `DivergenciaDetectada` / total de documentos      |
| **Tempo de Resposta do OCR**       | Tempo entre upload e retorno dos dados extraídos.                | ≤ 3 segundos              | Latência medida no `OcrPort`                                          |
| **Taxa de Uso de Rascunho**        | % de documentos que passam pelo auto-save antes de serem salvos. | ≥ 90%                     | Contagem de eventos `RascunhoSalvo` / total de documentos             |
| **Precisão do Cálculo do Líquido** | % de documentos onde o líquido calculado bate com o esperado.    | 100%                      | Testes automatizados cobrindo todos os tipos de documento             |

---

## 2. Requisitos Não-Funcionais (NFRs)

### 2.1. Performance

| ID          | Requisito                      | Critério de Aceitação                 | Prioridade |
| :---------- | :----------------------------- | :------------------------------------ | :--------- |
| **PERF-01** | OCR de PDF de 1 página         | ≤ 3 segundos (p95)                    | Must       |
| **PERF-02** | Auto-save de formulário        | ≤ 2 segundos após última digitação    | Must       |
| **PERF-03** | Carregamento do grid (47 docs) | ≤ 1 segundo com paginação de 12 itens | Must       |
| **PERF-04** | Cálculo do líquido             | Instantâneo (< 100ms)                 | Must       |

### 2.2. Disponibilidade e Confiabilidade

| ID         | Requisito                | Critério de Aceitação                                         | Prioridade |
| :--------- | :----------------------- | :------------------------------------------------------------ | :--------- |
| **REL-01** | Persistência de rascunho | Rascunho nunca perdido (localStorage + backend)               | Must       |
| **REL-02** | Fallback de OCR          | Se OCR falhar, lançamento manual deve estar sempre disponível | Must       |
| **REL-03** | Consistência do cálculo  | Líquido sempre consistente (bruto − ret − desc + juros/multa) | Must       |

### 2.3. Segurança

| ID         | Requisito                   | Critério de Aceitação                                                          | Prioridade |
| :--------- | :-------------------------- | :----------------------------------------------------------------------------- | :--------- |
| **SEC-01** | Armazenamento de PDFs       | PDFs criptografados em repouso no S3/MinIO                                     | Must       |
| **SEC-02** | Acesso a documentos fiscais | Apenas usuários com perfil Operador ou superior podem visualizar               | Must       |
| **SEC-03** | Trilha de auditoria         | Toda alteração manual em campo OCR logada com usuário, timestamp, antes/depois | Must       |

### 2.4. Usabilidade

| ID        | Requisito           | Critério de Aceitação                                            | Prioridade |
| :-------- | :------------------ | :--------------------------------------------------------------- | :--------- |
| **UX-01** | Preview lado a lado | PDF visível simultaneamente ao formulário (sem scroll excessivo) | Must       |
| **UX-02** | Atalhos de teclado  | ⌘K (busca), ⌘N (novo), ⌘S (salvar), ⌘↵ (confirmar) funcionando   | Should     |
| **UX-03** | Preview de títulos  | Sidebar mostrando pai + filhos antes do salvamento               | Must       |

---

## 3. SLIs e SLOs (Service Level Indicators/Objectives)

| SLI                                                                | SLO    | Janela  |
| :----------------------------------------------------------------- | :----- | :------ |
| Taxa de sucesso do OCR (extração com todos os campos obrigatórios) | ≥ 85%  | 7 dias  |
| Latência do auto-save (p99)                                        | ≤ 3s   | 1 dia   |
| Taxa de erro 500 na API de documentos                              | ≤ 0,1% | 7 dias  |
| Taxa de cancelamento por erro de lançamento                        | ≤ 2%   | 30 dias |

---

## 4. Decisões de Escalabilidade

1. **Processamento OCR assíncrono**: Se o volume de uploads for alto (> 100/min), o OCR deve ser processado em fila (SQS/bull) em vez de síncrono.
2. **Cache de alíquotas**: A tabela de alíquotas por município deve ser cacheada em memória (Redis) com TTL de 24h, pois muda raramente.
3. **Paginação obrigatória**: O grid nunca retorna mais de 50 documentos por página, independente do total.
