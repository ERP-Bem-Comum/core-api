# W1 — GREEN — FIN-DOC-READER-PORT

Wave W1 (implementação mínima). Skill: **`ts-domain-modeler`** + **`ports-and-adapters`** (orquestrado). Módulo `financial`, feature 034 (fatia 1, épico #62), ADR-0050. Implementação mínima até os testes RED do W0 ficarem GREEN — YAGNI estrito, nada além do contrato da fatia 1.

> **Nota de retomada:** este REPORT foi lavrado ao reabrir a worktree `fin-ocr` após queda de energia. O código do W1 já estava no working tree e **11/11 testes GREEN**; o `STATE` marcava W1 `in-progress` porque a queda ocorreu antes do `wave-finish`. Os testes foram **re-executados na retomada** (saída literal abaixo) antes de fechar a wave.

## Arquivos de produção criados (sob o worktree `fin-ocr/`)

- `src/modules/financial/application/ports/document-reader.ts` — `DocumentReaderInput` (bytes + `declaredMime?`) e `DocumentReaderPort` como `Readonly<{ read: (input) => Promise<Result<…>> }>`. **Bytes, nunca URL** (ADR-0050, anti-SSRF). Port é `type` de função — não interface/class (CA1, `.claude/rules/application.md`).
- `src/modules/financial/domain/document-reader/types.ts` — `DocumentReaderResult` imutável e **minimizado (LGPD)**: só campos extraídos (`tipo`, `numero`, `competencia`, `dataEmissao`, `fornecedor`, `valorBrutoCents`, `retencoes`) + discriminante `resolvedVia: 'xml' | 'native-text'`. Nenhum campo de texto bruto (CA2). `DocumentType`, `SupplierIdentity`, `Retention` auxiliares.
- `src/modules/financial/domain/document-reader/errors.ts` — union kebab EN de 6 membros derivada da tupla-witness `DOCUMENT_READER_ERRORS as const` (valor e tipo em sincronia, fonte única).
- `src/modules/financial/adapters/document-reader/mock.ts` — `createMockDocumentReader(seed)` determinístico: `{ result }` → `ok`, `{ error }` → `err` (CA3).
- `src/modules/financial/adapters/document-reader/cascade.ts` — `createCascadeReader({ xml, native })`: precedência **XML > nativo > `scanned-unsupported`** com short-circuit (nativo não é consultado se o XML resolve) — CA4.

## Aderência às regras de camada

- **Domínio puro** (`types.ts`, `errors.ts`): zero I/O, `Readonly`, sem `class`/`throw`, erro como string-literal union (`.claude/rules/domain.md`). ✔
- **Application** (`document-reader.ts`): port como `type Readonly<{}>` de função, sem import de `adapters/` (`.claude/rules/application.md`). ✔
- **Adapters** (`mock.ts`, `cascade.ts`): implementam o port, convertem via `Result` na borda, não vazam exception (`.claude/rules/adapters.md`). ✔
- Imports com extensão `.ts` + `import type` para tipos (`verbatimModuleSyntax`). Primitiva `ok`/`err`/`Result` de `src/shared/primitives/result.ts` (existente). ✔

## Saída literal GREEN (re-run na retomada)

```
▶ financial/adapters/document-reader/cascade
  ✔ CA4: XML resolve → resolvedVia="xml" mesmo quando o nativo também resolveria (precedência XML>nativo)
  ✔ CA4: quando o XML resolve, o reader nativo não é consultado (short-circuit)
  ✔ CA4: XML falha, nativo resolve → resolvedVia="native-text"
  ✔ CA4: nenhum reader resolve → err("scanned-unsupported")
▶ financial/adapters/document-reader/mock
  ✔ CA3: semeado com { result } → read() devolve ok(result)
  ✔ CA3: semeado com { error } → read() devolve err(error)
  ✔ CA3: é determinístico — a mesma seed devolve o mesmo Result em chamadas repetidas
▶ financial/domain/document-reader/types
  ✔ CA2: um DocumentReaderResult completo só carrega campos permitidos + resolvedVia (sem texto bruto)
  ✔ CA2: resolvedVia é o discriminante "xml" | "native-text"
  ✔ CA1/CA2: o mínimo válido é só resolvedVia — os demais campos são opcionais
  ✔ CA2: o union de erros é exatamente os 6 membros kebab EN esperados
ℹ tests 11 · pass 11 · fail 0 · skipped 0
```

## Cobertura CA → implementação

- **CA1** port é `type Readonly<{}>` de função devolvendo `Result` → `document-reader.ts`. ✔
- **CA2** result só campos + `resolvedVia`, sem texto bruto → `types.ts`. ✔
- **CA3** mock determinístico resultado/erro semeado → `mock.ts`. ✔
- **CA4** cascata XML>nativo>`scanned-unsupported`, precedência comprovada → `cascade.ts`. ✔

## Refinamento transparente (vs 000-request.md)

- `DocumentReaderResult` inclui `dataEmissao?` além dos campos listados no request (campo fiscal comum; ainda dentro da minimização — sem texto bruto). Registrado aqui para o W2 avaliar.

Próximo: **W2** (audit read-only — pureza, `Result`, minimização, type-system) via skill `code-reviewer` + agente `typescript-language-expert`.

---

## Round 2 — correção pós-W2 REJECTED (aderência a ADR)

O W2 round 1 reprovou (`004-code-review/REVIEW.md`) por 3 violações de ADR + 1 minor. Correções aplicadas em `domain/document-reader/types.ts` + os 3 testes (port/mock/cascade `src` inalterados):

- **C1 (idioma EN — ADR-0023:53 / ADR-0039:43 / AGENTS.md:56):** campos renomeados para EN, ancorados no agregado `Document` (`document.ts`): `tipo→type`, `numero→documentNumber`, `dataEmissao→issueDate: Date`, `fornecedor→supplier`, `valorBrutoCents→grossValue`, `retencoes→retentions`, `competencia→competence` (EN puro, decisão da P.O.); `SupplierIdentity` agora `legalName`/`taxId`.
- **C2 (Money VO — ADR-0018:69 / domain.md):** `grossValue?: Money` (era `number`). Valores validados via `Money.fromCents` (nos testes, montados por smart constructor).
- **C3 (dup de VO):** removidos os `Retention` e `DocumentType` locais/degradados; reusa `domain/shared/retention.ts` (`Retention` com `type: RetentionType`, `base`/`value: Money`) e `domain/document/types.ts` (`DocumentType` canônico, 7 espécies). Também reusa `Competencia` (`domain/document/competencia.ts`).
- **I1 (minor):** comentário "discriminante" → "tag de proveniência" (não é discriminated union real).

**Re-execução:** `pnpm test` (document-reader) **11/11 GREEN**; `pnpm run typecheck` **limpo (exit 0)**. CAs inalterados (minimização, determinismo, precedência XML>nativo).
