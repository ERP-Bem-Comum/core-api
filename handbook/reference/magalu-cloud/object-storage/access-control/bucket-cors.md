# Bucket CORS

## O que é CORS?

**CORS** (Cross-Origin Resource Sharing) é um mecanismo de segurança que permite que aplicações web hospedadas em diferentes domínios acessem recursos de um bucket, desde que o bucket esteja configurado para permitir essas requisições.

### Objetivo Principal

Permitir que aplicações externas – como frontends JavaScript, SPAs ou sistemas de terceiros – consumam diretamente recursos armazenados no bucket (como imagens, PDFs, arquivos de mídia etc.), respeitando regras pré-definidas de origem, métodos e cabeçalhos.

## Funcionamento do CORS

A configuração de CORS é feita por meio de regras em formato JSON, associadas a um bucket. Essas regras determinam:

- Quais domínios (origens) podem acessar o bucket
- Quais métodos HTTP são permitidos
- Quais cabeçalhos podem ser usados nas requisições
- Quais cabeçalhos podem ser expostos à aplicação cliente
- Por quanto tempo a resposta preflight (OPTIONS) pode ser cacheada pelo navegador

> CORS **não substitui** as permissões de acesso do bucket. É necessário garantir que os objetos tenham as ACLs ou Policies corretas.

## Estrutura de uma Regra de CORS

A estrutura básica de uma regra CORS segue o padrão abaixo:

```json
[
  {
    "AllowedOrigins": ["https://dominio.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Componentes

- **AllowedOrigins**: Lista de domínios permitidos a acessar o bucket.
- **AllowedMethods**: Métodos HTTP permitidos (ex: `GET`, `POST`, `PUT`, etc).
- **AllowedHeaders**: Cabeçalhos que a requisição pode enviar.
- **ExposeHeaders**: Cabeçalhos que a resposta pode expor à aplicação.
- **MaxAgeSeconds**: Duração do cache da resposta preflight no navegador.

## Considerações de Segurança

- Evite usar `AllowedOrigins: ["*"]` em buckets privados ou com dados sensíveis.
- Sempre combine CORS com uma política de acesso apropriada (ACLs ou Bucket Policy).
