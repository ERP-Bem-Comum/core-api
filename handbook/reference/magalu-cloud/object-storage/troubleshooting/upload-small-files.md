# Problemas com Upload de Objetos

## Lentidão em Upload de Muitos Arquivos

**Sintoma**

Lentidão em upload de muitos arquivos.

**Causa**

Cada upload de arquivo envolve uma requisição HTTP separada ao S3. Muitas requisições pequenas podem aumentar o overhead de rede e latência.

**Solução**

Recomendamos paralelizar o upload de arquivos para diminuir o tempo de processamento.

### MGC-CLI

A MGC-CLI utiliza o parâmetro `--workers` para definir o número de threads paralelas.

```bash
mgc object-storage objects sync --local=/local/path --bucket=path --workers 32
```

### AWS-CLI

A AWS-CLI permite ajustar a configuração `max_concurrent_requests` no arquivo de configuração para aumentar o número de requisições simultâneas.

**Configurando `max_concurrent_requests` via Arquivo de Configuração**

A configuração `max_concurrent_requests` pode ser definida no arquivo de configuração do AWS CLI (~/.aws/config). Aqui está como você pode configurá-lo:

1. Abra ou crie o arquivo de configuração:

```bash
nano ~/.aws/config
```

2. Adicione ou modifique a configuração:

```
[profile your-profile]
s3 =
  max_concurrent_requests = 32
```

3. Rode o comando `sync`:

```bash
aws s3 sync /local/path s3://bucket-name
```

Substitua `your-profile` pelo nome do perfil AWS que você está usando. Se você não estiver usando perfis, pode usar a seção `[default]`.

### RCLONE

O RCLONE usa o parâmetro `--transfers` para controlar o número de transferências simultâneas.

```bash
rclone copy /local/path remote:path --transfers=32
```

> **Importante**
>
> Recomendamos ajustar esses parâmetros de acordo com a capacidade do seu hardware para encontrar o equilíbrio ideal entre a velocidade de upload e o uso de CPU e RAM. Teste diferentes configurações para otimizar o desempenho conforme suas necessidades.
>
> Se surgir alguma dúvida ou se precisar de assistência adicional, nossa equipe de suporte está à disposição. Abra um [chamado de suporte](https://help.magalu.cloud/hc/pt-br?scope=support) para obter ajuda.
