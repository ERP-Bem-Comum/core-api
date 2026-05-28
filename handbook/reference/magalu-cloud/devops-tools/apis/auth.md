# Autenticação nas APIs

Para autenticar-se nas APIs da Magalu Cloud, é necessário criar API Keys com os escopos desejados.

## Método de Autenticação

A autenticação ocorre através do header `x-api-key` nas requisições HTTP.

## Exemplo de Requisição

```curl
curl --location 'https://api.magalu.cloud/REGION/compute/v1/instances' \
--header 'Accept: application/json'
```

Adicione o header de autenticação com sua API Key antes de enviar a requisição.

## Considerações Importantes

Lembre-se de substituir o parâmetro REGION por uma localidade válida, que pode ser:
- br-ne1
- br-se1
