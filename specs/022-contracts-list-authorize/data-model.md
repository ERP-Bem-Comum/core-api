# Data Model — 022 (contract:read na listagem)

> Esta feature **não introduz schema novo nem altera tabelas**. Incluído para rastreabilidade.

## Entidades

### Permissão de leitura de contratos (`contract:read`)

- **Representa**: capacidade de ler dados de contratos. Já existe no catálogo central e é exigida pelas leituras de detalhe, histórico e exportação.
- **Mudança**: nenhuma na permissão em si — apenas passa a ser **exigida também** pela rota de listagem.

### Listagem de contratos (recurso protegido)

- **Representa**: visão tabular da carteira (número, contraparte, valores, vigência, status), com filtros e paginação.
- **Mudança**: somente o controle de acesso (preHandler). Campos/filtros/paginação inalterados.

## Transições de estado

Nenhuma. A feature é a aplicação de um guard de autorização a uma rota existente.
