import { getApiUrl } from './config';
import type {
  GameHistoryEntry,
  LeaderboardEntry,
  LeaderboardPeriod,
  RoomInfo,
  UserProfile,
} from '@tien-len/shared';

class ApiClient {
  private accessToken: string | null = null;

  setToken(token: string | null): void {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  loadToken(): string | null {
    if (this.accessToken) {
      return this.accessToken;
    }
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
    return this.accessToken;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.loadToken();
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${getApiUrl()}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });

    if (response.status === 401 && !path.includes('/auth/')) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers.set('Authorization', `Bearer ${this.accessToken}`);
        const retry = await fetch(`${getApiUrl()}${path}`, {
          ...init,
          headers,
          credentials: 'include',
        });
        if (!retry.ok) {
          throw new Error(await this.readError(retry));
        }
        return retry.json() as Promise<T>;
      }
    }

    if (!response.ok) {
      throw new Error(await this.readError(response));
    }
    return response.json() as Promise<T>;
  }

  private async readError(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        return body.message.join(', ');
      }
      return body.message ?? response.statusText;
    } catch {
      return response.statusText;
    }
  }

  private async tryRefresh(): Promise<boolean> {
    try {
      const data = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      }).then((r) => (r.ok ? r.json() : null));
      if (data?.accessToken) {
        this.setToken(data.accessToken as string);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  register(body: { email: string; password: string; nickname: string; country?: string }) {
    return this.request<{ user: UserProfile; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  login(body: { email: string; password: string }) {
    return this.request<{ user: UserProfile; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  guest(body: { nickname?: string; country?: string } = {}) {
    return this.request<{ user: UserProfile; accessToken: string }>('/auth/guest', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  me() {
    return this.request<{ user: UserProfile }>('/auth/me');
  }

  logout() {
    return this.request<{ ok: boolean }>('/auth/logout', { method: 'POST' });
  }

  profile() {
    return this.request<UserProfile>('/users/me');
  }

  updateProfile(body: { nickname?: string; country?: string; avatarUrl?: string }) {
    return this.request<UserProfile>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  history() {
    return this.request<GameHistoryEntry[]>('/users/me/history');
  }

  leaderboard(period: LeaderboardPeriod) {
    return this.request<LeaderboardEntry[]>(`/leaderboard?period=${period}`);
  }

  createRoom(body: {
    maxPlayers?: 2 | 3 | 4;
    allowFiveConsecutivePairs?: boolean;
    isPrivate?: boolean;
    turnTimeoutMs?: number;
  }) {
    return this.request<{ room: RoomInfo; qrDataUrl: string }>('/rooms', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  joinRoom(code: string) {
    return this.request<RoomInfo>('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  getRoom(code: string) {
    return this.request<RoomInfo>(`/rooms/${code}`);
  }
}

export const api = new ApiClient();
