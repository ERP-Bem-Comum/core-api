# W0 RED CTR-DOMAIN-STATE-MACHINE-AMENDMENT

Status: completed round 1 / Skill: tdd-strategist / Data: 2026-05-20

## Stats pnpm test

tests 627 / suites 208 / pass 600 / fail 14 / cancelled 0 / skipped 13
Baseline: 608. Delta: +19 testes, +14 fail novos (todos W0).

## Failures novos (14)

amendment.test.ts (9): TypeError Amendment.parsePending is not a function (3x),
parsePendingWithoutDocument is not a function (3x), parsePendingWithDocument is not a function (3x).

amendment.mapper.test.ts (5): AssertionError Expected false got true para
Pending+homologatedAt, Pending+homologatedBy, Homologated+signedDocRef null,
Homologated+homologatedAt null, Homologated+homologatedBy null.

## Arquivos tocados

tests/modules/contracts/domain/amendment/amendment.test.ts (modificado)
  + 9 testes parsePending* (CA2, CA2b, CA2c) -- falham
  + 3 testes discriminador composto (CA1 runtime) -- passam
  + bloco comentado W1-STATIC (CA3 @ts-expect-error)

tests/modules/contracts/adapters/persistence/fixtures.ts (modificado)
  + import 3 subtipos refinados
  + buildPendingAmendmentWithoutDoc, buildPendingAmendmentWithDoc, buildHomologatedAmendmentRefined

tests/modules/contracts/adapters/persistence/amendment.mapper.test.ts (criado, 262 LOC)
  + 3 testes shapes validos (passam)
  + 5 testes shapes impossiveis (falham RED)

src/ -- NAO TOCADO

## Decisoes para W1

1. AmendmentMapperError ganha amendment-mapper-impossible-shape (string literal)
2. Builders fixtures.ts usam as unknown as SubtypeX em W0; casts removidos em W1
3. @ts-expect-error ativadas em W1 apos tipos existirem
4. CA1 runtime passa em W0 (agnostico aos tipos refinados)

## Proximo passo

W1 GREEN: ts-domain-modeler refatora types.ts + amendment.ts + amendment.mapper.ts + use-cases + ativa W1-STATIC
