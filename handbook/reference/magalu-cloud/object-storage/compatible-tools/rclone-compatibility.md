# Rclone

## RClone

"O RClone é uma ferramenta poderosa para sincronização de dados entre diferentes sistemas de armazenamento." Para integrá-lo com a Magalu Cloud, siga estas etapas:

1. **Instalação**: Acesse a documentação oficial do RClone para instruções de setup.

2. **Gerar API Keys**: Crie chaves de acesso conforme orientado na seção dedicada de API Keys.

3. **Configuração da API Key**:
   - Execute `rclone config`
   - Selecione a região e endpoint apropriados
   - Crie um novo remote seguindo este modelo:

```
Enter name for new remote: <RemoteName>
Type of storage configure: <s3>
Choose your S3 provider: Magalu
access_key_id: <magalu_access_key_id>
secret_access_key: <secret_access_key>
endpoint: <Magalu Cloud URL>
```

**Nota importante**: A opção "Magalu" como provedor S3 está disponível a partir da versão v1.67.0 (lançada em 14/06/2024). Em versões anteriores, utilize a opção "Other" para configuração.
