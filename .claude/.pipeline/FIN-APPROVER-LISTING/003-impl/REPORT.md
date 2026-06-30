# W1 GREEN

Skill: pipeline-maestro. Port `UserQuery.listByPermission` + in-memory (listPermissions) + drizzle (join 4 tabelas via handle.schema) + composition expõe `listUsersByPermission` + plugin separado `approversHttpPlugin` (GET /api/v1/approvers, gate user:list) + public-api + server. Stub de UserQuery em list-users.test corrigido. typecheck/lint/format verdes; auth 560/560; approvers 3/3.
