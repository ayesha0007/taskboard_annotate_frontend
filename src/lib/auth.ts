const ACCESS_TOKEN_KEY = "tb_access_token";
const REFRESH_TOKEN_KEY = "tb_refresh_token";

/**
 * Tokens are kept in memory-backed localStorage rather than a plain
 * global variable so a page refresh doesn't force a re-login. For an
 * even more locked-down setup, swap this for an httpOnly cookie set by
 * the backend - localStorage is acceptable here since the API itself
 * has no cookie-based session to protect against CSRF.
 */
export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(access: string, refresh: string): void {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  setAccessToken(access: string): void {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
  },
  clear(): void {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
