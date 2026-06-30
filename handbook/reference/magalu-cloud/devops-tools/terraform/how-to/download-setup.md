# Como usar o provider

Você pode visitar a [página oficial do provider MGC no registro online do Terraform](https://registry.terraform.io/providers/MagaluCloud/mgc/latest) e abaixo estão os passos iniciais que auxiliam na configuração do provider para o seu projeto.

1.  Crie uma pasta para o seu projeto, como por exemplo: `~/terraform-mgc`.
2.  Crie um novo arquivo de configuração para o projeto, como por exemplo `~/terraform-mgc/main.tf`
3.  Adicione o código abaixo ao arquivo `main.tf` recém criado:

O código abaixo fará o download e instalação da última versão do provider mgc.

```hcl
terraform {
    required_providers {
        mgc = {
        source = "MagaluCloud/mgc"
        }
    }
}

provider "mgc" {
    # Configuration options
}
```

Se você deseja instalar uma versão específica do provider, basta adicionar o parâmetro `version`, como mostra este outro exemplo:

```hcl
terraform {
    required_providers {
        mgc = {
        source = "MagaluCloud/mgc"
        version = "0.18.6"
        }
    }
}

provider "mgc" {
    # Configuration options
}
```

No código acima estamos forçando a instalação do provider de versão `0.18.6`.
