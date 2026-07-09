<!-- PLAN (pós-spec, pré-W0). Ancorado em ADR-0050 + research.md + spec.md. -->

# PLAN — Motor de Leitura de Documento Fiscal (fatia 1)

> Detalha o COMO da `spec.md`. Foco: menor-dependência (ADR-0011), métrica objetiva (12/12), fixtures sintéticas (sem PII).

## 1. Estrutura de arquivos (módulo `financial`)

```
src/modules/financial/
├── domain/document-reader/
│   ├── types.ts          # DocumentReaderResult, ReaderField VOs, DocumentType, resolvedVia
│   └── errors.ts         # DocumentReaderError (union kebab EN)
├── application/ports/
│   └── document-reader.ts # DocumentReaderPort (type Readonly<{ read }>)
└── adapters/document-reader/
    ├── cascade.ts        # orquestra xml → native → scanned-unsupported
    ├── xml.ts            # fast-xml-parser → campos (NFS-e/NF-e)
    ├── native-pdf.ts     # node:zlib + tokenizer + ToUnicode + estruturação
    ├── pdf-lowlevel.ts   # primitivas: inflate guardado, tokenizer de objetos, content-stream
    └── mock.ts           # determinístico p/ testes de application
tests/modules/financial/adapters/document-reader/
    ├── _fixtures/         # PDFs/XMLs SINTÉTICOS + builder
    ├── native-pdf.test.ts · xml.test.ts · cascade.test.ts
```

## 2. Contratos (formas — sem implementação)

```ts
// application/ports/document-reader.ts
export type DocumentReaderInput = Readonly<{ bytes: Uint8Array; declaredMime?: string }>;
export type DocumentReaderPort = Readonly<{
  read: (input: DocumentReaderInput) => Promise<Result<DocumentReaderResult, DocumentReaderError>>;
}>;

// domain/document-reader/types.ts  (campos only — minimização LGPD)
export type DocumentReaderResult = Readonly<{
  resolvedVia: 'xml' | 'native-text';
  tipo?: DocumentType;
  numero?: string;
  competencia?: string;
  dataEmissao?: string;
  fornecedor?: Readonly<{ razaoSocial: string; documento: string }>; // CNPJ/CPF
  valorBrutoCents?: number;
  retencoes?: readonly Readonly<{ tipo: string; valorCents: number }>[];
}>;

// domain/document-reader/errors.ts
export type DocumentReaderError =
  | 'scanned-unsupported'
  | 'unsupported-pdf-structure'
  | 'decompression-limit-exceeded'
  | 'source-too-large'
  | 'empty-input'
  | 'malformed-document';
```

## 3. Reader nativo in-house — design (o coração da fatia)

Ordem de processamento (`native-pdf.ts` sobre `pdf-lowlevel.ts`):

1. **Guarda de tamanho** (`bytes.length <= MAX`) → `source-too-large`.
2. **Detecção de estrutura:** procurar `xref` clássico; se `/XRef`(stream)/`/ObjStm`/`/Encrypt` → `unsupported-pdf-structure` (fora do escopo v1 — decisão empírica da varredura).
3. **Inflate guardado:** `zlib.inflateRawSync(stream, { maxOutputLength: MAX_INFLATE })` → `decompression-limit-exceeded` no erro (anti-bomb; `handbook/reference/nodejs/Zlib.md:837`).
4. **Tokenizer de content-stream:** operadores `BT/ET`, `Tj`, `TJ`, `Td/TD/Tm`; extrai as strings mostradas.
5. **Decodificação:** WinAnsi/StandardEncoding direto; para fontes `Identity-H`, parsear o CMap `/ToUnicode` (`bfchar`/`bfrange`) → mapear os 2-byte codes para Unicode (evita garbling — CA3).
6. **Sem texto recuperável** (ex.: só imagem, ou `/ToUnicode` ausente) → `scanned-unsupported`.
7. **Estruturação por tipo:** sobre o texto fiel, extrair campos por regras/âncoras (CNPJ/CPF por regex, valores R$, datas; template por `tipoDocumento`). Devolver `DocumentReaderResult`.

## 4. Reader XML

- **`fast-xml-parser@5.7.3` (MIT) — promovido a dep direta** (já no lockfile via `@aws-sdk/client-s3`; **checklist ADR-0011 §5**: mantido, 2FA, versão pinada — custo marginal ~0).
- `TextDecoder` nativo respeita `encoding` declarado (ISO-8859-1 comum em XML gov BR; `handbook/reference/nodejs/Utilities.md:2690`).
- Mapear campos-alvo do schema NFS-e Nacional/NF-e (path-aware, não regex).

## 5. Fixtures sintéticas (crítico — sem PII, ADR-0050/LGPD)

- **Builder Node** (`_fixtures/build.ts`, `node:zlib.deflateRawSync`) monta PDFs mínimos **classic-xref** com content-stream FlateDecode e valores fiscais **falsos** (CNPJ/CPF fake, valores conhecidos) espelhando a **estrutura** do gabarito (NFS-e/RPA/Boleto). Um boleto com `Identity-H` + `/ToUnicode` exercita a CA3.
- XML sintético NFS-e/NF-e com os mesmos campos.
- **Nada de PII real** — o gabarito real fica só na validação manual local (não commitável).
- Determinístico (sem timestamps/rand) → reprodutível no CI.

## 6. Fatiamento em tickets de pipeline (W0→W3 cada)

| Ticket                     | Escopo                                                                                                       | Size  |
| :------------------------- | :----------------------------------------------------------------------------------------------------------- | :---- |
| **FIN-DOC-READER-PORT**    | port + types + errors + mock + cascade skeleton + W0 do contrato                                             | S     |
| **FIN-DOC-READER-NATIVE**  | `pdf-lowlevel` + `native-pdf` (inflate guardado, tokenizer, ToUnicode) + fixtures builder + W0 CA1/2/3/5/6/7 | **L** |
| **FIN-DOC-READER-XML**     | `fast-xml-parser` (promover dep) + mapping NFS-e/NF-e + W0 CA4                                               | M     |
| **FIN-DOC-READER-CASCADE** | orquestração + precedência XML>nativo + CA8/9 + gate integrado                                               | S     |

> Fatia 2 (fora daqui): storage do PDF-fonte + borda HTTP `POST /api/v2/financial/documents/read` + wiring ao `Document` rascunho.

## 7. Métrica de aceite (a régua do dono)

- **Correção:** todos os campos das fixtures sintéticas extraídos certos (0 valor errado) — o "12/12" do estudo, adaptado a dado sintético.
- **Leve/rápido:** caminho principal em `node:zlib` (nativo), 0 GPU, 0 dep de runtime nova (exceto `fast-xml-parser` já-presente).
- **Qualidade:** todo caso não-suportado devolve `Result` de erro explícito — nunca valor errado silencioso.
- **Gate de escape:** se `FIN-DOC-READER-NATIVE` não bater a métrica no W0/W1 (ex.: ToUnicode intratável), acionar fallback `unpdf` (MIT) com checklist ADR-0011 §5 — decisão registrada, não silenciosa.

## 8. Grounding (não "de memória")

- ADR-0050 (cascata) · ADR-0011 §5 (checklist lib) · ADR-0006 (ports).
- `handbook/reference/nodejs/{Zlib.md:837,1586, Globals.md:120,540, Utilities.md:2690}` (zlib/fetch/TextDecoder nativos).
- Evans p.224 (ACL) · Vernon p.182 (Ports&Adapters).
- `research.md` (5 fontes + varredura empírica) · estudo local (métrica 12/12).
