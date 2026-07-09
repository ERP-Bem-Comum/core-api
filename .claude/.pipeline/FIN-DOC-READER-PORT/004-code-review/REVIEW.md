# Code Review — Ticket FIN-DOC-READER-PORT — Round 1

**Veredito:** REJECTED

**Reviewer:** code-reviewer (sessão principal) + agente `typescript-language-expert` (ângulo type-system)
**Data:** 2026-07-08
**Escopo revisado:**
- `src/modules/financial/application/ports/document-reader.ts`
- `src/modules/financial/domain/document-reader/types.ts`
- `src/modules/financial/domain/document-reader/errors.ts`
- `src/modules/financial/adapters/document-reader/mock.ts`
- `src/modules/financial/adapters/document-reader/cascade.ts`
- testes: `types.test.ts`, `mock.test.ts`, `cascade.test.ts`

> **Nota de honestidade do processo:** o veredito preliminar da sessão dispensou os campos em PT e o `number` cru citando "precedente do módulo" (código existente) — o que é o anti-padrão #12 (citar de memória / usar dívida como licença). Ao **abrir os ADRs**, o precedente se revela dívida pré-existente, não autorização. As diretrizes canônicas são as abaixo. O veredito correto é REJECTED.

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

#### C1 — Idioma PT em identificadores de domínio (viola nomenclatura canônica)

`domain/document-reader/types.ts` (campos `tipo`, `numero`, `competencia`, `dataEmissao`, `fornecedor`, `valorBrutoCents`, `retencoes`, `razaoSocial`, `documento`) e `application/ports/document-reader.ts` (o input está OK: `bytes`/`declaredMime` são EN).

**Regra violada — citação literal:**
- `handbook/architecture/adr/0023-contract-lifecycle-pending-state.md:53-55`:
  > "### Nomenclatura canônica (EN no código · PT na borda)
  > Mantém-se o padrão do projeto: identificadores em EN; termos ao humano em PT via dicionário (`cli/formatters/`, e futuramente a ACL HTTP)."
- `handbook/architecture/adr/0039-contract-cancelled-state.md:43`:
  > "### Nomenclatura (EN no código · PT na borda)"
- `AGENTS.md:56`:
  > "| Código (tipos, funções, variáveis, pastas, arquivos) | **EN** |"

**Prova de que o padrão é campo-EN mesmo em conceito de domínio BR:** os VOs canônicos usam campos EN — `Money` → `cents` (`src/shared/kernel/money.ts:11`); `Competencia` → `year`/`month` (`src/modules/financial/domain/document/competencia.ts:7-10`); `Retention` → `type`/`base`/`value`/`rateBps` (`src/modules/financial/domain/shared/retention.ts:10-15`). O nome do *conceito* pode ser um termo de negócio (`Competencia`), mas as *propriedades* são EN.

**Esperado:** renomear os campos para EN. Sugestão alinhada ao Document/VOs existentes: `documentType`, `documentNumber`, `competence`, `issueDate`, `supplier`, `grossAmount`, `withholdings`; `SupplierIdentity` → `legalName`/`taxId`. PT só na borda (DTO HTTP em `adapters/http/`).

#### C2 — Valor monetário como `number` cru em type de `domain/` (viola modelagem canônica de Money)

`domain/document-reader/types.ts:29` (`valorBrutoCents?: number`) e `:17` (`Retention.valorCents: number`).

**Regra violada — citação literal:**
- `handbook/architecture/adr/0018-persistence-dual-dialect-drizzle.md:69`:
  > "| `Money` (cents inteiro) | `integer` | `bigint` | … `Money.fromCents` já valida `<= MAX_SAFE_INTEGER`. |"
- `.claude/rules/domain.md`:
  > "Branded types para IDs e valores validados — `ContractId`, `AmendmentId`, `Money`, `Period`… Smart constructor obrigatório (`Money.fromCents(raw): Result<Money, MoneyError>`)."

`number` cru pula a validação canônica (`money-non-integer-value`, `money-negative-value`, `money-exceeds-safe-integer` — `money.ts:23-29`, defeito fiscal #8 documentado). Existe VO cross-BC pronto: `src/shared/kernel/money.ts` (`import * as Money`). **Esperado:** `grossAmount?: Money.Money`; valores validados via `Money.fromCents` no reader (extração inválida → `malformed-document`).

#### C3 — Redefinição de VO de domínio já existente (`Retention`) — duplicação degradada

`domain/document-reader/types.ts:14-18` redefine `Retention` como `{ tipo: string; valorCents: number }`.

**Já existe** `src/modules/financial/domain/shared/retention.ts:8-15` — VO canônico no MESMO módulo:
```ts
export type RetentionType = 'ISS' | 'IRRF' | 'INSS' | 'CSRF';
export type Retention = Readonly<{ type: RetentionType; base: Money.Money; rateBps: number; value: Money.Money }>;
// + smart constructor create(): Result<Retention, RetentionError>
```
A versão da fatia 1 é degradada em três eixos ao mesmo tempo: idioma (`tipo`/`valorCents` PT), tipo (`string` livre vs union `RetentionType`), e valor (`number` vs `Money`). Dois conceitos `Retention` conflitantes no módulo `financial` violam DRY e a linguagem ubíqua (um só significado por termo). **Esperado:** reusar `domain/shared/retention.ts` (`import * as Retention`); `withholdings?: readonly Retention.Retention[]`.

### 🟡 Importante (registrar)

#### I1 — `resolvedVia` chamado de "discriminante" mas não é discriminated union

`domain/document-reader/types.ts:20`. `DocumentReaderResult` é um único record; `resolvedVia: 'xml'|'native-text'` é union de literais, não tag de uma union de shapes — `result.resolvedVia === 'xml'` não estreita nenhum outro campo, e `{ resolvedVia: 'xml' }` sem campo algum é habitável. Aceitável por YAGNI na fatia 1 (readers são stubs), mas o **comentário engana**. Corrigir o vocabulário ("tag de proveniência") ou, se fatias futuras derem garantias de campo por via, migrar para union real. (Achado do `typescript-language-expert`.)

### 🔵 Sugestão

- **S1** — `Retention.tipo: string` livre (mesmo após EN) admite `''` e lixo; ao reusar o VO canônico (C3) isso some (vira `RetentionType`).
- **S2** — `DocumentType = 'NFS-e'|'RPA'|'Boleto'|'DANFE'`: siglas fiscais como *valores* de union são aceitáveis (igual `RetentionType`). No round 2, checar se o `financial/domain/document/` já expõe um tipo canônico de espécie de documento para não duplicar (mesma armadilha do C3).

---

## O que está bom (confirmado)

- **Type-system limpo:** `pnpm run typecheck` → `EXIT_CODE=0`, zero diagnóstico. `verbatimModuleSyntax` 100% correto nos 5 arquivos; `import type` em todo import de tipo, `ok`/`err` como valor. (Verificado pelo `typescript-language-expert`.)
- **Derivação do union de erros** (`errors.ts:4-13`): witness `as const` + `(typeof T)[number]` é o idioma canônico de fonte única. Os 6 membros kebab EN estão corretos.
- **Cascata** (`cascade.ts`): precedência XML>nativo>`scanned-unsupported` com short-circuit — CA4 satisfeito, sem cast, `resolvedVia` preservado no nível de tipos.
- **Mock** determinístico (CA3) e **minimização LGPD** (CA2, sem texto bruto) corretos.
- **Testes:** AAA explícito, fakes injetáveis (readers fake na cascata, seed no mock), guard bidirecional de tipo no union de erros. Boa disciplina de W0.
- **Bytes, nunca URL** no input (ADR-0050, anti-SSRF) — corretíssimo.

O esqueleto de contrato e a mecânica (cascata/mock/erros) estão sólidos. O que reprova é **aderência a ADR de nomenclatura e de VO** — não a lógica.

---

## Próximo passo

**REJECTED → volta para W1 (round 2).** Correções C1+C2+C3 (renomear para EN + adotar `Money` e reusar o VO `Retention`) + I1 (comentário). Como C1/C2/C3 mudam o contrato de `DocumentReaderResult`, os 3 testes (que hoje montam `tipo`/`valorCents`/`competencia`) precisam ser reescritos junto — os CAs (minimização, determinismo, precedência) permanecem os mesmos. Depois, W2 round 2.

---

# Code Review — Round 2

**Veredito:** APPROVED

**Data:** 2026-07-08
**Escopo:** re-verificação das issues do round 1 em `domain/document-reader/types.ts` + os 3 testes (port/mock/cascade `src` inalterados). Regra (SKILL): listar apenas o que faltava corrigir.

| Issue (round 1) | Estado | Evidência |
| :-- | :-- | :-- |
| 🔴 C1 idioma PT | **corrigido** | campos EN ancorados no agregado `Document`: `type`/`documentNumber`/`competence`/`issueDate`/`supplier`/`grossValue`/`retentions`; `SupplierIdentity` → `legalName`/`taxId`. |
| 🔴 C2 `number` cru | **corrigido** | `grossValue?: Money` (`import type { Money }` de `shared/kernel/money.ts`); `Retention` traz `base`/`value: Money`. |
| 🔴 C3 dup de VO | **corrigido** | `Retention` e `DocumentType` locais removidos; reusa `domain/shared/retention.ts`, `domain/document/types.ts` (7 espécies) e `domain/document/competencia.ts`. Um só significado por termo no módulo. |
| 🟡 I1 comentário | **corrigido** | `types.ts:20-23` — "tag de PROVENIÊNCIA… NÃO é discriminated union". |
| 🔵 S1/S2 | **absorvidos** | `Retention.type` agora é `RetentionType` (union, não `string`); `DocumentType` canônico reusado. |

**Gates re-executados:** `pnpm test` (document-reader) 11/11 GREEN · `pnpm run typecheck` exit 0. Nomenclatura EN (ADR-0023/0039), Money VO (ADR-0018), sem duplicação de conceito — todas as diretrizes citadas no round 1 satisfeitas.

**Próximo passo:** APPROVED → **W3** (gate final `ts-quality-checker`: typecheck + format:check + lint + test completo).
