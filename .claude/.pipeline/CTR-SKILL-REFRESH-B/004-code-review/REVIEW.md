# W2 — REVIEW — CTR-SKILL-REFRESH-B

> **Veredito:** APPROVED — round 1.

**Reviewer:** `code-reviewer`
**Data:** 2026-05-21T00:00Z
**Escopo revisado:**
- `.claude/skills/ts-domain-modeler/SKILL.md` — §3.B completa (linhas 281-533) + template "Templates rápidos" (linhas 223-277)
- `.claude/.pipeline/CTR-SKILL-REFRESH-B/002-tests/verify-skill-refresh-b.sh` — verificador refinado (CA7)
- `src/shared/brand.ts` — arquivo canônico (fidelidade §3.B.1)
- `src/shared/immutable.ts` — arquivo canônico (fidelidade §3.B.5)
- `src/modules/contracts/domain/shared/money.ts` — arquivo canônico (fidelidade §3.B.7 + template)
- `src/` e `tests/` — status intocados confirmado por `git diff --cached`

---

## Verificador W0

```
Verificando: .../skills/ts-domain-modeler/SKILL.md
---
[PASS] CA1: Seção §3.B existe (## §3.B — Smart Constructor Canônico)
[PASS] CA2: 9 sub-seções presentes (Brand Modernizado, Wrapper-Brand, Module-as-Namespace, Smart Constructor, Identidade Fixa, Migração Big-Bang, Template Canônico, Tabela, Tickets vivos)
[PASS] CA3: Contagem exata declarada: **DO (9)**, **DON'T (9)**, **CONSIDER (4)** presentes
[PASS] CA4: Wrapper-brand e Primitivo-brand ambos presentes como strings literais
[PASS] CA5: Strings literais 'unique symbol', 'Brand<T, K>', 'BrandOf' presentes
[PASS] CA6: Facade 'immutable(', 'deepImmutable' presentes + 'Object.freeze' mencionado em DON'T
[PASS] CA7: Template Money obsoleto eliminado: zero ocorrências da assinatura 'zero: (): Money =>' (marca do Padrão A)
[PASS] CA8: 4 tickets vivos referenciados (CTR-SHARED-IMMUTABLE, CTR-SHARED-BRAND-UNIQUE-SYMBOL, CTR-SHARED-VO-CANONICAL, CTR-DOMAIN-IMPORT-CODEMOD)
[PASS] CA9: src/ e tests/ intocados pelo ticket (zero arquivos staged em src/ e tests/)
[PASS] CA10: Fidelidade ao código vivo: 'fromCents' e 'Number.MAX_SAFE_INTEGER' presentes na §3.B
---
Result: 10/10 PASSED
Status: GREEN — todos os critérios satisfeitos.
```

---

## Sumário audit qualitativo

Issues encontradas: **1 sugestão** (não-bloqueante).

---

## Issues por arquivo:linha

### Nenhuma issue crítica (🔴) ou importante (🟡).

### 🔵 Sugestão — SKILL.md:286 — Cross-ref bidirecional §3.B ↔ §3.C ausente

**Categoria:** Clareza / cross-refs entre seções
**Problema:** O bloco intro da §3.B (linha 286) menciona `Cross-ref §3.D` mas não menciona `§3.C`. O 000-request §"Eixos de audit qualitativo" pedia verificação: "A §3.B menciona §3.D (smart constructor como ponto de entrada de tagged errors) e §3.C (discriminated union usa smart constructor)? Consistente?". A relação B → C existe semanticamente (todo discriminated union em §3.C usa smart constructors de §3.B como ponto de entrada de parse), mas não está explicitada no cross-ref do blockquote introdutório.

Simetria atual:
- §3.B intro → menciona §3.D ✅, não menciona §3.C
- §3.D intro → menciona §3.B implicitamente ("ambos dependem do smart constructor") ✅
- §3.C intro → menciona §3.D ✅, não menciona §3.B

**Impacto:** Um leitor chegando pela §3.C não tem a âncora explícita para §3.B. Baixo impacto porque §3.B.4 referencia §3.D.1 inline, e a ordem linear da leitura B → C → D guia o leitor. Não bloqueia aprovação.

**Fix sugerido** (próximo ticket ou round seguinte):
```diff
- > **Cross-ref §3.D:** §3.D aborda Tagged Errors e State Machine — ambos dependem do smart constructor como ponto de entrada. §3.B cobre o *como* — o idioma do brand modernizado, Padrão D e a facade `immutable()`.
+ > **Cross-ref §3.D:** §3.D aborda Tagged Errors e State Machine — ambos dependem do smart constructor como ponto de entrada. §3.B cobre o *como* — o idioma do brand modernizado, Padrão D e a facade `immutable()`.
+ > **Cross-ref §3.C:** discriminated unions (§3.C) assumem que cada variante já foi construída via smart constructor (§3.B) — o parse garante a invariante antes de o discriminator operar.
```

---

## Audit especial — refino CA7 + 3 menções DON'T legítimas

### Avaliação do refino CA7

**Julgamento: APROVADO. O refino é correto e robusto.**

O critério original (`grep -c "export const Money = {"`) era impreciso porque a própria §3.B precisa exibir o antipadrão para ter valor pedagógico — remover as menções DON'T descaracterizaria a documentação.

A assinatura `zero: (): Money =>` é **única do Padrão A** (método `zero()` como função de identidade, violando DON'T B§10). Esta assinatura:
1. Nunca apareceria numa menção DON'T abreviada (que usa `export const Money = { ... }` como placeholder)
2. É a marca definitiva do template antigo: identidade como função em vez de constante
3. Retorna 0 matches após W1, confirmando que o template Padrão A foi de fato eliminado

O critério refinado é semanticamente mais preciso: detecta o padrão problemático (construção repetida via função) e não detecta as menções educacionais (que mostram o antipadrão em contexto).

### Verificação das 3 menções DON'T legítimas

| Linha | Conteúdo | Classificação |
| :---- | :-------- | :------------ |
| **349** | `// ❌ export const Money = { fromCents: ..., add: ..., ... }` dentro do bloco §3.B.3 | Legítima — marca pedagógica `❌` explícita, mostra o antipadrão Module-as-Namespace |
| **428** | `Em bases com Padrão A (\`export const Money = { ... }\`)` no texto de §3.B.6 | Legítima — explicação textual da migração big-bang; sem prefixo `❌` mas o contexto DON'T B§11 é claro |
| **508** | `§7 — Namespace-objeto \`export const Money = { … }\` (perde tree-shaking + jargão OO)` na tabela DON'T | Legítima — definição literal do DON'T B§7 na tabela canônica; a linha está sob o bloco `**DON'T (9)**` |

Nenhuma das 3 menções constitui instância viva do antipadrão. Todas são referências controladas ao padrão proibido dentro de contexto educacional. **Devem permanecer.**

---

## Cobertura dos 10 CAs — audit qualitativo

| CA | Status | Avaliação qualitativa |
| :-- | :----: | :-------------------- |
| **CA1** — §3.B antes de §3.D | ✅ | §3.B inicia na linha 281, §3.D na linha 535 — ordem correta B → D → C (C está após D na ordem de arquivo, mas §3.C não é dependência de §3.B, e ambas estão após §3.B). |
| **CA2** — 9 sub-seções | ✅ | §3.B.1 a §3.B.9 com títulos únicos e conteúdo distinto. Nenhuma sub-seção é placeholder vazio. |
| **CA3** — 9 DO + 9 DON'T + 4 CONSIDER | ✅ | Marcadores literais `**DO (9)**`, `**DON'T (9)**`, `**CONSIDER (4)**` presentes na §3.B.8. Promoções temáticas documentadas tanto na tabela (marcador `*(promoção temática de (A))*`) quanto no blockquote intro da §3.B.8. Justificativa presente e rastreável ao 000-request. |
| **CA4** — Wrapper-brand + Primitivo-brand | ✅ | Tabela §3.B.2 com ambas as colunas explicitadas, exemplos concretos (`Money`, `Period` para Wrapper; `ContractId`, `AmendmentId`, `DocumentId`, `UserRef` para Primitivo), e justificativa "colapsa sob extensão" presente. |
| **CA5** — `unique symbol`, `Brand<T, K>`, `BrandOf` | ✅ | §3.B.1 cita `declare const __brand: unique symbol`, `Brand<T, K extends string>`, `BrandOf<B>`. Fiel ao arquivo vivo `src/shared/brand.ts`. |
| **CA6** — `immutable()`, `deepImmutable`, `Object.freeze` em DON'T | ✅ | §3.B.5 documenta a facade, exibe snippet de ambas as funções, e tem bloco DON'T explícito com `Object.freeze` marcado `❌`. |
| **CA7** — template Money obsoleto eliminado | ✅ | Template "Templates rápidos" está em Padrão D fiel ao arquivo vivo. Cross-ref `> Veja §3.B — Smart Constructor Canônico.` presente na linha 227. As 3 menções DON'T legítimas (linhas 349/428/508) são pedagógicas. Refino da assinatura verificadora é correto. |
| **CA8** — 4 tickets vivos | ✅ | §3.B.9 contém tabela com todos os 4 tickets: `CTR-SHARED-IMMUTABLE`, `CTR-SHARED-BRAND-UNIQUE-SYMBOL`, `CTR-SHARED-VO-CANONICAL`, `CTR-DOMAIN-IMPORT-CODEMOD`. |
| **CA9** — `src/` e `tests/` intocados; zero regressão | ✅ | `git diff --cached -- src/ tests/` → 0 linhas. `pnpm run typecheck` exit 0. `pnpm run lint` exit 0. Nenhum arquivo de produção tocado. |
| **CA10** — fidelidade ao código vivo | ✅ | Template §3.B.7 é bit-a-bit fiel a `src/modules/contracts/domain/shared/money.ts`. Brand snippet fiel a `src/shared/brand.ts` (omite comentário ESLint-disable, que é detalhe de implementação, não padrão). Immutable snippet usa pseudocódigo `/* recursivo */` para `deepImmutable` — adequado para documentação (não pretende ser cópia do arquivo). |

---

## Análise dos eixos de audit qualitativo do 000-request

### Ratio legis — cada DO/DON'T tem justificativa explícita?

**SIM.** Cada item das sub-seções narrativas (§3.B.1 a §3.B.6) inclui o "por que":
- DO §8 Module-as-namespace: "tree-shaking + semântica limpa"
- DON'T §7 Namespace-objeto: "perde tree-shaking + jargão OO" (com a tag textual dentro do próprio item)
- DON'T §6 Brand-de-primitivo para grandezas: "colapsa sob extensão" com exemplo concreto de breaking change
- DON'T §3 Parse vs Validate: citação Wlaschin + exemplo de código duplo ❌/✅
- DON'T §10 `zero()` como função: "implica construção repetida" + distinção constante vs função
- Promoções temáticas: marcadas com `*(promoção temática de (A))*` na tabela + explicadas em §3.B.4 e §3.B.8

Nenhum DO/DON'T é só enunciado — todos têm justificativa narrativa ou inline.

### Padrão D module-as-namespace

**Claro e completo.** §3.B.3 exibe 3 blocos de código: ✅ (Padrão D correto) + ❌ namespace-objeto + ❌ function-as-constructor. A distinção entre os dois DON'Ts (§7 e §8) é feita lado a lado. A explicação do tree-shaking está presente.

### Identidade fixa (ZERO constante vs zero() função)

**Justificativa presente e explícita.** §3.B.5 distingue explicitamente:
- `export const ZERO: Money = immutable({ cents: 0 }) as Money` — constante (DO B§10)
- `export const zero = (): Money => ...` — função (DON'T B§10, "implica construção repetida")

A justificativa "constante carrega a invariante 'este é o único'" não está com essa frase exata, mas o conceito está expresso em "constante" vs "implica construção repetida". Satisfatório para fins documentais.

### Codemod big-bang vs dual

**§3.B.6 cobre ambos de forma concisa.** DO §12 (big-bang com ts-morph) com referência concreta ao `CTR-DOMAIN-IMPORT-CODEMOD` (~200 imports). DON'T §11 (migração dual) com o diagnóstico "drift permanente" e instrução de cobertura total dos callers.

### Fidelidade dos snippets

**Fiel em todos os pontos verificados:**
- `brand.ts`: snippet captura `declare const __brand: unique symbol`, `Brand<T, K extends string>`, `BrandOf<B>` — correto. Omissão do comentário ESLint-disable é adequada.
- `immutable.ts`: `immutable = <T extends object>(value: T): Readonly<T> => Object.freeze(value)` — idêntico ao arquivo vivo. `deepImmutable = <T>(value: T): T => { /* recursivo */ }` — placeholder pedagógico correto.
- `money.ts`: template §3.B.7 é cópia fiel linha a linha de `src/modules/contracts/domain/shared/money.ts`, incluindo `ZERO`, `fromCents`, `add`, `subtract`, `equals`, `greaterThan`, guards corretos (`Number.isInteger`, `Number.MAX_SAFE_INTEGER`).

---

## O que está bem feito

- **Cross-ref §3.B → §3.D** no blockquote introdutório é preciso e suficiente para o leitor conectar os sub-temas.
- **Promoções temáticas DO §2/§5 + DON'T §3** estão documentadas com marcadores explícitos `*(promoção temática de (A))*` tanto na tabela §3.B.8 quanto no texto narrativo de §3.B.4. Rastreabilidade total.
- **Exemplos de código duplo ❌/✅** em §3.B.3 e §3.B.4 são o estilo mais eficaz para comunicar a distinção Pattern D vs Padrão A.
- **Template §3.B.7 fiel ao código vivo** — o risco de divergência entre doc e implementação foi mitigado copiando o arquivo real.
- **Exemplo de consumo em §3.B.7** inclui `Money.ZERO`, demonstrando o uso da constante de identidade dentro do Padrão D.
- **Refino CA7** foi cirúrgico e correto: identificou uma assinatura única ao Padrão A (`zero: (): Money =>`) em vez de uma string que aparece legitimamente em contextos pedagógicos.
- **Zero regressão** em src/ e tests/ — o ticket é estritamente documental conforme escopo.

---

## Próximo passo

W3 — `ts-quality-checker` executa verificador W0 + `pnpm run typecheck` + `pnpm run format:check` + `pnpm test` + `pnpm run lint`. Gates já verificados nesta W2 mostram exit 0 em todos.
