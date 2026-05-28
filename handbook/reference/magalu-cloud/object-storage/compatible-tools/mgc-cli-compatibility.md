# MGC CLI

## Magalu Cloud Command Line Interface

O MGC CLI (Magalu Cloud Command Line Interface) é uma ferramenta que permite interagir diretamente com os serviços da Magalu Cloud por meio da linha de comando. Compatível com macOS, Linux e Windows, a CLI oferece suporte para arquiteturas AMD64 e ARM, proporcionando flexibilidade em diversos ambientes.

## Como Configurar a MGC CLI com API Keys

1. **Instalação**: Siga as instruções na documentação oficial da MGC CLI.

2. **Gerar API Keys**: Siga as instruções para gerar API Keys.

3. **Configuração da API Key**:

   - Para definir seu par de chaves, edite o arquivo `~/.config/mgc/default/auth.yaml`:

   ```yaml
   access_key_id: <access_key_id>
   secret_access_key: <secret_access_key>
   ```

4. **Alterar Região Padrão**:

   - Para verificar as regiões disponíveis, execute o seguinte comando:

   ```bash
   mgc config get-schema region -o jsonpath=$.enum
   ```

   - Para definir a região execute o seguinte comando:

   ```bash
   mgc config set --key region --value <region>
   ```

   - Edite o arquivo `~/.config/mgc/default/cli.yaml` para definir a sua região:

   ```yaml
   region: <region>
   ```

   - Para usar uma região diferente da definida nas configurações, use a flag `--region` como o exemplo abaixo:

   ```bash
   mgc object-storage buckets list --region <region>
   ```

> **Note**: Por padrão a MGC-CLI usa a região `br-se1`
