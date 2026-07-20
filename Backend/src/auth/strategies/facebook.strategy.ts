import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('FACEBOOK_APP_ID', 'disabled'),
      clientSecret: config.get<string>('FACEBOOK_APP_SECRET', 'disabled'),
      callbackURL: config.get<string>(
        'FACEBOOK_CALLBACK_URL',
        'http://localhost:4000/api/auth/facebook/callback',
      ),
      profileFields: ['id', 'displayName', 'emails', 'photos'],
      scope: ['email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: unknown) => void,
  ): void {
    done(null, {
      provider: 'facebook' as const,
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      nickname: profile.displayName || `FB_${profile.id.slice(0, 6)}`,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    });
  }
}
