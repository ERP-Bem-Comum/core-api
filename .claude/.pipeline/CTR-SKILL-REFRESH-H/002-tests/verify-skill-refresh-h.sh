#!/usr/bin/env bash
# =============================================================================
# verify-skill-refresh-h.sh
# Script verificador W0 RED — ticket CTR-SKILL-REFRESH-H
#
# Propósito: checar se a §3.H (Organização de Módulo + árvore canônica) foi
#            escrita corretamente na SKILL.md, com 8 sub-seções, tabela
#            6 DO + 6 DON'T + 2 CONSIDER, árvore canônica ASCII, 4 tickets
#            vivos e nota sobre RESTRUCTURE pendente.
# W0 RED:   script deve retornar exit 1 com vários FAIL (§3.H ainda não existe).
# W1 GREEN: script deve retornar exit 0 com todos PASS.
#
# Uso: bash verify-skill-refresh-h.sh
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
# CA1 — Seção §3.H existe
# Critério: arquivo contém linha que começa com "## §3.H"
# =============================================================================
grep -q "^## §3\.H" "$SKILL_FILE"
check "CA1" "Seção §3.H existe (## §3.H — Organização de Módulo)" $?

# =============================================================================
# CA2 — 8 sub-seções identificáveis
# Critério: presença das 8 âncoras temáticas dentro da §3.H
#   1. Granularidade Canônica
#   2. Critério H2 (Repository — Domain vs Application)
#   3. Tipos de Port Moram Junto
#   4. Shared Kernel
#   5. public-api/
#   6. Árvore canônica
#   7. Tabela canônica
#   8. Tickets vivos
# =============================================================================
grep -q "Granularidade" "$SKILL_FILE"
r1=$?
grep -q "Critério H2" "$SKILL_FILE"
r2=$?
grep -q "Tipos de Port Moram Junto" "$SKILL_FILE"
r3=$?
grep -q "Shared Kernel" "$SKILL_FILE"
r4=$?
grep -q "public-api/" "$SKILL_FILE"
r5=$?
grep -qi "Árvore canônica" "$SKILL_FILE"
r6=$?
grep -q "Tabela" "$SKILL_FILE"
r7=$?
grep -q "Tickets vivos" "$SKILL_FILE"
r8=$?

ca2_result=$(( r1 | r2 | r3 | r4 | r5 | r6 | r7 | r8 ))
check "CA2" "8 sub-seções identificáveis (Granularidade, Critério H2, Tipos de Port, Shared Kernel, public-api/, Árvore, Tabela, Tickets vivos)" $ca2_result

# =============================================================================
# CA3 — Contagem exata: **DO (6)**, **DON'T (6)**, **CONSIDER (2)**
# Critério: presença dos 3 cabeçalhos de bloco com contagem declarada exata.
# =============================================================================
grep -q "^\*\*DO (6)\*\*" "$SKILL_FILE"
r_do=$?
grep -q "^\*\*DON'T (6)\*\*" "$SKILL_FILE"
r_dont=$?
grep -q "^\*\*CONSIDER (2)\*\*" "$SKILL_FILE"
r_consider=$?

ca3_result=$(( r_do | r_dont | r_consider ))
check "CA3" "Contagem exata declarada: **DO (6)**, **DON'T (6)**, **CONSIDER (2)** presentes" $ca3_result

# =============================================================================
# CA4 — Strings âncora canônicas presentes
# Critério: "Shared Kernel", "src/shared/kernel/", "public-api/"
# =============================================================================
grep -q "Shared Kernel" "$SKILL_FILE"
r1=$?
grep -q "src/shared/kernel/" "$SKILL_FILE"
r2=$?
grep -q "public-api/" "$SKILL_FILE"
r3=$?
grep -q "src/modules/<bc>/domain/shared/" "$SKILL_FILE"
r4=$?

ca4_result=$(( r1 | r2 | r3 | r4 ))
check "CA4" "Strings âncora: 'Shared Kernel', 'src/shared/kernel/', 'public-api/', 'src/modules/<bc>/domain/shared/' presentes" $ca4_result

# =============================================================================
# CA5 — Árvore canônica ASCII presente
# Critério: presença de strings que caracterizam a árvore ASCII state-alvo
#   - "repository.ts", "events.ts", "4-6 arquivos" (ou "4–6 arquivos")
#   - "barrel" (indica index.ts barrel export)
# =============================================================================
grep -q "repository\.ts" "$SKILL_FILE"
r1=$?
grep -q "events\.ts" "$SKILL_FILE"
r2=$?
grep -qE "4-6 arquivos|4–6 arquivos" "$SKILL_FILE"
r3=$?
grep -qi "barrel" "$SKILL_FILE"
r4=$?

ca5_result=$(( r1 | r2 | r3 | r4 ))
check "CA5" "Árvore canônica ASCII: 'repository.ts', 'events.ts', '4-6 arquivos', 'barrel' presentes" $ca5_result

# =============================================================================
# CA6 — Critério H2 (domain vs application port) explicitado
# Critério: presença das strings que distinguem o critério H2:
#   - "invariância" ou "ciclo-de-vida" (motivação do port no domínio)
#   - "application/ports/" (destino alternativo)
# =============================================================================
grep -qE "invariância|ciclo-de-vida" "$SKILL_FILE"
r1=$?
grep -q "application/ports/" "$SKILL_FILE"
r2=$?

ca6_result=$(( r1 | r2 ))
check "CA6" "Critério H2 explicitado: 'invariância'/'ciclo-de-vida' e 'application/ports/' presentes" $ca6_result

# =============================================================================
# CA7 — 4 tickets vivos referenciados (incluindo RESTRUCTURE marcado como pendente)
# Critério: IDs literais exatos presentes no arquivo
#   - CTR-AGG-CONTRACT
#   - CTR-AGG-AMENDMENT
#   - CTR-STORAGE-PORT
#   - CTR-DOMAIN-RESTRUCTURE
# =============================================================================
grep -q "CTR-AGG-CONTRACT" "$SKILL_FILE"
r1=$?
grep -q "CTR-AGG-AMENDMENT" "$SKILL_FILE"
r2=$?
grep -q "CTR-STORAGE-PORT" "$SKILL_FILE"
r3=$?
grep -q "CTR-DOMAIN-RESTRUCTURE" "$SKILL_FILE"
r4=$?

ca7_result=$(( r1 | r2 | r3 | r4 ))
check "CA7" "4 tickets vivos referenciados: CTR-AGG-CONTRACT, CTR-AGG-AMENDMENT, CTR-STORAGE-PORT, CTR-DOMAIN-RESTRUCTURE" $ca7_result

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
# CA9 — Nota sobre RESTRUCTURE pendente — árvore reflete estado-alvo
# Critério: presença de strings que indicam que a árvore é estado-alvo e
#           RESTRUCTURE ainda está pendente
#   - "estado-alvo" (indica que a árvore não é o estado atual)
#   - "pendente" (RESTRUCTURE marcado como pendente)
# =============================================================================
grep -q "estado-alvo" "$SKILL_FILE"
r1=$?
grep -q "pendente" "$SKILL_FILE"
r2=$?

ca9_result=$(( r1 | r2 ))
check "CA9" "Nota RESTRUCTURE pendente e árvore como estado-alvo: 'estado-alvo' e 'pendente' presentes" $ca9_result

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
  echo "Status: RED — ${failed} critério(s) falhando. W1 precisa implementar §3.H."
  exit 1
fi
