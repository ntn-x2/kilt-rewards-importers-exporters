# KILT staking rewards importer & exporter

This repo contains a bunch of utility scripts to retrieve and optionally export KILT staking rewards information.

### Imports

For now, the only supported import methods use either the Subscan.io HTTP APIs for KILT Spiritnet or the RPC endpoint exposed by KILT Spiritnet nodes.

For more details about that, see the [imports module](src/imports).

### Exports

For now, the only supported export method generates a CSV file that follows the model expected by Koinly.io to import transactions for wallets/coins not yet supported.

For more details about that, see the [exports module](src/exports).

## Install and run

The repo contains an example `main()` function which fetches some historical data from Subscan and exports it to a CSV file.
The main can be changed according to each one's needs.

Depending on the import/export features, some environment variables must be specified.
Again, to check what those variable are, please refere to the [imports](src/imports) and [exports](src/exports) modules.

Once the needed variables have been set, install the dependencies with

```
yarn
```

and run the `main()` with

```
yarn start
```

### Example Environment

```
REWARDED_ACCOUNT=4p...r
RPC_ENDPOINT=wss://spiritnet.kilt.io
FROM_BLOCK=0
OUT_PATH=october2021.csv
```
