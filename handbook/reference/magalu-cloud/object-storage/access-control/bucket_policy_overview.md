# Bucket Policy

## O que é uma Bucket Policy?

Uma **Bucket Policy** é uma política baseada em recursos que pode ser aplicada a buckets do sistema de armazenamento de objetos. Ela define permissões específicas para operações que podem ser executadas dentro de um bucket e os objetos contidos nele. Essas políticas são escritas em formato JSON e seguem a mesma estrutura de uma política do IAM (Identity and Access Management) da AWS, mas com o escopo limitado ao bucket onde são aplicadas.

### Objetivo Principal

O objetivo de uma Bucket Policy é fornecer um mecanismo flexível para controlar o acesso a um bucket e aos seus objetos, garantindo a segurança e o controle granular sobre os recursos armazenados.

## Funcionamento de uma Bucket Policy

Apenas o proprietário do bucket pode associar uma **Bucket Policy** a ele. A política pode ser usada para conceder ou negar permissões de acesso a entidades (usuários, grupos ou outras contas). A grande vantagem das Bucket Policies é que elas podem definir permissões para usuários e grupos de fora da conta de proprietário (cross-account access), sem a necessidade de modificar as permissões em cada objeto individualmente.

### Cenário de Uso

- Conceder permissões para que outras contas carreguem objetos no bucket.
- Assegurar que o proprietário do bucket tenha controle total sobre os objetos enviados por terceiros.

## Estrutura de uma Bucket Policy

As **Bucket Policies** seguem um formato JSON estruturado, similar a políticas do IAM. Elas são compostas por vários blocos que definem como as permissões devem ser aplicadas. Abaixo, detalho cada um dos componentes principais de uma **Bucket Policy**.

### Bloco de Versão

O bloco de versão é um campo obrigatório e define o esquema de políticas que está sendo utilizado. Atualmente, o valor suportado é `"2012-10-17"`, que indica a versão de sintaxe de política.

Exemplo:

```json
"Version": "2012-10-17"
```

### Bloco de Identificação

O bloco de identificação, opcional, permite adicionar uma string de ID à política para identificação em auditorias e logs. É uma prática recomendada, mas não obrigatória.

Exemplo:

```json
"Id": "Policy1234567890"
```

### Bloco de Declarações (Statement)

O bloco mais importante, pois define as permissões que serão concedidas ou negadas. É composto por uma lista de declarações, onde cada declaração especifica uma permissão ou um conjunto de permissões.

```json
"Statement": [
  {
    "Sid": "Identificador",
    "Effect": "Allow",
    "Principal": "[TENANT-ID]",
    "Action": "s3:GetObject",
    "Resource": "meu-bucket/*",
    "Condition": {
      "IpAddress": {
        "aws:SourceIp": "0.0.0.1"
      }
    }
  }
]
```

> **Nota:** **Sid** e **Condition** são componentes opcionais.

### Componentes do Bloco de Declarações

- **Sid (String de Identificação):** Opcional, usado para fornecer um identificador único para a declaração.

  ```json
  "Sid": "Stmt1234567890"
  ```

- **Effect (Efeito):** Campo obrigatório que define se a permissão é de **Allow** (permitir) ou **Deny** (negar).

  ```json
  "Effect": "Allow"
  "Effect": "Deny"
  ```

- **Principal (Principal):** Especifica para quem a permissão é concedida ou negada. Pode ser um usuário específico, um grupo, uma conta ou todos (*).

  ```json
  "Principal": "*"
  "Principal": "[TENANT-ID]"
  ```

  **Formato do Principal para Contas de Serviço**

  Ao referenciar uma Conta de Serviço em uma política, o identificador Principal deve seguir o formato: `"<TENANT_ID_PROPRIETARIO>:sa/<EMAIL_CONTA_SERVICO>"`. Exemplo: `"5d1a6792-29c2-4924-afe2-3a681920dfb8:sa/sa-empresa-a@SEU-TENANT.sa.idmagalu.com"`

- **Action (Ação):** Define quais ações podem ou não ser realizadas no bucket. Isso inclui operações como `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`.

  ```json
  "Action": [
    "s3:DeleteBucketPolicy",
    "s3:GetBucketAcl",
    "s3:GetBucketPolicy",
    "s3:GetBucketPolicyStatus",
    "s3:GetBucketTagging",
    "s3:GetBucketVersioning",
    "s3:ListBucket",
    "s3:ListBucketMultipartUploads",
    "s3:ListBucketVersions",
    "s3:PutBucketAcl",
    "s3:PutBucketPolicy",
    "s3:PutBucketTagging",
    "s3:PutBucketVersioning",
    "s3:AbortMultipartUpload",
    "s3:DeleteObject",
    "s3:DeleteObjectVersion",
    "s3:GetObject",
    "s3:GetObjectAcl",
    "s3:GetObjectAttributes",
    "s3:GetObjectVersion",
    "s3:GetObjectVersionAcl",
    "s3:GetObjectVersionAttributes",
    "s3:ListMultipartUploadParts",
    "s3:PutObject",
    "s3:PutObjectAcl",
    "s3:PutObjectVersionAcl"
  ]
  ```

- **Resource (Recurso):** Define em quais buckets ou objetos a política será aplicada. Pode ser o bucket (`meu-bucket`) ou objetos específicos dentro do bucket (`meu-bucket/*`).

  ```json
  "Resource": "meu-bucket/*"
  "Resource": "meu-bucket/meu-objeto"
  ```

- **Conditionals (Condições):** Opcional, permite a filtragem de acessos por meio de regras definidas.

  ```json
  "Condition": {
    "StringLike": {
      "keys": "values"
    }
  }
  ```

  Atualmente, é possível filtrar os acessos por meio de IPs ou networks.

  - **IpAddress:** **Permite** o acesso ao bucket apenas pelos usuários com IPs contidos na condição.

    ```json
    "IpAddress": {
      "aws:SourceIp": ["Ip/Network"]
    }

    "IpAddress": {
      "aws:SourceIp": "Ip/Network"
    }
    ```

  - **NotIpAddress:** **Bloqueia** o acesso ao bucket pelos usuários com IPs contidos na condição.

    ```json
    "NotIpAddress": {
      "aws:SourceIp": ["Ip/Network"]
    }

    "NotIpAddress": {
      "aws:SourceIp": "Ip/Network"
    }
    ```

## Gerenciamento de Bucket Policies no Magalu Cloud

Confira em nossa Documentação exemplos de Bucket Policies e como fazer o gerenciamento utilizando o Console ou via CLI. Esse recurso proporciona um ambiente centralizado e de fácil uso para garantir que suas políticas estão configuradas de acordo com as melhores práticas de segurança e governança de dados.

## Considerações de Segurança

Ao definir permissões através de **Bucket Policies**, é importante tomar cuidados especiais para evitar vazamentos de dados ou acessos indevidos. Por exemplo:

- Limitar o uso de `Principal: "*"`, que concede permissão para qualquer entidade, somente quando absolutamente necessário.
- Monitorar regularmente os logs de acesso e uso do bucket para garantir que apenas as entidades autorizadas estejam acessando os dados.
