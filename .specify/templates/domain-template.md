# Modelo de Domínio: [FEATURE]

**Feature**: `specs/[###-feature-name]/` · **Consultor**: `/acdg-skills:ddd-architect`

> Fase 2 da pipeline `core-api-sdd` (máximo rigor). Cada decisão de fronteira/agregado
> exige **citação canônica ≥4 linhas** (Evans/Vernon) via `skills_citar` — princípio IX.

## Bounded Contexts afetados

- [ ] Contratos (`ctr_*`) · [ ] Financeiro (`fin_*`) · [ ] Auth (`auth_*`) · [ ] Parceiros (`partners_*`)

**Justificativa das fronteiras** (citação obrigatória):
> [trecho literal ≥4 linhas — `skills_citar`]
> — *(Linha NNNN, p. PP, AUTOR, *LIVRO*)*

## Linguagem ubíqua

| Termo (PT) | Significado | Tipo no código (EN) |
|---|---|---|
| [termo] | [definição do negócio] | [VO/Entity/Event] |

## Agregados e Value Objects

### [Agregado X]
- **Raiz**: [...] · **Invariantes**: [...]
- **Value Objects**: [branded types + smart constructor `Result<T,E>`]
- **Justificativa do boundary do agregado** (citação obrigatória):
  > [trecho literal ≥4 linhas]
  > — *(Linha NNNN, p. PP, AUTOR, *LIVRO*)*

## Eventos de domínio (outbox)

| Evento (EN-passado) | Quando ocorre | Payload | Consumidor(es) cross-BC |
|---|---|---|---|
| `[NomeEvento]` | [...] | [...] | [BC ou N/A] |

## Mapa de contexto

[Relações entre BCs (upstream/downstream, ACL, shared kernel). Cross-BC só via `public-api`
+ outbox — ADR-0006/0015.]
