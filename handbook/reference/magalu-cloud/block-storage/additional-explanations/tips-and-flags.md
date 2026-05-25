# Dicas de flags no CLI

## Limit

É possível usar `--control.limit` para controlar a quantidade de resultados impressos:

```bash
mgc virtual-machine machine-types list --control.limit 10
```

## Offset

É possível usar `--control.offset` para controlar o offset de resultados impressos:

```bash
mgc virtual-machine machine-types list --control.offset 10
```

## Sort

É possível usar `--control.sort` para controlar a ordenação dos resultados impressos:

```bash
mgc virtual-machine machine-types list --control.sort name:asc,end_standard_support_at:desc
```
