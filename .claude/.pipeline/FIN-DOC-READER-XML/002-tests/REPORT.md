# W0 — RED — FIN-DOC-READER-XML

Wave W0 (fail-first). Skill: **`tdd-strategist`** (orquestrado). Módulo `financial`, feature 034 (reader XML), ADR-0050 (XML = topo da cascata). Só testes + fixtures RED — nenhum `src/` de produção tocado.

## Grounding dos schemas (não "de memória")

Paths dos campos-alvo pesquisados via agente `general-purpose` + WebSearch, **confirmação cruzada de ≥4 fontes independentes** por documento (2026-07-09):

- **NF-e 4.00** (NT 2014.002, ns `portalfiscal.inf.br/nfe`): `nfeProc/NFe/infNFe/{ide/nNF, ide/dhEmi, emit/xNome, emit/CNPJ, total/ICMSTot/vNF, total/retTrib/*}`.
- **NFS-e Nacional** (Res. CGNFS-e 3/2023, ns `sped.fazenda.gov.br/nfse`): `NFSe/infNFSe/{nNFSe, emit/xNome, emit/CNPJ, DPS/infDPS/{dhEmi, dCompet, valores/vServPrest/vServ, valores/trib/tribMun/{pAliq, tpRetISSQN, vISSQN}}}`. `infNFSe` (assinado pelo Fisco) embute a `DPS/infDPS` (assinada pelo prestador).

## Fixtures sintéticas (sem PII — LGPD)

`tests/modules/financial/adapters/document-reader/_fixtures/xml-fixtures.ts` — dados fiscais **falsos** (CNPJ/valores fake), estruturalmente fiéis aos paths acima, com **gabarito** por fixture:

- `NFSE_NACIONAL` — NFS-e com ISS retido (`tpRetISSQN=2`, pAliq 5%, vServ 1000,00, vISSQN 50,00).
- `NFE` — NF-e 4.00 (→ `type='DANFE'`), sem retenção.
- `NFSE_LATIN1` — bytes **latin1** com `encoding="ISO-8859-1"` declarado + `xNome` acentuado.
- `XXE_ATTACK` — `<!DOCTYPE ... ENTITY xxe SYSTEM "file:///etc/passwd">` referenciado em `xNome`.
- `EMPTY_INPUT` / `MALFORMED_XML` / `UNKNOWN_XML` — entradas de erro.

## Testes RED — `xml.test.ts` (CA1–CA6)

| CA | Teste | Assere |
| :-- | :-- | :-- |
| CA1 | NFS-e → VOs canônicos | `type`, `documentNumber`, `supplier{legalName,taxId}`, `grossValue.cents=100000`, `competence{2026,4}`, `issueDate`, `retentions[0]` ISS `{base:100000, rateBps:500, value:5000}` |
| CA2 | NF-e → DANFE | `type='DANFE'`, campos estruturados path-aware, `grossValue.cents=123456` |
| CA3 | erros | vazio→`empty-input`; malformado→`malformed-document`; XML sem schema fiscal→`malformed-document` |
| CA4 | encoding | latin1 declarado → `legalName='PRESTAÇÃO E SERVIÇOS LTDA'` sem garbling |
| CA5 | minimização | `Object.keys ⊆` permitido; sem `text`/`rawText` |
| CA6 | XXE | entidade externa não resolvida — `legalName` nunca contém `root:` |

## Saída literal RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../adapters/document-reader/xml.ts'
  imported from .../tests/.../xml.test.ts
ℹ tests 1 · pass 0 · fail 1
```

Causa raiz esperada: `createXmlDocumentReader` não existe (`xml.ts` é criado no W1). Sem regressão.

## Contrato a implementar no W1 (transparente)

`export const createXmlDocumentReader = (): DocumentReaderPort` — parse path-aware (`fast-xml-parser`, promovido a dep direta), `TextDecoder` honrando `encoding` declarado, mapeando NFS-e/NF-e para os VOs `Money`/`Competencia`/`Retention` do agregado `Document`. Config anti-XXE (sem `processEntities`/DTD externo). Próximo: **W1** (`ports-and-adapters` + `nodejs-runtime-expert`).
