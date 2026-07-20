export type AuthProvider = 'email' | 'google' | 'facebook' | 'guest';

export interface UserProfile {
  id: string;
  email: string | null;
  nickname: string;
  avatarUrl: string | null;
  country: string;
  provider: AuthProvider;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  currentRank: number | null;
  createdAt: string;
}

export interface GameHistoryEntry {
  id: string;
  roomId: string;
  placement: number;
  playerCount: number;
  playedAt: string;
  points: number;
}

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  country: string;
  wins: number;
  gamesPlayed: number;
  winRate: number;
  points: number;
  rank: number;
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';
