# Tenant ID

O Tenant ID é o identificador da conta. Nas APIs ele tem o nome de `x-tenant-id`.

Para saber seu tenant ID basta utilizar o seguinte comando na CLI:

```
mgc auth tenant current
```

No retorno haverá o campo `uuid`

```
uuid: afd0199e-0ff10-4a10-at80-4134131
```

Utilize este valor no `x-tenant-id`.
