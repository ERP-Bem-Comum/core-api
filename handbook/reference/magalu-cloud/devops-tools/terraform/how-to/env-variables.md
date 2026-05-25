# Variáveis de ambiente

## Aviso Importante

"A partir da versão 0.35.0 do Terraform Provider, não temos mais suporte a variáveis de ambiente específicas da Magalu Cloud."

Recomenda-se utilizar o padrão oficial do Terraform com o formato `TF_VAR_nome_da_variavel`.

## Para versões anteriores à 0.35.0

Se você usa versões antigas, evite essas variáveis para facilitar futuras atualizações do provider.

### Variáveis Suportadas

As seguintes variáveis de ambiente estão disponíveis:

1. **`MGC_API_KEY`** - Chave de API para autenticação
2. **`MGC_OBJ_KEY_ID`** - ID da chave para Object Storage
3. **`MGC_OBJ_KEY_SECRET`** - Secret da chave para Object Storage
4. **`MGC_REGION`** - Região onde recursos serão criados
5. **`MGC_ENV`** - Define o ambiente de operação

### Precedência

"As variáveis de ambiente têm prioridade sobre a configuração do provider."

## Exemplos de Utilização

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
