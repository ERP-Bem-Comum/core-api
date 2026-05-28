# Download e instalação

## macOS

Para instalar a CLI no seu sistema macOS, você pode escolher entre a instalação via Homebrew ou baixar o arquivo tar.gz. Recomendamos a instalação através da ferramenta Homebrew, pois ela facilita a atualização da CLI e garante que todas as dependências necessárias estejam instaladas e será mais fácil manter a CLI atualizada.

### Homebrew

Para instalar a CLI utilizar a ferramenta brew, você precisa ter certeza de que ela está corretamente instalada no seu sistema. Visite o site oficial: [Homebrew](https://brew.sh/)

Depois abra um terminal e execute o comando de instalação:

```bash
brew install magalucloud/mgc/mgccli
```

### Arquivo tar.gz

A CLI possui arquivos de instalação separados para cada arquitetura. Baixe o arquivo correspondente a sua arquitetura no repositório oficial.

[https://github.com/MagaluCloud/mgccli/releases/](https://github.com/MagaluCloud/mgccli/releases/)

Tenha certeza de que seu usuário possui permissão sudo.

Abra um terminal e execute o seguinte comando para criar um diretório dedicado a CLI na sua home de usuário.

```bash
mkdir ~/mgc_cli
```

Execute o comando abaixo no mesmo diretório onde está o arquivo .tar.gz. Atualize o nome do arquivo de acordo com aquele que você baixou.

```bash
tar -xvf mgc_0.18.3_linux_amd64.tar.gz -C ~/mgc_cli
```

Para melhor experiência com a CLI, recomendamos que o diretório de instalação seja adicionado na variável PATH. Rode o comando abaixo e depois adicione essa linha ao arquivo `~/.bashrc` ou `~/.zshrc` dependendo do seu shell.

```bash
export PATH=$HOME/mgc_cli:$PATH
```

**ATENÇÃO:** Será necessário dar permissão de execução ao binário. Na primeira vez que você executá-lo no terminal, o macOS exibirá um alerta. Ignore o alerta e vá até "Configurações do Sistema", na aba "Privacidade e Segurança". Lá você deverá confirmar que aceita a execução do binário "mgc".

## Linux

Disponibilizamos pacotes .deb e .rpm para instalação em sistemas baseados em Debian e Red Hat, um repositório APT para integração ao sistema de atualizações automáticas de distribuições Debian/Ubuntu, além do arquivo tar.gz para instalação manual.

### Debian / Ubuntu

Para instalar via APT, execute os comandos abaixo:

```bash
# Download da chave de verificação
sudo gpg --yes --keyserver keyserver.ubuntu.com --recv-keys 0C59E21A5CB00594 && sudo gpg --export --armor 0C59E21A5CB00594 | sudo gpg --dearmor -o /etc/apt/keyrings/magalu-archive-keyring.gpg

# Adiciona repositório APT na lista de repositórios
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/magalu-archive-keyring.gpg] https://packages.magalu.cloud/apt stable main" | sudo tee /etc/apt/sources.list.d/magalu.list

# Instala a MGC CLI
sudo apt update
sudo apt install mgccli
```

Para instalar a CLI a partir do pacote deb:

```bash
sudo dpkg -i mgc_x.xx.x_linux_amd64.deb
```

### Fedora / CentOS

```bash
sudo rpm -i mgc_x.xx.x_linux_amd64.rpm
```

### Arquivo tar.gz

Baixe do repositório oficial:
[https://github.com/MagaluCloud/mgccli/releases/](https://github.com/MagaluCloud/mgccli/releases/)

```bash
mkdir ~/mgc_cli
tar -xvf mgc_0.18.3_linux_amd64.tar.gz -C ~/mgc_cli
export PATH=$HOME/mgc_cli:$PATH
```

## Windows

A CLI possui arquivos de instalação separados para cada arquitetura. Baixe o arquivo correspondente a sua arquitetura (amd64 / arm) no repositório oficial.

[https://github.com/MagaluCloud/mgccli/releases/](https://github.com/MagaluCloud/mgccli/releases/)

Para instalar a CLI no seu sistema Windows 10/11 siga os passos abaixo.

1. Realize o download do arquivo ZIP para uma pasta de sua preferência e descompacte o mesmo.
2. Abra um Prompt de Comando ou terminal Powershell como administrador e navegue até a pasta onde você extraiu os arquivos.

```bash
C:\mgc> .\mgc.exe
```

3. Adicione a CLI na variável de ambiente PATH:

```bash
$env:Path += ";C:\mgc"
```

4. Para adicionar de forma persistente:

```bash
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\mgc", [EnvironmentVariableTarget]::User)
```

5. Confirme:

```bash
mgc --version
```

6. Se o processo tiver sido finalizado com sucesso você receberá uma mensagem informando a versão em uso:

```bash
PS C:\mgc> mgc --version
C:\mgc\mgc.exe version v0.34.0 (windows/amd64)
```

7. Execute o comando **mgc auth login**, ele irá lhe redirecionar para autenticação na console.
