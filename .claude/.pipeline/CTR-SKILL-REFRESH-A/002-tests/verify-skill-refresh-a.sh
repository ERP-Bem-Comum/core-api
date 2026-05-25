#!/usr/bin/env bash
# =============================================================================
# verify-skill-refresh-a.sh
# Script verificador W0 RED — ticket CTR-SKILL-REFRESH-A
#
# Propósito: checar se a §3.A (Agregados Não-Brandados + updateAggregate helper)
#            foi escrita corretamente na SKILL.md, com 6 sub-seções, tabela
#            3 DO + 3 DON'T + 1 CONSIDER, strings âncora canônicas, cross-refs
#            §3.B e §3.D, 2 tickets vivos e doc fiel ao código vivo.
# W0 RED:   script deve retornar exit 1 com vários FAIL (§3.A ainda não existe).
# W1 GREEN: script deve retornar exit 0 com todos PASS.
#
# Uso: bash verify-skill-refresh-a.sh
# Saída: [PASS] / [FAIL] por critério, depois "Result: N/8 PASSED".
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
# CA1 — Seção §3.A existe
# Critério: arquivo contém linha que começa com "## §3.A"
# =============================================================================
grep -q "^## §3\.A" "$SKILL_FILE"
check "CA1" "Seção §3.A existe (## §3.A — Agregados Não-Brandados + updateAggregate)" $?

# =============================================================================
# CA2 — 6 sub-seções identificáveis
# Critério: presença das 6 âncoras temáticas dentro da §3.A
#   1. Brand em VOs folha
#   2. as unknown as (proibido em código de negócio)
#   3. updateAggregate (helper canônico)
#   4. shotgun parsing (mappers via smart constructors)
#   5. Zod (na borda, não no domínio)
#   6. Tabela canônica
# =============================================================================
grep -q "VOs folha" "$SKILL_FILE"
r1=$?
grep -q "as unknown as" "$SKILL_FILE"
r2=$?
grep -q "updateAggregate" "$SKILL_FILE"
r3=$?
grep -q "shotgun parsing" "$SKILL_FILE"
r4=$?
grep -q "Zod" "$SKILL_FILE"
r5=$?
grep -q "Tabela" "$SKILL_FILE"
r6=$?

ca2_result=$(( r1 | r2 | r3 | r4 | r5 | r6 ))
check "CA2" "6 sub-seções identificáveis (VOs folha, as unknown as, updateAggregate, shotgun parsing, Zod, Tabela)" $ca2_result

# =============================================================================
# CA3 — Contagem exata: **DO (3)**, **DON'T (3)**, **CONSIDER (1)**
# Critério: presença dos 3 cabeçalhos de bloco com contagem declarada exata.
# =============================================================================
grep -q "^\*\*DO (3)\*\*" "$SKILL_FILE"
r_do=$?
grep -q "^\*\*DON'T (3)\*\*" "$SKILL_FILE"
r_dont=$?
grep -q "^\*\*CONSIDER (1)\*\*" "$SKILL_FILE"
r_consider=$?

ca3_result=$(( r_do | r_dont | r_consider ))
check "CA3" "Contagem exata declarada: **DO (3)**, **DON'T (3)**, **CONSIDER (1)** presentes" $ca3_result

# =============================================================================
# CA4 — Strings âncora canônicas presentes
# Critério: "Brand", "VOs folha", "as unknown as", "updateAggregate",
#           "shotgun parsing", "Zod" presentes no arquivo
# =============================================================================
grep -q "Brand" "$SKILL_FILE"
r1=$?
grep -q "VOs folha" "$SKILL_FILE"
r2=$?
grep -q "as unknown as" "$SKILL_FILE"
r3=$?
grep -q "updateAggregate" "$SKILL_FILE"
r4=$?
grep -q "shotgun parsing" "$SKILL_FILE"
r5=$?
grep -q "Zod" "$SKILL_FILE"
r6=$?

ca4_result=$(( r1 | r2 | r3 | r4 | r5 | r6 ))
check "CA4" "Strings âncora: 'Brand', 'VOs folha', 'as unknown as', 'updateAggregate', 'shotgun parsing', 'Zod' presentes" $ca4_result

# =============================================================================
# CA5 — Cross-refs §3.B e §3.D mencionadas
# Critério: presença de referências cruzadas às seções §3.B e §3.D
# =============================================================================
grep -q "§3\.B" "$SKILL_FILE"
r1=$?
grep -q "§3\.D" "$SKILL_FILE"
r2=$?

ca5_result=$(( r1 | r2 ))
check "CA5" "Cross-refs §3.B e §3.D mencionadas no arquivo" $ca5_result

# =============================================================================
# CA6 — 2 tickets vivos referenciados
# Critério: IDs literais exatos presentes no arquivo
#   - CTR-DOMAIN-DEBRAND-AGG
#   - CTR-DOMAIN-MAPPER-RESULT
# =============================================================================
grep -q "CTR-DOMAIN-DEBRAND-AGG" "$SKILL_FILE"
r1=$?
grep -q "CTR-DOMAIN-MAPPER-RESULT" "$SKILL_FILE"
r2=$?

ca6_result=$(( r1 | r2 ))
check "CA6" "2 tickets vivos referenciados: CTR-DOMAIN-DEBRAND-AGG, CTR-DOMAIN-MAPPER-RESULT" $ca6_result

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
# CA8 — Doc fiel ao código vivo: updateContract/updateAmendment com genérico
# Critério: presença de "updateContract" OU "updateAmendment" E do padrão
#           genérico "<T extends Contract>" ou "<T extends Amendment>"
# =============================================================================
grep -qE "updateContract|updateAmendment" "$SKILL_FILE"
r1=$?
grep -qE "<T extends Contract>|<T extends Amendment>" "$SKILL_FILE"
r2=$?

ca8_result=$(( r1 | r2 ))
check "CA8" "Doc fiel ao código vivo: 'updateContract'/'updateAmendment' e '<T extends Contract>'/'<T extends Amendment>' presentes" $ca8_result

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
  echo "Status: RED — ${failed} critério(s) falhando. W1 precisa implementar §3.A."
  exit 1
fi
