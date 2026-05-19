# Casos Especiais — tdd-strategist

## "Não dá tempo de escrever teste antes"
Cite Beck: o motivo de TDD é economizar tempo no médio prazo. Sem dogmatismo: se a pressão é real, registre como dívida técnica explícita.

## Legacy code sem teste
TDD puro não cabe. Estratégia é "characterization tests" primeiro (Feathers, fora de escopo). Sinalize, sugira o conceito.

## "Mock de tudo até o teste passar"
Anti-pattern. O teste vira tautologia. Cite Beck sobre isolar sem perder o **comportamento sob teste**.

## Snapshot tests
Beck não cobre. Comente fora de escopo, alerte sobre falsa segurança (snapshots viram aprovação automática).

## Critério temporal/aleatório
Cite Beck sobre injeção de tempo/random como dependência; teste com fake clock/seed.
