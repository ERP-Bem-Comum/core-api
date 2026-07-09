# FIN-DOC-READER-XML — escopo

> Feature **034-fin-documento-reader** (fatia 3, reader XML). Módulo **`financial`**. Épico **#62**. Size **M**.
> Ancorado em **ADR-0050** (cascata nativo-first, XML é o TOPO) + **ADR-0011 §5** (checklist de lib) + **ADR-0027** (fora — borda é fatia 2).
> Consome a fundação de `FIN-DOC-READER-PORT` (port + `DocumentReaderResult` **já corrigido**: EN + VOs canônicos). **NÃO** redefinir tipos.

## Escopo (in)

1. **Promover `fast-xml-parser@5.7.3` (MIT) a dependência direta** em `package.json` (hoje é transitiva via `@aws-sdk/client-s3`). Checklist ADR-0011 §5: MIT confirmada local, versão pinada, custo de supply-chain ~0 (já no lockfile). Sem novo download.
2. **Adapter `adapters/document-reader/xml.ts`** — `createXmlDocumentReader(): DocumentReaderPort`. Parse **path-aware** (não regex — `research.md:64`) do XML → `DocumentReaderResult` com `resolvedVia: 'xml'`.
3. **Mapeamento de campos** para os schemas: **NFS-e Nacional** (Res. CGNFS-e 3/2023 — o XML é o doc legal) e **NF-e** (NT 2014.002). Campos-alvo: `type`, `documentNumber`, `supplier {legalName, taxId}`, `competence` (via `Competencia.fromString`), `issueDate`, `grossValue` (via `Money.fromCents`), `retentions` (via `Retention.create` — ISS/IRRF/INSS/CSRF).
4. **Encoding:** respeitar `encoding` declarado no prólogo XML (`ISO-8859-1`/`windows-1252` comuns em gov BR) via `TextDecoder` nativo (`research.md:64`, `handbook/reference/nodejs/Utilities.md:2690`) — sem garbling de acento.
5. **Segurança XML (XXE):** `fast-xml-parser` **não** resolve entidades externas/DTD por default — confirmar config (`processEntities`, sem `DOCTYPE` expandido) e travar em teste (entidade externa NÃO é resolvida). Anti-billion-laughs.

## Fora de escopo (outros tickets)

- Reader nativo de PDF (`FIN-DOC-READER-NATIVE`).
- Orquestração/precedência final da cascata (`FIN-DOC-READER-CASCADE` — a skeleton já existe).
- Borda HTTP + storage + wiring ao `Document` (fatia 2).

## Critérios de aceite (contra **fixtures XML sintéticas** — dados fiscais FALSOS, sem PII)

- **CA1 — NFS-e Nacional.** Dado XML sintético de NFS-e válido, `read(bytes)` → `resolvedVia='xml'` + `type='NFS-e'`, `documentNumber`, `supplier`, `competence`, `grossValue`, `retentions` **batendo o gabarito sintético** (0 valor errado). Money/Competencia/Retention são os VOs (validados).
- **CA2 — NF-e.** Dado XML sintético de NF-e, extrai `type`, `documentNumber`, `supplier`, `issueDate`, `grossValue` estruturados (path-aware).
- **CA3 — erros explícitos.** Bytes vazios → `err('empty-input')`; XML sintaticamente inválido → `err('malformed-document')`; XML válido mas sem campos-alvo reconhecíveis → `err('malformed-document')` (deixa a cascata cair para o nativo).
- **CA4 — encoding.** XML declarando `ISO-8859-1` com `razão social` acentuada → `legalName` sem garbling.
- **CA5 — minimização LGPD.** `DocumentReaderResult` carrega só os campos permitidos — nenhum texto bruto do XML.
- **CA6 — XXE fechado.** XML com entidade externa (`<!DOCTYPE ... SYSTEM ...>`) NÃO resolve o recurso (sem SSRF/leitura de arquivo); trata como documento normal ou `malformed-document`.

## Pipeline (agentes por wave)

| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED — fixtures XML sintéticas + testes de mapeamento/erros/encoding/XXE | skill **`tdd-strategist`** |
| W1 | promover dep + `xml.ts` (parse path-aware + map para VOs) | skill **`ports-and-adapters`** + agente **`nodejs-runtime-expert`** (TextDecoder) |
| W2 | audit (pureza, Result, minimização, **XXE/segurança**, aderência de contrato) | skill **`code-reviewer`** + agente **`security-backend-expert`** |
| W3 | gate | skill **`ts-quality-checker`** |

## DoD

Gate W3 verde. `fast-xml-parser` dep direta + `xml.ts` mapeia NFS-e/NF-e sintéticos para os VOs canônicos, com erros explícitos e XXE fechado. Desbloqueia (com o nativo) o `FIN-DOC-READER-CASCADE`.
