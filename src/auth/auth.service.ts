import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { Provider } from '../providers/entities/provider.entity';
import { Admin } from './entities/admin.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';

import { UserType, AdminRole } from '../common/enums';
import { MailService } from '../mail/mail.service';

import {
  ProviderRegisterDto,
  ProviderLoginDto,
  AdminLoginDto,
  AuthResponseDto,
  TokensResponseDto,
} from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  // ==================== PROVIDER AUTH ====================

  async registerProvider(
    dto: ProviderRegisterDto,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    // Verifier si le telephone existe deja
    const existingPhone = await this.providerRepository.findOne({
      where: { phone: dto.phone },
    });
    if (existingPhone) {
      throw new ConflictException('Ce numero de telephone est deja enregistre');
    }

    // Verifier si l'email existe deja (si fourni)
    if (dto.email) {
      const existingEmail = await this.providerRepository.findOne({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('Cette adresse email est deja enregistree');
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Creer le provider
    const provider = this.providerRepository.create({
      ...dto,
      password: hashedPassword,
    });
    const savedProvider = await this.providerRepository.save(provider);

    this.logger.log(`New provider registered: ${savedProvider.id}`);


    // Envoyer email de verification si email fourni
   if (savedProvider.email) {
  try {
    await this.sendEmailVerification(savedProvider.id, savedProvider.email);
  } catch (error) {
    console.error('EMAIL ERROR:', error);
  }
}


    // Generer les tokens
    const tokens = await this.generateTokens(
      savedProvider.id,
      UserType.PROVIDER,
      ipAddress,
    );

    return this.buildAuthResponse(savedProvider, UserType.PROVIDER, tokens);
  }

  async loginProvider(
    dto: ProviderLoginDto,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    // Determiner si l'identifiant est un email ou telephone
    const isEmail = dto.identifier.includes('@');

    const provider = await this.providerRepository.findOne({
      where: isEmail ? { email: dto.identifier } : { phone: dto.identifier },
    });

    if (!provider) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!provider.isActive) {
      throw new UnauthorizedException('Votre compte est desactive');
    }

    // Verifier le mot de passe
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      provider.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    this.logger.log(`Provider logged in: ${provider.id}`);

    // Generer les tokens
    const tokens = await this.generateTokens(
      provider.id,
      UserType.PROVIDER,
      ipAddress,
      dto.deviceInfo,
    );

    return this.buildAuthResponse(provider, UserType.PROVIDER, tokens);
  }

  // ==================== ADMIN AUTH ====================

  async loginAdmin(
    dto: AdminLoginDto,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const admin = await this.adminRepository.findOne({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Votre compte est desactive');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Mettre a jour la date de derniere connexion
    admin.lastLoginAt = new Date();
    await this.adminRepository.save(admin);

    this.logger.log(`Admin logged in: ${admin.id}`);

    // Generer les tokens
    const tokens = await this.generateTokens(
      admin.id,
      UserType.ADMIN,
      ipAddress,
      dto.deviceInfo,
    );

    return this.buildAuthResponse(admin, UserType.ADMIN, tokens, admin.role);
  }

  // ==================== TOKEN MANAGEMENT ====================

  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
  ): Promise<TokensResponseDto> {
    // Verifier le token dans la base
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isRevoked: false },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expire');
    }

    // Revoquer l'ancien token
    storedToken.isRevoked = true;
    await this.refreshTokenRepository.save(storedToken);

    // Generer de nouveaux tokens
    return this.generateTokens(
      storedToken.userId,
      storedToken.userType,
      ipAddress,
    );
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (storedToken) {
      storedToken.isRevoked = true;
      await this.refreshTokenRepository.save(storedToken);
    }
  }

  async revokeAllUserTokens(userId: string, userType: UserType): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, userType, isRevoked: false },
      { isRevoked: true },
    );
  }

  async logout(refreshToken: string): Promise<void> {
    await this.revokeRefreshToken(refreshToken);
  }

  // ==================== PASSWORD RESET ====================

  async forgotPassword(email: string): Promise<void> {
    const provider = await this.providerRepository.findOne({
      where: { email },
    });

    if (!provider) {
      // Ne pas reveler si l'email existe ou non (securite)
      this.logger.log(`Password reset requested for unknown email: ${email}`);
      return;
    }

    // Invalider les anciens tokens
    await this.passwordResetTokenRepository.update(
      { userId: provider.id, userType: UserType.PROVIDER, isUsed: false },
      { isUsed: true },
    );

    // Generer un nouveau token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 heure

    const resetToken = this.passwordResetTokenRepository.create({
      token,
      userId: provider.id,
      userType: UserType.PROVIDER,
      expiresAt,
    });
    await this.passwordResetTokenRepository.save(resetToken);

    // Envoyer l'email
    await this.mailService.sendPasswordResetEmail(provider, token);

    this.logger.log(`Password reset email sent to: ${provider.id}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token, isUsed: false },
    });

    if (!resetToken) {
      throw new BadRequestException('Token invalide ou expire');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Token expire');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre a jour le mot de passe
    if (resetToken.userType === UserType.PROVIDER) {
      await this.providerRepository.update(
        { id: resetToken.userId },
        { password: hashedPassword },
      );
    }

    // Marquer le token comme utilise
    resetToken.isUsed = true;
    await this.passwordResetTokenRepository.save(resetToken);

    // Revoquer tous les refresh tokens de l'utilisateur
    await this.revokeAllUserTokens(resetToken.userId, resetToken.userType);

    this.logger.log(`Password reset successful for user: ${resetToken.userId}`);
  }

  // ==================== EMAIL VERIFICATION ====================
  
  async sendEmailVerification(
    providerId: string,
    email: string,
  ): Promise<void> {
    // Invalider les anciens tokens
    await this.emailVerificationTokenRepository.update(
      { providerId, isUsed: false },
      { isUsed: true },
    );

    // Generer un nouveau token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 heures

    const verificationToken = this.emailVerificationTokenRepository.create({
      token,
      providerId,
      email,
      expiresAt,
    });
    await this.emailVerificationTokenRepository.save(verificationToken);

    // Recuperer le provider pour l'email
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (provider) {
      await this.mailService.sendEmailVerification(provider, token);
      this.logger.log(`Email verification sent to: ${email}`);
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const verificationToken =
      await this.emailVerificationTokenRepository.findOne({
        where: { token, isUsed: false },
      });

    if (!verificationToken) {
      throw new BadRequestException('Token invalide');
    }

    if (new Date() > verificationToken.expiresAt) {
      throw new BadRequestException('Token expire');
    }

    // Marquer l'email comme verifie
    await this.providerRepository.update(
      { id: verificationToken.providerId },
      { emailVerifiedAt: new Date() },
    );

    // Marquer le token comme utilise
    verificationToken.isUsed = true;
    await this.emailVerificationTokenRepository.save(verificationToken);

    this.logger.log(
      `Email verified for provider: ${verificationToken.providerId}`,
    );
  }

  async resendEmailVerification(email: string): Promise<void> {
    const provider = await this.providerRepository.findOne({
      where: { email },
    });

    if (!provider) {
      throw new NotFoundException('Prestataire non trouve');
    }

    if (provider.emailVerifiedAt) {
      throw new BadRequestException('Email deja verifie');
    }

    await this.sendEmailVerification(provider.id, email);
  }

  // ==================== HELPERS ====================

  private async generateTokens(
    userId: string,
    userType: UserType,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<TokensResponseDto> {
    const payload: Record<string, unknown> = { sub: userId, type: userType };

    // Access token (courte duree - 1 heure)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret') || 'default-secret',
      expiresIn: 3600, // 1 heure en secondes
    });

    // Refresh token (longue duree - 30 jours)
    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('jwt.refreshSecret') ||
        'default-refresh-secret',
      expiresIn: 2592000, // 30 jours en secondes
    });

    // Sauvegarder le refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 jours

    const storedRefreshToken = this.refreshTokenRepository.create({
      token: refreshToken,
      userId,
      userType,
      expiresAt,
      ipAddress,
      deviceInfo,
    });
    await this.refreshTokenRepository.save(storedRefreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 heure en secondes
    };
  }

  private buildAuthResponse(
    user: Provider | Admin,
    userType: UserType,
    tokens: TokensResponseDto,
    role?: AdminRole,
  ): AuthResponseDto {
    return {
      user: {
        id: user.id,
        email: user.email || '',
        firstName: user.firstName,
        lastName: user.lastName,
        type: userType,
        role: role,
      },
      tokens,
    };
  }

  // Pour validation dans les strategies
  async validateProvider(id: string): Promise<Provider | null> {
    return this.providerRepository.findOne({ where: { id, isActive: true } });
  }

  async validateAdmin(id: string): Promise<Admin | null> {
    return this.adminRepository.findOne({ where: { id, isActive: true } });
  }
}
