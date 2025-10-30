// lib/authService.ts

export interface UserInfo {
  name?: string;
  email?: string;
  id?: string;
}

export interface AuthProvider {
  login(): Promise<void>;
  logout(): Promise<void>;
  getToken(): Promise<string | null>;
  getUser(): Promise<UserInfo | null>;
}

let activeProvider: AuthProvider | null = null;
let listeners: (() => void)[] = [];

// Call this once during app init, e.g. in authProvider.tsx
export function setAuthProvider(provider: AuthProvider) {
  activeProvider = provider;
  authService.notify(); // Optional: notify listeners on first set
}

export const authService = {
  async login() {
    if (!activeProvider) throw new Error("No auth provider set");
    const result = await activeProvider.login();
    authService.notify(); // 👈 notify on login
    return result;
  },

  async logout() {
    if (!activeProvider) throw new Error("No auth provider set");
    const result = await activeProvider.logout();
    authService.notify(); // 👈 notify on logout
    return result;
  },

  async getToken() {
    if (!activeProvider) throw new Error("No auth provider set");
    return activeProvider.getToken();
  },

  async getUser() {
    if (!activeProvider) throw new Error("No auth provider set");
    return activeProvider.getUser();
  },

  // SUBSCRIBE: components like useAuth can listen for auth changes
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },

  // NOTIFY: trigger all listeners (e.g. after login/logout)
  notify() {
    for (const l of listeners) l();
  }
};
