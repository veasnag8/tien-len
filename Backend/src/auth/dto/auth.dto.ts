import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(24)
  @Matches(/^[a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF ]+$/)
  nickname!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class GuestLoginDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
