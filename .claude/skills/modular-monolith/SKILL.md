---
name: modular-monolith
description: >
  Define fronteiras entre módulos (Bounded Contexts) dentro do core-api e regras de
  comunicação cross-módulo via eventos. Garante que módulos possam ser extraídos como
  serviços independentes no futuro sem refactor traumático.
---

# Modular Monolith

## Persona

Você é o **guardião das fronteiras entre módulos** do core-api. Sua função é garantir:

1. **Módulos não importam uns dos outros**, exceto por contratos públicos compartilhados.
2. **Comunicação cross-módulo é por evento (outbox)**, nunca chamada direta.
3. **Cada módulo é dono dos próprios dados** (`ctr_*` apenas Contratos; `fin_*` apenas Financeiro).
4. **Refactor para microserviços** seja uma decisão futura sem retrabalho — basta cortar pelo eixo já estabelecido.

> **Fronteira:** opina sobre estrutura de pastas, `import` policy, contratos públicos. Não edita lógica de negócio — isso é [`ts-domain-modeler`](../ts-domain-modeler/SKILL.md).

---

## Source of Truth

- [ADR-0006 — Modular Monolith core-api](../../../../handbook/architecture/adr/0006-modular-monolith-core-api.md) — decisão de monolito modular.
- [ADR-0014 — MySQL database isolation](../../../../handbook/architecture/adr/0014-mysql-database-isolation.md) — isolamento por database/schema.
- [ADR-0015 — MySQL Outbox Pattern](../../../../handbook/architecture/adr/0015-mysql-outbox-pattern.md) — outbox como única ponte.
- [`handbook/architecture/03-data-architecture.md`](../../../../handbook/architecture/03-data-architecture.md) §1.1 — organização interna do `core` por módulo.
- Sempre [`handbook/reference/typescript/`](../../../../handbook/reference/typescript/) para sintaxe.

Reference local: [`./references/module-isolation-rules.md`](./references/module-isolation-rules.md).

---

## 📚 Referências específicas deste projeto

| Tópico | Onde olhar |
| :--- | :--- |
| Regras transversais (boundary rules, isolamento por pasta) | [`../../../CLAUDE.md`](../../../CLAUDE.md) §"Regras invariantes" |
| Persistência dual-dialect + lista normativa de features SQL | [`ADR-0020`](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) |
| Storage como serviço externo (S3/MinIO) — extensibilidade futura para outros módulos | [`ADR-0019`](../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md) |
| Email como port/adapter (mesmo padrão aplicado a outro recurso externo) | [`ADR-0010`](../../../handbook/architecture/adr/0010-email-port-adapter-pattern.md) |
| Drizzle ORM (organização de schemas por módulo no futuro) | [`handbook/reference/drizzle/`](../../../handbook/reference/drizzle/) |
| mysql2 driver (quando MySQL real existir) | [`handbook/reference/mysql2/`](../../../handbook/reference/mysql2/) |
| Layout canônico, vivo no repositório | `src/modules/contracts/{domain,application,adapters,worker,public-api}/` |
| Módulo Financeiro (Fase 2 — reservado, ainda não codado) | [`handbook/domain_questions/financeiro/`](../../../handbook/domain_questions/financeiro/) |
| BCs do módulo Contratos com fronteiras nominadas | [`handbook/domain_questions/contratos/02-context-map.md`](../../../handbook/domain_questions/contratos/02-context-map.md) |
| Fluxo de eventos cross-módulo (matriz P/C) | [`handbook/domain_questions/contratos/06-event-flow.md`](../../../handbook/domain_questions/contratos/06-event-flow.md) |

---

## Layout canônico

```
src/
├── shared/                   # Cross-cutting puro — Result, Brand, ID, ports compartilhados (Clock, etc.)
│   ├── result.ts
│   ├── brand.ts
│   ├── id.ts
│   └── ports/
│       ├── clock.ts
│       └── id-generator.ts
├── modules/
│   ├── contracts/            # Bounded Context "Gestão de Contratos"
│   │   ├── domain/           # TS puro
│   │   ├── application/      # Use cases + ports
│   │   ├── adapters/         # Implementações (persistence, http, storage, outbox…)
│   │   ├── worker/           # Processamento assíncrono do módulo
│   │   └── public-api/       # 🔵 API PÚBLICA (eventos + commands publicáveis)
│   ├── financial/            # Bounded Context "Financeiro"
│   │   ├── domain/
│   │   ├── application/
│   │   ├── adapters/
│   │   └── public-api/       # API pública
│   └── shared-kernel/        # 🟡 Tipos compartilhados ESTÁVEIS (CNPJ, CPF, IBGE)
│       └── index.ts
└── platform/
    └── outbox/               # Implementação do outbox pattern (compartilhada)
```

---

## Regras de import (não-negociáveis)

```
shared/              ◄────────  modules/<qualquer>/   (módulos podem usar shared)
  ▲
  │
shared-kernel/       ◄────────  modules/<qualquer>/   (módulos podem usar shared-kernel)

modules/<X>/public-api/  ◄────  modules/<Y>/application/  (Y pode escutar eventos de X)

modules/<X>/domain/     ❌    modules/<Y>/...           (X.domain NUNCA vê Y)
modules/<X>/adapters/   ❌    modules/<Y>/...           (idem)
modules/<X>/application/ ❌   modules/<Y>/application/  (idem — comunique via evento)
```

### Tabela de permissões

| De \ Para | `shared/` | `shared-kernel/` | `modules/X/domain/` | `modules/X/application/` | `modules/X/adapters/` | `modules/X/public-api/` | `modules/Y/*` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `shared/` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `shared-kernel/` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `modules/X/domain/` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `modules/X/application/` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (próprio) | ✅ public-api/ |
| `modules/X/adapters/` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (próprio) | ❌ |
| `modules/X/cli/` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (próprio) | ❌ |
| `modules/X/public-api/` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

Resumo:

- **Domain só vê shared + shared-kernel.**
- **Module X pode importar de `modules/Y/public-api/`** (escutar eventos de Y). Tudo o mais de Y é proibido.
- **`public-api/` de um módulo é pura** — só tipos + zod-like validators. Não tem regra de negócio.

---

## `modules/<X>/public-api/` — o que vai ali

A pasta `public-api/` é o que sai do módulo X e pode ser **consumido por outros módulos ou serviços externos** — é a única fronteira que o anti-padrão #3 do `CLAUDE.md` autoriza importar de fora. Inclui:

```ts
// src/modules/contracts/public-api/index.ts

// Eventos publicáveis (cópia somente leitura do tipo interno)
export type { ContratoEvento } from './eventos.ts';

// Commands aceitos (se o módulo expõe inbox)
export type { ContratoCommand } from './commands.ts';

// VOs públicos do módulo, se compartilhados via evento
export type { NumeroSequencialContrato } from './vo-public.ts';
```

> **Por que separar?** No dia em que extrair `modules/contracts/` para um serviço próprio, **só o `public-api/` continua sendo a fronteira**. O resto vira opaco. Quem consumia `public-api/` continua funcionando.

---

## Comunicação cross-módulo

### ❌ Errado: chamada direta

```ts
// src/modules/financial/application/use-cases/criar-conta-a-pagar.ts
import { ContratoRepository } from '../../../contracts/application/ports/contrato-repository.ts'; // ❌ NÃO

const usecase = (deps) => async (cmd) => {
  const contrato = await deps.contratoRepo.findById(cmd.contratoId); // ❌ acoplamento direto
  // ...
};
```

### ✅ Certo: evento

```ts
// modules/contracts/ publica evento via outbox (ADR-0015)
const evento: ContratoEvento = {
  type: 'EstadoContratualAtualizado',
  contratoId: c.id,
  valorVigente: c.valorVigente,
  vigenciaVigente: c.vigenciaVigente,
  ocorridoEm: clock.now(),
};
await eventBus.publish(evento);  // grava no outbox

// modules/financial/ consome o evento (ContratoEvento importado de contracts/public-api/)
import type { ContratoEvento } from '../../contracts/public-api/index.ts';

const handleContratoEvento = (e: ContratoEvento) => {
  switch (e.type) {
    case 'EstadoContratualAtualizado':
      // atualiza projeção local de "saldo de contrato" no DB do Financeiro
      break;
    // ...
  }
};
```

> Financeiro **importa apenas `contracts/public-api/`** — não conhece domínio interno de Contratos.

---

## Database isolation ([ADR-0014](../../../../handbook/architecture/adr/0014-mysql-database-isolation.md))

| Database | Dono | Pode escrever | Pode ler |
| :--- | :--- | :--- | :--- |
| `legacy.*` | `legacy-api` (NestJS legado) | `legacy_app` user | `readonly_bi` |
| `core.ctr_*` | `core-api` módulo Contratos (`contracts`) | `core_app` user | `readonly_bi`, Financeiro **NÃO** |
| `core.fin_*` | `core-api` módulo Financeiro (`financial`) | `core_app` user | `readonly_bi`, Contratos **NÃO** |
| `core.outbox` | `core-api` | `core_app` | (worker de relay) |

A regra é forte: **mesmo no mesmo processo (`core-api`)**, módulos não cruzam fronteira de tabela. Justificativa: ([ADR-0014](../../../../handbook/architecture/adr/0014-mysql-database-isolation.md)) — preservar caminho de extração futura para microserviço.

---

## Checklist de fronteira

Quando um arquivo é criado/movido:

- [ ] Domínio só importa de `shared/` e `shared-kernel/`.
- [ ] Application só importa do próprio módulo + `public-api/` de outros.
- [ ] Adapter pode importar do próprio módulo + lib externa (mysql2, etc.).
- [ ] `public-api/` é pasta isolada — só tipos puros, sem dependência de adapters.
- [ ] Nenhum `import` cruza barreira sem passar por `public-api/`.

---

## Comando para auditar fronteiras

```bash
# Achar imports proibidos cross-módulo
grep -rn "from '.*modules/[^/]*/\(domain\|application\|adapters\)" src/modules/
# Esperado: zero resultados — tudo deveria ir via public-api/
```

Pode virar lint rule no futuro. Por enquanto, code review manual + esse `grep` no CI.

---

## Anti-padrões

| ❌ Errado | ✅ Certo |
| :--- | :--- |
| `modules/financial` importa `modules/contracts/domain/X` | Importa `modules/contracts/public-api/X` (só eventos públicos) |
| Tabela `core.contratos_e_financeiro_compartilhado` | Tabela só de um módulo; outro tem projeção própria via evento |
| Use case de Financeiro chamando repo de Contratos | Financeiro consome evento `EstadoContratualAtualizado` |
| Helper "compartilhado" em `modules/contracts/utils.ts` reutilizado por Financeiro | Movido para `shared/` ou `shared-kernel/` |
| `modules/X/index.ts` reexportando tudo (domain, application, adapters) | Reexporta apenas `public-api/` |
| Outbox controller compartilhado por 2 módulos sabendo schemas internos | Cada módulo publica seu evento; outbox é transporte burro |

---

## Como esta skill se relaciona com outras

```
ts-domain-modeler         (modela tipos puros)
       ▲
       │
modular-monolith          ◄── você está aqui (define onde cada tipo vive)
       │
       ▼
ports-and-adapters        (define como o módulo conversa com fora)
```

---

## Changelog

- **2026-05-14:** Criação.
