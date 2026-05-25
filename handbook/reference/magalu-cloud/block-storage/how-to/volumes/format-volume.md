# Formatar e montar um volume

## Pré-requisitos

- O volume deve estar no estado disponível (available)
- O volume deve estar anexado a uma instância

Após a criação do novo volume, é preciso formatá-lo. Essa formatação é necessária para criar um sistema de arquivos no volume, ou seja, essa operação é necessária somente na criação de um novo volume.

Adicionalmente, obrigatoriamente quando anexar um volume a uma instância, incluindo a primeira vez, é necessário sua montagem. A montagem de um volume formatado adiciona o sistema de arquivos do volume à hierarquia de arquivos existente da sua instância. Dessa forma, o volume acessível fica acessível ao sistema operacional da instância.

Ao criar um volume do Block Storage na Magalu Cloud e anexá-lo à sua instância, um novo dispositivo de armazenamento será automaticamente apresentado à instância e você poderá formatá-lo e montá-lo da seguinte forma:

## Em Sistemas Linux

1. Identifique o volume: Use lsblk ou fdisk -l para identificar o nome do dispositivo associado ao volume (ex: /dev/sdb).

2. Formate o volume: Execute o comando de formatação correspondente ao sistema de arquivos escolhido:

   - Para ext4: `sudo mkfs.ext4 /dev/sdb`
   - Para XFS: `sudo mkfs.xfs /dev/sdb`

3. Monte o volume: Crie um ponto de montagem e monte o volume:

```bash
sudo mkdir /mnt/meuvolume
sudo mount /dev/sdb /mnt/meuvolume
```

4. Atualize o fstab (opcional): Para que o volume seja montado automaticamente após reinicializações, adicione-o ao arquivo /etc/fstab:

```bash
echo '/dev/sdb /mnt/meuvolume ext4 defaults 0 0' | sudo tee -a /etc/fstab
```

## Em Sistemas Windows

1. Abra o Gerenciador de Discos: Pressione Win + X e selecione "Gerenciamento de Disco".

2. Inicialize o disco (se necessário): Se o volume aparecer como não inicializado, clique com o botão direito sobre ele e selecione "Inicializar Disco". Escolha o estilo de partição (MBR ou GPT).

3. Crie uma nova partição: Clique com o botão direito no espaço não alocado e selecione "Novo Volume Simples". Siga as instruções para formatar o volume com NTFS ou o sistema de arquivos desejado.

4. Atribua uma letra ao volume: Durante o processo de criação do volume, você poderá escolher uma letra de unidade para facilitar o acesso.
