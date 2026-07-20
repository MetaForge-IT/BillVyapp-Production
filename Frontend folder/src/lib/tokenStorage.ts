const AUTH_TOKEN_KEY = "salon_access_token";

export function saveAccessToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAccessToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
