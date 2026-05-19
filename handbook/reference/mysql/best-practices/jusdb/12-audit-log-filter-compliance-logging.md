# MySQL 8.4 Audit Log Filter: Selective Logging for Compliance

> **Fonte:** https://www.jusdb.com/blog/mysql-8-4-audit-log-filter-guide
> **Publicado:** 2025-10-13
> **Aplicação no core-api:** ERP em domínio sensível (LGPD aplicável). Quando MySQL de produção for instalado, este filtro é o caminho para auditar acessos a tabelas com PII e mudanças de schema. Não usar até ter requisito formal — não custa zero mesmo com filtro seletivo.

---

## TL;DR

`audit_log` é plugin oficial; em 8.4 ganhou atomicidade nas operações de filtro e overhead caiu de ~1.1% para ~0.3%. Filtros são documentos JSON via `audit_log_filter_set_filter()`; atribuição por conta via `audit_log_filter_set_user()`. Formato **JSON sempre** (nunca OLD). Sempre filtrar antes de ativar `audit_log_policy=ALL`.

---

## Conceitos-chave

| Conceito | Descrição |
|---|---|
| `audit_log` | plugin carregável dinamicamente |
| Filter | regra em JSON que define o que registrar |
| Rule | condição dentro do filter sobre classe, evento, campos |
| User binding | conta `user@host` ↔ nome de filtro em `mysql.audit_log_user` |
| Classes de evento | `connection_event`, `general_event`, `table_access_event`, `command_event` |
| Output | NDJSON (preferido) ou OLD/XML-like (legado) |

---

## Instalação

```sql
INSTALL PLUGIN audit_log SONAME 'audit_log.so';
SELECT PLUGIN_NAME, PLUGIN_STATUS FROM information_schema.PLUGINS
WHERE PLUGIN_NAME='audit_log';
```

`my.cnf`:
```ini
[mysqld]
plugin-load-add    = audit_log.so
audit_log_format   = JSON
audit_log_file     = /var/log/mysql/audit.log
audit_log_policy   = ALL
audit_log_max_size = 536870912   # 512 MiB
```

⚠️ **Não habilite `policy=ALL` antes** dos filtros — satura I/O em OLTP.

---

## Classes de evento

| Classe | Captura | Uso |
|---|---|---|
| `connection_event` | login/logout/falha de auth | trilha de acesso |
| `general_event` | qualquer execução SQL | DML/DDL seletivo |
| `table_access_event` | leitura/escrita engine-level | row-level (cuidado: N tabelas = N eventos) |
| `command_event` | COM_QUIT, COM_PING, etc. | protocolos baixo nível |

---

## Sintaxe JSON dos filtros (progressivo)

### Log tudo
```sql
SELECT audit_log_filter_set_filter('log_all', '{"filter":{"log":true}}');
```

### Só conexões
```json
{"filter":{"class":{"name":"connection_event"}}}
```

### DML
```json
{"filter":{"class":{"name":"general_event","event":{"name":"status","log":{
  "or":[
    {"field":{"name":"sql_command","value":"insert"}},
    {"field":{"name":"sql_command","value":"update"}},
    {"field":{"name":"sql_command","value":"delete"}}
  ]}}}}}
```

### DDL
```json
{"filter":{"class":{"name":"general_event","event":{"name":"status","log":{
  "or":[
    {"field":{"name":"sql_command","value":"create_table"}},
    {"field":{"name":"sql_command","value":"alter_table"}},
    {"field":{"name":"sql_command","value":"drop_table"}},
    {"field":{"name":"sql_command","value":"create_index"}},
    {"field":{"name":"sql_command","value":"drop_index"}},
    {"field":{"name":"sql_command","value":"truncate"}}
  ]}}}}}
```

### Failed logins
```json
{"filter":{"class":{"name":"connection_event","event":{"name":"connect","log":{
  "field":{"name":"status","value":1}}}}}}
```

### SELECT em schema específico
```json
{"filter":{"class":{"name":"general_event","event":{"name":"status","log":{
  "and":[
    {"field":{"name":"sql_command","value":"select"}},
    {"field":{"name":"database","value":"patients"}}
  ]}}}}}
```

### Excluir usuário ruidoso
```json
{"filter":{"class":{"name":"general_event"},
  "exclude":{"field":{"name":"user","value":"monitoring_bot"}}}}
```

### DML em tabelas sensíveis
```json
{"filter":{"class":{"name":"table_access_event","log":{
  "or":[
    {"and":[
      {"field":{"name":"table","value":"claims"}},
      {"field":{"name":"access_type","value":"write"}}]},
    {"and":[
      {"field":{"name":"table","value":"patients"}},
      {"field":{"name":"access_type","value":"write"}}]}
  ]}}}}
```

---

## Funções de gestão

| Função | Efeito |
|---|---|
| `audit_log_filter_set_filter(name, json)` | criar/substituir (atômico em 8.4) |
| `audit_log_filter_set_user(user_host, filter_name)` | bind conta ↔ filter |
| `audit_log_filter_remove_filter(name)` | remover filter |
| `audit_log_filter_remove_user(user_host)` | remover bind |
| `audit_log_filter_flush()` | recarregar do disco |
| `audit_log_rotate()` | forçar rotação |

Workflow:
```sql
SELECT audit_log_filter_set_filter('log_dml_only', '<json>');
SELECT audit_log_filter_set_user('app_user@10.0.1.%', 'log_dml_only');
SELECT audit_log_filter_set_user('dba_alice@%', 'log_all');
SELECT audit_log_filter_set_user('%@%', 'log_connections_only');

SELECT NAME, FILTER     FROM mysql.audit_log_filter;
SELECT USER, FILTERNAME FROM mysql.audit_log_user;
```

---

## Compliance — mapeamento

| Framework | Eventos | Filtro |
|---|---|---|
| PCI-DSS 3.4 | DML + DDL + acesso a dados de cartão | `log_dml_only` + `table_access` em PAN |
| HIPAA Audit Control | operações em PHI | `log_table_access` em `patients`, `claims` |
| SOX 404(b) | DDL + admin actions | `log_ddl_only` + `log_all` para `dba_*` |
| **LGPD** | acesso/alteração de PII + consent | `table_access_event` em tabelas com PII |

---

## Performance

| Versão | Overhead | Lock | Atomicidade |
|---|---|---|---|
| 8.0 sem filtro | baseline | n/a | n/a |
| 8.0 com filtros | ~1.1% | RW lock | não |
| 8.4 com filtros | ~0.3% | lock-free read | sim |

Minimizar:
- Filtros seletivos, não `log:true` global.
- Excluir bots/monitoring.
- Não usar `table_access_event` em OLAP — JOIN N-tabelas gera N eventos.
- Não logar SELECT em data warehouse.

---

## Rotação

```sql
SELECT audit_log_rotate();
-- ou
CREATE EVENT rotate_audit_log
  ON SCHEDULE EVERY 6 HOUR
  DO SELECT audit_log_rotate();
```
`audit_log_max_size` faz rotação por tamanho.

---

## Output JSON — exemplo

```json
{
  "timestamp":"2026-02-23T14:32:01 UTC",
  "id":7412,
  "class":"general",
  "event":"status",
  "connection_id":42,
  "account":{"user":"app_user","host":"10.0.1.5"},
  "general_data":{
    "command":"Query",
    "sql_command":"select",
    "query":"SELECT id, name FROM patients WHERE dob > '1980-01-01'",
    "status":0
  }
}
```

Encriptação: log fica em texto claro no disco — usar **disco encriptado** (LUKS/dm-crypt) + envio TLS ao SIEM.

---

## Integração com SIEM

- **Filebeat → Elasticsearch:** `json.keys_under_root: true`, index diário.
- **Splunk Universal Forwarder:** `sourcetype = mysql:audit:json`.
- **Datadog:** rule `multi_line` pegando `^\{"timestamp"`.

---

## Best practices

1. JSON sempre, nunca OLD.
2. Filtros **antes** de `audit_log_policy=ALL`.
3. Catch-all em `%@%` com filtro mínimo.
4. Teste em uma conta antes do rollout.
5. `audit_log_max_size` ~512 MiB + rotate + ship imediato.
6. Logar admin (`dba_*`) com `log_all`.
7. Validar JSON antes do `set_filter`.
8. Backup de `mysql.audit_log_filter` e `mysql.audit_log_user`.
9. Review trimestral dos filtros.
10. `user@host` exato (aspas e match).

---

## Armadilhas

- I/O saturada após enable sem filtro.
- `table_access_event` multiplicado por JOIN.
- 8.0 sem atomicidade pode deixar filter inconsistente após crash → upgrade.
- Arquivo `audit.log` vazio = permissão (`chown mysql:mysql …`).
- JSON malformado → função retorna erro silencioso.
- `set_user` errado → filtro não aplica.

---

## Edições

| Produto | Plugin `audit_log` |
|---|---|
| MySQL Enterprise | nativo, suportado |
| MySQL Community 8.0+ | plugin disponível |
| Percona Server | compatível, integra com PMM |
| MariaDB 10.5+ | compatível, mas sintaxe ligeiramente diferente |

---

## Referências cruzadas

- [02-binlog-retention…](./02-binlog-retention-rotation-purge.md) — outra trilha de auditoria.
- [03-timeout-variables…](./03-timeout-variables-production-guide.md) — login/connection events relacionados.
- LGPD / compliance → handbook do projeto.
