# W1 REPORT — CTR-SKILL-REFRESH-A

> Wave: W1 GREEN | Data: 2026-05-21 | Resultado: 8/8 PASS

## Arquivo modificado

`.claude/skills/ts-domain-modeler/SKILL.md`

## Inserção

Seção §3.A inserida imediatamente antes de §3.B (linha 281 original).

## 6 Sub-seções implementadas

- §3.A.1: Brand em VOs Folha, Nao em Agregados (DO §1 + DON&apos;T §1)
- §3.A.2: as unknown as T Proibido em Codigo de Negocio (DON&apos;T §2) — cross-ref §3.B
- §3.A.3: Helper updateAggregate(prev, patch) (DO §4) — snippets de updateContract/updateAmendment com <T extends Contract/Amendment> — cross-ref §3.D
- §3.A.4: Mappers via Smart Constructors sem Shotgun Parsing (DON&apos;T §4) — cross-ref §3.B.4 + ticket CTR-DOMAIN-MAPPER-RESULT
- §3.A.5: Zod na Borda, Nao no Dominio (CONSIDER §1)
- §3.A.6: Tabela Canonica + §3.A.7: Tickets Vivos

## Verificador

8/8 PASSED — GREEN

## Gates

- pnpm run typecheck: zero erros
- pnpm test: 630/643 pass, 0 fail, 13 skip
