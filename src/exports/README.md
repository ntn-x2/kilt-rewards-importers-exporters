# Exporters module

This module contains all the supported tx exporters.

## Supported exporters

### Koinly custom tx format

For the Koinly exporter features to run, the following env variables must be set:

```bash
OUT_DIR     # Path to the folder that will contain the output file
OUT_FILE    # Name of the output CSV file that will contain the exported txs,
KOINLY_OUT_DRY_RUN  # Boolean that, if set to true, outputs the txs in CSV format without actually writing them to any file
```

All these variables have defaults, which are

```bash
OUT_DIR="."   # Project root
OUT_FILE="out.csv"
KOINLY_OUT_DRY_RUN="false"
```

For more info about the Koinly expected structure, refer to [their webpage](https://help.koinly.io/en/articles/3662999-how-to-create-a-custom-csv-file-with-your-data).