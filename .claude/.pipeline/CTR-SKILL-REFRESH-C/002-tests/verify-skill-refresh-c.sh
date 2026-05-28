#!/usr/bin/env bash
# =============================================================================
# verify-skill-refresh-c.sh
# Script verificador W0 RED — ticket CTR-SKILL-REFRESH-C
#
# Propósito: checar se a §3.C foi escrita corretamente na SKILL.md e se
#            a issue pré-existente SKILL.md:99 (throw new Error no exhaustive
#            default) foi corrigida.
# W0 RED:   script deve retornar exit 1 com vários FAIL (§3.C ainda não existe
#            e throw new Error ainda presente).
# W1 GREEN: script deve retornar exit 0 com todos PASS.
#
# Uso: bash verify-skill-refresh-c.sh
# Saída: [PASS] / [FAIL] por critério, depois "Result: N/10 PASSED".
# Exit code: 0 se todos passam; 1 se qualquer falha.
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
# CA1 — Seção §3.C existe
# Critério: arquivo contém linha "## §3.C — Discriminated Unions & Exhaustive Switch"
# =============================================================================
grep -q "^## §3\.C" "$SKILL_FILE"
check "CA1" "Seção §3.C existe (## §3.C — Discriminated Unions & Exhaustive Switch)" $?

# =============================================================================
# CA2 — 5 sub-seções presentes dentro de §3.C
# Critério: as 5 sub-seções identificáveis por strings âncora nos títulos
# =============================================================================
grep -q "Aninhamento" "$SKILL_FILE"
r1=$?
grep -q "Dupla Taxonomia" "$SKILL_FILE"
r2=$?
grep -q "Função-Ponte" "$SKILL_FILE"
r3=$?
grep -q "Exhaustive Switch" "$SKILL_FILE"
r4=$?
# Tabela canônica identificada pelos marcadores de contagem
grep -q "DO (5)" "$SKILL_FILE"
r5=$?

ca2_result=$(( r1 | r2 | r3 | r4 | r5 ))
check "CA2" "5 sub-seções presentes (Aninhamento, Dupla Taxonomia, Função-Ponte, Exhaustive Switch, Tabela DO(5))" $ca2_result

# =============================================================================
# CA3 — Contagem exata: 5 DO, 5 DON'T, 2 CONSIDER
#
# Estratégia: verificar a presença dos 3 cabeçalhos de bloco com a contagem
# declarada exata: "**DO (5)**", "**DON'T (5)**" e "**CONSIDER (2)**".
# Isso prova que a tabela canônica foi escrita com os totais corretos
# (e NÃO os totais errados 6+6 da L971).
# =============================================================================
grep -q "^\*\*DO (5)\*\*" "$SKILL_FILE"
r_do=$?
grep -q "^\*\*DON'T (5)\*\*" "$SKILL_FILE"
r_dont=$?
grep -q "^\*\*CONSIDER (2)\*\*" "$SKILL_FILE"
r_consider=$?

ca3_result=$(( r_do | r_dont | r_consider ))
check "CA3" "Contagem exata declarada: **DO (5)**, **DON'T (5)**, **CONSIDER (2)** presentes" $ca3_result

# =============================================================================
# CA4 — Padrão A + Padrão B do exhaustive switch ambos presentes
# Critério: strings literais "Padrão A" e "Padrão B" presentes no arquivo
# =============================================================================
grep -q "Padrão A" "$SKILL_FILE"
r1=$?
grep -q "Padrão B" "$SKILL_FILE"
r2=$?

ca4_result=$(( r1 | r2 ))
check "CA4" "Padrão A (omitir default) e Padrão B (const _: never = x; return _) ambos documentados" $ca4_result

# =============================================================================
# CA5 — Issue pré-existente SKILL.md:99 corrigida
# Critério: NENHUMA ocorrência de "throw new Error" em toda a SKILL.md.
# grep -c retorna 0 ocorrências → critério PASSA (exit 0 do check).
# grep -c retorna > 0 → critério FALHA.
# =============================================================================
# NOTA: `grep -c` retorna exit 1 quando zero matches (POSIX), mesmo imprimindo "0".
# Sem o fallback correto, `|| echo "0"` concatena dois zeros e quebra o `-eq`.
# `; true` força exit 0 do subshell preservando o stdout do grep -c.
throw_count=$(grep -c "throw new Error" "$SKILL_FILE" 2>/dev/null; true)
[ "$throw_count" -eq 0 ]
check "CA5" "Zero ocorrências de 'throw new Error' na SKILL.md (issue pré-existente SKILL.md:99 corrigida)" $?

# =============================================================================
# CA6 — Aninhamento (anti cross-product) explicitado
# Critério: ambas as strings "cross-product" e a expressão de anti-padrão
# "3 estados × 4 kinds" (ou similar) presentes.
# AmendmentVariant e AmendmentCore como exemplo canônico.
# =============================================================================
grep -q "cross-product" "$SKILL_FILE"
r1=$?
grep -q "3 estados" "$SKILL_FILE"
r2=$?
grep -q "AmendmentVariant" "$SKILL_FILE"
r3=$?
grep -q "AmendmentCore" "$SKILL_FILE"
r4=$?

ca6_result=$(( r1 | r2 | r3 | r4 ))
check "CA6" "Aninhamento anti cross-product: 'cross-product', '3 estados', 'AmendmentVariant', 'AmendmentCore' presentes" $ca6_result

# =============================================================================
# CA7 — Dupla taxonomia explicitada
# Critério: "Amendment" e "ContractAdjustment" ambos presentes como dupla
# taxonomia na §3.C; string "Eliminar ContractAdjustment" presente em DON'T.
# =============================================================================
grep -q "ContractAdjustment" "$SKILL_FILE"
r1=$?
grep -q "Eliminar ContractAdjustment" "$SKILL_FILE"
r2=$?

ca7_result=$(( r1 | r2 ))
check "CA7" "Dupla taxonomia Amendment vs ContractAdjustment documentada; DON'T 'Eliminar ContractAdjustment' presente" $ca7_result

# =============================================================================
# CA8 — 4 tickets vivos referenciados
# Critério: IDs literais exatos presentes no arquivo
# =============================================================================
grep -q "CTR-DOMAIN-STATE-MACHINE-AMENDMENT" "$SKILL_FILE"
r1=$?
grep -q "CTR-AGG-CONTRACT" "$SKILL_FILE"
r2=$?
grep -q "CTR-USECASE-HOMOLOGATE-AMENDMENT" "$SKILL_FILE"
r3=$?
grep -q "CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX" "$SKILL_FILE"
r4=$?

ca8_result=$(( r1 | r2 | r3 | r4 ))
check "CA8" "4 tickets vivos referenciados (STATE-MACHINE-AMENDMENT, AGG-CONTRACT, USECASE-HOMOLOGATE-AMENDMENT, EXHAUSTIVE-SWITCH-FIX)" $ca8_result

# =============================================================================
# CA9 — src/ e tests/ intocados pelo ticket
# Critério: nenhum arquivo em src/ ou tests/ foi staged (adicionado ao index).
# Usa git diff --cached para detectar staged changes apenas —
# modificações pré-existentes no working tree (outros tickets) não contam.
# Em W0, antes de qualquer W1, este critério sempre deve ser PASS.
# =============================================================================
cd "$REPO_ROOT" || exit 1
staged_in_src_tests=$(git diff --cached --name-only -- src/ tests/ 2>/dev/null | wc -l | tr -d ' ')
[ "$staged_in_src_tests" -eq 0 ]
check "CA9" "src/ e tests/ intocados pelo ticket (zero arquivos staged em src/ e tests/)" $?

# =============================================================================
# CA10 — Doc fiel ao código vivo
# Critério: strings que refletem os tipos e funções reais do src/.
#
# PendingWithoutDocumentAmendment — tipo real em
#   src/modules/contracts/domain/amendment/types.ts
#
# applyHomologatedAdjustment — função de exhaustive switch em
#   src/modules/contracts/domain/contract/contract.ts
# OU toContractAdjustment em homologate-amendment.ts (qualquer um dos dois).
# =============================================================================
grep -q "PendingWithoutDocumentAmendment" "$SKILL_FILE"
r1=$?
grep -qE "(applyHomologatedAdjustment|toContractAdjustment)" "$SKILL_FILE"
r2=$?

ca10_result=$(( r1 | r2 ))
check "CA10" "Fidelidade ao código vivo: 'PendingWithoutDocumentAmendment' + ('applyHomologatedAdjustment' ou 'toContractAdjustment') presentes" $ca10_result

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
  echo "Status: RED — ${failed} critério(s) falhando. W1 precisa implementar §3.C e corrigir SKILL.md:99."
  exit 1
fi
