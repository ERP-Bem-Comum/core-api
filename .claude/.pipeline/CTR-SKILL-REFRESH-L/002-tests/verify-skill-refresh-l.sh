#!/usr/bin/env bash
# =============================================================================
# verify-skill-refresh-l.sh
# Script verificador W0 RED — ticket CTR-SKILL-REFRESH-L
#
# Propósito: checar se a §3.L (Síntese Canônica — índice consolidado dos blocos
#            refreshed) foi escrita corretamente na SKILL.md, com tabela visão-geral
#            de 40 DO + 44 DON'T + 16 CONSIDER + 5 AVOID, glossário ≥11 termos,
#            mapa de cross-refs §3.A–§3.I, tickets vivos consolidados, e blocos
#            não-refreshed E/F/G/J/K listados com status.
# W0 RED:   script deve retornar exit 1 com vários FAIL (§3.L ainda não existe).
# W1 GREEN: script deve retornar exit 0 com todos PASS.
#
# Uso: bash verify-skill-refresh-l.sh
# Saída: [PASS] / [FAIL] por critério, depois "Result: N/7 PASSED".
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
# CA1 — Seção §3.L existe
# Critério: arquivo contém linha que começa com "## §3.L"
# =============================================================================
grep -q "^## §3\.L" "$SKILL_FILE"
check "CA1" "Seção §3.L existe (## §3.L — Síntese Canônica)" $?

# =============================================================================
# CA2 — Tabela visão-geral com marcadores dos 4 totais
# Critério: presença de "40 DO", "44 DON'T", "16 CONSIDER", "5 AVOID" no arquivo.
# =============================================================================
grep -q "40 DO" "$SKILL_FILE"
r1=$?
grep -q "44 DON.T" "$SKILL_FILE"
r2=$?
grep -q "16 CONSIDER" "$SKILL_FILE"
r3=$?
grep -q "5 AVOID" "$SKILL_FILE"
r4=$?

ca2_result=$(( r1 | r2 | r3 | r4 ))
check "CA2" "Tabela visão-geral com totais 40 DO, 44 DON'T, 16 CONSIDER, 5 AVOID" $ca2_result

# =============================================================================
# CA3 — Glossário ≥11 termos canônicos
# Critério: presença dos 11 termos obrigatórios do glossário.
#   1. Wrapper-brand
#   2. Primitivo-brand
#   3. Tagged Error
#   4. Smart Constructor
#   5. Refinement Constructor
#   6. Padrão D
#   7. Shared Kernel
#   8. Functional Core
#   9. Imperative Shell
#  10. VO como Prova
#  11. Agregado como Guardião
# =============================================================================
grep -q "Wrapper-brand" "$SKILL_FILE"
t1=$?
grep -q "Primitivo-brand" "$SKILL_FILE"
t2=$?
grep -q "Tagged Error" "$SKILL_FILE"
t3=$?
grep -q "Smart Constructor" "$SKILL_FILE"
t4=$?
grep -q "Refinement Constructor" "$SKILL_FILE"
t5=$?
grep -q "Padrão D" "$SKILL_FILE"
t6=$?
grep -q "Shared Kernel" "$SKILL_FILE"
t7=$?
grep -q "Functional Core" "$SKILL_FILE"
t8=$?
grep -q "Imperative Shell" "$SKILL_FILE"
t9=$?
grep -q "VO como Prova" "$SKILL_FILE"
t10=$?
grep -q "Agregado como Guardião" "$SKILL_FILE"
t11=$?

ca3_result=$(( t1 | t2 | t3 | t4 | t5 | t6 | t7 | t8 | t9 | t10 | t11 ))
check "CA3" "Glossário ≥11 termos: Wrapper-brand, Primitivo-brand, Tagged Error, Smart Constructor, Refinement Constructor, Padrão D, Shared Kernel, Functional Core, Imperative Shell, VO como Prova, Agregado como Guardião" $ca3_result

# =============================================================================
# CA4 — Mapa de cross-refs: §3.A, §3.B, §3.C, §3.D, §3.H, §3.I mencionados
# Critério: todos os 6 cross-refs presentes no arquivo.
# =============================================================================
grep -q "§3\.A" "$SKILL_FILE"
cr1=$?
grep -q "§3\.B" "$SKILL_FILE"
cr2=$?
grep -q "§3\.C" "$SKILL_FILE"
cr3=$?
grep -q "§3\.D" "$SKILL_FILE"
cr4=$?
grep -q "§3\.H" "$SKILL_FILE"
cr5=$?
grep -q "§3\.I" "$SKILL_FILE"
cr6=$?

ca4_result=$(( cr1 | cr2 | cr3 | cr4 | cr5 | cr6 ))
check "CA4" "Cross-refs §3.A, §3.B, §3.C, §3.D, §3.H, §3.I mencionados" $ca4_result

# =============================================================================
# CA5 — Blocos não-refreshed E/F/G/J/K listados com status
# Critério: pelo menos os 5 identificadores de bloco pendente mencionados.
# Os blocos E/F/G/J/K nunca tiveram ticket CTR-SKILL-REFRESH-* concluído.
# Busca por CTR-SKILL-REFRESH-E (abrange E1/E2) e CTR-SKILL-REFRESH-{F,G,J,K}.
# =============================================================================
grep -qE "CTR-SKILL-REFRESH-E" "$SKILL_FILE"
e1=$?
grep -qE "CTR-SKILL-REFRESH-F" "$SKILL_FILE"
e2=$?
grep -qE "CTR-SKILL-REFRESH-G" "$SKILL_FILE"
e3=$?
grep -qE "CTR-SKILL-REFRESH-J" "$SKILL_FILE"
e4=$?
grep -qE "CTR-SKILL-REFRESH-K" "$SKILL_FILE"
e5=$?

ca5_result=$(( e1 | e2 | e3 | e4 | e5 ))
check "CA5" "Blocos não-refreshed E, F, G, J, K listados com status (via CTR-SKILL-REFRESH-E/F/G/J/K)" $ca5_result

# =============================================================================
# CA6 — Tickets-fonte presentes (pelo menos 5 tickets representativos dos 15)
# Critério: os tickets canônicos de cada bloco refreshed devem aparecer em §3.L.
# Amostra representativa: um ticket por bloco refreshed (A/B/C/D/H/I).
#   - CTR-VO-MONEY        (Bloco B)
#   - CTR-AGG-CONTRACT    (Bloco H/C)
#   - CTR-DOMAIN-TAGGED-ERRORS  (Bloco D)
#   - CTR-DOMAIN-STATE-MACHINE-CONTRACT (Bloco D)
#   - CTR-SHARED-RESULT-COMBINATORS     (Bloco I)
# =============================================================================
grep -q "CTR-VO-MONEY" "$SKILL_FILE"
tk1=$?
grep -q "CTR-AGG-CONTRACT" "$SKILL_FILE"
tk2=$?
grep -q "CTR-DOMAIN-TAGGED-ERRORS" "$SKILL_FILE"
tk3=$?
grep -q "CTR-DOMAIN-STATE-MACHINE-CONTRACT" "$SKILL_FILE"
tk4=$?
grep -q "CTR-SHARED-RESULT-COMBINATORS" "$SKILL_FILE"
tk5=$?

ca6_result=$(( tk1 | tk2 | tk3 | tk4 | tk5 ))
check "CA6" "Tickets-fonte presentes: CTR-VO-MONEY, CTR-AGG-CONTRACT, CTR-DOMAIN-TAGGED-ERRORS, CTR-DOMAIN-STATE-MACHINE-CONTRACT, CTR-SHARED-RESULT-COMBINATORS" $ca6_result

# =============================================================================
# CA7 — src/ e tests/ intocados pelo ticket
# Critério: nenhum arquivo em src/ ou tests/ foi staged (adicionado ao index).
# Usa git diff --cached para detectar staged changes apenas.
# =============================================================================
cd "$REPO_ROOT" || exit 1
staged_in_src_tests=$(git diff --cached --name-only -- src/ tests/ 2>/dev/null | wc -l | tr -d ' ')
[ "$staged_in_src_tests" -eq 0 ]
check "CA7" "src/ e tests/ intocados pelo ticket (zero arquivos staged em src/ e tests/)" $?

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
  echo "Status: RED — ${failed} critério(s) falhando. W1 precisa implementar §3.L."
  exit 1
fi
