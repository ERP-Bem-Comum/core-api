# W2 — Code Review (audit read-only) · FIN-READER-TOUNI-GUARD (#389)

**Agente:** `security-backend-expert` · **Rounds:** 1 · **Veredito:** **APPROVED**

## Escopo
Diff (4 arquivos, +59/-1), `native-pdf.ts` inteiro, `pdf-lowlevel.ts` (não tocado),
`.claude/rules/adapters.md`, suíte do reader (17/17 pass).

## Análise adversarial da guarda `cp > 0x10ffff`
| Vetor | Coberto? |
|---|---|
| codepoint > 0x10FFFF finito (`FFFFFF`) | Sim — fixture `HOSTILE_TOUNICODE` valida |
| hex gigante | Sim — `parseInt` satura → `Infinity > 0x10ffff` → `continue` |
| `NaN` | Estruturalmente **inatingível** — regex `[0-9A-Fa-f]+` garante ≥1 dígito hex → `parseInt` nunca `NaN`. Não é lacuna |
| lone surrogates (0xD800–0xDFFF) | `fromCodePoint` **não lança** — produz mojibake (qualidade de dado, não CWE-248) |
| limite exato `0x10FFFF` | Sim — passa (`>`, não `>=`) e é válido; sem off-by-one |
| negativo | Impossível (regex sem sinal) |

## Outros vazamentos de exceção
Nenhum outro `throw`/API que lança em `native-pdf.ts`. `pdf-lowlevel.ts` já converte exceções
(`inflateGuarded`) em `Result`. Contrato `Result` do `DocumentReaderPort` restaurado ponta a ponta.

## Achados
- **Minor (follow-up opcional, NÃO bloqueia o merge):** lone surrogates em `bfchar` produzem mojibake
  silencioso no texto extraído (CMaps fiscais reais não geram). Se for tratar, registrar via `issue-report`.

## Conformidade
`.claude/rules/adapters.md` restaurada: `parseToUnicode` sempre retorna normalmente (fail-closed,
ignora o mapeamento inválido). Fixture sintética, determinística, sem PII.
