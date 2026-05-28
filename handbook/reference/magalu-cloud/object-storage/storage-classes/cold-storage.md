# Cold Instant

Por padrão, novos objetos utilizam a classe de armazenamento "standard", que é adequada para acessos **frequentes**. No entanto, para muitos casos, o acesso aos objetos armazenados pode ser **raro** e o principal objetivo é garantir que eles sejam mantidos por **longos períodos**, ainda que disponíveis para acesso rápido quando necessário.

**Exemplos**: backups, logs, registros arquivados para cumprimento de legislações.

Para esses casos, nas regiões suportadas, está disponível a classe de armazenamento fria "cold_instant", que oferece um custo de **armazenamento** reduzido e um custo de **acesso** mais elevado. Consulte a página de Preços para comparar as diferentes classes de armazenamento.

> No momento, a única região que oferece suporte para a classe de armazenamento "cold_instant" é a região **Sudeste 1 (br-se1)**.

Na Magalu Cloud, a classe de armazenamento é definida por objeto, permitindo que um mesmo bucket contenha objetos de diferentes classes.

## Upload de Objeto com a Classe de Armazenamento "cold_instant"

### MGC-CLI

Para carregar um novo arquivo com a classe de armazenamento fria, utilize o valor "cold_instant" no argumento `--storage-class`:

```bash
mgc object-storage objects upload ARQUIVO NOME_DO_BUCKET --storage-class=cold_instant
```

### AWS-CLI

Na AWS CLI, o nome da classe de armazenamento deve ser um dos disponíveis na AWS; `cold_instant` não é suportada. Para contornar essa limitação, use o nome `GLACIER_IR`

```bash
aws s3 cp --storage-class=GLACIER_IR ARQUIVO s3://NOME_DO_BUCKET
```

### RCLONE

Na ferramenta RClone, o argumento é `--s3-storage-class`:

```bash
rclone copyto --s3-storage-class="cold_instant" ARQUIVO NOME_DO_REMOTO:NOME_DO_BUCKET/NOME_DO_OBJETO
```

Substitua `NOME_DO_REMOTO` pelo nome do seu remote configurado no RClone, `NOME_DO_BUCKET` pelo nome do bucket e `NOME_DO_OBJETO` pelo nome do arquivo dentro desse bucket.

## Modificar a Classe de Armazenamento de um Objeto de "standard" para "cold_instant"

### MGC-CLI

Para alterar a classe de armazenamento de um objeto via CLI, copie o objeto para o mesmo bucket com o parâmetro `--storage-class=cold_instant`:

```bash
mgc object-storage objects copy NOME_DO_BUCKET/NOME_DO_OBJETO MESMO_NOME_DO_BUCKET/MESMO_NOME_DO_OBJETO --storage-class=cold_instant
```

Este comando, se usado com um destino diferente da origem, faz uma cópia do objeto original, que continuará existindo com a classe de armazenamento original.

### AWS-CLI

Para alterar a classe de armazenamento de um objeto via CLI, copie o objeto para o mesmo bucket trocando o parâmetro `--storage-class`. Na AWS CLI, o nome da classe de armazenamento deve ser um dos disponíveis na AWS; `cold_instant` não é suportada. Utilize o nome `GLACIER_IR`.

```bash
aws s3 cp --storage-class GLACIER_IR s3://NOME_DO_BUCKET/NOME_DO_OBJETO s3://MESMO_NOME_DO_BUCKET/MESMO_NOME_DO_OBJETO
```

Este comando, se usado com um destino diferente da origem, faz uma cópia do objeto original, que continuará existindo com a classe de armazenamento original.

### RCLONE

```bash
rclone settier "cold_instant" "NOME_DO_REMOTO:NOME_DO_BUCKET/NOME_DO_OBJETO"
```

Substitua `NOME_DO_REMOTO` pelo nome do seu remote configurado no RClone, `NOME_DO_BUCKET` pelo nome do bucket e `NOME_DO_OBJETO` pelo nome do arquivo dentro desse bucket.
