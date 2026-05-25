# Dicas de flags no CLI

## Limit

You can use `--control.limit` to control the quantity of results printed:

```
mgc virtual-machines machine-types list --control.limit 10
```

## Offset

You can use `--control.offset` to control the offset of results printed:

```
mgc virtual-machines machine-types list --control.offset 10
```

## Sort

You can use `--control.sort` to control the ordering of results printed:

```
mgc virtual-machines machine-types list --control.sort name:asc,end_standard_support_at:desc
```
