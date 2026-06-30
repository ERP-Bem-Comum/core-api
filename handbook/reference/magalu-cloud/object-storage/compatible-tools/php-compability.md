# PHP

PHP é uma das linguagens mais populares atualmente, por apresentar compatibilidade com diversas outras ferramentas, permitindo uma flexibilidade aos desenvolvedores. Ela também é compatível com o AWS SDK, tornando possível executar métodos de armazenamento de objetos via script.

> Atualmente, o mgc suporta até a versão 3.335.* do AWS-SDK.

## Pré-requisitos

- PHP >= 8.0
- COMPOSER >= 2.0
- AWS-SDK <= 3.335.0

### Baixando a AWS-SDK utilize:

1. Por meio de linha de comando

```bash
composer require aws/aws-sdk-php=3.335.0 -W
```

## Exemplo de Upload de Arquivo para a MGC:

Para utilizar a api é necessário determinar a região que se quer utilizar, elas e seus respectivos endpoints se encontram [aqui](https://docs.magalu.cloud/docs/storage/object-storage/additional-explanations/regions).

```php
<?php

use Aws\S3\S3Client;
use Aws\Exception\AwsException;

$accessKey = 'xxxxxxxxxxxxxxx';
$secretKey = 'xxxxxxxxxxxxxxx';

$region = 'br-se1';

try {
    $s3Client = new S3Client([
        'region' => $region,
        'version' => 'latest',
        'credentials' => [
            'key' => $accessKey,
            'secret' => $secretKey,
        ],
        #'debug' => true,
        'endpoint' => "https://{$region}.magaluobjects.com", // Endpoint da MagaluCloud
        'use_path_style_endpoint' => true,
    ]);
} catch (AwsException $e) {
    echo "Erro ao criar sessão:\n";
    echo $e->getMessage();
}
?>
```

---

### Criar Bucket

```php
<?php

function criar_bucket($bucketName, $s3Client, $secretKey) {
    try {
        $result = $s3Client->createBucket([
            'Bucket' => $bucketName,
        ]);
        echo "Bucket criado com sucesso!\n";
    } catch (AwsException $e) {
        echo "Erro ao criar o bucket:\n";
        echo $e->getMessage();
        exit(1);
    }
}

?>
```

### Listar Buckets

```php
<?php

function listar_buckets($s3Client, $secretKey) {
    try {
        $result = $s3Client->listBuckets();
        foreach ($result['Buckets'] as $bucket) {
            echo $bucket['Name'] . "\n";
        }
    } catch (AwsException $e) {
        echo "Erro ao listar os buckets:\n";
        echo $e->getMessage();
        exit(1);
    }
}

?>
```

### Apagar Bucket

```php
<?php

function apagar_buckets($bucketName, $s3Client, $secretKey) {
    try {
        $result = $s3Client->deleteBucket([
            'Bucket' => $bucketName,
        ]);
        echo "Bucket deletado com sucesso!\n";
    } catch (AwsException $e) {
        echo "Erro ao deletar o bucket:\n";
        echo $e->getMessage();
        exit(1);
    }
}

?>
```

---

### Upload de Objetos

```php
<?php

function upload_object($bucketName, $s3Client, $filePath) {
    try {
        $objectName = basename($filePath);
        if (!file_exists($filePath)) {
            throw new Exception("O arquivo {$filePath} não foi encontrado.\n");
            exit(1);
        }
        $result = $s3Client->putObject([
            'Bucket' => $bucketName,
            'Key' => $objectName,
            'SourceFile' => $filePath,
            'ContentType' => mime_content_type($filePath), // Define o tipo de conteúdo
        ]);
        echo "Arquivo enviado com sucesso!\n";
    } catch (AwsException $e) {
        echo "Erro ao enviar o arquivo:\n";
        echo $e->getMessage();
        exit(1);
    }
}

?>
```

### Download de Objetos

```php
<?php

function download_object($bucketName, $s3Client, $objectName) {
    try {
        $result = $s3Client->getObject([
            'Bucket' => $bucketName,
            'Key' => $objectName,
            'SaveAs' => $objectName,
        ]);
        echo "Arquivo baixado com sucesso!\n";
    } catch (AwsException $e) {
        echo "Erro ao baixar o arquivo:\n";
        echo $e->getMessage();
        exit(1);
    }
}

?>
```

### Listar Objetos

```php
<?php

function list_objects($bucketName, $s3Client) {
    try {
        $result = $s3Client->listObjects([
            'Bucket' => $bucketName,
        ]);
        foreach ($result['Contents'] as $object) {
            echo $object['Key'] . "\n";
        }
    } catch (AwsException $e) {
        echo "Erro ao listar os objetos:\n";
        echo $e->getMessage();
        exit(1);
    }
}

?>
```

### Apagar Objetos

```php
<?php

function apagar_objeto($bucketName, $s3Client, $objectName) {
    try {
        $result = $s3Client->deleteObject([
            'Bucket' => $bucketName,
            'Key' => $objectName,
        ]);
        echo "Arquivo deletado com sucesso!\n";
    } catch (AwsException $e) {
        echo "Erro ao deletar o arquivo:\n";
        echo $e->getMessage();
        exit(1);
    }
}

?>
```
