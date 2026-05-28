# Boto3

A **Magalu Cloud** também oferece compatibilidade com SDKs que utilizam o protocolo S3, abaixo segue o exemplo de de uso utilizando bibliotecas em Python, para realizar operações em um bucket hospedado na **Magalu Cloud**

> Atualmente, a Magalu Cloud oferece suporte até a versão 1.35.99 da biblioteca boto3.

Recomenda-se utilizar uma dessas versões para garantir a compatibilidade e evitar possíveis problemas relacionados a funcionalidades não testadas em versões mais recentes.

## Exemplo de Uso com Boto3 (Python):

### Endpoints

Para consultar as regiões e os endpoints disponíveis no magalu cloud [clique aqui](https://docs.magalu.cloud/docs/storage/object-storage/additional-explanations/regions).

```python
import boto3

endpoint_url = "<Region URL>"  # Substitua pela URL da região
aws_access_key_id = '<magalu_access_key_id>'
aws_secret_access_key = '<secret_access_key>'
bucket_name = 'nome-do-bucket'

client = boto3.client('s3',
    endpoint_url=endpoint_url,
    aws_access_key_id=aws_access_key_id,
    aws_secret_access_key=aws_secret_access_key)

def list_buckets():
    response = client.list_buckets()
    buckets = [bucket['Name'] for bucket in response['Buckets']]
    print("Listando buckets...")
    for bucket in buckets:
        print(bucket)

def create_bucket():
    print(f"Criando bucket {bucket_name}...")
    client.create_bucket(Bucket=bucket_name)

def upload_file():
    print("Fazendo upload do arquivo...")
    local_file_path = 'C:/PATH/EXAMPLE/Roadmap.html'
    s3_file_key = 'example'
    client.upload_file(local_file_path, bucket_name, s3_file_key)
```
