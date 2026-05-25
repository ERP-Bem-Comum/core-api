# .NET SDK

A Magalu Cloud oferece compatibilidade com SDKs que utilizam o protocolo S3. Abaixo, apresentamos um exemplo de uso utilizando o SDK para .NET, realizando operações comuns em um bucket hospedado na Magalu Cloud.

## Requisitos

* **.NET 6.0 ou superior**
* **Pacote NuGet**: `AWSSDK.S3`
  ```bash
  dotnet add package AWSSDK.S3
  ```
* **Gerar API Keys**: Siga as instruções para gerar API Keys conforme descrito na documentação de DevOps.

## Exemplo de Uso com SDK .NET

Para utilizar a API é necessário determinar a região que se quer utilizar. As regiões e seus respectivos endpoints encontram-se na documentação de regiões.

```csharp
using System;
using System.IO;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.Runtime;
using System.Collections.Generic;

class Program
{
    static async Task Main(string[] args)
    {
        var awsAccessKey = "<magalu_access_key_id>";
        var awsSecretKey = "<secret_access_key>";
        var serviceUrl = "<Region URL>"; // Exemplo: https://br-se1.magaluobjects.com
        var credentials = new BasicAWSCredentials(awsAccessKey, awsSecretKey);
        var config = new AmazonS3Config
        {
            ServiceURL = serviceUrl,
            ForcePathStyle = true,
            UseHttp = false,
            Timeout = TimeSpan.FromMinutes(10),
            SignatureVersion = "4",
        };
        using var s3Client = new AmazonS3Client(credentials, config);

        // Listar buckets
        await ListBucketsAsync(s3Client);

        // Criar um bucket
        string bucketName = "sdk-dotnet-bucket";
        await CreateBucketAsync(s3Client, bucketName);

        // Fazer upload multipart de um arquivo
        string filePath = "C:/PATH/TO/YOUR/FILE";
        await UploadFileMultipartAsync(s3Client, bucketName, filePath, "file-name");

        // Excluir um bucket
        await DeleteBucketAsync(s3Client, bucketName);
    }

    static async Task ListBucketsAsync(IAmazonS3 s3Client)
    {
        var response = await s3Client.ListBucketsAsync();
        foreach (var bucket in response.Buckets)
        {
            Console.WriteLine($"- {bucket.BucketName}");
        }
    }

    static async Task CreateBucketAsync(IAmazonS3 s3Client, string bucketName)
    {
        var request = new PutBucketRequest { BucketName = bucketName };
        await s3Client.PutBucketAsync(request);
        Console.WriteLine("Bucket criado com sucesso!");
    }

    static async Task UploadFileMultipartAsync(IAmazonS3 s3Client, string bucketName, string filePath, string keyName)
    {
        const int PartSize = 5 * 1024 * 1024;
        var initiateRequest = new InitiateMultipartUploadRequest
        {
            BucketName = bucketName,
            Key = keyName
        };
        var initiateResponse = await s3Client.InitiateMultipartUploadAsync(initiateRequest);
        var uploadId = initiateResponse.UploadId;

        using var fileStream = File.OpenRead(filePath);
        var partETags = new List<PartETag>();

        for (int partNumber = 1; fileStream.Position < fileStream.Length; partNumber++)
        {
            var buffer = new byte[PartSize];
            int bytesRead = await fileStream.ReadAsync(buffer, 0, buffer.Length);
            var uploadPartRequest = new UploadPartRequest
            {
                BucketName = bucketName,
                Key = keyName,
                UploadId = uploadId,
                PartNumber = partNumber,
                PartSize = bytesRead,
                InputStream = new MemoryStream(buffer, 0, bytesRead),
                UseChunkEncoding = false // AVISO: Necessário para compatibilidade com Magalu Cloud
            };
            var uploadPartResponse = await s3Client.UploadPartAsync(uploadPartRequest);
            partETags.Add(new PartETag(partNumber, uploadPartResponse.ETag));
        }

        var completeRequest = new CompleteMultipartUploadRequest
        {
            BucketName = bucketName,
            Key = keyName,
            UploadId = uploadId,
            PartETags = partETags
        };
        await s3Client.CompleteMultipartUploadAsync(completeRequest);
        Console.WriteLine("Upload multipart concluído com sucesso!");
    }

    static async Task DeleteBucketAsync(IAmazonS3 s3Client, string bucketName)
    {
        await s3Client.DeleteBucketAsync(new DeleteBucketRequest { BucketName = bucketName });
        Console.WriteLine("Bucket excluído com sucesso!");
    }
}
```

> **UseChunkEncoding = false**: O uso dessa configuração é obrigatório para compatibilidade com a Magalu Cloud. Ela desativa o chunked encoding no upload, evitando problemas de compatibilidade.

## Links Úteis

* [Instalação do SDK Amazon S3 para .NET](https://docs.aws.amazon.com/sdk-for-net/v3/developer-guide/net-dg-install-sdk.html)
* Troubleshooting para erros de upload usando o SDK .NET
