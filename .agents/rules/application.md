---
paths:
  - 'src/modules/*/application/**/*.ts'
  - 'tests/modules/*/application/**/*.ts'
---

# Regras invariantes — Application

Aplicáveis a tudo sob `src/modules/*/application/`. Application orquestra; não tem regra de negócio nem conhece infra.

- Use cases são **factory functions**: `(deps: Readonly<{...}>) => (input) => Promise<Result<O, E>>`.
- **Ports são `type`**, nunca `interface` com implementação nem `class`. Cada port é um `Readonly<{...}>` de funções.
- Sequência canônica num use case: **validar → fetch → domain → persist → publish event**. Eventos só após o save ter sucesso.
- Sem importar de `adapters/`. Application conhece apenas tipos de port.
- Se um `if` decide estado de negócio, ele está no lugar errado — mover para `domain/`.

## Skill canônica

`ports-and-adapters` para definir ports (Repository, EventBus, Storage, Clock). Ver [`.claude/skills/ports-and-adapters/SKILL.md`](../skills/ports-and-adapters/SKILL.md).
