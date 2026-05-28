# Variáveis de ambiente

Esta documentação descreve como configurar e utilizar variáveis de ambiente a CLI. Essas variáveis de ambiente são usadas para autenticação e configuração de ambiente ao interagir com a infraestrutura e serviços fornecidos.

## Variáveis de Ambiente

1. `MGC_API_KEY` - Chave de API para autenticação. [Saiba mais](../../api-keys/overview.md).

2. `MGC_OBJ_KEY_ID` - ID da chave para acessar ao produto de Object Storage. [Saiba mais](../../api-keys/overview.md).

3. `MGC_OBJ_KEY_SECRET` - _Secret_ da chave para acessar ao produto de Object Storage. [Saiba mais](../../api-keys/overview.md).

4. `MGC_REGION` - Especifica a região onde os recursos serão criados e gerenciados.

5. `MGC_ENV` - Define o ambiente de operação para diferenciar entre diferentes fases de desenvolvimento.

> **warning**
>
> As variáveis de ambiente têm prioridade sobre a configuração do provider. Mas não sobre parâmetros inline dos comandos. A variável MGC_API_KEY, por exemplo, é usada por padrão se estiver definida, mas é sobrescrita em um comando que utilize o parâmetro `--api-key=<minha-chave>`.

## Exemplo de utilização

### Linux

```bash
export MGC_API_KEY="sua_api_key_aqui"
export MGC_OBJ_KEY_ID="seu_obj_key_id_aqui"
export MGC_OBJ_KEY_SECRET="seu_obj_key_secret_aqui"
export MGC_REGION="sua_regiao_aqui"
export MGC_ENV="seu_ambiente_aqui"
```

### Windows

```powershell
$env:MGC_API_KEY="sua_api_key_aqui"
$env:MGC_OBJ_KEY_ID="seu_obj_key_id_aqui"
$env:MGC_OBJ_KEY_SECRET="seu_obj_key_secret_aqui"
$env:MGC_REGION="sua_regiao_aqui"
$env:MGC_ENV="seu_ambiente_aqui"
```
