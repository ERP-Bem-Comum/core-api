# W2 — Code Review (audit read-only) · FIN-READER-FLATE-SYNCFLUSH (#388 2a)

**Agente:** `security-backend-expert` · **Rounds:** 1 · **Veredito:** **APPROVED** (0 Blockers)

## Verificado (empírico, não são achados)
- **Recovery `endstream` é O(n) amortizado, NÃO O(n²)** (`pdf-lowlevel.ts:71-106`): cursor estritamente
  monotônico (`i` sempre cresce; `indexOf` retoma onde parou → janelas não-sobrepostas ≤ MAX_BYTES).
  Medido: 512 streams (`MAX_STREAMS`) com `/Length` errado → 3-4ms. O F2 da Fatia 1 já era pin parcial.
- **Teto anti-bomb preservado:** `maxOutputLength: MAX_INFLATE` sempre passado; CA5/F3 verdes. O risco de
  "aceitar ruído" **não foi ampliado** — 0,6% de ruído aleatório passa, 100% via `inflateRawSync`
  pré-existente, **zero** via o novo `Z_SYNC_FLUSH`.
- **Sem regressão** dos guards da Fatia 1 (20/20, cursor monotônico → sem loop/re-varredura).

## Achados (todos follow-up — NÃO bloqueiam esta fatia S)
| ID | Sev | CWE | Descrição | Destino |
| :--- | :--- | :--- | :--- | :--- |
| F2 | Major | CWE-436 | `endstream` dentro de bytes binários corta o recovery cedo. Fail-closed no nível do documento (tudo-ou-nada) + o motor nunca confirma sozinho (#62 CA4). Follow-up: log/flag quando o fallback heurístico é usado (auditoria). | issue |
| F3 | Major/Minor | CWE-354 | `Z_SYNC_FLUSH` pula o checksum (Adler32/CRC); a validação "não-vazio" é fraca perante `Zlib.md:442-443`. Funil de âncoras do `structure()` é a rede final. Follow-up: validação de plausibilidade. | issue |
| F4 | Minor | CWE-400 | Falta pin de teste **explícito** do novo gatilho (`len>=0` errado, em volume). | issue |
| F5 | Minor | CWE-20 | Falta caso de deflate **corrompido no meio** (não só truncado) em envelope válido. | issue |

## Conformidade
`.claude/rules/adapters.md` mantida (reader devolve `Result`; fail-closed). Citação `Zlib.md:415-443`
conferida literal. **Seguir para W3.** Follow-ups → issue de hardening da 2a.
