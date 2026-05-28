#!/usr/bin/env bash
# =============================================================================
# verify-skill-refresh-b.sh
# Script verificador W0 RED — ticket CTR-SKILL-REFRESH-B
#
# Propósito: checar se a §3.B foi escrita corretamente na SKILL.md e se o
#            template Money obsoleto (Padrão A — `export const Money = { ... }`)
#            foi substituído pelo Padrão D canônico.
# W0 RED:   script deve retornar exit 1 com vários FAIL (§3.B ainda não existe
#            e template Money antigo ainda presente).
# W1 GREEN: script deve retornar exit 0 com todos PASS.
#
# Uso: bash verify-skill-refresh-b.sh
# Saída: [PASS] / [FAIL] por critério, depois "Result: N/10 PASSED".
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
# CA1 — Seção §3.B existe
# Critério: arquivo contém linha "## §3.B — Smart Constructor Canônico"
# =============================================================================
grep -q "^## §3\.B" "$SKILL_FILE"
check "CA1" "Seção §3.B existe (## §3.B — Smart Constructor Canônico)" $?

# =============================================================================
# CA2 — 9 sub-seções presentes com strings âncora identificáveis
# Critério: presença das 9 âncoras temáticas dentro da §3.B
#   1. Brand Modernizado
#   2. Wrapper-Brand (vs Primitivo-Brand)
#   3. Module-as-Namespace
#   4. Smart Constructor (from<Source>)
#   5. Identidade Fixa
#   6. Migração Big-Bang
#   7. Template Canônico
#   8. Tabela (canônica — DO+DON'T+CONSIDER)
#   9. Tickets vivos
# =============================================================================
grep -q "Brand Modernizado" "$SKILL_FILE"
r1=$?
grep -q "Wrapper-Brand" "$SKILL_FILE"
r2=$?
grep -q "Module-as-Namespace" "$SKILL_FILE"
r3=$?
grep -q "Smart Constructor" "$SKILL_FILE"
r4=$?
grep -q "Identidade Fixa" "$SKILL_FILE"
r5=$?
grep -q "Migração Big-Bang" "$SKILL_FILE"
r6=$?
grep -q "Template Canônico" "$SKILL_FILE"
r7=$?
grep -q "Tabela" "$SKILL_FILE"
r8=$?
grep -q "Tickets vivos" "$SKILL_FILE"
r9=$?

ca2_result=$(( r1 | r2 | r3 | r4 | r5 | r6 | r7 | r8 | r9 ))
check "CA2" "9 sub-seções presentes (Brand Modernizado, Wrapper-Brand, Module-as-Namespace, Smart Constructor, Identidade Fixa, Migração Big-Bang, Template Canônico, Tabela, Tickets vivos)" $ca2_result

# =============================================================================
# CA3 — Contagem exata: 9 DO, 9 DON'T, 4 CONSIDER
#
# Estratégia: verificar a presença dos 3 cabeçalhos de bloco com a contagem
# declarada exata: "**DO (9)**", "**DON'T (9)**" e "**CONSIDER (4)**".
# Isso prova que a tabela canônica foi escrita com os totais corretos da §3.B
# (promoções temáticas DO §2/§5 + DON'T §3 documentadas no 000-request.md).
# =============================================================================
grep -q "^\*\*DO (9)\*\*" "$SKILL_FILE"
r_do=$?
grep -q "^\*\*DON'T (9)\*\*" "$SKILL_FILE"
r_dont=$?
grep -q "^\*\*CONSIDER (4)\*\*" "$SKILL_FILE"
r_consider=$?

ca3_result=$(( r_do | r_dont | r_consider ))
check "CA3" "Contagem exata declarada: **DO (9)**, **DON'T (9)**, **CONSIDER (4)** presentes" $ca3_result

# =============================================================================
# CA4 — Wrapper-Brand e Primitivo-Brand ambos explicitados
# Critério: strings literais "Wrapper-brand" E "Primitivo-brand" presentes
# (case-sensitive — como aparecem na tabela canônica do 000-request §3.B.2)
# =============================================================================
grep -q "Wrapper-brand" "$SKILL_FILE"
r1=$?
grep -q "Primitivo-brand" "$SKILL_FILE"
r2=$?

ca4_result=$(( r1 | r2 ))
check "CA4" "Wrapper-brand e Primitivo-brand ambos presentes como strings literais" $ca4_result

# =============================================================================
# CA5 — unique symbol, Brand<T, K>, BrandOf mencionados
# Critério: strings literais que documentam o brand modernizado de shared/brand.ts
# =============================================================================
grep -q "unique symbol" "$SKILL_FILE"
r1=$?
grep -q "Brand<T, K>" "$SKILL_FILE"
r2=$?
grep -q "BrandOf" "$SKILL_FILE"
r3=$?

ca5_result=$(( r1 | r2 | r3 ))
check "CA5" "Strings literais 'unique symbol', 'Brand<T, K>', 'BrandOf' presentes" $ca5_result

# =============================================================================
# CA6 — Facade immutable() / deepImmutable() documentada
# Critério:
#   (a) "immutable(" (com parêntese aberto) — denota chamada de função no código
#   (b) "deepImmutable" — variante para VOs compostos aninhados
#   (c) "Object.freeze" deve aparecer em DON'T (proibido direto no domínio)
# =============================================================================
grep -q "immutable(" "$SKILL_FILE"
r1=$?
grep -q "deepImmutable" "$SKILL_FILE"
r2=$?
grep -q "Object\.freeze" "$SKILL_FILE"
r3=$?

ca6_result=$(( r1 | r2 | r3 ))
check "CA6" "Facade 'immutable(', 'deepImmutable' presentes + 'Object.freeze' mencionado em DON'T" $ca6_result

# =============================================================================
# CA7 — Template Money obsoleto substituído (AUSÊNCIA verificada)
# Critério: a assinatura única do template antigo `zero: (): Money =>` retorna 0.
#
# Nota: a string `export const Money = {` permanece legítima em 4 lugares como
# **menção DON'T** ao antipadrão (bloco code com prefixo ❌, parágrafo §3.B.6,
# linha da tabela DON'T §7). Documentar o antipattern é parte do valor da §3.B.
# Por isso CA7 usa uma assinatura **única ao template obsoleto** que nunca
# apareceria numa menção DON'T abreviada: `zero: (): Money =>`.
#
# POSIX: `grep -c` retorna exit 1 com zero matches — `; true` força exit 0
# preservando o stdout "0".
# =============================================================================
money_old_count=$(grep -c "zero: (): Money =>" "$SKILL_FILE" 2>/dev/null; true)
[ "$money_old_count" -eq 0 ]
check "CA7" "Template Money obsoleto eliminado: zero ocorrências da assinatura 'zero: (): Money =>' (marca do Padrão A)" $?

# =============================================================================
# CA8 — 4 tickets vivos referenciados
# Critério: IDs literais exatos presentes no arquivo
#   - CTR-SHARED-IMMUTABLE        (Facade immutable/deepImmutable)
#   - CTR-SHARED-BRAND-UNIQUE-SYMBOL  (Brand<T,K> + unique symbol)
#   - CTR-SHARED-VO-CANONICAL     (Template canônico em 6+ VOs)
#   - CTR-DOMAIN-IMPORT-CODEMOD   (Codemod big-bang ~200 imports)
# =============================================================================
grep -q "CTR-SHARED-IMMUTABLE" "$SKILL_FILE"
r1=$?
grep -q "CTR-SHARED-BRAND-UNIQUE-SYMBOL" "$SKILL_FILE"
r2=$?
grep -q "CTR-SHARED-VO-CANONICAL" "$SKILL_FILE"
r3=$?
grep -q "CTR-DOMAIN-IMPORT-CODEMOD" "$SKILL_FILE"
r4=$?

ca8_result=$(( r1 | r2 | r3 | r4 ))
check "CA8" "4 tickets vivos referenciados (CTR-SHARED-IMMUTABLE, CTR-SHARED-BRAND-UNIQUE-SYMBOL, CTR-SHARED-VO-CANONICAL, CTR-DOMAIN-IMPORT-CODEMOD)" $ca8_result

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
# Critério: strings que refletem implementação real em
#   src/modules/contracts/domain/shared/money.ts
#   - "fromCents"           — smart constructor canônico
#   - "Number.MAX_SAFE_INTEGER" — guarda de overflow real no money.ts
# =============================================================================
grep -q "fromCents" "$SKILL_FILE"
r1=$?
grep -q "Number\.MAX_SAFE_INTEGER" "$SKILL_FILE"
r2=$?

ca10_result=$(( r1 | r2 ))
check "CA10" "Fidelidade ao código vivo: 'fromCents' e 'Number.MAX_SAFE_INTEGER' presentes na §3.B" $ca10_result

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
  echo "Status: RED — ${failed} critério(s) falhando. W1 precisa implementar §3.B e substituir template Money obsoleto."
  exit 1
fi
