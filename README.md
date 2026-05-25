# opencode-copilot-provider

A minimal, configurable GitHub Copilot auth/provider helper.

This repo provides a tiny, separate implementation of the GitHub Copilot auth flow, where the client ID can be easily changed.

## Features

- GitHub device-code login
- Token polling
- Copilot token exchange
- Copilot models fetch
- Configurable `client_id`

## Quick Start

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/WallenHan/opencode-copilot-provider.git
    cd opencode-copilot-provider
    ```

2.  **Run the authentication:**

    This command will guide you through the GitHub device login.

    ```bash
    node index.mjs auth
    ```

    You will see a URL and a code. Open the URL in your browser and enter the code to authorize the application.

3.  **Use a custom Client ID:**

    You can override the default client ID in two ways:

    **Option A: Command-line argument**

    ```bash
    node index.mjs auth --client-id <your-client-id>
    ```

    **Option B: Environment variable**

    ```bash
    export OPENCODE_COPILOT_CLIENT_ID=<your-client-id>
    node index.mjs auth
    ```

## Other Commands

-   **Get device code without waiting:**

    This will print the device code JSON and exit, allowing you to handle the polling yourself.

    ```bash
    node index.mjs login
    ```

-   **Fetch available Copilot models:**

    You need a valid `refresh_token` from the `auth` command to do this.

    ```bash
    # First, get a refresh token
    # The output of `auth` command will contain a "refresh_token"
    node index.mjs auth > auth_output.json
    REFRESH_TOKEN=$(jq -r .refresh_token auth_output.json)

    # Then, exchange it for a Copilot token and fetch models
    # Note: This is a simplified example. The script does this internally.
    # To fetch models, you need a short-lived bearer token, not the refresh token.
    # The `auth` command gives you the final copilot token.
    COPILOT_TOKEN=$(jq -r .copilot_token auth_output.json)
    node index.mjs models --token $COPILOT_TOKEN
    ```
