# Module Isolation Rules — Modular Monolith

> 📖 **Fontes:**
>
> - [ADR-0006](../../../../../handbook/architecture/adr/0006-modular-monolith-core-api.md) — Modular Monolith core-api.
> - [ADR-0014](../../../../../handbook/architecture/adr/0014-mysql-database-isolation.md) — Database isolation.
> - [ADR-0015](../../../../../handbook/architecture/adr/0015-mysql-outbox-pattern.md) — Outbox pattern.
> - Simon Brown — _Software Architecture for Developers_, capítulo sobre Modular Monoliths.
> - Sempre [`handbook/reference/typescript/`](../../../../../handbook/reference/typescript/) para sintaxe TS.

---

## 1. As 5 leis

### Lei 1 — Domínio puro

> O `domain/` de um módulo importa **APENAS** de `shared/` e `shared-kernel/`. Nunca de outro módulo, nunca de `application/`, nunca de `adapters/`.

Motivação: domínio é estável; deve ser testável sem subir nada. Se algum dia extrair o módulo para serviço próprio, `domain/` continua sem mudança.

### Lei 2 — Application owns the orchestration

> Use cases vivem em `application/`. Eles importam:
>
> - O próprio `domain/`
> - `application/ports/` próprio
> - `contracts/` de outros módulos (somente para tipar consumo de eventos)

Application **não** importa adapters — define apenas o tipo do port.

### Lei 3 — Adapters são plug-ins

> Adapters implementam Ports da própria application. Podem importar libs externas (mysql2, drizzle, etc.) que **estão proibidas no domain/application**.

Cada port tem **pelo menos 2 adapters**: real (para prod) e InMemory (para testes + CLI da P.O.).

### Lei 4 — Cross-module via contracts/ + eventos

> Quando o módulo Y precisa reagir a algo do módulo X:
>
> 1. X publica `XEvento` via `EventBus.publish` (que grava no outbox).
> 2. Y declara o tipo via `import type { XEvento } from 'modules/X/contracts/'`.
> 3. Y tem um handler/consumer que escuta o outbox-relay e chama use case próprio.

Y **nunca** chama repo de X. Y **nunca** lê tabela de X.

### Lei 5 — Database por módulo

> Tabelas têm prefixo `ctr_*` para Contratos e `fin_*` para Financeiro ([ADR-0014](../../../../../handbook/architecture/adr/0014-mysql-database-isolation.md) §1.1). O usuário de banco `core_app` tem GRANT em ambos schemas, mas a aplicação respeita a fronteira por contrato.

Mesmo no mesmo processo, **`modules/financeiro/adapters/*.ts` nunca toca tabela `ctr_*`**.

---

## 2. O que vai em `shared/` vs. `shared-kernel/`

| `shared/`                                                                        | `shared-kernel/`                                                 |
| :------------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| Mecanismos técnicos: Result, Brand, ID, ports cross-cutting (Clock, IdGenerator) | Tipos de domínio compartilhados estáveis: CNPJ, CPF, Email, IBGE |
| Pode evoluir conforme infra muda                                                 | Estável — mudar exige migração ampla                             |
| Não tem regra de negócio                                                         | Tem regra de validação universal (CNPJ tem DV calculável)        |

> Diretriz: comece movendo para `shared-kernel/` **só quando 2+ módulos genuinamente precisam**. Premature shared = acoplamento.

---

## 3. O que vai em `modules/<X>/contracts/`

```
modules/contratos/contracts/
├── index.ts              # barrel
├── eventos.ts            # ContratoEvento (subset PÚBLICO da discriminated union interna)
├── commands.ts           # ContratoCommand (se módulo aceita inbox)
├── vo-public.ts          # VOs que aparecem nos eventos (Moeda, Periodo) — se forem reusáveis
└── schema.ts             # Validators (zod ou puros) que outros módulos podem usar para deserializar eventos
```

Regras:

- **Apenas tipos e validators.** Sem regra de negócio.
- **Cópia diluída de tipos internos.** Se internamente tem 15 campos, externamente publica apenas os 5 relevantes.
- **Versionado por arquivo.** Adicionar evento novo = arquivo novo (`eventos-v2.ts`?) ou versionar o `type` field (`type: 'ContratoMaeCriado.v2'`).
- **Quebra de contrato = mudança coordenada.** Se mudar shape, atualiza todos os consumidores. Em monolito, é refactor; em microserviço futuro, é coordenação de release.

---

## 4. Padrão de teste de fronteira

```ts
// tests/architecture/module-boundaries.test.ts
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

test('domain/ não importa de outro módulo', () => {
  const files = globSync('src/modules/*/domain/**/*.ts');
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const otherModuleImport = /from\s+['"].*modules\/(?!contratos)[^/]+\//;
    // ... assert: nenhum import de outro módulo
  }
});

test('application/ só importa contracts/ de outros módulos', () => {
  /* ... */
});
```

Esses testes ficam **fora** dos módulos, em `tests/architecture/`. Validam estrutura sem rodar negócio.

---

## 5. Quando extrair módulo para serviço

Sinais de que está na hora de cortar:

1. **Deploy independente é necessário** — Financeiro precisa ser deployado mais rápido que Contratos.
2. **Equipes separadas trabalham nele.**
3. **Escalabilidade diferenciada** — Financeiro recebe 100x mais eventos que Contratos.
4. **Tecnologia diferente** — Financeiro precisa de Rust por latência; Contratos continua TS.

Quando cortar:

- **`contracts/`** vira contrato HTTP/gRPC entre serviços. Tudo o resto vira opaco.
- **`outbox` continua sendo o canal.** Agora atravessa rede em vez de mesmo processo.
- **Banco se divide:** `core.ctr_*` vai para o serviço Contratos; `core.fin_*` para o Financeiro.
- **Nenhum import direto precisa mudar** — porque já era pra ter sido `contracts/` só.

Se você fez tudo certo no monolito, a extração leva 1 sprint. Se misturou, leva 1 quarter.

---

## 6. Anti-padrões

| ❌ Errado                                                                   | ✅ Certo                                                              |
| :-------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| `import { Contrato } from '../../contratos/domain/...'` em Financeiro       | `import type { ContratoEvento } from '../../contratos/contracts/...'` |
| `core.contratos_e_financeiro_resumo` (tabela compartilhada)                 | Cada módulo tem projeção própria; sincroniza via evento               |
| Helper compartilhado no `modules/contratos/utils/` consumido por Financeiro | Sobe para `shared/` ou `shared-kernel/`                               |
| Outbox dispatcher conhecendo schema de cada módulo                          | Outbox transporta evento opaco; consumer faz o cast                   |
| `modules/X/index.ts` exportando domain inteiro                              | Exporta só `contracts/`                                               |
| Cross-module call "só uma vezinha"                                          | Não há "só uma vezinha" — vira hábito; faça evento                    |

---

## 7. Glossário

| Termo                 | Definição                                                                                                                                     |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| Bounded Context       | Fronteira semântica do modelo de domínio; vira módulo                                                                                         |
| Modular Monolith      | Múltiplos BCs no mesmo deploy, com fronteiras estritas                                                                                        |
| Contracts (pasta)     | API pública do módulo — eventos, commands, validators                                                                                         |
| Shared Kernel         | Tipos de domínio compartilhados estáveis (CNPJ, CPF)                                                                                          |
| Outbox Pattern        | Tabela transacional que vira fonte de eventos publicáveis ([ADR-0015](../../../../../handbook/architecture/adr/0015-mysql-outbox-pattern.md)) |
| Anti-Corruption Layer | Adapter que isola modelo novo de modelo legado                                                                                                |
