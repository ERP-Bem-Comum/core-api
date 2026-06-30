# Copiar o snapshot object de uma região a outra

A cópia de snapshots object de uma determinada região a outra pode ser uma ferramenta útil quando se deseja criar volumes disponíveis exclusivamente em uma região para fins de replicação, backup ou mesmo setup de ambiente.

Para efetuar a cópia é necessário que o usuário já possua um snapshot de determinado volume em uma região específica.

> No momento só é possível a cópia de snapshots da região **MGL1** para as regiões **SE1** ou **NE1**

Para a referência da região e do snapshot utilize os parâmetros abaixo:

| Nome | Tipo | Descrição |
|------|------|-----------|
| id | UUID | O id do snapshot |
| destination-region | string | região destino |

## Copiar snapshot object

```bash
mgc block-storage snapshots copy --id="5efd97f4-5534-4b4d-80e8-12db12ce2f85" --destination-region="br-se1"
```

> Caso a cópia seja necessária para Instant Snapshots pode ser feita a conversão deste snapshot para o tipo object e após isso a cópia conforme procedimento acima.

Para transformar um instant snapshot em um Snapshot Object deve-se usar o prompt abaixo:

| Nome | Tipo | Descrição |
|------|------|-----------|
| source-snapshot.id | string | O id do snapshot instant |
| source-snapshot.name | string | O nome do snapshot instant |
| type | string | o tipo do snapshot (no caso aqui object) |
| name | string | o nome do snapshot a ser criado (object) |

## Transformar Instant snapshot em Object

```bash
mgc block-storage snapshots create --source-snapshot.id="0ee497f3-4113-46ea-a9c1-2bf3ed8e6ed4" --type="object" --name="snapobject"
```

A restauração de um snapshot poderá ser feita na criação de um novo volume. Esta mesma ação estará disponível no console em breve.

Para a referência do snapshot podem ser usados 2 tipos de parâmetros:

| Nome | Tipo | Descrição |
|------|------|-----------|
| id | string | O id do snapshot |
| name | string | nome do snapshot |

## Restaurar o snapshot Object na nova região

```bash
mgc block-storage volumes create --name="mysnapshot" -size="10" --type.name="cloud_nvme10k" --snapshot.id="00e295b5-5a4a-46bc-8237-f2682a786928"
```
