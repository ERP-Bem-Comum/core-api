# ADR-0034: OCR como Port/Adapter Pattern

- **Status:** Accepted
- **Date:** 2026-06-06
- **Deciders:** Tech Lead + Especialista de Domínio

## Contexto

O Módulo Financeiro precisa extrair dados de documentos fiscais (NFS-e, DANFE, RPA, etc.) a partir de PDFs. Existem múltiplas opções de tecnologia de OCR no mercado:

1. **Tesseract OCR** (open source, local, gratuito, mas acurácia variável)
2. **AWS Textract** (SaaS, alta acurácia, custo por página)
3. **Google Cloud Vision** (SaaS, alta acurácia, custo por página)
4. **Azure Form Recognizer** (SaaS, modelos customizados)

Precisamos de uma decisão que:
- Não acople o domínio a uma tecnologia específica.
- Permita trocar de OCR sem refactoring do core.
- Suporte fallback para lançamento manual quando o OCR falhar.

## Decisão

Adotar o **Port/Adapter Pattern** para o OCR:

1. Definir `OcrPort` como `type Readonly<{...}>` no domain com método `extract(pdfUrl: string): Promise<OcrResult>`.
2. Implementar adapters concretos fora do domínio como factory functions (zero `class`):
   - `createOcrMockAdapter` (fase 1 — desenvolvimento e testes)
   - `createTesseractOcrAdapter` (fase 2 — opção open source)
   - `createAwsTextractAdapter` (fase 3 — opção SaaS, se necessário)
3. O domain nunca conhece a implementação. A injeção de dependência ocorre na composição da aplicação.
4. `OcrResult` usa `Readonly<>` e `ReadonlyArray<>` para garantir imutabilidade.

## Consequências

### Positivas
- **Substituição sem refactoring**: Trocar Tesseract por Textract exige apenas criar um novo adapter, sem tocar `DocumentoService`.
- **Testabilidade**: `createOcrMockAdapter` permite testes unitários determinísticos.
- **Fallback garantido**: Se todos os adapters falharem, o operador sempre pode lançar manualmente.
- **Alinhamento com ADR-0006**: Ports como `type Readonly<{}>` preservam a fronteira do modular monolith.

### Negativas
- **Overhead de abstração**: Adiciona uma camada indireta.
- **Schema de OcrResult**: Mudanças no formato de saída do OCR exigem atualização do `OcrResult` e potencialmente dos adapters.
- **Latência**: Adapters SaaS introduzem latência de rede (mitigada com timeout e fallback).

## Alternativas Rejeitadas

1. **OCR direto no domain**: Rejeitado. Acoplaria o domain a uma tecnologia específica e dificultaria testes.
2. **OCR apenas SaaS desde o início**: Rejeitado. Custo elevado em desenvolvimento/testes. Preferimos mock local + opção SaaS futura.
3. **OCR apenas Tesseract**: Rejeitado. Acurácia pode ser insuficiente para documentos complexos. Queremos a opção de upgrade.

## Referências

- Evans, _Domain-Driven Design_, p. 105 — "Repositories and Factories are part of the domain layer, but their implementations are in the infrastructure layer."
- Martin, _Clean Architecture_, Cap. 17 — "The Dependency Rule: source code dependencies must point only inward, toward higher-level policies."
- ADR-0006 — Modular Monolith (fronteiras entre BCs via ports/adapters).
- ADR-0019 — Document Storage S3 + MinIO (PDFs armazenados separadamente; OCR recebe URL).
