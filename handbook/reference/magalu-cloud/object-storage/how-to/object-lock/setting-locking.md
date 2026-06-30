# Locking

O object storage da Magalu Cloud oferece funcionalidade de locking que permite retenção e bloqueio da deleção dos objetos por um dado período. Atualmente, apenas o modo compliance está disponível.

## Requisito Importante

A função de locking requer que o objeto esteja em um bucket versionado.

## Configurando Locking de um Bucket

Você pode ativar o object lock em um bucket usando MGC-CLI ou AWS-CLI:

**MGC-CLI:**

```bash
mgc object-storage buckets object-lock set --dst Meu-Bucket --days 7
```

**AWS-CLI:**

```bash
aws s3api put-object-lock-configuration --bucket Meu-bucket \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "COMPLIANCE",
        "Days": 7
      }
    }
  }'
```

### Aviso Importante

Ao ativar o S3 Object Lock, a regra de bloqueio não se aplica retroativamente aos objetos já existentes no bucket. O bloqueio se aplica apenas aos objetos enviados após a ativação.

## Configurando Locking dos Objetos

É possível aplicar locking a objetos existentes (desde que versionados):

**MGC-CLI:**

```bash
mgc object-storage objects object-lock set MEU_BUCKET/MEU_OBJETO --retain-until-date="2025-02-09T00:00:00"
```

**AWS-CLI:**

```bash
aws s3api put-object-retention --bucket MEU_BUCKET --key MEU_OBJETO \
  --retention '{"Mode": "COMPLIANCE", "RetainUntilDate": "2025-02-10T00:00:00"}'
```

A flag `--retain-until-date` aceita timestamps no formato ISO 8601.
