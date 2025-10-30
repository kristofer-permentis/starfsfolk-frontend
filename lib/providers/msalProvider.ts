// lib/providers/msalProvider.ts

import { PublicClientApplication, AccountInfo } from "@azure/msal-browser";
import { msalConfig } from "../authConfig";
import { AuthProvider, UserInfo } from "../authService";

// Create the MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

let currentAccount: AccountInfo | null = null;

const msalProvider: AuthProvider = {
  async login() {
    await msalInstance.initialize(); // Ensure instance is ready
    console.log('redirectUri =', msalConfig.auth.redirectUri);
console.log('clientId =', msalConfig.auth.clientId);
console.log('authority =', msalConfig.auth.authority);
    const loginResult = await msalInstance.loginPopup({
      scopes: ["api://821a8f5f-2dbb-436a-b049-eac62bb17edf/access_as_user"],
    });

    currentAccount = loginResult.account;
  },

async logout() {
  await msalInstance.initialize(); // <-- add this line

  if (currentAccount) {
    await msalInstance.logoutPopup({ account: currentAccount });
    currentAccount = null;
  }
},


async getToken(): Promise<string | null> {
  const accounts = msalInstance.getAllAccounts();
  if (!accounts.length) return null;

  const account = accounts[0];
  currentAccount = account;

  try {
    await msalInstance.initialize(); // Ensure instance is ready
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
