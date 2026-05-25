# 000 — Request CTR-SKILL-REFRESH-H

> **Bloco H — Documental.** §3.H (Organização de Módulo + árvore canônica) na SKILL.md. `src/`/`tests/` intocados.
> 14º ticket Opção B.

## Discrepâncias documentadas

- L973: declara **10 DO + 6 DON'T + 2 CONSIDER**. Contagem real `(H)` na entrevista: **6 + 6 + 2** (DO §33-§38, DON'T §31-§36, CONSIDER §13-§14). Usar 6+6+2 reais (mesma decisão do SKILL-REFRESH-C que documentou divergência semelhante).
- **`CTR-DOMAIN-RESTRUCTURE` NÃO está fechado** (Bloco H — promover Money/Period/UserRef para `src/shared/kernel/`; mover Repository de `application/ports/` para `domain/<agg>/`; mover BucketName/StorageKey para `application/ports/document-storage.types.ts`). A árvore canônica da §3.H reflete o **estado-alvo** pós-RESTRUCTURE — sinalizar isso explicitamente.

## Estado-alvo — §3.H logo após §3.D (cronologia da SKILL.md atual: B → I → D → C; após este ticket: B → I → D → C → H)

### Sub-seções (8)

1. **§3.H.1 — Granularidade Canônica do Agregado** — 4-6 arquivos por agregado: `types.ts`, `errors.ts`, `events.ts`, `<aggregate>.ts`, `repository.ts`, `index.ts` (barrel `import * as Contract`). DO §33.
2. **§3.H.2 — Critério H2: Repository — Domain vs Application** — Port ditado por invariância/ciclo-de-vida → `domain/<aggregate>/repository.ts`. Caso contrário → `application/ports/`. DO §34; CONSIDER §14 (port ambíguo: "se eu trocar o agregado por outro, faz sentido?").
3. **§3.H.3 — Tipos de Port Moram Junto** — `BucketName`/`StorageKey` em `application/ports/document-storage.types.ts`, não em `domain/shared/`. DO §35; DON'T §34.
4. **§3.H.4 — Shared Kernel vs BC-specific** — `src/shared/kernel/` para VOs cross-BC (`Money`, `Period`, `UserRef`). `src/modules/<bc>/domain/shared/` para específicos (`ContractId`, `NonZeroMoney`). DO §36+§37; DON'T §36.
5. **§3.H.5 — `public-api/` por Módulo** — cada módulo dono dos eventos que emite (ADR-0006). Sem `src/shared/events/` global. DO §38; DON'T §35.
6. **§3.H.6 — Árvore canônica (estado-alvo pós-RESTRUCTURE)** — diagram ASCII do layout. **Nota:** parte reflete estado-alvo; código atual ainda tem Repository em `application/ports/` (será movido em `CTR-DOMAIN-RESTRUCTURE`).
7. **§3.H.7 — Tabela canônica**: `**DO (6)**`, `**DON'T (6)**`, `**CONSIDER (2)**`.
8. **§3.H.8 — Tickets vivos**: `CTR-AGG-CONTRACT`, `CTR-AGG-AMENDMENT`, `CTR-STORAGE-PORT`, `CTR-DOMAIN-RESTRUCTURE` (pendente).

## Strings âncoras

- `## §3.H`
- `**DO (6)**`, `**DON'T (6)**`, `**CONSIDER (2)**`
- `Shared Kernel`, `src/shared/kernel/`, `src/modules/<bc>/domain/shared/`
- `public-api/`
- `4-6 arquivos`, `repository.ts`, `events.ts`, `barrel`
- DON'T: `src/shared/events/`, `feature slice`, agregado `600+ linhas`
- Tickets: `CTR-AGG-CONTRACT`, `CTR-AGG-AMENDMENT`, `CTR-STORAGE-PORT`, `CTR-DOMAIN-RESTRUCTURE`

## CAs

- **CA1** §3.H existe.
- **CA2** 8 sub-seções.
- **CA3** `**DO (6)**` + `**DON'T (6)**` + `**CONSIDER (2)**`.
- **CA4** Strings `Shared Kernel`, `src/shared/kernel/`, `public-api/`.
- **CA5** Árvore canônica ASCII presente.
- **CA6** Critério H2 (domain vs application port) explicitado.
- **CA7** 4 tickets vivos referenciados (incluindo RESTRUCTURE marcado como pendente).
- **CA8** `src/`/`tests/` intocados; gates verdes (643/630/0).
- **CA9** Nota sobre RESTRUCTURE pendente — árvore reflete estado-alvo.

## Pipeline (4 waves padrão SKILL-REFRESH).
