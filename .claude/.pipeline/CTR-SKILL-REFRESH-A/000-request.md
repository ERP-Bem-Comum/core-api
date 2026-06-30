# 000 — Request CTR-SKILL-REFRESH-A

> **Bloco A — Documental.** §3.A (Agregados Não-Brandados + updateAggregate helper) na SKILL.md. `src/`/`tests/` intocados.
> 15º ticket Opção B.

## Contagem após promoções para §3.B

Bloco A original tinha 5 DO + 4 DON'T + 1 CONSIDER. **3 itens foram promovidos para §3.B em SKILL-REFRESH-B** (decisão editorial documentada lá):
- Promovidos para §3.B: DO §2 (cast no smart constructor), DO §5 (Adapter via smart constructors), DON'T §3 (validação booleana vs parse).

Restantes para §3.A:
- **DO (3)**: §1 (Brand em VOs folha), §3 (`unique symbol` quando ergonomia importa), §4 (`updateAggregate(prev, patch)` helper).
- **DON'T (3)**: §1 (Brandar agregados), §2 (`as unknown as T` em negócio), §4 (Mapper shotgun parsing — literal direto sem smart constructor).
- **CONSIDER (1)**: §1 (Zod/Effect Schema na borda, não no domínio).

## Estado-alvo — §3.A logo antes de §3.B

### Sub-seções (6)

1. **§3.A.1 — Brand em VOs Folha, Não em Agregados** — DO §1 + DON'T §1. Por que: agregados têm identidade nominal pela forma + `id: ContractId` (que é branded). Brand na casca força `as unknown as Contract` em transições.
2. **§3.A.2 — `as unknown as T` Proibido em Código de Negócio** — DON'T §2. Cross-ref §3.B (cast único auditado no smart constructor é a EXCEÇÃO).
3. **§3.A.3 — Helper `updateAggregate(prev, patch)`** — DO §4. `Partial<Omit<Aggregate, ContractImmutableField>>`. Cross-ref §3.D para state machine: helper preserva subtipo refinado.
4. **§3.A.4 — Mappers via Smart Constructors** — DON'T §4 (shotgun parsing). Cross-ref §3.B.4 (smart constructor é único ponto de cast) + ticket vivo `CTR-DOMAIN-MAPPER-RESULT`.
5. **§3.A.5 — Zod na Borda, Não no Domínio** — CONSIDER §1. Zod vive em `application/` ou `adapters/` adaptando input externo.
6. **§3.A.6 — Tabela canônica** + **§3.A.7 — Tickets vivos**: `CTR-DOMAIN-DEBRAND-AGG`, `CTR-DOMAIN-MAPPER-RESULT`.

## Strings âncoras

- `## §3.A`
- `**DO (3)**`, `**DON'T (3)**`, `**CONSIDER (1)**`
- `Brand em VOs folha`, `Brandar agregados`, `as unknown as`
- `updateAggregate`, `updateContract` ou `updateAmendment`
- `Zod` na borda
- `shotgun parsing`
- Tickets: `CTR-DOMAIN-DEBRAND-AGG`, `CTR-DOMAIN-MAPPER-RESULT`

## CAs

- **CA1** §3.A existe.
- **CA2** 6 sub-seções.
- **CA3** `**DO (3)** + **DON'T (3)** + **CONSIDER (1)**`.
- **CA4** Strings: `Brand`, `VOs folha`, `as unknown as`, `updateAggregate`, `shotgun parsing`, `Zod`.
- **CA5** Cross-refs §3.B e §3.D mencionadas.
- **CA6** 2 tickets vivos referenciados.
- **CA7** `src/`/`tests/` intocados; gates verdes (643/630/0).
- **CA8** Doc fiel ao código vivo: `updateContract`/`updateAmendment` (genéricos `<T extends Contract>`).

## Pipeline (4 waves padrão).
