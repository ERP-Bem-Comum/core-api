# Terraform

## Infraestrutura como Código

"Infraestrutura como Código (IaC) refere-se à prática de utilizar arquivos de configuração armazenados em repositórios de código para descrever e gerenciar a infraestrutura de recursos computacionais."

Empresas aproveitam o Terraform para automatizar a configuração e provisionamento de sua infraestrutura na nuvem.

## OpenTofu + S3 + Magalu Cloud

Este guia demonstra como usar OpenTofu, uma alternativa open source ao Terraform, para criar e gerenciar recursos de Object Storage na Magalu Cloud.

### Pré-requisitos

- Sistema operacional Linux (por exemplo, Ubuntu)
- OpenTofu na versão `v1.7.1` ou superior

### Projeto e Módulo Raiz

Crie um diretório para o projeto e initialize um módulo de configuração raiz:

```bash
mkdir tutorial-tofu
cd tutorial-tofu
echo "terraform {}" > main.tf
tofu validate
```

Módulos do Terraform utilizam plugins chamados Providers, que são extensões instaláveis para permitir o uso de produtos de diferentes nuvens.

Este tutorial usa o provider hashicorp/aws (licença MPL v2.0), que permite interação com fornecedores de Object Storage compatíveis com o padrão S3. Atualize `main.tf`:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.50.0"
    }
  }
}

provider "aws" {
  # Configuration options
}
```

Instale este plugin:

```bash
tofu init
```

> Nota: Existe um provider de Terraform oficial da Magalu Cloud, mas o hashicorp/aws é utilizado para demonstrar compatibilidade com o padrão S3.

### Configuração das Credenciais

O Object Storage da Magalu utiliza autenticação via API Key. Crie uma chave no console em "Início > Object Storage > API Key" clicando em "Criar API Key".

A chave gerada possui **ID** e **Secret**. Configure um arquivo de perfil AWS em `~/.aws/credentials`:

```bash
mkdir -p ~/.aws
cat << EOF >> ~/.aws/credentials
[tutorial-tofu]
aws_access_key_id = COLE_AQUI_O_ID
aws_secret_access_key = COLE_AQUI_O_SECRET
EOF
```

Para a Magalu Cloud, ajuste os campos `endpoint_url` e `region`. Para a região "Brasil - Nordeste 1" (br-ne1):

```bash
cat << EOF >> ~/.aws/config
[profile tutorial-tofu]
endpoint_url = https://br-ne1.magaluobjects.com/
region = br-ne1
EOF
```

Retorne ao módulo raiz e inclua o nome do perfil na configuração do provider:

```hcl
provider "aws" {
  profile                     = "tutorial-tofu"
  skip_region_validation      = true
  skip_requesting_account_id  = true
  skip_credentials_validation = true
}
```

Os atributos adicionais são necessários conforme documentação do plugin.

### Primeiro Bucket

Crie o primeiro recurso: um bucket para armazenar objetos. Crie `resources.tf`:

```hcl
resource "aws_s3_bucket" "first_bucket" {
  bucket_prefix = "tutorial-bucket"
}
```

> Nota: Use `bucket_prefix` em vez de `bucket` pois nomes de buckets na Magalu Cloud são globais e devem ser únicos.

Execute `tofu plan` para planejar o provisionamento:

```bash
tofu plan
```

Este comando exibe as mudanças necessárias. O plano listará a criação do bucket.

Aplique o plano:

```bash
tofu apply -compact-warnings
```

Confirme digitando `yes` quando solicitado. A mensagem final deve ser:

```
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

Verifique o estado do novo recurso:

```bash
tofu state list
tofu state show
tofu show
```

Você também pode verificar a criação do bucket no console, certificando-se de selecionar a região "Brasil - Nordeste 1".

## Mais Recursos: Objetos

Agora que temos um bucket criado, adicione dois arquivos dentro dele usando o recurso `aws_s3_object`. Atualize `resources.tf`:

```hcl
resource "aws_s3_bucket" "first_bucket" {
  bucket_prefix = "tutorial-bucket"
}

resource "aws_s3_object" "first_bucket_objects" {
  for_each = tomap({
    file1 = "./main.tf"
    file2 = "./resources.tf"
  })
  bucket = aws_s3_bucket.first_bucket.id
  key    = each.value
  source = each.value
}
```

O comando `tofu plan` mostrará:

```
Plan: 2 to add, 0 change, 0 destroy.
```

Aplique com `tofu apply`:

```
Apply complete! Resources: 2 added, 0 changed, 0 destroyed.
```

Os arquivos estarão agora na nuvem. O comando `tofu state list` deve mostrar 3 recursos:

```
aws_s3_bucket.first_bucket
aws_s3_object.first_bucket_objects["file1"]
aws_s3_object.first_bucket_objects["file2"]
```

Para ver o estado do segundo objeto:

```bash
tofu state show 'aws_s3_object.first_bucket_objects["file2"]'
```

Resultado:

```hcl
# aws_s3_object.first_bucket_objects["file2"]:
resource "aws_s3_object" "first_bucket_objects" {
    arn                = "arn::s3:::tutorial-bucket20240523203657781600000001/resources.tf"
    bucket             = "tutorial-bucket20240523203657781600000001"
    bucket_key_enabled = false
    content_type       = "application/octet-stream"
    etag               = "01d689431df57be26625e8fb41ac04d2"
    force_destroy      = false
    id                 = "./resources.tf"
    key                = "./resources.tf"
    source             = "./resources.tf"
    storage_class      = "STANDARD"
    tags_all           = {}
}
```

### Desprovisionando Tudo

Para evitar surpresas na conta do cartão de crédito, é crucial saber como limpar todos os recursos criados:

```bash
tofu destroy
```

Resultado:

```
Destroy complete! Resources: 3 destroyed.
```

### Configuração e Estado

O comando `tofu state` fornece informações sobre o estado atual da infraestrutura descrita no código. A declaração descreve a infraestrutura desejada, enquanto o "state" reflete a configuração atual.

A declaração especifica um bucket com certo prefixo no nome e dois objetos dentro, com o caminho dos arquivos locais para cada objeto. O estado contém muito mais informação, como o nome completo que o bucket recebeu, as etags de cada objeto e vários outros detalhes.

Um `ls` no diretório do projeto mostrará dois arquivos gerados que descrevem o estado atual e anterior da instalação:

```
terraform.tfstate
terraform.tfstate.backup
```

Um `less` no arquivo atual após destroy mostrará que o estado atual não possui recursos:

```json
{
  "version": 4,
  "terraform_version": "1.7.1",
  "serial": 7,
  "lineage": "51390cb1-af8e-d82b-99d6-1bb5da876657",
  "outputs": {},
  "resources": [],
  "check_results": null
}
```

### Compartilhando o Estado com o Time

Num cenário onde várias pessoas trabalham na mesma infraestrutura, ter as configurações e estado apenas localmente não é ideal. Além disso, por conter informações sensíveis, não é recomendado colocar os arquivos `tfstate.*` num repositório git, especialmente se for público.

Uma solução é usar a funcionalidade de estado remoto, que suporta várias opções de armazenamento implementadas por diferentes backends.

Este tutorial finaliza com um exemplo de como configurar OpenTofu para armazenar o estado remotamente num bucket S3 da Magalu Cloud usando o backend "s3".

Primeiro, crie um bucket novo para isso em `state-bucket.tf`:

```hcl
resource "aws_s3_bucket" "state_bucket" {
  bucket_prefix = "tutorial-state-bucket"
}
```

Aplique com `tofu apply`.

Exiba o nome do bucket gerado:

```bash
tofu state show aws_s3_bucket.state_bucket
```

Finalmente, adicione o bloco `backend "s3"` ao bloco `terraform` em `main.tf`:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.50.0"
    }
  }
  backend "s3" {
    bucket                      = "NOME_DO_SEU_BUCKET_DE_STATE_AQUI"
    key                         = "the_state"
    region                      = "br-ne1"
    profile                     = "tutorial-tofu"
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_credentials_validation = true
    skip_s3_checksum            = true
  }
}

provider "aws" {
  profile                     = "tutorial-tofu"
  skip_region_validation      = true
  skip_requesting_account_id  = true
  skip_credentials_validation = true
}
```

Para instalar o backend:

```bash
tofu init
```

> Nota: Num cenário mais real, o bucket de state talvez não viveria no mesmo projeto, ou teria prevenções como `lifecycle { prevent_destroy = true }`, ou seria criado manualmente.

---

*Adaptado do post original em Egoísmo Duplicado*
