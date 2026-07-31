---
paths:
  - "src/modules/partners/**/*.ts"
  - "tests/modules/partners/**/*.ts"
---

# Módulo Partners — cadastro de contrapartes

Três agregados raiz num único módulo ([ADR-0031](../../handbook/architecture/adr/0031-partners-registry-module.md)): **`supplier`**, **`financier`**, **`collaborator`** — mais **`Act`** ([ADR-0036](../../handbook/architecture/adr/0036-act-partner-placeholder.md)). Não fatiar em N módulos: cardinalidade modesta e mesma linguagem ubíqua de "cadastro de contraparte".

## Soft-delete é o padrão de todo `par_*` ([ADR-0035](../../handbook/architecture/adr/0035-partner-territory-soft-delete.md))

```
active        boolean NOT NULL DEFAULT true
deactivated_at datetime(3) NULL
CHECK ((active = FALSE) = (deactivated_at IS NOT NULL))
```

- **Nunca hard delete.** Desmarcar = inativar; marcar = criar/reativar, **idempotente**.
- O CHECK é parte do contrato: `active` e `deactivated_at` não podem divergir.
- Motivo: consistência de padrão no módulo + auditabilidade (o legado perdia o fato do desligamento) + reversibilidade barata.

## Enums do legado — traduzir, **com exceções** ([ADR-0031](../../handbook/architecture/adr/0031-partners-registry-module.md) §5)

Regra geral: enum legado vira string literal union **EN kebab-case**, com dicionário PT na borda. **Quatro exceções mantêm o rótulo legado literal:**

| Campo                             | Por que não traduzir                                            |
| --------------------------------- | ---------------------------------------------------------------- |
| `race`, `gender_identity`         | Espelham categorias oficiais do **IBGE** — traduzir distorce a semântica |
| `serviceCategory`                 | ~40 valores, **incluindo o typo legado** `ONGANIZACAO_DE_EVENTOS` — fidelidade de ETL |
| `occupationArea`                  | `PARC\|DDI\|DCE\|EPV` — siglas internas da organização           |

⚠️ Corrigir o typo de `serviceCategory` **quebra o ETL**. Ele é intencional.

## Fronteiras

- **Geografias são lookup, não agregado** — `partner_states`/`partner_municipalities` são dados de referência (UF + código IBGE), sem ciclo de vida próprio. O catálogo geográfico é read-only imutável; a **parceria territorial** o referencia (e essa, sim, é Entity com soft-delete).
- **VOs `Cpf`/`Cnpj`/`Email` vivem no shared kernel** (`src/shared/kernel/`), não no módulo — são cross-BC. Ver [ADR-0044](../../handbook/architecture/adr/0044-cnpj-alphanumeric-kernel.md) para o CNPJ alfanumérico.
- **Perfil administrativo de usuário é agregado separado**, que referencia `auth.User` por ID via `auth/public-api`. Login/credencial/sessão continuam no módulo `auth`. `massApprovalPermission` é uma `Permission` do RBAC (`contract:mass-approve`), não um boolean solto.
- `Act` tem **status duplo**: `registrationStatus` (`PreRegistration` → `Complete`) **e** `status` (`Active`/`Inactive`, soft-delete padrão). São eixos independentes.

## Eventos publicados ([ADR-0043](../../handbook/architecture/adr/0043-partners-supplier-integration-events.md))

Só **`SupplierRegistered`** e **`SupplierEdited`** cruzam para o `financial`. `SupplierDeactivated`/`Reactivated` estão **fora do contrato** por ora — não mudam nome/CNPJ, que é o que o read-model consome. Payload montado no adapter de persistência a partir do snapshot; ver [`adapters.md`](./adapters.md).
