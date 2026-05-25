# opencode-copilot-provider

A minimal, configurable GitHub Copilot auth/provider helper.

## Why this exists

OpenCode's built-in Copilot flow hardcodes a client ID in the bundled plugin. This repo provides a tiny, separate implementation where the client ID can be changed without touching OpenCode itself.

## Features

- GitHub device-code login
- Token polling
- Copilot token exchange
- Copilot models fetch
- Configurable `client_id`

## Usage

### Login

```bash
node index.mjs auth --domain github.com --client-id Ov23li8tweQw6odWQebz
```

### Print device code JSON without polling

```bash
node index.mjs login --domain github.com
```

### Fetch Copilot models

```bash
node index.mjs models --domain github.com --token <access_token>
```

## Override client ID

Set one of:

```bash
export OPENCODE_COPILOT_CLIENT_ID='your-client-id'
```

or pass:

```bash
--client-id your-client-id
```

## Notes

- Node.js 18+ required.
- This is the simplest possible version; it is intentionally not a full OpenCode integration yet.
