# Criar e Verificar Status de Versionamento

Versionamento permite ao usuário manter várias versões de um objeto em um bucket. Isso pode ser útil para recuperação de dados e gerenciamento de alterações. Ao custo de maior uso de armazenamento, o versionamento de objetos pode ser uma ferramenta valiosa para garantir a integridade dos dados.

---

## Ativar Versionamento de Objetos

O versionamento por padrão é desabilitado, para habilitar siga as instruções abaixo:

**MGC-CLI:**

```bash
mgc object-storage buckets versioning enable --bucket NOME_DO_BUCKET
```

**AWS-CLI:**

```bash
aws s3api put-bucket-versioning --bucket NOME_DO_BUCKET --versioning-configuration Status=Enabled
```

---

## Verificar o Status de Versionamento

Manter o controle sobre o versionamento de objetos em um bucket é essencial para garantir que você possa acessar e restaurar versões anteriores dos seus dados.

**MGC-CLI:**

```bash
mgc object-storage buckets versioning get --bucket NOME_DO_BUCKET
```

**AWS-CLI:**

```bash
aws s3api get-bucket-versioning --bucket NOME_DO_BUCKET
```
