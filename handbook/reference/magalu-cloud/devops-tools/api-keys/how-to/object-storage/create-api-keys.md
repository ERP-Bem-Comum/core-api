# Criar API Keys

## Console | CLI MGC

⚠️ **Warning**: "API Key dará acesso total a Object Storage, permitindo que todas as ações disponíveis possam ser executadas"

### Console Steps

1. Access [ID Magalu](https://id.magalu.com/api-keys) (ensure you're authenticated with an account that has necessary permissions)
2. Click "Criar API Key"
3. Define a name for the API Key
4. Select the expiration period
5. Select Object Storage
6. Choose desired permissions (read-only / create-only / both)

![Object Storage Marker](/assets/images/object-storage-marker-1599d75df7a8cf07a5e699097e805fd7.png)

⚠️ **Warning**: Even when selecting the "Acesso Total" flag in Permissions, Object Storage requires checking the specific checkbox shown in the image.

### CLI MGC Steps

After completing [authentication](../../../cli-mgc/how-to/auth.md), create a new API key by executing:

```
mgc object-storage api-key create <api-key-name>
```

The command returns a UUID. Use it in the following command to define the keys you'll use:

```
mgc object-storage api-key set <api-key-uuid>
```
