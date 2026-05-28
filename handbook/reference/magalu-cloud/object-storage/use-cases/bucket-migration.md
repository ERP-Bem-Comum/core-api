# Migrando Buckets com Rclone

Este guia fornece um passo a passo para realizar a migração de buckets entre diferentes provedores de cloud ou entre regiões distintas dentro de um mesmo provedor utilizando a ferramenta Rclone. Alguns exemplos de situações em que pode ser necessário realizar a migração de buckets incluem:

* **Mudança de Provedor de Cloud**: Quando uma organização decide mudar de provedor de serviços em nuvem por alguma razão.
* **Reorganização Geográfica**: Quando há a necessidade de transferir dados para uma nova região, por exemplo, para reduzir latência ou atender a requisitos de conformidade/regulamentação específicos de uma localidade.

## Configurações Iniciais

Antes de iniciar a migração, é necessário realizar algumas configurações iniciais:

1. Primeiramente, crie dois perfis no Rclone, conforme descrito na documentação. Recomendamos utilizar nomes de perfil explícitos para facilitar a identificação, como exemplificado abaixo:
   * Perfil de origem: origem-ne1 (caso esteja migrando de uma região NE1 para SE1)
   * Perfil de destino: destino-se1

2. Crie um novo bucket no perfil de destino, garantindo que o nome seja único. O comando para criação é o seguinte:

```bash
rclone mkdir DESTINO:BUCKET-NAME
```

**Nota**: Substitua DESTINO pelo nome do perfil de destino e BUCKET-NAME pelo nome do bucket a ser criado. O nome do bucket é único, ou seja, o nome do bucket destino deve ser diferente do nome atual ou o comando será abortado.

## Realizando a Migração

Com os perfis configurados e o bucket de destino criado, execute o comando abaixo para iniciar a migração dos dados entre os buckets:

```bash
rclone sync ORIGEM:BUCKET-NAME DESTINO:BUCKET-NAME
```

**Nota**: Neste comando, substitua ORIGEM e DESTINO pelos perfis configurados e BUCKET-NAME de seus respectivos perfis.

## Otimizando a Migração

Para acelerar o processo de migração, é possível ajustar a quantidade de transferências simultâneas utilizando a flag `--transfers`. Por exemplo:

```bash
rclone sync ORIGEM:BUCKET-NAME DESTINO:BUCKET-NAME --transfers 16
```

Esse comando configura o Rclone para realizar até 16 transferências simultâneas, o que pode resultar em um aumento significativo na velocidade da migração.

Para mais informações sobre como otimizar o desempenho do Rclone, consulte a documentação adicional sobre boas práticas e tuning.
