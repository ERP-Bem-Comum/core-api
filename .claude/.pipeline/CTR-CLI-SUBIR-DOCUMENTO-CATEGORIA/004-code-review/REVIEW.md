# Code Review — Ticket CTR-CLI-SUBIR-DOCUMENTO-CATEGORIA — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-28
**Escopo revisado:**

- `src/modules/contracts/cli/commands/subir-documento.ts` (diff: +29/-5)
- `src/modules/contracts/cli/state.ts` (diff: `const` → `export const DOCUMENT_CATEGORIES`)
- `tests/cli/contracts.cli.subir-documento-categoria.test.ts` (novo, E2E driver memory)

Camada: `cli/` — regida por `.claude/rules/adapters.md` (borda que pode tocar infra,
`try/catch`→`Result`, cast documentado na borda). **Domínio não foi tocado** (nenhum
arquivo de `src/modules/contracts/domain/` no diff).

---

## Cobertura dos critérios de aceitação

| CA | Verificado em | Status |
| :-- | :-- | :--: |
| CA1 — `--categoria signed_contract` cria doc com essa categoria, exit 0 | `subir-documento.ts:117-124,133-149` + teste `:42-48` | ✅ |
| CA2 — categoria inválida → exit 64 + lista válidas | `subir-documento.ts:118-123` (stderr cita `categoriasValidas()`) + teste `:57-61` (`assert.match(stderr, /signed_contract/)`) | ✅ |
| CA3 — sem `--categoria` → default `other` (regressão) | `subir-documento.ts:117` (`?? 'other'`) + teste `:70-76` | ✅ |
| CA4 — `categoria` entra em `ALLOWED` | `subir-documento.ts:40,44` + teste `:80-82` | ✅ |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sug-1 — `subir-documento.ts:119-121` — string PT inline fora de `cli/formatters/`

**Categoria:** G (idioma).
**Observação:** CLAUDE.md §Idioma diz que strings ao humano em PT devem vir "via
dicionário em `cli/formatters/`". A mensagem `--categoria invalida: <x>. Validas: ...`
está inline no comando. **Não é regressão deste ticket:** o arquivo já tinha 4 strings
PT inline pré-existentes (`:79` flag obrigatória, `:87` parent-tipo, `:129` fixtures,
`:167` documento registrado). Refatorar todas para `formatters/` seria scope creep fora
do escopo do ticket S. Registrado para um futuro ticket de consolidação de mensagens da
CLI, não bloqueia.

---

## Verificações do checklist (passaram)

- **A (domínio):** N/A — domínio intocado. Sem `throw`/`class`/`this`/`extends Error` no diff.
- **C (exhaustividade):** validação por `ReadonlySet.has()` + early-return; sem switch novo. OK.
- **D (adapters/CLI):** borda CLI converte falha de validação em exit code (64), não vaza
  exceção. `ctx.clock.now()` usado em vez de `new Date()` (`:146`). OK.
- **F (ESM/TS):** imports com `.ts`; `import type { DocumentCategory }` (`:33`),
  `import type { CliContext }` (`:19`). Sem `require`/`enum`/`namespace`. OK.
- **G (idioma/naming):** identificadores EN; `categoria`/`DocumentCategory` são termos de
  domínio; sem prefixo `I`/sufixo `Impl`. OK (ressalva Sug-1).
- **Cast na borda:** `categoriaRaw as DocumentCategory` (`:118` dentro do `.has()` por
  exigência da assinatura de `ReadonlySet<DocumentCategory>.has`; `:124` narrowing após o
  guard). Documentado no REPORT W1 como padrão de borda da CLI. Sem `any`. OK.
- **H (tests):** AAA por bloco (`describe` por CA); fakes via driver memory + state file
  temporário; UUID reais via `randomUUID()` (`:29`); asserções sobre o estado persistido
  (`categoria` lida do JSON), não só "não lança". OK.

---

## O que está bom

- `DOCUMENT_CATEGORIES` promovido a export único em `state.ts` — elimina uma 3ª cópia das
  8 categorias e mantém uma só fonte da verdade (o mesmo set usado na revalidação do
  snapshot em `isValidContractDocument`). Mudança mínima, sem alterar comportamento.
- YAGNI estrito: nada além do necessário para GREEN; default `other` preserva retrocompat
  (CA3) exatamente como o request pediu.
- Coerência categoria↔parentTipo corretamente deixada **fora de escopo** (conforme
  `000-request.md` §Fora de escopo) — o domínio `Document.create` segue livre.
- Teste E2E real (driver memory + state file), validando o byte persistido em vez de mock.

---

## Próximo passo

**APPROVED** → pipeline-maestro avança para W3 (ts-quality-checker).
