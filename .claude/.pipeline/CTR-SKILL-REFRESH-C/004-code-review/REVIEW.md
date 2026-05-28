# W2 — REVIEW — CTR-SKILL-REFRESH-C

> **Veredito:** APPROVED — round 1.

**Reviewer:** code-reviewer
**Data:** 2026-05-20T00:00Z
**Escopo revisado:**
- `.claude/skills/ts-domain-modeler/SKILL.md` (831 linhas — único arquivo modificado pelo ticket)
- `.claude/.pipeline/CTR-SKILL-REFRESH-C/002-tests/verify-skill-refresh-c.sh` (fix POSIX — auditado)
- `src/modules/contracts/domain/amendment/types.ts` — verificação cruzada §3.C.1 (AmendmentVariant, AmendmentCore, PendingWithoutDocumentAmendment)
- `src/modules/contracts/domain/contract/types.ts` L114-119 — verificação cruzada §3.C.2 (ContractAdjustment)
- `src/modules/contracts/application/use-cases/homologate-amendment.ts` L57-73 — verificação cruzada §3.C.3/§3.C.4 (toContractAdjustment)
- `src/modules/contracts/domain/contract/contract.ts` L177-253 — verificação cruzada §3.C.4 (applyHomologatedAdjustment — Padrão A ao vivo)

---

## Verificador W0

```
Verificando: .../skills/ts-domain-modeler/SKILL.md
---
[PASS] CA1: Seção §3.C existe (## §3.C — Discriminated Unions & Exhaustive Switch)
[PASS] CA2: 5 sub-seções presentes (Aninhamento, Dupla Taxonomia, Função-Ponte, Exhaustive Switch, Tabela DO(5))
[PASS] CA3: Contagem exata declarada: **DO (5)**, **DON'T (5)**, **CONSIDER (2)** presentes
[PASS] CA4: Padrão A (omitir default) e Padrão B (const _: never = x; return _) ambos documentados
[PASS] CA5: Zero ocorrências de 'throw new Error' na SKILL.md (issue pré-existente SKILL.md:99 corrigida)
[PASS] CA6: Aninhamento anti cross-product: 'cross-product', '3 estados', 'AmendmentVariant', 'AmendmentCore' presentes
[PASS] CA7: Dupla taxonomia Amendment vs ContractAdjustment documentada; DON'T 'Eliminar ContractAdjustment' presente
[PASS] CA8: 4 tickets vivos referenciados (STATE-MACHINE-AMENDMENT, AGG-CONTRACT, USECASE-HOMOLOGATE-AMENDMENT, EXHAUSTIVE-SWITCH-FIX)
[PASS] CA9: src/ e tests/ intocados pelo ticket (zero arquivos staged em src/ e tests/)
[PASS] CA10: Fidelidade ao código vivo: 'PendingWithoutDocumentAmendment' + ('applyHomologatedAdjustment' ou 'toContractAdjustment') presentes
---
Result: 10/10 PASSED
Status: GREEN — todos os critérios satisfeitos.
```

---

## Sumário audit qualitativo

- Issues encontradas: **2** (0 críticas, 1 média, 1 baixa).
- Cobertura dos 10 eixos de audit: completa.
- `git diff --cached --name-only -- src/ tests/` → **0 arquivos staged** (CA9 confirmado via shell).
- `pnpm run typecheck` → **exit 0**, zero erros.
- `pnpm run lint` → **exit 0**, zero erros.

---

## Issues por arquivo:linha

### `.claude/skills/ts-domain-modeler/SKILL.md:646-666` — Tensão interna §3.C.3 — MÉDIA

**Categoria:** Fidelidade ao código vivo / coerência interna.

**Problema:** O título de §3.C.3 é "Função-Ponte **Retorna Array**" e o parágrafo de abertura afirma que a função retorna `readonly ContractAdjustment[]`. O snippet de código a seguir, porém, exibe a assinatura real `(amendment: AmendmentEntity): ContractAdjustment` (escalar) — correto, porque é o código vivo. O bloco `> Nota:` esclarece a tensão, mas a sequência `título-assertivo → snippet-contradizente → nota-corretiva` pode confundir um leitor que lê em diagonal: ele chega ao snippet esperando `ContractAdjustment[]` e encontra `ContractAdjustment`.

**Impacto:** Médio. A tensão é real no design (função vive hoje como escalar; intenção é array); a nota corretiva está presente e correta. Não é erro factual — é risco de leitura errada por desenvolvedor que não ler o bloco `> Nota:`.

**Sugestão de escrita mais clara (sem alterar o fato):**

```markdown
### §3.C.3 — Função-Ponte: Assinatura Atual × Forma Canônica Projetada

A função que traduz `Amendment` → `ContractAdjustment` existe hoje com assinatura
escalar. A **forma canônica projetada** retorna `readonly ContractAdjustment[]`
para suportar as 3 cardinalidades descritas abaixo.

**Assinatura atual** (código vivo em `homologate-amendment.ts:57`):
```ts
export const toContractAdjustment = (amendment: AmendmentEntity): ContractAdjustment => { ... }
```

**Forma canônica projetada:**
```ts
Amendment.toAdjustments(homologated): readonly ContractAdjustment[]
```
```

Esta reescrita não é bloqueante — o conteúdo informacional está correto. Registrado para housekeeping posterior (pode ser incluído em `CTR-SKILL-REFRESH-C` round 1 de correção qualitativa ou no próximo ticket que tocar §3.C.3).

---

### `.claude/skills/ts-domain-modeler/SKILL.md:629` — Referência de linha imprecisa no snippet §3.C.2 — BAIXA

**Categoria:** Fidelidade ao código vivo (detalhe).

**Problema:** O comentário `// src/modules/contracts/domain/contract/types.ts (linhas 114-119)` aponta para linhas 114-119, mas a leitura real do arquivo confirma `ContractAdjustment` em L114-119. A contagem está tecnicamente correta — porém o código ao redor (L111-113: `updateContract` + L121: `CreateContractInput`) pode fazer a linha 114 parecer deslocada dependendo de futuros inserts. É uma referência de linha "viva" — não uma URL — e portanto frágil por natureza.

**Impacto:** Baixo. Não afeta a compreensão; apenas a navegação manual futura.

**Sugestão:** remover o número de linha do comentário inline — o nome da função já é suficiente como âncora de navegação. Ou mantê-lo como está, sabendo que é snapshot.

---

## Audit especial — fix da linha 99 + bug POSIX no verificador

### Fix da linha 99 (seção "Obrigações")

**Auditado em SKILL.md:99-100:**

```ts
// Veja §3.C.4 (Padrão B) — exhaustive sem throw.
default: { const _exhaustive: never = amendment; return _exhaustive; }
```

- `throw new Error(...)` eliminado. CA5 confirma zero ocorrências de `throw new Error` em toda a SKILL.md. ✅
- Padrão B aplicado corretamente: `const _exhaustive: never = amendment; return _exhaustive;`. ✅
- Comentário de referência cruzada `// Veja §3.C.4 (Padrão B)` presente e correto — conecta a correção à nova seção que a justifica. ✅
- Nenhuma regressão semântica: o switch ao redor (L94-101) cobre `Amendment` com os 4 kinds (Addition, Suppression, TermChange, Misc); Padrão B é a escolha certa aqui porque há código de contexto externo ao switch (não é função return-only de switch direto). ✅
- A issue registrada no W2 do SKILL-REFRESH-D como "Média pré-existente" foi **totalmente atendida** por este ticket. ✅

### Bug POSIX no verificador (CA5 — `grep -c` + zero matches)

**Auditado em `verify-skill-refresh-c.sh:108-113`:**

```bash
# NOTA: `grep -c` retorna exit 1 quando zero matches (POSIX), mesmo imprimindo "0".
# Sem o fallback correto, `|| echo "0"` concatena dois zeros e quebra o `-eq`.
# `; true` força exit 0 do subshell preservando o stdout do grep -c.
throw_count=$(grep -c "throw new Error" "$SKILL_FILE" 2>/dev/null; true)
[ "$throw_count" -eq 0 ]
check "CA5" "Zero ocorrências de 'throw new Error' na SKILL.md (issue pré-existente SKILL.md:99 corrigida)" $?
```

- O comentário inline explica corretamente o comportamento POSIX de `grep -c` com zero matches (exit 1, stdout "0"). ✅
- O fix `; true` força exit 0 do subshell, preservando o stdout do `grep -c` sem concatenação. ✅
- A alternativa rejeitada (`|| echo "0"`) produziria `"0\n0"` quando zero matches, quebrando a aritmética do `[ -eq 0 ]`. O comentário documenta exatamente essa armadilha. ✅
- Testado: saída real `10/10 PASSED` confirma funcionamento correto pós-fix. ✅

---

## Cobertura dos 10 eixos de audit qualitativo

| Eixo | Status | Evidência / Observação |
| :--- | :---: | :--- |
| **Ratio legis** — cada DO/DON'T tem justificativa explícita? | PASS | §3.C.1 tem "Por que evitar cross-product?" com 3 bullets de justificativa. §3.C.2 tem "Ports & Adapters interno" + "NÃO eliminar ... a evolução assimétrica prova". §3.C.4 tem "viola 'zero throw' do domínio. Proibido sem exceção." + explicação do `assertNever`. Cada DON'T da tabela §3.C.5 inclui o motivo após o travessão. |
| **Fidelidade ao código vivo** — `AmendmentVariant` em `amendment/types.ts:55+` | PASS | Snippet §3.C.1 (L565-603) é cópia fiel de `amendment/types.ts:27-103`: 4 kinds corretos, `NonZeroMoney` em Addition/Suppression, `newEndDate: Date` em TermChange, `Misc` sem campo. `PendingWithoutDocumentAmendment` com `homologatedAt: null; homologatedBy: null` — match exato com L56-62 do arquivo real. |
| **Fidelidade ao código vivo** — `ContractAdjustment` em `contract/types.ts:117-122` | PASS | Snippet §3.C.2 (L630-635) match exato com `contract/types.ts:L114-119`: 4 kinds corretos, `amount: Money`, `newEnd: Date`, `Acknowledgment` sem `amount`. |
| **Fidelidade ao código vivo** — `toContractAdjustment` em `homologate-amendment.ts:57-73` | PASS (com issue MÉDIA sobre tensão de título) | Snippet §3.C.3 (L650-666) é transcrição literal de `homologate-amendment.ts:57-73`, incluindo o `default: { const _exhaustive: never = amendment; return _exhaustive; }`. Tensão de título "Retorna Array" vs assinatura escalar atual documentada via nota corretiva. |
| **Fidelidade ao código vivo** — exhaustive switch em `contract.ts:175-220` | PASS | Padrão A (L693-701) usa `adjustment.kind` com os 4 kinds de `ContractAdjustment` e aponta `applyHomologatedAdjustment` como exemplo vivo. A função real (L191-250) usa exatamente o Padrão A sem `default` — `switch` sem default e o compilador enforce via `noFallthroughCasesInSwitch`. Fidelidade perfeita. |
| **Fix da linha 99 sem regressão** | PASS | Linha 100 tem `default: { const _exhaustive: never = amendment; return _exhaustive; }` com comentário `// Veja §3.C.4 (Padrão B) — exhaustive sem throw.`. Sem `throw`. Sem regressão no switch. |
| **Bug POSIX no verificador** (`sh:108-110`) | PASS | Fix `; true` aplicado, comentário inline explica o comportamento POSIX e a armadilha da alternativa `|| echo "0"`. Confirmado por `10/10 PASSED` no run real. |
| **Cross-refs §3.C ↔ §3.D** | PASS | §3.C abre com `> Cross-ref com §3.D:` (L546) explicando a divisão de responsabilidades (§3.D = porquê State Machine; §3.C = como idioma TS). §3.C.1 fecha com `> Cross-ref §3.D.4` (L613). DO §29 na tabela §3.C.5 tem `*(cross-ref §3.D.2)*`. §3.D está intacta — nenhuma linha regrediu. |
| **Divergência 5+5+2 vs L971** | PASS | §3.C.5 documenta explicitamente: "A tabela L971 da entrevista declara 6+6+2 por erro de contagem — usar 5+5+2 reais." Decisão alinhada ao 000-request §"Discrepância de contagem documentada". |
| **Padrão A + Padrão B** | PASS | Padrão A (L690-701): omite `default`, usa `adjustment.kind`, termina com comentário `// Exhaustive: tsconfig.noFallthroughCasesInSwitch enforce.`. Padrão B (L706-718): `default:` com `const _exhaustive: never = amendment; return _exhaustive;` + comentário inline `// TS infere 'never' — nunca executado em runtime`. Ambos os padrões apontam exemplo vivo no `src/`. |

---

## O que está bom

**Cross-ref §3.C ↔ §3.D é preciso e não-redundante.** A abertura da §3.C delineia a divisão de responsabilidades com uma frase: "§3.D aborda o *porquê* do aninhamento; §3.C foca no *como*." Isso resolve o risco de duplicação antecipado no 000-request §"Risco 1" sem sacrificar a completude de cada seção.

**Ratio legis presente e fundamentado.** DON'T §26 (cross-product) tem "duplica máquina de estado, força sincronização redundante" — o motivo é navegável por código. DON'T §29 (`default: throw`) tem "viola 'zero throw' do domínio. Proibido sem exceção." — zero ambiguidade. DON'T §30 (`assertNever`) explica a limitação do TS ("rejeita função `never` sem corpo que lança") em vez de ser lista dogmática.

**Padrão A documentado com exemplo que está de fato no código.** `applyHomologatedAdjustment` usa Padrão A sem `default` — e a SKILL.md o cita como exemplo vivo. Desenvolvedor que precisar decidir entre A e B pode consultar a regra, ver o exemplo no `src/` e confirmar que funciona.

**Fix da linha 99 é cirúrgico e rastreável.** O comentário `// Veja §3.C.4 (Padrão B)` conecta a correção à nova seção com um endereço navegável dentro da própria SKILL.md. Isso torna o fix um exemplo didático — não apenas uma correção silenciosa.

**Dupla taxonomia explicada com tabela comparativa.** A tabela §3.C.2 (Tipo / Categoria / 4 kinds) torna a distinção `Amendment` vs `ContractAdjustment` escaneável em 3 segundos — superior a um parágrafo de prosa.

**DON'T §27 (transição sem Result) é o mais subapreciado e foi incluído.** A maioria das skills documenta apenas o `throw` óbvio; capturar que uma função que transita estado sem `Result` força o caller a usar `throw` para sinalizar falha é uma justificativa mais sofisticada e didaticamente valiosa.

---

## Próximo passo

**W3 QUALITY.** Nenhuma issue crítica. As issues registradas:

- Issue MÉDIA (§3.C.3 tensão título vs snippet): esclarecível em housekeeping; não bloqueia W3. Sugestão de escrita mais clara documentada acima para o próximo ticket que tocar §3.C.3.
- Issue BAIXA (referência de linha frágil em §3.C.2:629): cosmética; pode ser endereçada junto com a issue MÉDIA ou ignorada.

`ts-quality-checker` deve rodar: `pnpm run typecheck` + `pnpm run lint` + `pnpm run format:check` + `pnpm test`. Ticket estritamente documental — zero regressão esperada em todos os gates (já confirmado em W1 e reconfirmado neste W2: typecheck ✅, lint ✅).
