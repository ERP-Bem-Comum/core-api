#!/usr/bin/env bash
# =============================================================================
# verify-skill-refresh-i.sh
# Script verificador W0 RED — ticket CTR-SKILL-REFRESH-I
#
# Propósito: checar se a §3.I (Composição Funcional com Result) foi escrita
#            corretamente na SKILL.md, com as 8 sub-seções, tabela 7+6+3,
#            snippets α/β/γ canônicos e fidelidade ao src/shared/result.ts.
# W0 RED:   script deve retornar exit 1 com vários FAIL (§3.I ainda não existe).
# W1 GREEN: script deve retornar exit 0 com todos PASS.
#
# Uso: bash verify-skill-refresh-i.sh
# Saída: [PASS] / [FAIL] por critério, depois "Result: N/9 PASSED".
# Exit code: 0 se todos passam; 1 se qualquer falha.
#
# NOTA POSIX: `grep -c` retorna exit 1 quando zero matches — mesmo imprimindo "0".
# Todos os `grep -c` que checam ausência usam `; true` para forçar exit 0 do
# subshell preservando stdout do grep -c. NÃO usar `|| echo "0"` (concatena
# dois zeros e quebra o `-eq`). Lição aprendida em SKILL-REFRESH-C.
# =============================================================================

SKILL_FILE="$(cd "$(dirname "$0")/../../.." && pwd)/skills/ts-domain-modeler/SKILL.md"
REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"

passed=0
failed=0

check() {
  local id="$1"
  local desc="$2"
  local result="$3"   # 0 = pass, 1 = fail

  if [ "$result" -eq 0 ]; then
    echo "[PASS] ${id}: ${desc}"
    passed=$((passed + 1))
  else
    echo "[FAIL] ${id}: ${desc}"
    failed=$((failed + 1))
  fi
}

# --- Garante que o arquivo existe antes de tudo ---
if [ ! -f "$SKILL_FILE" ]; then
  echo "[ERROR] SKILL.md não encontrado em: $SKILL_FILE"
  exit 1
fi

echo "Verificando: $SKILL_FILE"
echo "---"

# =============================================================================
# CA1 — Seção §3.I existe (posição após §3.B)
# Critério: arquivo contém linha que começa com "## §3.I"
# =============================================================================
grep -q "^## §3\.I" "$SKILL_FILE"
check "CA1" "Seção §3.I existe (## §3.I — Composição Funcional com Result)" $?

# =============================================================================
# CA2 — 8 sub-seções identificáveis
# Critério: presença das 8 âncoras temáticas dentro da §3.I
#   1. Result Homemade
#   2. Early Return
#   3. combine
#   4. mapErr
#   5. Functional Core
#   6. Coexistência (das 3 estratégias)
#   7. Tabela
#   8. Tickets vivos
# =============================================================================
grep -q "Result Homemade" "$SKILL_FILE"
r1=$?
grep -q "Early Return" "$SKILL_FILE"
r2=$?
grep -qi "combine" "$SKILL_FILE"
r3=$?
grep -qi "mapErr" "$SKILL_FILE"
r4=$?
grep -q "Functional Core" "$SKILL_FILE"
r5=$?
grep -q "Coexistência" "$SKILL_FILE"
r6=$?
grep -q "Tabela" "$SKILL_FILE"
r7=$?
grep -q "Tickets vivos" "$SKILL_FILE"
r8=$?

ca2_result=$(( r1 | r2 | r3 | r4 | r5 | r6 | r7 | r8 ))
check "CA2" "8 sub-seções identificáveis (Result Homemade, Early Return, combine, mapErr, Functional Core, Coexistência, Tabela, Tickets vivos)" $ca2_result

# =============================================================================
# CA3 — Contagem exata: **DO (7)**, **DON'T (6)**, **CONSIDER (3)**
# Critério: presença dos 3 cabeçalhos de bloco com contagem declarada exata.
# =============================================================================
grep -q "^\*\*DO (7)\*\*" "$SKILL_FILE"
r_do=$?
grep -q "^\*\*DON'T (6)\*\*" "$SKILL_FILE"
r_dont=$?
grep -q "^\*\*CONSIDER (3)\*\*" "$SKILL_FILE"
r_consider=$?

ca3_result=$(( r_do | r_dont | r_consider ))
check "CA3" "Contagem exata declarada: **DO (7)**, **DON'T (6)**, **CONSIDER (3)** presentes" $ca3_result

# =============================================================================
# CA4 — Strings âncora α/β/γ explicitadas: "early return", "combine", "mapErr"
# Critério: as 3 strings (case-insensitive para early return) devem existir
# como documentação das estratégias α/β/γ.
# =============================================================================
grep -qi "early return" "$SKILL_FILE"
r1=$?
grep -q "combine" "$SKILL_FILE"
r2=$?
grep -q "mapErr" "$SKILL_FILE"
r3=$?

ca4_result=$(( r1 | r2 | r3 ))
check "CA4" "Strings âncora das 3 estratégias: 'early return', 'combine', 'mapErr' presentes" $ca4_result

# =============================================================================
# CA5 — "Functional Core" e "Imperative Shell" mencionados
# Critério: ambas as strings literais devem aparecer na §3.I
# =============================================================================
grep -q "Functional Core" "$SKILL_FILE"
r1=$?
grep -q "Imperative Shell" "$SKILL_FILE"
r2=$?

ca5_result=$(( r1 | r2 ))
check "CA5" "'Functional Core' e 'Imperative Shell' ambos presentes" $ca5_result

# =============================================================================
# CA6 — DON'T menciona libs/padrões banidos
# Critério: as strings "Effect", "fp-ts", "neverthrow", "andThen", "pipe",
#           "traverse", "ResultAsync" devem aparecer (como DON'T da seção)
# =============================================================================
grep -q "Effect" "$SKILL_FILE"
r1=$?
grep -q "fp-ts" "$SKILL_FILE"
r2=$?
grep -q "neverthrow" "$SKILL_FILE"
r3=$?
grep -q "andThen" "$SKILL_FILE"
r4=$?
grep -q "\bpipe\b" "$SKILL_FILE"
r5=$?
grep -q "traverse" "$SKILL_FILE"
r6=$?
grep -q "ResultAsync" "$SKILL_FILE"
r7=$?

ca6_result=$(( r1 | r2 | r3 | r4 | r5 | r6 | r7 ))
check "CA6" "Libs/padrões banidos no DON'T: Effect, fp-ts, neverthrow, andThen, pipe, traverse, ResultAsync" $ca6_result

# =============================================================================
# CA7 — 2 tickets vivos referenciados
# Critério: IDs literais exatos presentes no arquivo
#   - CTR-SHARED-RESULT-COMBINATORS
#   - CTR-DOMAIN-COMPOSE-REFACTOR
# =============================================================================
grep -q "CTR-SHARED-RESULT-COMBINATORS" "$SKILL_FILE"
r1=$?
grep -q "CTR-DOMAIN-COMPOSE-REFACTOR" "$SKILL_FILE"
r2=$?

ca7_result=$(( r1 | r2 ))
check "CA7" "2 tickets vivos referenciados: CTR-SHARED-RESULT-COMBINATORS e CTR-DOMAIN-COMPOSE-REFACTOR" $ca7_result

# =============================================================================
# CA8 — src/ e tests/ intocados pelo ticket
# Critério: nenhum arquivo em src/ ou tests/ foi staged (adicionado ao index).
# Usa git diff --cached para detectar staged changes apenas.
# =============================================================================
cd "$REPO_ROOT" || exit 1
staged_in_src_tests=$(git diff --cached --name-only -- src/ tests/ 2>/dev/null | wc -l | tr -d ' ')
[ "$staged_in_src_tests" -eq 0 ]
check "CA8" "src/ e tests/ intocados pelo ticket (zero arquivos staged em src/ e tests/)" $?

# =============================================================================
# CA9 — Fidelidade ao src/shared/result.ts
# Critério: vocabulário canônico do result.ts está documentado na §3.I:
#   - "ok"    — função exportada
#   - "err"   — função exportada
#   - "isOk"  — type guard exportado
#   - "isErr" — type guard exportado
# (combine e mapErr já cobertos por CA4 — não duplicar aqui)
# =============================================================================
grep -q "\bok\b" "$SKILL_FILE"
r1=$?
grep -q "\berr\b" "$SKILL_FILE"
r2=$?
grep -q "isOk" "$SKILL_FILE"
r3=$?
grep -q "isErr" "$SKILL_FILE"
r4=$?

ca9_result=$(( r1 | r2 | r3 | r4 ))
check "CA9" "Fidelidade ao result.ts: 'ok', 'err', 'isOk', 'isErr' presentes" $ca9_result

# =============================================================================
# Resultado final
# =============================================================================
total=$((passed + failed))
echo "---"
echo "Result: ${passed}/${total} PASSED"

if [ "$failed" -eq 0 ]; then
  echo "Status: GREEN — todos os critérios satisfeitos."
  exit 0
else
  echo "Status: RED — ${failed} critério(s) falhando. W1 precisa implementar §3.I."
  exit 1
fi
