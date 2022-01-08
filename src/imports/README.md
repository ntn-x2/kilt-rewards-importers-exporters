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
```

The following variables are required

```bash
SUBSCAN_API_KEY
REWARDED_ACCOUNT
```

while the other variables have the following defaults:

```bash
MAX_PAGES=undefined         # Undefined does not cap the maximum # of pages fetched
MAX_ROWS=50
START_PAGE=0
MAX_ATTEMPTS=5
RETRY_TIMEOUT=5
```

For more info about the Substrate HTTP APIs, refer to [their webpage](https://docs.api.subscan.io).