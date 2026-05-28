#!/usr/bin/env bash
# =============================================================================
# verify-skill-refresh-d.sh
# Script verificador W0 RED — ticket CTR-SKILL-REFRESH-D
#
# Propósito: checar se a §3.D foi escrita corretamente na SKILL.md.
# W0 RED:  script deve retornar exit 1 com vários FAIL (§3.D ainda não existe).
# W1 GREEN: script deve retornar exit 0 com todos PASS.
#
# Uso: bash verify-skill-refresh-d.sh
# Saída: [PASS] / [FAIL] por critério, depois "Result: N/9 PASSED".
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
# CA1 — Seção §3.D existe
# Critério: arquivo contém linha "## §3.D — Tagged Errors & Invariantes em Tipos"
# =============================================================================
grep -q "^## §3\.D" "$SKILL_FILE"
check "CA1" "Seção §3.D existe (## §3.D — Tagged Errors & Invariantes em Tipos)" $?

# =============================================================================
# CA2 — 6 sub-seções presentes dentro de §3.D
# Critério: as 6 sub-seções identificáveis pelo título
# =============================================================================
grep -q "Tagged Errors" "$SKILL_FILE"
r1=$?
grep -q "State Machine em Tipos" "$SKILL_FILE"
r2=$?
grep -q "Invariantes Contextuais" "$SKILL_FILE"
r3=$?
grep -q "Aninhamento de Eixos" "$SKILL_FILE"
r4=$?
# Tabela canônica é identificada pelos marcadores DO/DON'T/CONSIDER + §
grep -q "10 DO" "$SKILL_FILE"
r5=$?
grep -q "Tickets vivos" "$SKILL_FILE"
r6=$?

ca2_result=$(( r1 | r2 | r3 | r4 | r5 | r6 ))
check "CA2" "6 sub-seções presentes (Tagged Errors, State Machine, Invariantes, Aninhamento, Tabela DO/DON'T, Tickets vivos)" $ca2_result

# =============================================================================
# CA3 — Contagem exata: 10 DO, 7 DON'T, 2 CONSIDER
#
# Estratégia: verificar a presença dos 3 cabeçalhos de bloco com a contagem
# declarada: "**DO (10)**", "**DON'T (7)**" e "**CONSIDER (2)**".
# Isso prova que a tabela canônica foi escrita com os totais corretos.
# =============================================================================
grep -q "^\*\*DO (10)\*\*" "$SKILL_FILE"
r_do=$?
grep -q "^\*\*DON'T (7)\*\*" "$SKILL_FILE"
r_dont=$?
grep -q "^\*\*CONSIDER (2)\*\*" "$SKILL_FILE"
r_consider=$?

ca3_result=$(( r_do | r_dont | r_consider ))
check "CA3" "Contagem exata declarada: **DO (10)**, **DON'T (7)**, **CONSIDER (2)** presentes" $ca3_result

# =============================================================================
# CA4 — Nomenclatura semântica explícita: 3 nomes canônicos
# Critério: as strings literais exatas presentes no arquivo
# =============================================================================
grep -q "VO como Prova" "$SKILL_FILE"
r1=$?
grep -q "Agregado como Guardião" "$SKILL_FILE"
r2=$?
grep -q "Caso de Uso como Orquestrador" "$SKILL_FILE"
r3=$?

ca4_result=$(( r1 | r2 | r3 ))
check "CA4" "Nomenclatura semântica: 'VO como Prova', 'Agregado como Guardião', 'Caso de Uso como Orquestrador'" $ca4_result

# =============================================================================
# CA5 — Aninhamento ≠ cross-product explicitado
# Critério: ambas as palavras presentes (a §3.D deve conter aviso explícito
# de NUNCA cross-product + exemplo de aninhamento)
# =============================================================================
grep -qi "aninhamento" "$SKILL_FILE"
r1=$?
grep -qi "cross-product" "$SKILL_FILE"
r2=$?

ca5_result=$(( r1 | r2 ))
check "CA5" "Aninhamento ≠ cross-product: ambos os termos presentes no arquivo" $ca5_result

# =============================================================================
# CA6 — 4 tickets vivos referenciados
# Critério: IDs literais presentes no arquivo
# =============================================================================
grep -q "CTR-DOMAIN-TAGGED-ERRORS" "$SKILL_FILE"
r1=$?
grep -q "CTR-DOMAIN-STATE-MACHINE-CONTRACT" "$SKILL_FILE"
r2=$?
grep -q "CTR-DOMAIN-STATE-MACHINE-AMENDMENT" "$SKILL_FILE"
r3=$?
grep -q "CTR-DOMAIN-INVARIANT-CONTEXTUAL" "$SKILL_FILE"
r4=$?

ca6_result=$(( r1 | r2 | r3 | r4 ))
check "CA6" "4 tickets vivos referenciados (TAGGED-ERRORS, STATE-MACHINE-CONTRACT, STATE-MACHINE-AMENDMENT, INVARIANT-CONTEXTUAL)" $ca6_result

# =============================================================================
# CA7 — Checklist e antipatterns atualizados (3 + 2 novos itens)
# Critério: strings identificadoras dos novos itens presentes
# =============================================================================
# Checklist (3 novos):
grep -q "tagged records" "$SKILL_FILE"
r1=$?
grep -q "tipo refinado distinto" "$SKILL_FILE"
r2=$?
grep -q "assinatura refinada" "$SKILL_FILE"
r3=$?
# Antipatterns (2 novas linhas):
grep -q "assertPending" "$SKILL_FILE"
r4=$?
grep -q "3 status × 4 kinds" "$SKILL_FILE"
r5=$?

ca7_result=$(( r1 | r2 | r3 | r4 | r5 ))
check "CA7" "Checklist (3 itens: tagged records, tipo refinado, assinatura refinada) + antipatterns (2: assertPending, 3×4=12)" $ca7_result

# =============================================================================
# CA8 — src/ e tests/ intocados pelo ticket
# Critério: nenhum arquivo em src/ ou tests/ foi staged (adicionado ao index)
# pelo ticket. Usa git diff --cached para detectar staged changes apenas —
# modificações pre-existentes no working tree (outros tickets) não contam.
# Em W0, antes de qualquer W1, este critério sempre deve ser PASS.
# =============================================================================
cd "$REPO_ROOT" || exit 1
staged_in_src_tests=$(git diff --cached --name-only -- src/ tests/ 2>/dev/null | wc -l | tr -d ' ')
[ "$staged_in_src_tests" -eq 0 ]
check "CA8" "src/ e tests/ intocados pelo ticket (zero arquivos staged em src/ e tests/)" $?

# =============================================================================
# CA9 — Fidelidade ao código vivo (snippets críticos presentes)
# Critério: strings que refletem os tipos reais do src/
# =============================================================================
# Tipos refinados do Contract (cf. src/modules/contracts/domain/contract/types.ts)
grep -q "ActiveContract" "$SKILL_FILE"
r1=$?
grep -q "status: 'Active'" "$SKILL_FILE"
r2=$?
# Tipos refinados do Amendment (cf. src/modules/contracts/domain/amendment/types.ts)
grep -q "PendingWithoutDocumentAmendment" "$SKILL_FILE"
r3=$?
# NonZeroMoney (cf. src/modules/contracts/domain/shared/non-zero-money.ts)
grep -q "NonZeroMoney" "$SKILL_FILE"
r4=$?

ca9_result=$(( r1 | r2 | r3 | r4 ))
check "CA9" "Fidelidade ao código vivo: ActiveContract, status:'Active', PendingWithoutDocumentAmendment, NonZeroMoney" $ca9_result

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
  echo "Status: RED — ${failed} critério(s) falhando. W1 precisa implementar §3.D."
  exit 1
fi
