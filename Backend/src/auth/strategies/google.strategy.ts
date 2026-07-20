import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID', 'disabled'),
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET', 'disabled'),
      callbackURL: config.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:4000/api/auth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    done(null, {
      provider: 'google' as const,
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      nickname: profile.displayName || `Google_${profile.id.slice(0, 6)}`,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    });
  }
}
