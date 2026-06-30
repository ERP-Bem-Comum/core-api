# Autenticação

Para se autenticar, basta adicionar sua API Key no provider:

```hcl
provider "mgc" {
  alias = "nordeste"
  region = "br-ne1"
  api_key = "00000000-0000-0000-0000-000000000"
}
```

💡 Saiba como [criar uma API Key](../../api-keys/how-to/other-products/create-api-key.md)

## Autenticação com API Key em Object Storage

Para utilizar no Object Storage, temos uma diferença, por utilizarmos o protocolo S3, é necessário utilizar os pares de chaves (`Key Pairs`), para gerar os pares de chaves, siga as instruções aqui [Como gerar Key Pairs](../../api-keys/how-to/object-storage/create-api-keys.md)

## Exemplo de como utilizar `Key Pairs` e `API-Key` no Terraform

```hcl
provider "mgc" {
  alias = "nordeste"
  region = "br-ne1"
  api_key = "00000000-0000-0000-0000-000000000"
  object_storage = {
    key_pair = {
      key_id = "00000000-0000-0000-0000-000000000"
      key_secret = "00000000-0000-0000-0000-000000000"
    }
  }
}
```

Para mais detalhes e exemplos de uso de API Key no terraform, consulte a [documentação oficial](https://registry.terraform.io/providers/MagaluCloud/mgc/latest/docs/guides/api-key) no [Terraform Registry](https://registry.terraform.io/providers/MagaluCloud/mgc/latest/docs/guides/api-key)
