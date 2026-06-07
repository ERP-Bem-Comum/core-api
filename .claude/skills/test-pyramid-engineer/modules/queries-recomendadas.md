# Queries Recomendadas (MCP `acdg-skills`)

Toda decisão de camada/double é fundamentada com citação literal. Fluxo: `skills_buscar`
(localiza linha) → `skills_citar` (extrai ≥4 linhas com `verificarTerms` para grounding).

## Atalhos de citação já validados (Vocke)

| Tema                                    | Arquivo                                                  | Linha | `verificarTerms`         |
| --------------------------------------- | -------------------------------------------------------- | ----- | ------------------------ |
| Definição de unit / base da pirâmide    | `shared-references/tdd/practical-test-pyramid--vocke.md` | 171   | `unit subject test`      |
| Integration tests (IO/DB/rede)          | `shared-references/tdd/practical-test-pyramid--vocke.md` | 341   | `integration database`   |
| Evitar duplicação entre camadas         | `shared-references/tdd/practical-test-pyramid--vocke.md` | 1003  | `duplication baggage`    |
| Acceptance test não precisa ser no topo | `shared-references/tdd/practical-test-pyramid--vocke.md` | 953   | `acceptance granularity` |

## Buscas úteis

```
dominio=tdd  →  "solitary sociable unit test doubles mock stub fake spy"
dominio=tdd  →  "what to test public interface trivial getters private methods"
dominio=tdd  →  "deployment pipeline order fast slow tests fail fast"
arquivo=…agile-testing-condensed--gregory-crispin.md  →  "test quadrants automated exploratory"
```

## Cross-ref (comparar escolas — encaminhar ao tdd-theorist se virar debate)

```
skills_cross_ref(conceito="test double", dominios=["tdd","clean-code"])
skills_cross_ref(conceito="test pyramid")
```

> ⚠️ Se o usuário quer **debate de escolas** (pirâmide vs trophy, Detroit vs London), isso é
> `tdd-theorist`. Aqui usamos cross-ref só para sustentar uma decisão de arquitetura concreta.
