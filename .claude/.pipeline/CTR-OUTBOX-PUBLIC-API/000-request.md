# 000 — Request CTR-OUTBOX-PUBLIC-API

> **Ticket #7/7 da série Outbox (ÚLTIMO). Size: S.** Cria `src/modules/contracts/public-api/events.ts` — contrato público para outros módulos consumirem eventos do módulo Contratos via outbox.
> Depende de **todos os 6 tickets anteriores** ✅.
> 24º ticket consecutivo do protocolo **Opção B**.

## Justificativa

ADR-0006 §"Modular monolith — Public API por módulo" exige que módulos só importem de `<module>/public-api/` de outros módulos — nunca de `<module>/domain/` ou `<module>/application/` privados. Hoje `src/modules/contracts/public-api/` **não existe** — bloqueia o módulo Financeiro futuro de consumir eventos `ContractStateUpdated` ou `AmendmentHomologated`.

`OUTBOX_SCHEMA_VERSION = 1` (do #2) versiona o wire format. Decoder versionado `decodeContractsModuleEventV1(json)` permite que consumers tratem rows da outbox sem reinventar o mapper.

## Escopo

### 1. `src/modules/contracts/public-api/events.ts` — contrato público

```ts
// PUBLIC API — único ponto de entrada para outros módulos consumirem
// eventos do módulo Contratos. Re-exporta types do domain como interface estável.
//
// **NÃO** importe de '../domain/' nem '../application/' a partir de outros módulos.
// **USE APENAS** este arquivo.
//
// Schema version: 1
//   Adicionar variante NUNCA quebra v1 (consumers fazem switch exaustivo).
//   Remover/renomear variante exige bump para v2 + decoder v2 mantido.

import type { ContractEvent } from '../domain/contract/events.ts';
import type { AmendmentEvent } from '../domain/amendment/events.ts';
import { type Result, ok, err } from '../../../../shared/result.ts';
import { outboxRowToEvent, type OutboxMapperError } from '../adapters/persistence/mappers/outbox.mapper.ts';
import type { OutboxRow } from '../adapters/persistence/mappers/outbox.mapper.ts';

/** Schema version corrente do wire format da outbox. Bumped em breaking changes. */
export const CONTRACTS_SCHEMA_VERSION = 1 as const;

/** Union estável de eventos públicos do módulo Contratos. */
export type ContractsModuleEvent = ContractEvent | AmendmentEvent;

/** Type guard para borda externa (e.g., webhook listener, http handler). */
export const isContractsModuleEvent = (u: unknown): u is ContractsModuleEvent => {
  if (typeof u !== 'object' || u === null) return false;
  const candidate = u as { type?: unknown };
  if (typeof candidate.type !== 'string') return false;
  return KNOWN_EVENT_TYPES.has(candidate.type);
};

const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set([
  'ContractCreated',
  'ContractStateUpdated',
  'ContractEnded',
  'AmendmentCreated',
  'AmendmentDocumentAttached',
  'AmendmentHomologated',
]);

/** Decoder versionado v1 — desserializa OutboxRow para ContractsModuleEvent. */
export type DecoderError =
  | DecoderInvalidShape
  | DecoderSchemaVersionMismatch
  | DecoderInvalidPayload;

export type DecoderInvalidShape = Readonly<{
  tag: 'DecoderInvalidShape'; reason: string;
}>;
export type DecoderSchemaVersionMismatch = Readonly<{
  tag: 'DecoderSchemaVersionMismatch'; expected: number; actual: number;
}>;
export type DecoderInvalidPayload = Readonly<{
  tag: 'DecoderInvalidPayload'; mapperError: OutboxMapperError;
}>;

// Case constructors (Padrão D)
export const decoderInvalidShape = (reason: string): DecoderInvalidShape => ({
  tag: 'DecoderInvalidShape', reason,
});
export const decoderSchemaVersionMismatch = (expected: number, actual: number): DecoderSchemaVersionMismatch => ({
  tag: 'DecoderSchemaVersionMismatch', expected, actual,
});
export const decoderInvalidPayload = (mapperError: OutboxMapperError): DecoderInvalidPayload => ({
  tag: 'DecoderInvalidPayload', mapperError,
});

/**
 * Decoder versionado v1 — recebe uma `OutboxRow` (lida da tabela `ctr_outbox`)
 * e retorna o `ContractsModuleEvent` reidratado.
 *
 * Consumers que persistem rows via worker delivery passam o row aqui para
 * reidratar o evento com tipos do domain (Money, Period, etc.).
 */
export const decodeContractsModuleEventV1 = (
  row: OutboxRow,
): Result<ContractsModuleEvent, DecoderError> => {
  if (row.schemaVersion !== CONTRACTS_SCHEMA_VERSION) {
    return err(decoderSchemaVersionMismatch(CONTRACTS_SCHEMA_VERSION, row.schemaVersion));
  }
  const mapped = outboxRowToEvent(row);
  if (!mapped.ok) return err(decoderInvalidPayload(mapped.error));
  return ok(mapped.value);
};

// Re-export do tipo OutboxRow para o consumer (não precisa importar de adapters/)
export type { OutboxRow } from '../adapters/persistence/mappers/outbox.mapper.ts';
```

### 2. `src/modules/contracts/public-api/index.ts` — barrel

```ts
// Public API do módulo Contratos.
// Outros módulos (ex: Financeiro futuro) importam APENAS daqui.

export {
  CONTRACTS_SCHEMA_VERSION,
  isContractsModuleEvent,
  decodeContractsModuleEventV1,
  decoderInvalidShape,
  decoderSchemaVersionMismatch,
  decoderInvalidPayload,
} from './events.ts';

export type {
  ContractsModuleEvent,
  DecoderError,
  DecoderInvalidShape,
  DecoderSchemaVersionMismatch,
  DecoderInvalidPayload,
  OutboxRow,
} from './events.ts';
```

### 3. Tests

```
tests/modules/contracts/public-api/events.test.ts
```

Cenários:
- **CA-T1:** `CONTRACTS_SCHEMA_VERSION === 1`.
- **CA-T2:** `isContractsModuleEvent({type: 'ContractCreated', ...})` → true.
- **CA-T3:** `isContractsModuleEvent({type: 'UnknownEvent'})` → false.
- **CA-T4:** `isContractsModuleEvent(null)` / `'string'` / `42` → false.
- **CA-T5:** `decodeContractsModuleEventV1(row v1)` → ok com event hidratado.
- **CA-T6:** `decodeContractsModuleEventV1(row v2)` → err(`DecoderSchemaVersionMismatch`).
- **CA-T7:** `decodeContractsModuleEventV1(row com payload corrupto)` → err(`DecoderInvalidPayload`).
- **CA-T8:** Type-level — `ContractsModuleEvent` cobre os 6 event types (smoke compile-time).

### 4. Documentação operacional

Atualizar `CLAUDE.md` — adicionar ao §"Mapa de camadas do módulo Contracts":

```
public-api/                # contrato público para outros módulos (ADR-0006)
├── events.ts              # ContractsModuleEvent + decoder versionado
└── index.ts               # barrel — único ponto de import externo
```

E mencionar em §"Anti-padrões":
- "Importar de `<module>/domain/` ou `<module>/application/` a partir de outro módulo — usar `<module>/public-api/`."

## Critérios de aceitação

- **CA1** — `src/modules/contracts/public-api/events.ts` existe e exporta `CONTRACTS_SCHEMA_VERSION`, `ContractsModuleEvent`, `isContractsModuleEvent`, `decodeContractsModuleEventV1`, `DecoderError` (+ 3 tagged variants + 3 constructors).
- **CA2** — `src/modules/contracts/public-api/index.ts` (barrel) re-exporta tudo.
- **CA3** — `isContractsModuleEvent` rejeita non-objects, objects sem `type`, e types desconhecidos.
- **CA4** — `decodeContractsModuleEventV1` detecta version mismatch + payload inválido com tagged errors.
- **CA5** — 8 tests cobrindo CA-T1..T8.
- **CA6** — `CLAUDE.md` atualizado com `public-api/` no mapa de camadas + anti-pattern de import privado.
- **CA7** — Gates verdes (typecheck/test/test:integration/lint/format).
- **CA8** — Padrão D mantido (tagged errors + case constructors).

## Não-objetivos

- Decoder v2 (não precisa enquanto schema v1 não evoluir).
- Adapter de consumer real (módulo Financeiro futuro).
- Documentação operacional de consumer integration → handbook futuro.

## Risco / pontos de atenção

1. **Ciclo de import:** public-api importa de adapters/persistence/mappers (para `outboxRowToEvent`). Verificar que isso não cria ciclo (mappers não importa de public-api).
2. **Re-export de `OutboxRow`:** consumer precisa do tipo para passar para `decodeContractsModuleEventV1`. Re-exportar via `public-api/events.ts` evita import direto de adapters.
3. **Mitigação Bug #47936** — ticket pequeno, deve fechar em poucos tool uses.
