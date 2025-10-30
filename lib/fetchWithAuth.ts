import { authService } from './authService';

export class NotAuthenticatedError extends Error {
  constructor(message = 'Notandi er ekki auðkenndur') {
    super(message);
    this.name = 'NotAuthenticatedError';
  }
}

export class NotAuthorizedError extends Error {
  constructor(message = 'Notandi hefur ekki leyfi til þess að nota valið efni') {
    super(message);
    this.name = 'NotAuthorizedError';
  }
}

export class ServerError extends Error {
  constructor(status: number, message = 'Server error') {
    super(`Villa frá netþjóni (${status}): ${message}`);
    this.name = 'ServerError';
  }
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await authService.getToken();
  if (!token) throw new NotAuthenticatedError();

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) throw new NotAuthenticatedError();
  if (res.status === 403) throw new NotAuthorizedError();
  if (res.status >= 500) throw new ServerError(res.status);

  return res;
}
