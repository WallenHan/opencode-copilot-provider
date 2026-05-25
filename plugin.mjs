import {
  authorize,
  exchangeCopilotToken,
  getEndpoints,
} from './index.mjs';

/**
 * @type {import('@opencode-ai/plugin').Plugin}
 */
export const CustomCopilotProviderPlugin = async ({ client }) => {
  const providerId = 'custom-copilot';
  const providerName = 'Custom GitHub Copilot';

  // Get configuration from opencode.jsonc
  const providerConfig = client.config.provider?.[providerId];
  const customClientId = providerConfig?.options?.clientId;
  const customDomain = providerConfig?.options?.domain || 'github.com';

  return {
    provider: {
      [providerId]: {
        name: providerName,
        // Let OpenCode know this provider uses OAuth
        auth: 'oauth',
      },
    },
    auth: {
      // This loader runs before every API request for this provider
      loader: async ({ auth, provider }) => {
        if (provider.id !== providerId || auth.type !== 'oauth') {
          return;
        }

        const refreshToken = auth.refresh;
        if (!refreshToken) {
          throw new Error('Custom Copilot: Refresh token is missing. Please reconnect.');
        }

        // Exchange the long-lived refresh token for a short-lived Copilot token
        try {
          const copilotAuth = await exchangeCopilotToken({
            refreshToken,
            domain: customDomain,
          });

          const endpoints = getEndpoints(customDomain);

          // Return the API key and base URL for the request
          return {
            apiKey: copilotAuth.token,
            baseURL: endpoints.apiBase,
          };
        } catch (error) {
          console.error('Custom Copilot: Failed to refresh token.', error);
          throw new Error('Custom Copilot token exchange failed. Please try /connect again.');
        }
      },
      // This defines the /connect method
      methods: [
        {
          provider: providerId,
          name: 'Custom Copilot Device Login',
          type: 'oauth',
          // This function runs when the user selects this method in /connect
          authorize: async (inputs, {-back}) => {
            try {
              // Start the device flow using our logic
              const device = await authorize({
                domain: customDomain,
                clientId: customClientId,
              });

              // Return the auth data to OpenCode to be stored
              return {
                type: 'success',
                // This refresh token is stored in ~/.local/share/opencode/auth.json
                refresh: device.refresh_token,
                // Metadata can be useful for debugging
                metadata: {
                  clientId: device.client_id,
                  domain: device.domain,
                },
              };
            } catch (error) {
              console.error('Custom Copilot auth failed:', error);
              return {
                type: 'error',
                message: error.message || 'An unknown error occurred during authentication.',
              };
            }
          },
        },
      ],
    },
  };
};
