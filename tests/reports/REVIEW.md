# Code Review — Legibility, "God Files" and Clean Code

**Veredito:** REJECTED (Minor issues, but blocks approval due to strict `throw` rule)

**Reviewer:** Gemini CLI (Code Reviewer)
**Data:** 2026-05-14
**Escopo revisado:**

- `src/modules/contracts/domain/contract/contract.ts`
- `src/modules/contracts/domain/amendment/amendment.ts`
- `src/modules/contracts/application/use-cases/create-amendment.ts`

---

## Análise de "God Files" (Arquivos Monolíticos)

Foi feita uma varredura pelos maiores arquivos do módulo. Os arquivos mais extensos são `contract.ts` (~210 linhas) e `amendment.ts` (~189 linhas).

**Veredito:** **NÃO EXISTEM "God Files" neste módulo.**
O projeto segue uma rigorosa separação em _Ports & Adapters_ e modelagem funcional. Os arquivos de domínio concentram apenas as funções puras de manipulação de estado, demonstrando altíssima coesão e respeito ao Single Responsibility Principle (SRP).

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

#### Issue 1 — Quebra da regra "Zero throw"

**Arquivos:**

- `src/modules/contracts/domain/contract/contract.ts:145`
- `src/modules/contracts/domain/amendment/amendment.ts:60`
- `src/modules/contracts/domain/amendment/amendment.ts:167`
- `src/modules/contracts/application/use-cases/create-amendment.ts:74`

**Categoria:** A (regras absolutas do domínio)
**Problema:** Uso de `throw new Error(...)` no branch `default` de blocos `switch` (Exhaustiveness Check). O `SKILL.md` determina "Zero `throw` — buscar `throw` no diff; cada ocorrência é REJECTED".
**Fix sugerido:** Remover o `throw`. Como a variável é inferida como `never`, o TypeScript já garantirá o erro em tempo de compilação caso uma nova variante seja adicionada sem tratamento.

```ts
// antes
default: {
  const _exhaustive: never = adjustment;
  throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
}

// depois
default: {
  const _exhaustive: never = adjustment;
  return _exhaustive; // ou simplesmente omitir o throw dependendo do strictness do TS
}
```

#### Issue 2 — Type Bypassing (Castings Perigosos)

**Arquivos:**

- `src/modules/contracts/domain/contract/contract.ts:61`, `88`, `107`, `130`, `139`, `154`, `162`
- `src/modules/contracts/domain/amendment/amendment.ts:86`, `111`, `133`

**Categoria:** F (TypeScript moderno / Safety)
**Problema:** Uso excessivo de `as unknown as Type` (ex: `as unknown as ContractEntity`). Isso desativa a tipagem estrutural do TypeScript. Se a interface ganhar novos campos amanhã, o compilador não acusará erro nos métodos construtores/atualizadores que esquecerem de preenchê-los.
**Fix sugerido:** Remover o bypass e garantir que o objeto retornado obedeça estritamente ao tipo de destino estruturalmente, ou utilizar funções utilitárias que retenham type-safety.

---

### 🔵 Sugestão (estilo / clareza / DRY)

#### Issue 3 — Duplicação de utilitários primários

**Arquivos:**

- `src/modules/contracts/domain/contract/contract.ts:13-15`
- `src/modules/contracts/domain/amendment/amendment.ts:17-19`

**Categoria:** G (Naming, clareza)
**Problema:** Funções utilitárias como `isValidDate` e `isBlank` estão duplicadas no topo dos arquivos de domínio.
**Fix sugerido:** Extrair esses utilitários para a pasta `shared/` ou `domain/shared/` para respeitar o princípio DRY (Don't Repeat Yourself) e manter os arquivos de domínio focados nas regras de negócio.

---

## O que está bom

- **Error Handling Funcional:** O uso do pattern `Result<T, E>` está excelente. Não há "spaghetti" de `try/catch` na camada de aplicação.
- **Mutabilidade Segura:** Ótima aplicação de imutabilidade. O estado avança retornando novas instâncias (`const next = { ...contract, status: 'Expired' }`) sem mutar o objeto original.
- **Design Livre de Classes:** A aderência a `Zero class` e `Zero this` resultou em um código limpo, testável e sem ambiguidades de contexto léxico.
- **Ubiquitous Language:** Excelente escolha de nomes aderentes ao domínio de negócio (ex: `applyHomologatedAdjustment`, `homologate`, `attachSignedDocument`).

---

## Próximo passo

- **Dev:** Aplicar os fixes detalhados na seção 🔴 (remover os `throw` nos exhaustiveness checks e ajustar os castings `as unknown as`).
- Extrair utilitários de validação (seção 🔵) é recomendado para aprimorar a legibilidade.
