# T061 — Citações das decisões-chave (Princípio IX)

> Rastreabilidade das decisões de design da Gestão de Programas a fontes canônicas.
> **Fonte primária:** `specs/008-gestao-programas/research.md` (citações literais ≥4 linhas
> extraídas via MCP `acdg-skills`). Este arquivo consolida os ponteiros para o ticket de polish.

## DDD — Bounded Context / agregado próprio (D1)

**Decisão**: módulo isolado `src/modules/programs/` (`prg_*`), não anexado a Financeiro/Contratos.

- **Eric Evans**, _Domain-Driven Design_, p. 311 (linha 6777) — referências externas só à raiz do
  agregado (sustenta "outros módulos só conhecem `ProgramaID`"). → `research.md:14-17`.
- **Vaughn Vernon**, _Implementing Domain-Driven Design_, p. 450 (linha 8985) — "Model True
  Invariants in Consistency Boundaries"; o agregado se descobre pelas invariantes verdadeiras
  (sigla única, transições de status), próprias de Programa. → `research.md:19-24`.

## Modelagem relacional — identidade dupla (D2)

**Decisão**: `id` UUID v4 (PK de domínio) + `program_number` sequencial `UNIQUE NOT NULL`.

- **Ramakrishnan & Gehrke**, _Sistemas de Gerenciamento de Banco de Dados_, 3ª ed., p. 73
  (linha 1959) — `UNIQUE` declara chave candidata; no máximo uma vira `PRIMARY KEY`. `id` é a PK;
  `program_number` é chave candidata. → `research.md:37-41`.

## TDD — estratégia de testes por camadas (D5)

**Decisão**: TDD fail-first (W0 RED) nas camadas do projeto (domínio → use case → HTTP → persistência → E2E Bruno).

- **Kent Beck**, _TDD: Desenvolvimento Guiado por Testes_, p. 23 (linha 500) — ciclo canônico
  (escreva o teste → faça rodar → faça direito); a API é desenhada pelo teste antes da
  implementação. → `research.md:87-94`.

## Decisões de apoio (ancoradas em ADR/handbook, sem citação de livro)

| # | Decisão | Fonte |
| --- | --- | --- |
| D3 | `program_number` via `MAX+1` sob `SELECT … FOR UPDATE` | MySQL Refman §17.7.4 · ADR-0020 · `research.md:49-59` |
| D4 | Optimistic-lock por coluna `version` | SC-005/FR-016 · `research.md:63-73` |
| D6 | Máquina de estados `ProgramStatus` (`CHECK`, sem ENUM) | ADR-0020 · `research.md:98-100` |
| D7 | Logo em object storage (`logo_key`) | ADR-0019 · `research.md:106` |
| D8 | Permissões `program:read/write/deactivate` fixas em código | ADR-0024 · `research.md:114` |

**Conclusão (T061)**: o DoD do `quickstart.md` ("citações das decisões-chave registradas —
Princípio IX") fica satisfeito. As três decisões-chave (DDD, DB, TDD) carregam citação literal
verificável na fonte `research.md`; as de apoio ancoram em ADR/handbook.
