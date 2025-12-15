// lib/providers/msalProvider.ts

import { PublicClientApplication, AccountInfo } from "@azure/msal-browser";
import { msalConfig } from "../authConfig";
import { AuthProvider, UserInfo } from "../authService";

// Create the MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

let currentAccount: AccountInfo | null = null;
let initialized = false;

// Initialize MSAL and handle redirect response
async function ensureInitialized() {
  if (initialized) return;
  await msalInstance.initialize();

  // Handle redirect response if returning from login
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response?.account) {
      currentAccount = response.account;
    }
  } catch (err) {
    console.error("Error handling redirect:", err);
  }

  initialized = true;
}

const msalProvider: AuthProvider = {
  async login() {
    await ensureInitialized();

    // Use redirect instead of popup to avoid popup blockers
    await msalInstance.loginRedirect({
      scopes: ["api://821a8f5f-2dbb-436a-b049-eac62bb17edf/access_as_user"],
    });
  },

  async logout() {
    await ensureInitialized();

    if (currentAccount) {
      await msalInstance.logoutRedirect({ account: currentAccount });
      currentAccount = null;
    }
  },


  async getToken(): Promise<string | null> {
    await ensureInitialized();

    const accounts = msalInstance.getAllAccounts();
    if (!accounts.length) return null;

    const account = accounts[0];
    currentAccount = account;

    try {
      const tokenResult = await msalInstance.acquireTokenSilent({
        scopes: ["api://" + msalConfig.auth.clientId + "/.default"],
        account,
      });

      return tokenResult.accessToken;
    } catch (err) {
      console.error("Token acquisition failed:", err);
      return null;
    }
  },

  async getUser(): Promise<UserInfo | null> {
    await ensureInitialized();

    if (!currentAccount) {
      const accounts = msalInstance.getAllAccounts();
      if (!accounts.length) return null;
      currentAccount = accounts[0];
    }

    return {
      name: currentAccount.name,
      email: currentAccount.username,
      id: currentAccount.localAccountId,
    };
  },
};

export { msalProvider };
