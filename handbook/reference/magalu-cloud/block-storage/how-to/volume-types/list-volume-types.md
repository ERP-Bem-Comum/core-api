# Listar tipos de volumes

Atualmente oferecemos 5 tipos de volumes, são eles:

*   NVMe com 1.000 IOPS (cloud\_nvme1k)
*   NVMe com 5.000 IOPS (cloud\_nvme5k)
*   NVMe com 10.000 IOPS (cloud\_nvme10k)
*   NVMe com 15.000 IOPS (cloud\_nvme\_15k)
*   NVMe com 20.000 IOPS (cloud\_nvme20k)

Para listar os tipos de volumes disponíveis, execute o comando abaixo:

## Console

Inicio > Menu > Block Storage

1.  Clique em "Criar volumes";
2.  A lista de tipos de volumes aparecerá no tópico "Escolha um tipo de volume"

## CLI

```bash
mgc block-storage volume-types list
```
