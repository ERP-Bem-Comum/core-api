# Code Review — Ticket FIN-DOC-SOURCE-FILE-REF — Round 1

**Veredito:** REJECTED

**Reviewer:** code-reviewer (contrato) + agente `drizzle-orm-expert` (migration/schema/mapper)
**Data:** 2026-07-09

## Parte A — contrato (code-reviewer): sem achado
VO puro/imutável, ADR-0006 (não importa `StorageRef`), smart constructor → `Result`, propagação consistente (create/saveDraft/submit/undoApproval), mapper → `Result`. Já havia antecipado o gap de length-cap (confirmado pelo drizzle-expert como MAJOR 3).

## Parte B — Drizzle (`drizzle-orm-expert`): CHANGES-REQUESTED

Mecânicos verdes (typecheck, 9/9, snapshot↔migration↔schema sem drift, row-size ~10.4KB < 65KB, `ADD COLUMN` nullable elegível a INSTANT — precedente `0026`). Achados:

### 🟠 MAJOR 1 — mapper descarta corrupção parcial (`document.mapper.ts` `rehydrateSourceFile`)
Guard só olha `bucket == null` → se bucket NULL mas key/hash/size/mime preenchidos, devolve `ok(null)` (perda silenciosa). **Fix:** se bucket NULL mas qualquer irmã presente → `err('mapper-invalid-source-file')`.

### 🟠 MAJOR 2 — schema sem CHECK all-or-nothing (`schemas/mysql.ts`)
As 5 colunas deviam ser todas-NULL ou todas-preenchidas (defesa em profundidade no banco; precedente `retention_chk`/`difference_chk`). **Fix:** CHECK `fin_documents_source_file_all_or_none_chk`.

### 🟠 MAJOR 3 — VO sem length-cap (`source-file-ref.ts`)
`bucket`/`key`/`mimeType` sem limite de tamanho vs colunas (63/1024/127) → `ERROR 1406` no INSERT obscurecido como `db-unavailable`. **Fix:** `bucket ≤ 63`, `key ≤ 1024`, `mimeType ≤ 127` (limites S3, ADR-0019). Erro nasce no domínio (ADR-0020: CHECK é defesa em profundidade, não única validação).

### 🟡 MINOR — `size_bytes` sem CHECK `> 0` (`schemas/mysql.ts`)
Paridade com as bigint irmãs (`gross_value_chk` etc.). **Fix:** CHECK `size_bytes IS NULL OR size_bytes > 0`.

### 🔵 NIT — 5 `ALTER TABLE` separados (padrão Drizzle Kit, não-defeito).

## Próximo passo
REJECTED → aplicar os 3 MAJOR + MINOR + testes de regressão (corrupção parcial → err; length-cap → err) + regenerar a migration com os CHECKs (0031 não aplicado ainda — CA4 adiado — barato reajustar). Depois W2 round 2.

---

# Code Review — Round 2

**Veredito:** APPROVED

**Data:** 2026-07-09

| Finding | Correção | Regressão travada |
| :-- | :-- | :-- |
| 🟠 MAJOR 1 mapper corrupção parcial | `rehydrateSourceFile`: bucket NULL + qualquer irmã presente → `err('mapper-invalid-source-file')` | `CA3: corrupção parcial … → err` |
| 🟠 MAJOR 2 CHECK all-or-none | `check('fin_documents_source_file_all_or_none_chk', …)` no schema → migration `0032` | (CHECK no banco; validado no CA4) |
| 🟠 MAJOR 3 length-cap no VO | `bucket ≤ 63`, `key ≤ 1024`, `mime ≤ 127` em `SourceFileRef.create` (constantes = larguras das colunas) | `CA1: rejeita campos acima da largura das colunas` |
| 🟡 MINOR size_bytes CHECK | `check('fin_documents_source_file_size_bytes_chk', … > 0)` → migration `0032` | (CHECK no banco) |
| 🔵 NIT ALTER separados | sem ação (padrão Drizzle) | — |

**Migration:** `0031` (ADD COLUMN nullable) + `0032` (2 CHECK constraints) — ambas não-aplicadas (CA4 adiado), aplicam em sequência.

**Gates pós-fix:** `node --test` 11 pass / 0 fail (2 novos de regressão); `pnpm run typecheck` exit 0; `eslint` 0 erros.

**Próximo passo:** APPROVED → **W3** (gate final) + **CA4** (validar `0031`+`0032` no MySQL real, sob autorização) no fecho do ticket.
