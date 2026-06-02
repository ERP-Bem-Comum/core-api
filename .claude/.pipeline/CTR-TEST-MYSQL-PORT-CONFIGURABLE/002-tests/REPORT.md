# W0 — Evidência do gap (CTR-TEST-MYSQL-PORT-CONFIGURABLE)

**Data:** 2026-06-02

Reprodução do problema (conn string de integração hardcoded em `127.0.0.1:3306`, conflita com o stack `bemcomum-*` que ocupa a 3306):

```
$ grep -rln "127.0.0.1:3306" tests/modules/contracts tests/cli | grep -v MYSQL_PORT
→ 9 arquivos de integração com porta fixa
```

Contraste: auth, partners e etl JÁ usavam `${process.env['MYSQL_PORT'] ?? '3306'}`. O gap é só nos testes de contracts (mais antigos). O compose já mapeia `'${MYSQL_PORT:-3306}:3306'` — só os testes não liam o env.
