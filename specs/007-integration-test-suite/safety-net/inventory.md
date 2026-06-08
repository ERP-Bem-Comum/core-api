# Inventário de requests .bru (base do mapeamento 1:1 — T003)

> Gerado de api-collections/{auth,contracts,partners}. Total e por módulo abaixo.

## Módulo: auth (94 requests)

| # | request (.bru) | método | rota |
| --- | --- | --- | --- |
| 1 | `1-auth/00-health.bru` | GET | url: {{baseUrl}}/health |
| 2 | `1-auth/01-login-admin.bru` | POST | url: {{baseUrl}}/api/v2/auth/login |
| 3 | `1-auth/02-me-admin.bru` | GET | url: {{baseUrl}}/api/v2/auth/me |
| 4 | `1-auth/03-login-bare.bru` | POST | url: {{baseUrl}}/api/v2/auth/login |
| 5 | `1-auth/04-login-wrong-password.bru` | POST | url: {{baseUrl}}/api/v2/auth/login |
| 6 | `1-auth/05-login-unknown-email.bru` | POST | url: {{baseUrl}}/api/v2/auth/login |
| 7 | `1-auth/folder.bru` | ? | ? |
| 8 | `2-users/10-list-no-token.bru` | GET | url: {{baseUrl}}/api/v1/users |
| 9 | `2-users/11-list-forbidden-bare.bru` | GET | url: {{baseUrl}}/api/v1/users |
| 10 | `2-users/12-list-ok.bru` | GET | url: {{baseUrl}}/api/v1/users?pageSize=5 |
| 11 | `2-users/13-list-pagesize-invalid.bru` | GET | url: {{baseUrl}}/api/v1/users?pageSize=7 |
| 12 | `2-users/14-list-search.bru` | GET | url: {{baseUrl}}/api/v1/users?search=amanda&pageSize=10 |
| 13 | `2-users/15-list-filter-status.bru` | GET | url: {{baseUrl}}/api/v1/users?status=active&pageSize=10 |
| 14 | `2-users/16-list-status-invalid.bru` | GET | url: {{baseUrl}}/api/v1/users?status=xpto |
| 15 | `2-users/17-list-search-too-long.bru` | GET | url: {{baseUrl}}/api/v1/users?search=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
| 16 | `2-users/20-create-no-token.bru` | POST | url: {{baseUrl}}/api/v1/users |
| 17 | `2-users/21-create-forbidden-bare.bru` | POST | url: {{baseUrl}}/api/v1/users |
| 18 | `2-users/22-create-ok.bru` | POST | url: {{baseUrl}}/api/v1/users |
| 19 | `2-users/23-create-dup-email.bru` | POST | url: {{baseUrl}}/api/v1/users |
| 20 | `2-users/24-create-invalid-cpf.bru` | POST | url: {{baseUrl}}/api/v1/users |
| 21 | `2-users/25-create-invalid-email.bru` | POST | url: {{baseUrl}}/api/v1/users |
| 22 | `2-users/26-create-empty-body.bru` | POST | url: {{baseUrl}}/api/v1/users |
| 23 | `2-users/30-detail-ok.bru` | GET | url: {{baseUrl}}/api/v1/users/{{userId}} |
| 24 | `2-users/31-detail-not-found.bru` | GET | url: {{baseUrl}}/api/v1/users/00000000-0000-4000-8000-000000000000 |
| 25 | `2-users/32-detail-forbidden-bare.bru` | GET | url: {{baseUrl}}/api/v1/users/{{userId}} |
| 26 | `2-users/40-update-ok.bru` | PUT | url: {{baseUrl}}/api/v1/users/{{userId}} |
| 27 | `2-users/41-update-conflict-email.bru` | PUT | url: {{baseUrl}}/api/v1/users/{{userId}} |
| 28 | `2-users/42-update-invalid-cpf.bru` | PUT | url: {{baseUrl}}/api/v1/users/{{userId}} |
| 29 | `2-users/43-update-not-found.bru` | PUT | url: {{baseUrl}}/api/v1/users/00000000-0000-4000-8000-000000000000 |
| 30 | `2-users/50-deactivate-ok.bru` | PATCH | url: {{baseUrl}}/api/v1/users/{{userId}}/deactivate |
| 31 | `2-users/51-deactivate-idempotent.bru` | PATCH | url: {{baseUrl}}/api/v1/users/{{userId}}/deactivate |
| 32 | `2-users/52-activate-ok.bru` | PATCH | url: {{baseUrl}}/api/v1/users/{{userId}}/activate |
| 33 | `2-users/53-deactivate-self.bru` | PATCH | url: {{baseUrl}}/api/v1/users/{{adminId}}/deactivate |
| 34 | `2-users/54-status-not-found.bru` | PATCH | url: {{baseUrl}}/api/v1/users/00000000-0000-4000-8000-000000000000/activate |
| 35 | `2-users/55-deactivate-forbidden-bare.bru` | PATCH | url: {{baseUrl}}/api/v1/users/{{userId}}/deactivate |
| 36 | `2-users/70-photo-upload-ok.bru` | PUT | url: {{baseUrl}}/api/v1/users/{{userId}}/photo?mimeType=image/jpeg |
| 37 | `2-users/71-photo-upload-invalid-mime.bru` | PUT | url: {{baseUrl}}/api/v1/users/{{userId}}/photo?mimeType=application/pdf |
| 38 | `2-users/72-photo-delete-ok.bru` | DELETE | url: {{baseUrl}}/api/v1/users/{{userId}}/photo |
| 39 | `2-users/folder.bru` | ? | ? |
| 40 | `3-security/60-tampered-token.bru` | GET | url: {{baseUrl}}/api/v1/users |
| 41 | `3-security/61-empty-bearer.bru` | GET | url: {{baseUrl}}/api/v1/users |
| 42 | `3-security/62-sql-injection-search.bru` | GET | url: {{baseUrl}}/api/v1/users?search=' |
| 43 | `3-security/63-mass-assignment.bru` | POST | url: {{baseUrl}}/api/v1/users |
| 44 | `3-security/64-create-privilege-escalation.bru` | POST | url: {{baseUrl}}/api/v1/users |
| 45 | `3-security/folder.bru` | ? | ? |
| 46 | `4-me/80-me-get.bru` | GET | url: {{baseUrl}}/api/v1/me |
| 47 | `4-me/81-me-update.bru` | PUT | url: {{baseUrl}}/api/v1/me |
| 48 | `4-me/82-me-password-reset.bru` | POST | url: {{baseUrl}}/api/v1/me/password-reset |
| 49 | `4-me/folder.bru` | ? | ? |
| 50 | `5-permissions/90-catalog-ok.bru` | GET | url: {{baseUrl}}/api/v1/permissions |
| 51 | `5-permissions/91-catalog-no-token.bru` | GET | url: {{baseUrl}}/api/v1/permissions |
| 52 | `5-permissions/92-catalog-forbidden-bare.bru` | GET | url: {{baseUrl}}/api/v1/permissions |
| 53 | `5-permissions/93-catalog-post-readonly.bru` | POST | url: {{baseUrl}}/api/v1/permissions |
| 54 | `5-permissions/94-me-capture-admin-id.bru` | GET | url: {{baseUrl}}/api/v2/auth/me |
| 55 | `5-permissions/95-user-permissions-ok.bru` | GET | url: {{baseUrl}}/api/v1/users/{{adminUserId}}/permissions |
| 56 | `5-permissions/96-user-permissions-not-found.bru` | GET | url: {{baseUrl}}/api/v1/users/00000000-0000-4000-a000-000000000000/permissions |
| 57 | `5-permissions/97-user-permissions-forbidden-bare.bru` | GET | url: {{baseUrl}}/api/v1/users/{{adminUserId}}/permissions |
| 58 | `5-permissions/folder.bru` | ? | ? |
| 59 | `6-roles/100-me-capture-bare-id.bru` | GET | url: {{baseUrl}}/api/v2/auth/me |
| 60 | `6-roles/101-list-roles-ok.bru` | GET | url: {{baseUrl}}/api/v1/roles |
| 61 | `6-roles/102-list-roles-no-token.bru` | GET | url: {{baseUrl}}/api/v1/roles |
| 62 | `6-roles/103-list-roles-forbidden-bare.bru` | GET | url: {{baseUrl}}/api/v1/roles |
| 63 | `6-roles/104-assign-role-ok.bru` | POST | url: {{baseUrl}}/api/v1/users/{{bareUserId}}/roles |
| 64 | `6-roles/105-assign-role-idempotent.bru` | POST | url: {{baseUrl}}/api/v1/users/{{bareUserId}}/roles |
| 65 | `6-roles/106-confirm-propagation.bru` | GET | url: {{baseUrl}}/api/v1/users/{{bareUserId}}/permissions |
| 66 | `6-roles/107-revoke-role-ok.bru` | DELETE | url: {{baseUrl}}/api/v1/users/{{bareUserId}}/roles/{{adminRoleId}} |
| 67 | `6-roles/108-revoke-role-idempotent.bru` | DELETE | url: {{baseUrl}}/api/v1/users/{{bareUserId}}/roles/{{adminRoleId}} |
| 68 | `6-roles/109-assign-role-no-token.bru` | POST | url: {{baseUrl}}/api/v1/users/{{bareUserId}}/roles |
| 69 | `6-roles/110-assign-role-forbidden-bare.bru` | POST | url: {{baseUrl}}/api/v1/users/{{bareUserId}}/roles |
| 70 | `6-roles/120-revoke-self-lockout.bru` | DELETE | url: {{baseUrl}}/api/v1/users/{{adminUserId}}/roles/{{adminRoleId}} |
| 71 | `6-roles/folder.bru` | ? | ? |
| 72 | `7-role-mgmt/200-create-role-ok.bru` | POST | url: {{baseUrl}}/api/v1/roles |
| 73 | `7-role-mgmt/201-create-role-duplicate.bru` | POST | url: {{baseUrl}}/api/v1/roles |
| 74 | `7-role-mgmt/202-create-role-bad-permission.bru` | POST | url: {{baseUrl}}/api/v1/roles |
| 75 | `7-role-mgmt/203-create-role-invalid-name.bru` | POST | url: {{baseUrl}}/api/v1/roles |
| 76 | `7-role-mgmt/204-create-role-no-token.bru` | POST | url: {{baseUrl}}/api/v1/roles |
| 77 | `7-role-mgmt/205-create-role-forbidden-bare.bru` | POST | url: {{baseUrl}}/api/v1/roles |
| 78 | `7-role-mgmt/206-update-role-rename-ok.bru` | PUT | url: {{baseUrl}}/api/v1/roles/{{newRoleId}} |
| 79 | `7-role-mgmt/207-update-role-permissions-ok.bru` | PUT | url: {{baseUrl}}/api/v1/roles/{{newRoleId}} |
| 80 | `7-role-mgmt/208-update-role-bad-permission.bru` | PUT | url: {{baseUrl}}/api/v1/roles/{{newRoleId}} |
| 81 | `7-role-mgmt/209-update-role-not-found.bru` | PUT | url: {{baseUrl}}/api/v1/roles/00000000-0000-4000-a000-000000000000 |
| 82 | `7-role-mgmt/210-update-role-no-token.bru` | PUT | url: {{baseUrl}}/api/v1/roles/{{newRoleId}} |
| 83 | `7-role-mgmt/211-update-role-forbidden-bare.bru` | PUT | url: {{baseUrl}}/api/v1/roles/{{newRoleId}} |
| 84 | `7-role-mgmt/212-deactivate-role-ok.bru` | PATCH | url: {{baseUrl}}/api/v1/roles/{{newRoleId}}/deactivate |
| 85 | `7-role-mgmt/213-me-recapture-bare-id.bru` | GET | url: {{baseUrl}}/api/v2/auth/me |
| 86 | `7-role-mgmt/214-create-inuse-role.bru` | POST | url: {{baseUrl}}/api/v1/roles |
| 87 | `7-role-mgmt/215-assign-inuse-role.bru` | POST | url: {{baseUrl}}/api/v1/users/{{bareUserId}}/roles |
| 88 | `7-role-mgmt/216-deactivate-role-in-use.bru` | PATCH | url: {{baseUrl}}/api/v1/roles/{{inUseRoleId}}/deactivate |
| 89 | `7-role-mgmt/217-revoke-inuse-role.bru` | DELETE | url: {{baseUrl}}/api/v1/users/{{bareUserId}}/roles/{{inUseRoleId}} |
| 90 | `7-role-mgmt/218-deactivate-role-no-token.bru` | PATCH | url: {{baseUrl}}/api/v1/roles/{{inUseRoleId}}/deactivate |
| 91 | `7-role-mgmt/219-deactivate-role-forbidden-bare.bru` | PATCH | url: {{baseUrl}}/api/v1/roles/{{inUseRoleId}}/deactivate |
| 92 | `7-role-mgmt/folder.bru` | ? | ? |
| 93 | `collection.bru` | ? | ? |
| 94 | `environments/local.bru` | ? | ? |

## Módulo: contracts (19 requests)

| # | request (.bru) | método | rota |
| --- | --- | --- | --- |
| 1 | `auth/01-register-bare-user.bru` | POST | url: {{baseUrl}}/api/v2/auth/register |
| 2 | `auth/02-login-bare-user.bru` | POST | url: {{baseUrl}}/api/v2/auth/login |
| 3 | `auth/03-login-reader.bru` | POST | url: {{baseUrl}}/api/v2/auth/login |
| 4 | `auth/04-login-operator.bru` | POST | url: {{baseUrl}}/api/v2/auth/login |
| 5 | `auth/folder.bru` | ? | ? |
| 6 | `collection.bru` | ? | ? |
| 7 | `contracts/01-create-contract.bru` | POST | url: {{baseUrl}}/api/v2/contracts |
| 8 | `contracts/02-create-sem-contractor-400.bru` | POST | url: {{baseUrl}}/api/v2/contracts |
| 9 | `contracts/03-create-contractor-id-invalido-400.bru` | POST | url: {{baseUrl}}/api/v2/contracts |
| 10 | `contracts/04-get-contract-by-id.bru` | GET | url: {{baseUrl}}/api/v2/contracts/{{contractCreatedId}} |
| 11 | `contracts/05-patch-metadata.bru` | PATCH | url: {{baseUrl}}/api/v2/contracts/{{contractCreatedId}} |
| 12 | `contracts/06-patch-campo-imutavel-400.bru` | PATCH | url: {{baseUrl}}/api/v2/contracts/{{contractCreatedId}} |
| 13 | `contracts/07-patch-corpo-vazio-400.bru` | PATCH | url: {{baseUrl}}/api/v2/contracts/{{contractCreatedId}} |
| 14 | `contracts/08-delete-recusado-405.bru` | DELETE | url: {{baseUrl}}/api/v2/contracts/{{contractCreatedId}} |
| 15 | `contracts/09-get-sem-auth-401.bru` | GET | url: {{baseUrl}}/api/v2/contracts/{{contractCreatedId}} |
| 16 | `contracts/10-patch-reader-403.bru` | PATCH | url: {{baseUrl}}/api/v2/contracts/{{contractCreatedId}} |
| 17 | `contracts/folder.bru` | ? | ? |
| 18 | `environments/local.bru` | ? | ? |
| 19 | `health-check.bru` | GET | url: {{baseUrl}}/health |

## Módulo: partners (67 requests)

| # | request (.bru) | método | rota |
| --- | --- | --- | --- |
| 1 | `acts/01-export-csv.bru` | GET | url: {{baseUrl}}/api/v1/acts/export |
| 2 | `acts/02-export-csv-403.bru` | GET | url: {{baseUrl}}/api/v1/acts/export |
| 3 | `acts/folder.bru` | ? | ? |
| 4 | `aggregate/01-list-no-auth.bru` | GET | url: {{baseUrl}}/api/v1/partners |
| 5 | `aggregate/02-list-bare-user-403.bru` | GET | url: {{baseUrl}}/api/v1/partners |
| 6 | `aggregate/03-list-todos-os-tipos.bru` | GET | url: {{baseUrl}}/api/v1/partners |
| 7 | `aggregate/04-filter-por-type-supplier.bru` | GET | url: {{baseUrl}}/api/v1/partners |
| 8 | `aggregate/05-filter-por-search.bru` | GET | url: {{baseUrl}}/api/v1/partners |
| 9 | `aggregate/06-type-invalido-400.bru` | GET | url: {{baseUrl}}/api/v1/partners |
| 10 | `aggregate/07-meta-paginacao.bru` | GET | url: {{baseUrl}}/api/v1/partners |
| 11 | `aggregate/folder.bru` | ? | ? |
| 12 | `auth/01-register-bare-user.bru` | POST | url: {{baseUrl}}/api/v2/auth/register |
| 13 | `auth/02-login-bare-user.bru` | POST | url: {{baseUrl}}/api/v2/auth/login |
| 14 | `auth/03-login-operator.bru` | POST | url: {{baseUrl}}/api/v2/auth/login |
| 15 | `auth/folder.bru` | ? | ? |
| 16 | `collaborators/01-list-no-auth.bru` | GET | url: {{baseUrl}}/api/v1/collaborators |
| 17 | `collaborators/02-list-bare-user-403.bru` | GET | url: {{baseUrl}}/api/v1/collaborators |
| 18 | `collaborators/03-create-collaborator.bru` | POST | url: {{baseUrl}}/api/v1/collaborators |
| 19 | `collaborators/04-get-collaborator-by-id.bru` | GET | url: {{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}} |
| 20 | `collaborators/05-list-contains-created.bru` | GET | url: {{baseUrl}}/api/v1/collaborators |
| 21 | `collaborators/06-complete-registration.bru` | PATCH | url: {{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}}/complete-registration |
| 22 | `collaborators/07-get-after-complete.bru` | GET | url: {{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}} |
| 23 | `collaborators/08-update-collaborator.bru` | PUT | url: {{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}} |
| 24 | `collaborators/09-deactivate-collaborator.bru` | POST | url: {{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}}/deactivate |
| 25 | `collaborators/10-reactivate-collaborator.bru` | POST | url: {{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}}/reactivate |
| 26 | `collaborators/11-import-csv-empty.bru` | POST | url: {{baseUrl}}/api/v1/collaborators/import |
| 27 | `collaborators/12-import-csv-valid.bru` | POST | url: {{baseUrl}}/api/v1/collaborators/import |
| 28 | `collaborators/13-import-csv-malformed.bru` | POST | url: {{baseUrl}}/api/v1/collaborators/import |
| 29 | `collaborators/14-export-csv.bru` | GET | url: {{baseUrl}}/api/v1/collaborators/export |
| 30 | `collaborators/15-export-csv-403.bru` | GET | url: {{baseUrl}}/api/v1/collaborators/export |
| 31 | `collaborators/folder.bru` | ? | ? |
| 32 | `collection.bru` | ? | ? |
| 33 | `environments/local.bru` | ? | ? |
| 34 | `financiers/01-list-no-auth.bru` | GET | url: {{baseUrl}}/api/v1/financiers |
| 35 | `financiers/02-list-bare-user-403.bru` | GET | url: {{baseUrl}}/api/v1/financiers |
| 36 | `financiers/03-create-financier.bru` | POST | url: {{baseUrl}}/api/v1/financiers |
| 37 | `financiers/04-get-financier-by-id.bru` | GET | url: {{baseUrl}}/api/v1/financiers/{{financierCreatedId}} |
| 38 | `financiers/05-list-contains-created.bru` | GET | url: {{baseUrl}}/api/v1/financiers |
| 39 | `financiers/06-deactivate-financier.bru` | POST | url: {{baseUrl}}/api/v1/financiers/{{financierCreatedId}}/deactivate |
| 40 | `financiers/07-reactivate-financier.bru` | POST | url: {{baseUrl}}/api/v1/financiers/{{financierCreatedId}}/reactivate |
| 41 | `financiers/08-update-financier.bru` | PUT | url: {{baseUrl}}/api/v1/financiers/{{financierCreatedId}} |
| 42 | `financiers/09-export-csv.bru` | GET | url: {{baseUrl}}/api/v1/financiers/export |
| 43 | `financiers/10-export-csv-403.bru` | GET | url: {{baseUrl}}/api/v1/financiers/export |
| 44 | `financiers/folder.bru` | ? | ? |
| 45 | `health-check.bru` | GET | url: {{baseUrl}}/health |
| 46 | `suppliers/01-list-no-auth.bru` | GET | url: {{baseUrl}}/api/v1/suppliers |
| 47 | `suppliers/02-list-bare-user-403.bru` | GET | url: {{baseUrl}}/api/v1/suppliers |
| 48 | `suppliers/03-create-supplier.bru` | POST | url: {{baseUrl}}/api/v1/suppliers |
| 49 | `suppliers/04-get-supplier-by-id.bru` | GET | url: {{baseUrl}}/api/v1/suppliers/{{supplierCreatedId}} |
| 50 | `suppliers/05-list-contains-created.bru` | GET | url: {{baseUrl}}/api/v1/suppliers |
| 51 | `suppliers/06-deactivate-supplier.bru` | POST | url: {{baseUrl}}/api/v1/suppliers/{{supplierCreatedId}}/deactivate |
| 52 | `suppliers/07-reactivate-supplier.bru` | POST | url: {{baseUrl}}/api/v1/suppliers/{{supplierCreatedId}}/reactivate |
| 53 | `suppliers/08-update-supplier.bru` | PUT | url: {{baseUrl}}/api/v1/suppliers/{{supplierCreatedId}} |
| 54 | `suppliers/09-export-csv.bru` | GET | url: {{baseUrl}}/api/v1/suppliers/export |
| 55 | `suppliers/10-service-categories.bru` | GET | url: {{baseUrl}}/api/v1/suppliers/service-categories |
| 56 | `suppliers/folder.bru` | ? | ? |
| 57 | `territory/01-states-no-auth.bru` | GET | url: {{baseUrl}}/api/v1/partner-states |
| 58 | `territory/02-states-bare-user-403.bru` | GET | url: {{baseUrl}}/api/v1/partner-states |
| 59 | `territory/03-list-partner-states.bru` | GET | url: {{baseUrl}}/api/v1/partner-states |
| 60 | `territory/04-toggle-state-activate.bru` | POST | url: {{baseUrl}}/api/v1/partner-states/SP |
| 61 | `territory/05-toggle-state-invalid-uf-400.bru` | POST | url: {{baseUrl}}/api/v1/partner-states/XX |
| 62 | `territory/06-toggle-state-deactivate.bru` | DELETE | url: {{baseUrl}}/api/v1/partner-states/SP |
| 63 | `territory/07-list-municipalities.bru` | GET | url: {{baseUrl}}/api/v1/partner-municipalities?uf=SP |
| 64 | `territory/08-toggle-municipality-activate.bru` | POST | url: {{baseUrl}}/api/v1/partner-municipalities/{{sampleIbgeCode}} |
| 65 | `territory/09-toggle-municipality-invalid-code-400.bru` | POST | url: {{baseUrl}}/api/v1/partner-municipalities/0000000 |
| 66 | `territory/10-toggle-municipality-deactivate.bru` | DELETE | url: {{baseUrl}}/api/v1/partner-municipalities/{{sampleIbgeCode}} |
| 67 | `territory/folder.bru` | ? | ? |


## Nota de contagem

- Total `.bru`: 180 · **`folder.bru` (metadados de pasta, NÃO requests HTTP): 16**.
- **Requests reais para o 1:1: 164** (auth/contracts/partners). A rede BDD/TDD cobre estes 164.
