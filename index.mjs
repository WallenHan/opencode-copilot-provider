#!/usr/bin/env node

const DEFAULT_CLIENT_ID = process.env.OPENCODE_COPILOT_CLIENT_ID || 'Ov23li8tweQw6odWQebz';
const DEFAULT_USER_AGENT = process.env.OPENCODE_COPILOT_USER_AGENT || 'OpenCodeCopilot/0.1';
const DEFAULT_SCOPE = process.env.OPENCODE_COPILOT_SCOPE || 'read:user';
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_POLL_TIMEOUT_MS = 15 * 60 * 1000;

function normalizeDomain(input = 'github.com') {
  return String(input).trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function getEndpoints(domain) {
  const normalized = normalizeDomain(domain);
  const isEnterprise = normalized !== 'github.com';
  const apiBase = isEnterprise ? `https://copilot-api.${normalized}` : 'https://api.githubcopilot.com';
  return {
    deviceCodeUrl: `https://${normalized}/login/device/code`,
    tokenUrl: `https://${normalized}/login/oauth/access_token`,
    copilotTokenUrl: `https://api.github.com/copilot_internal/v2/token`,
    modelsUrl: `${apiBase}/models`,
    apiBase,
  };
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON, got: ${text.slice(0, 200)}`);
  }
}

async function requestDeviceCode({ domain = 'github.com', clientId = DEFAULT_CLIENT_ID, scope = DEFAULT_SCOPE } = {}) {
  const { deviceCodeUrl } = getEndpoints(domain);
  const res = await fetch(deviceCodeUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': DEFAULT_USER_AGENT,
    },
    body: JSON.stringify({ client_id: clientId, scope }),
  });
  if (!res.ok) throw new Error(`device code request failed: ${res.status} ${res.statusText}`);
  return readJson(res);
}

async function pollAccessToken({ domain = 'github.com', clientId = DEFAULT_CLIENT_ID, deviceCode, intervalMs = DEFAULT_POLL_INTERVAL_MS, timeoutMs = DEFAULT_POLL_TIMEOUT_MS } = {}) {
  const { tokenUrl } = getEndpoints(domain);
  const started = Date.now();
  let waitMs = intervalMs;
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, waitMs));
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': DEFAULT_USER_AGENT,
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    const data = await readJson(res);
    if (data.access_token) return data;
    if (data.error === 'authorization_pending') continue;
    if (data.error === 'slow_down') {
      waitMs += 5000;
      continue;
    }
    throw new Error(`token polling failed: ${data.error || 'unknown error'}`);
  }
  throw new Error('token polling timed out');
}

async function exchangeCopilotToken({ refreshToken, domain = 'github.com' } = {}) {
  const { copilotTokenUrl } = getEndpoints(domain);
  const res = await fetch(copilotTokenUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: `token ${refreshToken}`,
      'User-Agent': DEFAULT_USER_AGENT,
    },
  });
  if (!res.ok) throw new Error(`copilot token exchange failed: ${res.status} ${res.statusText}`);
  return readJson(res);
}

async function fetchCopilotModels({ accessToken, domain = 'github.com' } = {}) {
  const { modelsUrl } = getEndpoints(domain);
  const res = await fetch(modelsUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': DEFAULT_USER_AGENT,
    },
  });
  if (!res.ok) throw new Error(`models fetch failed: ${res.status} ${res.statusText}`);
  return readJson(res);
}

async function login({ domain = 'github.com', clientId = DEFAULT_CLIENT_ID } = {}) {
  const device = await requestDeviceCode({ domain, clientId });
  const result = {
    domain: normalizeDomain(domain),
    client_id: clientId,
    device_code: device.device_code,
    user_code: device.user_code,
    verification_uri: device.verification_uri,
    interval: device.interval || 5,
    expires_in: device.expires_in,
  };
  return result;
}

async function authorize({ domain = 'github.com', clientId = DEFAULT_CLIENT_ID } = {}) {
  const device = await requestDeviceCode({ domain, clientId });
  console.log(`Open this URL: ${device.verification_uri}`);
  console.log(`Enter code: ${device.user_code}`);
  console.log('Waiting for GitHub authorization...');
  const token = await pollAccessToken({
    domain,
    clientId,
    deviceCode: device.device_code,
    intervalMs: (device.interval || 5) * 1000,
  });
  const copilot = await exchangeCopilotToken({ refreshToken: token.access_token, domain });
  return {
    domain: normalizeDomain(domain),
    client_id: clientId,
    refresh_token: token.access_token,
    copilot_token: copilot.token,
    copilot_expires_at: copilot.expires_at,
    copilot_refresh_in: copilot.refresh_in,
    endpoints: copilot.endpoints,
  };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) {
      args._.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'help';
  const domain = args.domain || args.d || 'github.com';
  const clientId = args['client-id'] || args.client_id || DEFAULT_CLIENT_ID;

  try {
    if (cmd === 'login') {
      const out = await login({ domain, clientId });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (cmd === 'auth') {
      const out = await authorize({ domain, clientId });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (cmd === 'models') {
      const accessToken = args.token;
      if (!accessToken) throw new Error('missing --token <access_token>');
      const out = await fetchCopilotModels({ accessToken, domain });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
      console.log(`Usage:
  opencode-copilot-provider login   [--domain github.com] [--client-id <id>]
  opencode-copilot-provider auth    [--domain github.com] [--client-id <id>]
  opencode-copilot-provider models  --token <access_token> [--domain github.com]

Env:
  OPENCODE_COPILOT_CLIENT_ID
  OPENCODE_COPILOT_USER_AGENT
  OPENCODE_COPILOT_SCOPE
`);
      return;
    }
    throw new Error(`unknown command: ${cmd}`);
  } catch (err) {
    console.error(err?.message || String(err));
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  DEFAULT_CLIENT_ID,
  DEFAULT_USER_AGENT,
  authorize,
  exchangeCopilotToken,
  fetchCopilotModels,
  getEndpoints,
  login,
  normalizeDomain,
  pollAccessToken,
  requestDeviceCode,
};
