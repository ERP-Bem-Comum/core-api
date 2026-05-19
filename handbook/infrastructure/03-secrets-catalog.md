[← Voltar para Infraestrutura](./README.md)

# 🔐 Catálogo de Secrets

> **Status:** vigente | **Última revisão:** 2026-04-27

---

## 1. Princípios

- **Nenhum secret em variável de ambiente em texto plano.** Sempre via Secrets Manager.
- **Rotação documentada** para cada secret.
- **Acesso por princípio do menor privilégio** — cada serviço lê apenas seus próprios secrets.
- **Nada commitado.** `.env` no `.gitignore`. `.env.example` com chaves vazias é OK.

---

## 2. Ferramenta

A definir conforme escolha do cloud provider:

- AWS: **AWS Secrets Manager** (preferência) ou Parameter Store.
- GCP: **Secret Manager**.
- Multi-cloud / on-prem: **HashiCorp Vault**.

---

## 3. Catálogo

### 3.1. Banco de Dados

| Secret | Consumidor | Rotação |
| :--- | :--- | :--- |
| `DATABASE_URL_LEGACY` | `legacy-api` | Trimestral |
| `DATABASE_URL_CORE` | `core-api` | Trimestral |
| `DATABASE_URL_READONLY` | BI / relatórios | Trimestral |

**Formato:**
```
mysql://<user>:<password>@<host>:3306/<database>?ssl=true
```

> Engine: MySQL 8 — ver [ADR-0013](../architecture/adr/0013-mysql-database-engine.md).
> Cada serviço aponta para seu database (`legacy_app` → `legacy`, `core_app` → `core`).

---

### 3.2. Bradesco

| Secret | Consumidor | Rotação |
| :--- | :--- | :--- |
| `BRADESCO_API_KEY` | `core-api` | Conforme acordo com banco |
| `BRADESCO_API_SECRET` | `core-api` | Conforme acordo |
| `BRADESCO_CERT_PEM` | `core-api` | Anual ou conforme banco |
| `BRADESCO_CERT_KEY` | `core-api` | Anual ou conforme banco |
| `BRADESCO_VAN_HOST` | `core-api` | Quando banco mudar |
| `BRADESCO_BENEFICIARIO_CONFIG` | `core-api` | Conforme contrato |

> Certificados X.509: armazenar PEM e key separadamente, com permissões restritivas.

---

### 3.3. Auth / Sessão

| Secret | Consumidor | Rotação |
| :--- | :--- | :--- |
| `JWT_SIGNING_KEY` | `bff-gateway` | Mensal |
| `SESSION_SECRET` | `bff-gateway`, `legacy-api` | Mensal |
| `OIDC_CLIENT_ID` | `bff-gateway` | Não rotaciona (configuração) |
| `OIDC_CLIENT_SECRET` | `bff-gateway` | Conforme provedor |

---

### 3.4. OCR (futuro)

| Secret | Consumidor | Rotação |
| :--- | :--- | :--- |
| `OCR_PROVIDER_KEY` | `core-api` | Conforme provedor |
| `OCR_PROVIDER_ENDPOINT` | `core-api` | Quando provedor mudar |

> A definir após contratação do provedor OCR.

---

### 3.5. Observabilidade

| Secret | Consumidor | Rotação |
| :--- | :--- | :--- |
| `OTEL_EXPORTER_ENDPOINT` | Todos os serviços | Quando coletor mudar |
| `OTEL_EXPORTER_TOKEN` | Todos os serviços | Trimestral |

---

## 4. Procedimento de Rotação

Para cada secret rotacionado:

1. **Gerar** novo valor.
2. **Adicionar** como versão secundária no Secrets Manager (versionamento ativo).
3. **Deploy** dos serviços que leem a versão "current".
4. **Validar** que serviços estão usando o novo valor (logs/métricas).
5. **Remover** valor antigo após período de validação (24-48h).
6. **Auditar** logs para garantir nenhum erro de auth durante a janela.
7. **Registrar** no log de rotação (data, secret, executor).

---

## 5. Armazenamento Local em Dev

Em dev local, usar arquivo `.env` (no `.gitignore`):

```bash
# .env (NÃO commitar)
DATABASE_URL_CORE=postgresql://core_app:senha@localhost:5432/erp_financeiro?schema=core
BRADESCO_API_KEY=test-key-xxx
JWT_SIGNING_KEY=dev-only-key-yyy
# ...
```

Cada repositório deve manter um `.env.example` com chaves vazias e documentação:

```bash
# .env.example
# Banco de dados (obtenha credenciais do líder de infra)
DATABASE_URL_CORE=

# Bradesco — sandbox/homologação só
BRADESCO_API_KEY=

# Auth
JWT_SIGNING_KEY=
```

---

## 6. Procedimento em Caso de Vazamento

Se um secret for **comprometido** ou suspeito de vazamento:

1. **Rotação imediata** do secret afetado.
2. **Auditar logs** de uso do secret em busca de acesso suspeito.
3. **Notificar Security** + stakeholders relevantes.
4. **Post-mortem** sem culpa documentado em [`../operations/incidents/`](../operations/README.md).
5. **Atualizar este catálogo** se a rotação afetou cadência ou owner.

---

## 7. Referências

- [`./01-infra-handoff.md`](./01-infra-handoff.md) — handoff principal.
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
