# core-api — ERP Bem Comum

Modular Monolith hospedando os módulos de negócio do ERP. **Fase 1: módulo Contratos.**

> **Stack:** Node.js 24 LTS · TypeScript 6.0 · ESM (`"type": "module"`, `NodeNext`) · pnpm (multi-repo).
>
> **Source of Truth:** [`../handbook/`](../handbook/). Skills e orquestrador em [`.claude/`](./.claude/README.md).

---

## 🏗️ Estrutura

```
src/                                   Código de produção
├── shared/                            Utilitários cross-módulo (puro, sem infra)
│   ├── result.ts                      Result<T, E>
│   ├── brand.ts                       Brand<T, Tag>
│   ├── id.ts                          newUuid, isUuidV4
│   └── ports/                         Ports cross-cutting (Clock, IdGenerator)
│
├── shared-kernel/                     Tipos de domínio compartilhados (CNPJ, CPF, IBGE)
│
└── modules/
    └── contratos/                     Bounded Context "Gestão de Contratos"
        ├── domain/
        │   ├── shared/                VOs do módulo (Moeda, Periodo, IDs, UsuarioRef)
        │   ├── contrato/              Agregado Contrato Mãe
        │   └── aditivo/               Agregado Aditivo
        ├── application/
        │   ├── ports/                 Repository, EventBus, Storage (types)
        │   └── use-cases/             Factory functions (deps) => (input) => Result
        ├── adapters/                  Implementações concretas (MySQL, InMemory, S3, ...)
        ├── cli/                       CLI para P.O. validar regras (consome InMemory)
        └── contracts/                 🔵 API PÚBLICA do módulo (eventos + commands)

tests/                                 Espelho de src/ — só arquivos *.test.ts
└── modules/contratos/domain/shared/moeda.test.ts ...
```

### Imports cross-pasta

`package.json` declara **subpath imports** (Node nativo, sem transpiler):

```json
"imports": {
  "#src/*": "./src/*"
}
```

Testes referenciam código de produção via `#src/*` — limpo, refatoração-safe:

```ts
import { Moeda } from '#src/modules/contratos/domain/shared/moeda.ts';
```

---

## 🚀 Scripts

```bash
npm install
npm run typecheck     # tsc --noEmit
npm test              # node --test --experimental-strip-types
npm run cli:contratos -- <subcomando>  # CLI do módulo Contratos
```

---

## 🌊 Como contribuir

Todo trabalho não-trivial passa pela **pipeline 4-wave** (W0 RED → W1 GREEN → W2 REVIEW → W3 QUALITY). Ver:

- [`.claude/README.md`](./.claude/README.md) — Visão geral
- [`.claude/agents/contratos-orchestrator.md`](./.claude/agents/contratos-orchestrator.md) — Ponto de entrada
- [`.claude/.pipeline/README.md`](./.claude/.pipeline/README.md) — Como abrir ticket

---

## 📐 Regras transversais (do `CLAUDE.md` raiz + `.claude/`)

- **`throw` proibido** no domínio. `Result<T, E>` em vez disso.
- **Sem `class`, sem `this`** — `Readonly<>` types + funções puras.
- **Branded types** para IDs e VOs (CPF, CNPJ, Moeda).
- **Discriminated unions** + `switch` exhaustivo com `never` no default.
- **Imutabilidade absoluta** — mudança por cópia (`{ ...prev, status: 'X' }`).
- **`import type`** + extensões `.ts` nos imports (NodeNext + verbatimModuleSyntax).
- **PT-BR para domínio** (Contrato, Aditivo, encerrar). **EN para eventos/commands**.

---

## 📋 Status (2026-05-14)

- ✅ Esqueleto criado (`package.json`, `tsconfig.json`, estrutura de pastas)
- ✅ `.claude/` populado (orquestrador + 7 skills + hook + pipeline)
- ⬜ `src/shared/` (Result, Brand, ID) — próximo
- ⬜ Domínio do módulo Contratos
- ⬜ Application + Use Cases
- ⬜ CLI para P.O.
- ⬜ Adapters reais
