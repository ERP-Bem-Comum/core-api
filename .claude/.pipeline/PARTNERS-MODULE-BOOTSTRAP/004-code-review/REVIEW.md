# W2 — REVIEW · PARTNERS-MODULE-BOOTSTRAP

> Agente: code-reviewer · Round: 1 · Veredito: **APPROVED**

## Checklist

| Critério | Status | Nota |
| :--- | :--- | :--- |
| Idioma (código EN, comentário PT, erro kebab EN) | ✅ | `'invalid-cpf'`, `'invalid-cnpj'`, `'partner-ref-invalid'` |
| `import type` para tipos (`verbatimModuleSyntax`) | ✅ | `import type { Brand }`; `import { type Result, ok, err }` |
| Extensão `.ts` nos imports | ✅ | `'../primitives/result.ts'`, `'#src/shared/utils/id.ts'` |
| Subpath `#src/*` no módulo, relativo no kernel | ✅ | refs usa `#src/`; kernel usa relativo (coerente com `user-ref.ts`) |
| Padrão D (module-as-namespace, sem `generate`) | ✅ | `Cpf`/`Cnpj` expõem só `parse`; refs só `rehydrate` |
| Domínio puro / public-api puro (ADR-0006) | ✅ | `public-api/refs.ts` só tipos + validator; zero regra de negócio |
| `Result<T,E>` em vez de throw | ✅ | todos os construtores |
| YAGNI (mínimo p/ GREEN) | ✅ | Email fora; sem eventos/read model; refs compartilham helper |
| Sem regressão | ✅ | `isValidCnpj` mantido e verde |

## Análise pontual

- **`cpf.ts`** — pesos DV1 (9) e DV2 (10) corretos; `isValidCpf` valida length/repetição/DV antes do brand. `noUncheckedIndexedAccess`: `digits[9]`/`digits[10]` são acessados só após `length === 11` garantido — seguro (mesmo padrão já aprovado em `cnpj.ts`).
- **`cnpj.ts`** — `parse` delega a `isValidCnpj` (uma fonte de verdade do DV). `onlyDigits` roda 2× no caminho feliz (em `isValidCnpj` e no `parse`); custo desprezível para string de 14 — não justifica refactor (YAGNI). Imports após o file-header comment: idiomático.
- **`refs.ts`** — `type` + `const` homônimos (permitido em TS); `as const` congela os namespaces; helper `rehydrateAs<B>` evita 3× duplicação sem vazar tipo.
- **`index.ts` (partners)** — exporta só tipos; orienta importar os namespaces de `refs.ts` direto. Coerente com o barrel do kernel.

## Issues

Nenhuma. Nenhum import cross-módulo proibido, nenhum `throw`, nenhum `any`, nenhum ENUM/JSON. Liberado para W3.
