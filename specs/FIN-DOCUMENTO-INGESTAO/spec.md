<!--
Template de SPEC (fase spec-driven, pré-W0).
Idioma: PT-BR (doc). Erros internos em EN kebab-case. Eventos EN passado.
-->

# SPEC — Inclusão de Documento com OCR (`FIN-DOCUMENTO-INGESTAO`)

> **Tipo:** ticket · **Size:** L · **Épico-pai:** `FIN-MODULE-SCAFFOLD`
> **Status da spec:** em-revisão
> **ADRs tocados:** `ADR-0019` (S3/MinIO para storage de PDFs), `ADR-0020` (MySQL 8.4 como único dialeto)

## 1. Problema & contexto (o PORQUÊ)

O operador de contas a pagar gasta ~15 minutos por documento lançando manualmente todos os campos (fornecedor, valores, retenções, datas). Isso é lento, propenso a erro fiscal e não rastreável. O sistema precisa de uma tela que:

1. Leia o PDF via OCR e preencha automaticamente os campos.
2. Permita correção manual com trilha de auditoria.
3. Calcule o líquido automaticamente.
4. Gere os títulos (pai + filhos) de forma precisa.

Origem: Discovery realizado com especialista de domínio + análise de mocks de interface.

## 2. User stories

- Como **Operador de Contas a Pagar**, quero **fazer upload de um PDF e ver os dados preenchidos automaticamente**, para **economizar tempo e reduzir erros de digitação**.
- Como **Operador**, quero **ver o PDF original lado a lado com o formulário**, para **conferir visualmente se o OCR leu corretamente**.
- Como **Operador**, quero **que o sistema calcule o valor líquido automaticamente**, para **garantir que o fornecedor receba o valor correto**.
- Como **Aprovador**, quero **ver alertas quando uma alíquota divergir do padrão**, para **validar lançamentos fiscais com confiança**.
- Como **Operador**, quero **lançar um documento manualmente sem PDF**, para **contingência quando o OCR falha ou não há documento digital**.
- Como **Operador**, quero **alterar o vencimento de vários títulos simultaneamente no grid**, para **ganhar tempo quando houver renegociação de prazos com fornecedores**.

## 3. Critérios de aceitação (viram os testes do W0)

- **CA1** — Dado um PDF de NFS-e, quando o operador faz upload, então o OCR extrai: tipo, número, fornecedor, CNPJ, valor bruto, ISS, IRRF, INSS, data de emissão, competência em ≤ 3 segundos.
- **CA2** — Dado um documento com valor bruto R$ 10.000, ISS 3,5%, IRRF 1,5%, INSS 11%, quando o operador salva, então o sistema calcula líquido = R$ 7.935,00.
- **CA3** — Dado um documento com ISS divergente do padrão SEFIN, quando o operador tenta salvar, então o sistema exibe modal com 3 opções: `accept-document-value`, `correct-to-standard`, `request-corrected-invoice`.
- **CA4** — Dado um documento tipo NFS-e salvo, quando o sistema gera títulos, então cria 1 pai (líquido) + 4 filhos (ISS, IRRF, INSS, CSRF = PIS+COFINS+CSLL), todos com status `Aberto`.
- **CA5** — Dado um documento tipo DANFE salvo, então o sistema gera apenas 1 título pai (sem filhos) com status `Aberto` e registra ICMS/IPI/PIS/COFINS apenas como campos de leitura.
- **CA6** — Dado um formulário em edição, quando o operador altera qualquer campo, então o sistema auto-salva em ≤ 2 segundos.
- **CA7** — Dado um documento salvo, quando o operador acessa o grid de Contas a Pagar, então o documento aparece com status `Aberto` (ou `Rascunho` se não submetido).
- **CA8** — Dado um documento em status `Aprovado`, quando o operador seleciona no grid e clica "Baixar", então o status muda para `Pago` (pagamento manual) e habilita conciliação.
- **CA9** — Dado um documento com forma de pagamento TED, quando aprovado, então aparece na lista de remessa CNAB.
- **CA10** — Dado um documento com forma de pagamento PIX, quando aprovado, então **não** aparece na lista de remessa CNAB e segue fluxo manual.
- **CA11** — Dado um grid com 47 documentos, quando o operador busca por "Bambu", então o grid filtra exibindo apenas documentos do fornecedor "Bambu Educação".
- **CA12** — Dado múltiplos documentos selecionados no grid, quando o operador clica "Exportar CSV", então o sistema gera planilha com todos os campos visíveis do grid.
- **CA13** — Dado 5 títulos selecionados no grid (todos em status `Aberto` ou `Aprovado`), quando o operador clica "Alterar Vencimento" e informa a nova data "20/07/2026", então o vencimento de todos os títulos selecionados é atualizado para "20/07/2026" e registrado na trilha de auditoria.
- **CA14** — Dado 3 títulos selecionados (2 em `Aberto` e 1 em `Transmitido`), quando o operador clica "Alterar Vencimento", então o sistema exibe erro: "cannot-change-due-date-transmitted-or-beyond" e bloqueia a alteração.
- **CA15** — Dado um documento NFS-e com título pai e 4 filhos todos em status `Aprovado`, quando o operador paga (baixa) apenas o título pai, então o status do pai muda para `Pago`, mas os 4 filhos permanecem em `Aprovado`.
- **CA16** — Dado um documento NFS-e salvo com número "0847", quando o operador busca no grid por "0847", então o grid exibe o título pai e todos os títulos filhos (ISS, IRRF, INSS, CSRF) vinculados a esse documento.
- **CA17** — Dado um documento em edição, quando o operador clica "Salvar Documento", então o sistema persiste o documento, gera os títulos e redireciona para o grid de Contas a Pagar com a ordenação "Mais recente", exibindo o documento salvo no topo da lista.

## 4. Não-objetivos / fora de escopo

- Não implementar o módulo de aprovação em si (já existe `FIN-CLI-APROVAR-TITULO`).
- Não implementar geração de remessa CNAB (pertence a `FIN-AGG-PAYABLE-TRANSMISSION`).
- Não implementar conciliação bancária (pertence a `FIN-CONCILIACAO`).
- Não implementar gestão de plano orçamentário (apenas seleção do plano já existente).
- Não implementar cadastro completo de fornecedores (apenas busca e cadastro rápido).
- Não implementar notificações por email ao fornecedor (quando solicitar nota corrigida).

## 5. Clarificações (Q&A resolvidas)

- **Q:** O documento fiscal tem status próprio (Rascunho, Aberto, Aprovado) ou compartilha o status do título? · **R:** O documento é o fato gerador; o ciclo de vida financeiro é do título. Na prática, compartilham o mesmo status. O grid exibe o status do título pai. (Especialista de domínio, 05/06/2026).
- **Q:** O OCR é serviço próprio ou SaaS? · **R:** Ainda em decisão. A spec assume interface genérica (`OcrPort`) para não acoplar implementação.
- **Q:** A subcategoria (vista no mock) é campo novo? · **R:** Pendente de validação com PO. A spec inclui como campo opcional.
- **Q:** O aprovador é selecionado no lançamento? · **R:** O campo aprovador pode ser preenchido como preferência, mas qualquer aprovador com alçada suficiente pode aprovar depois.

## 6. Plano técnico de alto nível (o COMO — sem código)

### 6.1. Arquitetura

```
[ UI - Lançar Documento ]
       │
       ▼
[ OcrPort ] ──► [ Serviço OCR externo/local ]
       │
       ▼
[ DocumentoService (Application) ]
       │
       ├──► [ DocumentoRepositoryPort ] ──► MySQL (drizzle)
       ├──► [ FornecedorRepositoryPort ] ──► MySQL
       ├──► [ ContratoRepositoryPort ] ──► MySQL (read-only)
       ├──► [ OrcamentoRepositoryPort ] ──► MySQL (read-only)
       └──► [ StoragePort ] ──► S3/MinIO (PDFs)
```

### 6.2. Fluxo Principal

1. **Upload**: Operador faz upload do PDF → `StoragePort` persiste em S3/MinIO → retorna URL.
2. **OCR**: Sistema chama `OcrPort` com a URL do PDF → recebe `OcrResult` (campos extraídos).
3. **Preenchimento**: UI preenche formulário com dados do OCR → operador revisa/corrige.
4. **Validação**: Sistema calcula líquido → compara retenções com alíquotas padrão → sinaliza divergências.
5. **Salvar**: Operador clica "Salvar Documento" → `DocumentoService` valida → persiste documento → gera título pai + filhos via `TituloGenerator` → publica `TituloCriado` com status `Aberto`.
6. **Auto-save**: A cada alteração de campo → debounce de 2s → persiste rascunho em localStorage + backend.

### 6.3. Ports a Definir

| Port                       | Responsabilidade                                           |
| :------------------------- | :--------------------------------------------------------- |
| `OcrPort`                  | Abstrair o serviço de OCR (extrair dados de PDF).          |
| `StoragePort`              | Abstrair armazenamento de arquivos (S3/MinIO).             |
| `DocumentoRepositoryPort`  | CRUD de documentos fiscais/não-fiscais.                    |
| `TituloRepositoryPort`     | CRUD de títulos pai e filhos.                              |
| `FornecedorRepositoryPort` | Busca e cadastro rápido de fornecedores.                   |
| `AlíquotaRepositoryPort`   | Consulta de alíquotas padrão por município/código serviço. |

## 7. Constitution check (aderência aos ADRs/regras)

| Fonte                      | Exigência                                                             | Como a spec adere                                          |
| :------------------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------- |
| `ADR-0019`                 | Storage AWS S3 + MinIO (dev). `@aws-sdk/client-s3` é o cliente único. | PDFs armazenados via `StoragePort` usando S3/MinIO.        |
| `ADR-0020`                 | MySQL 8.4 como único dialeto.                                         | Documentos e títulos persistidos em MySQL via Drizzle ORM. |
| `ADR-0014`                 | Isolamento por prefixo (`ctr_*`, `fin_*`, `outbox`).                  | Tabelas do financeiro usarão prefixo `fin_`.               |
| `ADR-0015`                 | Outbox pattern para eventos cross-módulo.                             | Evento `TituloAprovado` publicado via outbox.              |
| `.claude/rules/domain.md`  | Domínio puro, sem framework.                                          | `Documento`, `Titulo`, `Retencao` são VOs/entidades puras. |
| `.claude/rules/testing.md` | Tests via node:test + --experimental-strip-types.                     | Todos os CAs cobertos por testes `.test.ts`.               |

## 8. Riscos & mitigações

| Risco                                          | Severidade | Mitigação                                                                |
| :--------------------------------------------- | :--------- | :----------------------------------------------------------------------- |
| OCR com acurácia < 90%                         | Alta       | Interface de correção manual + trilha de auditoria.                      |
| Complexidade fiscal variar por município       | Média      | Tabela de alíquotas parametrizável por CNPJ do prestador/código serviço. |
| PDFs com layout não padronizado                | Média      | Fallback para lançamento manual + upload do PDF mesmo sem OCR.           |
| Performance do auto-save em documentos grandes | Baixa      | Debounce + persistência assíncrona + localStorage como cache.            |

## 9. Definition of Done

- [ ] CAs cobertos por teste (W0) e verdes (W3).
- [ ] Constitution check sem conflito aberto.
- [ ] Tela de lançar documento renderizável (mesmo que com dados mock).
- [ ] Preview de títulos funcionando para todos os tipos de documento.
- [ ] Auto-save persistindo em backend.
- [ ] Grid de Contas a Pagar listando documentos com busca, filtros e ordenação "Mais recente".
- [ ] Busca por documento fiscal exibindo título pai e filhos vinculados no grid.
- [ ] Redirecionamento para grid (ordenação "Mais recente") após salvar documento.
