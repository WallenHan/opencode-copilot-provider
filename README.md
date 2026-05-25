# opencode-copilot-provider

A configurable, third-party GitHub Copilot provider for OpenCode.

This repository provides a standalone implementation of the GitHub Copilot authentication flow, packaged as a local OpenCode plugin. It allows you to use a **custom Client ID** and connect to **GitHub Enterprise**.

## Features

-   **Custom Client ID**: Easily override the default Copilot client ID.
-   **GitHub Enterprise Support**: Connect to self-hosted or enterprise Copilot instances by specifying a domain.
-   **Local Plugin**: Integrates with OpenCode without needing to be published to npm.
-   **Standalone**: No dependencies. Just Node.js.

## How to Use with OpenCode

Follow these steps to configure this as a local plugin.

### Step 1: Clone the Repository

Clone this repository to a permanent location on your computer. For example, you can place it in your home directory.

```bash
git clone https://github.com/WallenHan/opencode-copilot-provider.git ~/opencode-copilot-provider
```

### Step 2: Configure OpenCode (`opencode.jsonc`)

Now, you need to tell OpenCode about your new provider and where to find the local plugin.

1.  **Find your `opencode.jsonc` file.** It's usually located at `~/.config/opencode/opencode.jsonc` on macOS/Linux or `C:\\Users\\<YourUser>\\.config\\opencode\\opencode.jsonc` on Windows.

2.  **Add the `provider` and `plugin` sections** as shown below. Make sure to replace `<path-to-your-clone>` with the actual absolute path to where you cloned the repository in Step 1.

    ```jsonc
    // ~/.config/opencode/opencode.jsonc
    {
      "$schema": "https://opencode.ai/config.json",

      "provider": {
        // Define our new custom provider
        "custom-copilot": {
          "name": "Custom GitHub Copilot",
          "options": {
            // *** THIS IS WHERE YOU SET YOUR CUSTOM CLIENT ID ***
            "clientId": "Iv1.b507a08c87ecfe98", // Or any other ID you want to use

            // Optional: for GitHub Enterprise, change this domain
            "domain": "github.com"
          }
        }
      },

      "plugin": [
        // Point to the local plugin file
        // Make sure to use the correct absolute path to your cloned repo
        "<path-to-your-clone>/opencode-copilot-provider/plugin.mjs"
      ]
    }
    ```

    **Example Paths:**
    -   macOS/Linux: `"/Users/yourname/opencode-copilot-provider/plugin.mjs"`
    -   Windows: `"C:\\Users\\yourname\\opencode-copilot-provider\\plugin.mjs"` (note the double backslashes)

### Step 3: Connect Your Account in OpenCode

1.  **Restart OpenCode** to make sure it loads the new configuration.

2.  Run the `/connect` command in the OpenCode TUI.

3.  You should now see **"Custom GitHub Copilot"** in the list of providers. Select it.

4.  Follow the on-screen instructions to complete the device authentication in your browser.

5.  Once authorized, you can use the `/models` command to see and select models available through your custom provider.

## For Standalone Testing (without OpenCode)

You can also run the authentication flow directly from the command line.

1.  **Navigate to the directory:**
    ```bash
    cd ~/opencode-copilot-provider
    ```

2.  **Run the authentication:**
    This command will guide you through the device login and print the final tokens.
    ```bash
    node index.mjs auth
    ```

3.  **Use a custom Client ID:**
    ```bash
    node index.mjs auth --client-id <your-client-id>
    ```

4.  **Connect to GitHub Enterprise:**
    ```bash
    node index.mjs auth --domain <your-enterprise-domain.com> --client-id <your-enterprise-client-id>
    ```
