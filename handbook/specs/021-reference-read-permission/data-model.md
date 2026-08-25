# Data Model — 021 (reference:read no catálogo)

> Esta feature **não introduz schema novo nem altera tabelas**. O "modelo" aqui é o dado in-code do catálogo de permissões. Incluído para rastreabilidade das entidades da spec.

## Entidades

### Permissão (`Permission`)

- **Representa**: uma capacidade nomeada do sistema no formato `resource:action`.
- **Tipo**: branded `Brand<string, 'Permission'>` (`auth/domain/authorization/permission.ts`).
- **Regra de validação**: `PERMISSION_REGEX` — exatamente dois segmentos kebab alfanuméricos separados por `:`. `reference:read` é válido (passa em `Permission.parse`).
- **Instância desta feature**: `reference:read` — "ler dados de referência financeira".

### Catálogo de Permissões (`PermissionCatalog`)

- **Representa**: conjunto fixo, deploy-time e imutável em runtime, de todas as permissões reconhecidas (`CATALOG_RAW` → `PermissionCatalog.all`).
- **Consumidores**:
  - `listPermissionsCatalog` (US2 da 005 — catálogo completo).
  - `Role.setPermissions` (valida cada permissão ⊆ catálogo).
  - seed de `auth_permission` (deriva de `.all`).
  - `adminDevPermissions` (= `.all`, dev-seed do admin).
- **Mudança**: + uma entrada `'reference:read'`. Sem mudança estrutural — só o conteúdo do array.
- **Invariante de integridade**: o teste de "conjunto exato conhecido" enumera o catálogo esperado; adicionar uma permissão exige atualizar esse conjunto (caso contrário o gate reprova — é o mecanismo que evita drift por typo).

### Role / Perfil de acesso

- **Representa**: agrupamento de permissões atribuído a usuários (runtime).
- **Relação com esta feature**: uma vez que `reference:read` está no catálogo, qualquer role pode recebê-la via `setPermissions` (antes era rejeitada). O perfil "completo" (admin/dev-seed) a recebe automaticamente via `.all`.
- **Sem pré-concessão em código** (FR-008): nenhuma role de negócio nova; grants em runtime.

### Dados de referência financeira (recurso protegido)

- **Representa**: Categoria, Centro de Custo, Programa — listas de apoio à categorização (feature 020).
- **Relação**: recurso lido pelos 3 endpoints que exigem `reference:read`. Sem alteração nesta feature.

## Transições de estado

Nenhuma. A feature não tem ciclo de vida de agregado; é registro de uma constante no catálogo.
