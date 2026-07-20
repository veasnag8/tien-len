import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GuestLoginDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    this.setRefreshCookie(res, result.tokens.refreshToken);
    return { user: result.user, accessToken: result.tokens.accessToken };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    this.setRefreshCookie(res, result.tokens.refreshToken);
    return { user: result.user, accessToken: result.tokens.accessToken };
  }

  @Post('guest')
  async guest(@Body() dto: GuestLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.guestLogin(dto);
    this.setRefreshCookie(res, result.tokens.refreshToken);
    return { user: result.user, accessToken: result.tokens.accessToken };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies?.['refresh_token'] as string | undefined) ?? '';
    const tokens = await this.auth.refresh(token);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token');
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return { user: this.auth.toProfile(user) };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth(): void {
    return;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    await this.handleOAuthCallback(req, res);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuth(): void {
    return;
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    await this.handleOAuthCallback(req, res);
  }

  private async handleOAuthCallback(req: Request, res: Response): Promise<void> {
    const profile = req.user as {
      provider: 'google' | 'facebook';
      providerId: string;
      email: string | null;
      nickname: string;
      avatarUrl: string | null;
    };

    const result = await this.auth.oauthLogin(
      profile.provider,
      profile.providerId,
      profile.email,
      profile.nickname,
      profile.avatarUrl,
    );

    this.setRefreshCookie(res, result.tokens.refreshToken);
    const frontend = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    res.redirect(
      `${frontend}/auth/callback?accessToken=${encodeURIComponent(result.tokens.accessToken)}`,
    );
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });
  }
}
