# AWS CLI

## **AWS CLI**

A AWS CLI é amplamente utilizada para interagir com sistemas que utilizam o protocolo S3. Veja como configurá-la para uso com a Magalu Cloud:

Escolha seu sistema operacional para os comandos necessários:

### Linux

1. **Instalação**:

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli --update
```

### MacOS

1. **Instalação**:

```bash
curl "https://awscli.amazonaws.com/AWSCLIV2-2.22.35.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

### Windows

1. **Instalação**:

No Windows, você pode escolher uma das duas formas de instalação:

**Usando o instalador gráfico**:

- Baixe e execute o instalador `.msi` diretamente:

https://awscli.amazonaws.com/AWSCLIV2.msi

**Usando o comando `msiexec`**:

- Ou, execute o comando abaixo diretamente no PowerShell ou no prompt de comando:

```powershell
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

2. **Gerar API Keys**: Siga as instruções para gerar API Keys.

3. **Configuração da API Key**:

- Execute o comando `aws configure`

- Insira as informações solicitadas:

```bash
AWS Access Key ID [None]: <magalu_access_key_id>
AWS Secret Access Key [None]: <secret_access_key>
Default region name [None]: <Region>
Default output format [None]: <Enter>
```

4. **Configuração do Endpoint URL**:

- Edite o arquivo `~/.aws/config` para adicionar o endpoint da Magalu Cloud:

```
[default]
region = <Region>
endpoint_url = <Magalu Cloud URL>
```

5. **Validar a instalação**:

- Execute o comando `aws --version` para verificar se a versão correta do AWS CLI está sendo retornada.

```bash
aws --version
```

> **Endpoints**: Para consultar as regiões e os endpoints disponíveis no Magalu Cloud, consulte a documentação de regiões.
