import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../database/entities/user.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { OAuthProvider } from '../../database/entities/oauth-provider.entity';
import { UserPreferences } from '../../database/entities/user-preferences.entity';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  TokensDto,
  UserResponseDto,
  ChangePasswordDto,
} from './dto';
import { GoogleProfile } from './strategies/google.strategy';
import { MicrosoftProfile } from './strategies/microsoft.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(OAuthProvider)
    private oauthProviderRepository: Repository<OAuthProvider>,
    @InjectRepository(UserPreferences)
    private userPreferencesRepository: Repository<UserPreferences>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      displayName: firstName && lastName ? `${firstName} ${lastName}` : email,
      role: UserRole.REGISTERED,
      status: 'active',
      emailVerified: false,
    });

    await this.userRepository.save(user);

    // Create user preferences
    const preferences = this.userPreferencesRepository.create({
      user,
    });
    await this.userPreferencesRepository.save(preferences);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.mapUserToResponse(user),
      tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.mapUserToResponse(user),
      tokens,
    };
  }

  async googleLogin(profile: GoogleProfile): Promise<AuthResponseDto> {
    // Check if OAuth provider exists
    let oauthProvider = await this.oauthProviderRepository.findOne({
      where: {
        provider: 'google',
        providerId: profile.id,
      },
      relations: ['user'],
    });

    let user: User;

    if (oauthProvider) {
      // Existing OAuth user
      user = oauthProvider.user;
    } else {
      // Check if user exists with this email
      user = await this.userRepository.findOne({
        where: { email: profile.email },
      });

      if (user) {
        // Link OAuth provider to existing user
        oauthProvider = this.oauthProviderRepository.create({
          provider: 'google',
          providerId: profile.id,
          email: profile.email,
          user,
        });
        await this.oauthProviderRepository.save(oauthProvider);
      } else {
        // Create new user
        user = this.userRepository.create({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: `${profile.firstName} ${profile.lastName}`,
          avatar: profile.picture,
          role: UserRole.REGISTERED,
          status: 'active',
          emailVerified: profile.emailVerified,
        });
        await this.userRepository.save(user);

        // Create OAuth provider
        oauthProvider = this.oauthProviderRepository.create({
          provider: 'google',
          providerId: profile.id,
          email: profile.email,
          user,
        });
        await this.oauthProviderRepository.save(oauthProvider);

        // Create preferences
        const preferences = this.userPreferencesRepository.create({ user });
        await this.userPreferencesRepository.save(preferences);
      }
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.mapUserToResponse(user),
      tokens,
    };
  }

  async microsoftLogin(profile: MicrosoftProfile): Promise<AuthResponseDto> {
    // Check if OAuth provider exists
    let oauthProvider = await this.oauthProviderRepository.findOne({
      where: {
        provider: 'microsoft',
        providerId: profile.id,
      },
      relations: ['user'],
    });

    let user: User;

    if (oauthProvider) {
      // Existing OAuth user
      user = oauthProvider.user;
    } else {
      // Check if user exists with this email
      user = await this.userRepository.findOne({
        where: { email: profile.email },
      });

      if (user) {
        // Link OAuth provider to existing user
        oauthProvider = this.oauthProviderRepository.create({
          provider: 'microsoft',
          providerId: profile.id,
          email: profile.email,
          user,
        });
        await this.oauthProviderRepository.save(oauthProvider);
      } else {
        // Create new user
        user = this.userRepository.create({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: `${profile.firstName} ${profile.lastName}`.trim(),
          avatar: profile.picture,
          role: UserRole.REGISTERED,
          status: 'active',
          emailVerified: true,
        });
        await this.userRepository.save(user);

        // Create OAuth provider
        oauthProvider = this.oauthProviderRepository.create({
          provider: 'microsoft',
          providerId: profile.id,
          email: profile.email,
          user,
        });
        await this.oauthProviderRepository.save(oauthProvider);

        // Create preferences
        const preferences = this.userPreferencesRepository.create({ user });
        await this.userPreferencesRepository.save(preferences);
      }
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.mapUserToResponse(user),
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokensDto> {
    // Find refresh token
    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (token.revoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (token.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Revoke old token
    token.revoked = true;
    await this.refreshTokenRepository.save(token);

    // Generate new tokens
    return this.generateTokens(token.user);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke specific refresh token
      await this.refreshTokenRepository.update(
        { token: refreshToken, user: { id: userId } },
        { revoked: true },
      );
    } else {
      // Revoke all user's refresh tokens
      await this.refreshTokenRepository.update(
        { user: { id: userId }, revoked: false },
        { revoked: true },
      );
    }
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new BadRequestException('Cannot change password for OAuth users');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await this.userRepository.save(user);

    // Revoke all refresh tokens
    await this.logout(userId);
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['preferences'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async generateTokens(user: User): Promise<TokensDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1h'),
    });

    // Generate refresh token
    const refreshTokenPayload = {
      sub: user.id,
    };

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Save refresh token to database
    const expiresIn = this.parseExpiration(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: refreshToken,
      user,
      expiresAt: new Date(Date.now() + expiresIn),
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiration(
        this.configService.get<string>('JWT_EXPIRES_IN', '1h'),
      ) / 1000, // Convert to seconds
    };
  }

  private mapUserToResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }

  private parseExpiration(expiration: string): number {
    const units: { [key: string]: number } = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiration}`);
    }

    const [, value, unit] = match;
    return parseInt(value, 10) * units[unit];
  }
}
