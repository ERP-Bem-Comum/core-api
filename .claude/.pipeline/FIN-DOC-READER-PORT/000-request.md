# FIN-DOC-READER-PORT — escopo

> Feature **034-fin-documento-reader** (fatia 1), módulo **`financial`**. Épico **#62**. Size **S**.
> Ancorado em **ADR-0050** (cascata nativo-first, Accepted). Spec/plan: `specs/034-fin-documento-reader/{spec,plan}.md`.
> **Primeiro ticket da fatia** — a fundação que os readers (NATIVE/XML) e a cascata consomem.

## Escopo (in)

1. **Port** `application/ports/document-reader.ts` — `DocumentReaderPort = Readonly<{ read: (input: DocumentReaderInput) => Promise<Result<DocumentReaderResult, DocumentReaderError>> }>`. `DocumentReaderInput = { bytes: Uint8Array; declaredMime?: string }` (**bytes, nunca URL** — ADR-0050, anti-SSRF).
2. **Types de domínio** `domain/document-reader/types.ts` — `DocumentReaderResult` (campos only: tipo, número, competência, fornecedor{razaoSocial,documento}, valorBrutoCents, retenções[]) + `resolvedVia: 'xml' | 'native-text'` + `DocumentType`. Imutável (`Readonly`). **Minimização LGPD** — sem texto bruto.
3. **Errors** `domain/document-reader/errors.ts` — union kebab EN: `scanned-unsupported | unsupported-pdf-structure | decompression-limit-exceeded | source-too-large | empty-input | malformed-document`.
4. **Mock adapter** `adapters/document-reader/mock.ts` — determinístico (retorna um `DocumentReaderResult` semeado ou um erro semeado), p/ testes de application das fatias seguintes.
5. **Cascade skeleton** `adapters/document-reader/cascade.ts` — orquestra `xml → native → scanned-unsupported`, recebendo os readers por injeção (na fatia 1 os readers reais podem ser stubs que devolvem `unsupported`; a lógica de precedência XML>nativo é o que se testa aqui).

## Fora de escopo (tickets seguintes)

- Implementação real do reader nativo (`FIN-DOC-READER-NATIVE`) e XML (`FIN-DOC-READER-XML`).
- Borda HTTP, storage, wiring ao `Document` (fatia 2).
- OCR de imagem/escaneado (adiado — ADR-0050 degrau 3).

## Critérios de aceite

- **CA1** o port é um `type Readonly<{}>` de função (não interface/class) e devolve `Result` (`.claude/rules/application.md`).
- **CA2** `DocumentReaderResult` carrega só campos + `resolvedVia` — nenhum campo de texto bruto (minimização).
- **CA3** o mock devolve resultado semeado OU erro semeado (determinístico), consumível por testes.
- **CA4** a cascata: dado um input resolvido pelo reader XML, `resolvedVia='xml'`; dado só o nativo resolvendo, `resolvedVia='native-text'`; nenhum resolvendo → `err('scanned-unsupported')`. Precedência XML>nativo comprovada.

## Pipeline (agentes por wave)

| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (contrato do port + cascata + mock) | skill **`tdd-strategist`** |
| W1 | types + port + errors + mock + cascade skeleton | skill **`ts-domain-modeler`** + **`ports-and-adapters`** |
| W2 | audit (pureza, Result, minimização) | skill **`code-reviewer`** + agente **`typescript-language-expert`** |
| W3 | gate | skill **`ts-quality-checker`** |

## DoD

Gate W3 verde. Port + types + errors + mock + cascade skeleton prontos, testados. Desbloqueia `FIN-DOC-READER-NATIVE` e `FIN-DOC-READER-XML`.
