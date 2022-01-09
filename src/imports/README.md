# Importers module

This module contains all the supported tx importers.

## Supported importers

### Subscan Spiritnet HTTP API

For the Subscan importer features to run, the following env variables must be set:

```bash
SUBSCAN_API_KEY     # Subscan API key
REWARDED_ACCOUNT    # The KILT-encoded account to scan for rewards
MAX_PAGES           # Max number of pages to fetch before stopping
MAX_ROWS            # Max number of results to fetch per page
START_PAGE          # The page to start from
MAX_ATTEMPTS        # The max # of attempts upon any request failure before stopping the script
RETRY_TIMEOUT       # The # of seconds to wait between attempts upon request failure
FROM_TIMESTAMP      # The UTC timestamp to start fetching events from
TO_TIMESTAMP        # The UTC timestamp to end fetching events to
```

The following variables are required

```bash
SUBSCAN_API_KEY
REWARDED_ACCOUNT
```

while the other variables have the following defaults:

```bash
MAX_PAGES=undefined         # Undefined does not cap the maximum # of pages fetched
FROM_TIMESTAMP=undefined    # Do not override the selected month-harcoded from timestamp (start from beginning of the month)
TO_TIMESTAMP=undefined      # Do not override the selected month-harcoded to timestamps (end at the end of the month)
MAX_ROWS=50
START_PAGE=0
MAX_ATTEMPTS=5
RETRY_TIMEOUT=5
```

For more info about the Substrate HTTP APIs, refer to [their webpage](https://docs.api.subscan.io).

### Node RPC endpoint

For the RPC importer features to run, the following env variables must be set:

```bash
RPC_ENDPOINT        # The Spiritnet RPC endpoint to query
REWARDED_ACCOUNT    # The KILT-encoded account to scan for rewards
MAX_ROWS            # Max number of results to fetch per page
START_PAGE          # The page to start from
FROM_BLOCK          # The block number to start fetching events from
TO_BLOCK            # The block number to end fetching events to
```

The following variables are required

```bash
RPC_ENDPOINT
REWARDED_ACCOUNT
```

while the other variables have the following defaults:

```bash
FROM_TIMESTAMP=0            # Start from genesis block
TO_TIMESTAMP=undefined      # Uses the latest block at the time of the script running
MAX_ROWS=50
START_PAGE=0
```