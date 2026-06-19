# Code Review — Ticket FIN-RECON-ENTRYTYPE-UNION — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-19
**Escopo revisado:** `domain/statement/entry-type.ts` (novo), `domain/statement/types.ts`, `application/ports/bank-statement-parser.ts`, `adapters/statement-parsers/{ofx,csv}-parser.ts`, `adapters/persistence/mappers/statement.mapper.ts`, `adapters/persistence/schemas/mysql.ts`, migration `0009`, + 8 arquivos de teste tocados.

---

## Issues encontradas

### 🔴 Crítica — nenhuma.

### 🟡 Importante — nenhuma.

### 🔵 Sugestão (não-bloqueante, fora de escopo)

#### S1 — `adapters/http/schemas.ts:329` — `entryType: z.string()` no response

O schema de **resposta** HTTP ainda tipa `entryType` como `z.string()`, não `z.enum([...10])`. Não é regressão (EntryType serializa como string; o contrato de saída sempre foi string) e está **fora do escopo** da #159 (domínio + CHECK). Registrar como possível follow-up se quiser contrato de saída fechado — não bloqueia este ticket.

---

## Verificação por categoria

| Cat. | Item | Veredito |
| --- | --- | --- |
| A | Domínio sem `throw`/`class`/`this`/`any`; `Readonly`; return types explícitos | ✅ |
| B | `EntryType` é union literal EN (como `Movement`); `normalize`/`rehydrate` puros, sync; erro `'invalid-entry-type'` string-literal; `as EntryType` **apenas** dentro de `rehydrate` após `VALUE_SET.has(raw)` | ✅ |
| D | Port `type Readonly<{}>`; mapper converte estado inválido do banco em `err('invalid-statement-entry-type')` (adapters.md — domínio rejeita estado inválido) | ✅ |
| E | Tudo em `financial`/`fin_*`; sem cross-módulo; port importa do **domínio** (permitido), não de `adapters/` | ✅ |
| F | Imports com `.ts`; `import type` nos type-only; `import * as EntryType` (namespace de valor — usa `normalize`/`rehydrate`) | ✅ |
| G | Idioma EN no código (`EntryType`, `normalize`, `rehydrate`, `VALUES`, `SYNONYMS`); siglas BR (`PIX`/`TED`/`DOC`/`DARF`/`Boleto`) preservadas por decisão de spec (`data-model.md:96`) | ✅ |
| — | ADR-0020 (CHECK permitido) · ADR-0014 (prefixo `fin_*`) · sem ADR novo necessário | ✅ |
| H | Integração CA5 com UUID válido + SQL cru read/write real; testes unit com asserções claras (não só "não lança") | ✅ |

---

## O que está bom

- **Reconciliação fiel à spec 017** — conjunto exato de `data-model.md:37`/`:122`, não um union inventado. O risco que a issue alertava (rejeitar tipo legítimo do banco) é coberto pelo fallback `'Other'` + sinônimos OFX/CSV.
- **Três camadas de defesa coerentes:** parser normaliza (ingestão nunca falha) → `rehydrate` no `toDomain` (round-trip) → CHECK no DB. Mesma forma de `movement`/`reconciliation_status`.
- **Não-regressão real:** 298 testes financial verdes + integração no MySQL real (CA5 + CA7); fixtures `'TARIFA'`→`'Fee'` ajustados ao fechar o tipo (não suprimidos).
- **Numeração de migration** tratada como diretriz de merge (documentada), sem hack manual no SQL.

## Próximo passo

APPROVED → pipeline-maestro avança para W3 (gate final).
