import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { Demand } from '../demands/entities/demand.entity';
import { DemandBudget } from '../demands/entities/demand-budget.entity';
import { Provider } from '../providers/entities/provider.entity';
import { Organizer } from '../organizers/entities/organizer.entity';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly adminEmail: string;
  private readonly platformUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.adminEmail =
      this.configService.get<string>('email.adminEmail') || 'admin@hgpd.com';
    this.platformUrl =
      this.configService.get<string>('email.platformUrl') || 'https://hgpd.com';
  }

  async sendDemandNotification(
    provider: Provider,
    demand: Demand,
    demandBudgets?: DemandBudget[],
    providerCategoryIds?: number[],
    providerCategoryNames?: string[],
  ): Promise<void> {
    if (!provider.email) {
      this.logger.warn(
        `Provider ${provider.id} has no email address, skipping notification`,
      );
      return;
    }

    // Filtrer les budgets pour ne montrer que ceux correspondant aux catégories du prestataire
    const providerBudgets =
      demandBudgets && providerCategoryIds
        ? demandBudgets
            .filter((db) => providerCategoryIds.includes(db.categoryId))
            .map((db) => ({
              categoryName: db.category?.name || 'Catégorie',
              budgetInterval: `${this.formatCurrency(Number(db.minAmount))} – ${this.formatCurrency(Number(db.maxAmount))}`,
            }))
        : [];

    // Filtrer additionalInfo pour ne montrer que les messages des catégories du prestataire
    const filteredAdditionalInfo = this.parseAndFilterAdditionalInfo(
      demand.additionalInfo,
      providerCategoryNames || [],
    );

    try {
      await this.mailerService.sendMail({
        to: provider.email,
        subject: `Nouvelle demande de prestation - ${demand.eventNature}`,
        template: 'new-demand',
        context: {
          providerName: `${provider.firstName} ${provider.lastName}`,
          companyName: provider.companyName,
          contactName: demand.contactName,
          eventNature: demand.eventNature,
          eventDate: this.formatDate(new Date(demand.eventDate)),
          approximateGuests: demand.approximateGuests || 'Non spécifié',
          location: demand.location || 'Non spécifié',
          geographicZone: demand.geographicZone || 'Non spécifié',
          budget: demand.budget
            ? this.formatCurrency(demand.budget)
            : 'Non spécifié',
          categoryBudgets: providerBudgets,
          hasCategoryBudgets: providerBudgets.length > 0,
          additionalInfo: filteredAdditionalInfo || 'Aucune information supplémentaire',
          platformUrl: this.platformUrl,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(
        `Demand notification sent to provider ${provider.email} for demand ${demand.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send demand notification to ${provider.email}: ${error.message}`,
      );
      throw error;
    }
  }

  async sendDemandNotificationToMultipleProviders(
    providers: Provider[],
    demand: Demand,
    demandBudgets?: DemandBudget[],
    providerCategoriesMap?: Map<string, number[]>,
    providerCategoryNamesMap?: Map<string, string[]>,
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    for (const provider of providers) {
      try {
        const providerCategoryIds =
          providerCategoriesMap?.get(provider.id) || [];
        const providerCategoryNames =
          providerCategoryNamesMap?.get(provider.id) || [];
        await this.sendDemandNotification(
          provider,
          demand,
          demandBudgets,
          providerCategoryIds,
          providerCategoryNames,
        );
        if (provider.email) {
          results.success.push(provider.email);
        }
      } catch {
        if (provider.email) {
          results.failed.push(provider.email);
        }
      }
    }

    return results;
  }

  async sendApprovalNotificationWithOrganizerDetails(
    provider: Provider,
    demand: Demand,
    organizer: Organizer,
    leadPrice?: number,
    providerCategoryNames?: string[],
  ): Promise<void> {
    if (!provider.email) {
      this.logger.warn(
        `Provider ${provider.id} has no email address, skipping approval notification`,
      );
      return;
    }

    // Filtrer additionalInfo pour ne montrer que les messages des catégories du prestataire
    const filteredAdditionalInfo = this.parseAndFilterAdditionalInfo(
      demand.additionalInfo,
      providerCategoryNames || [],
    );

    try {
      await this.mailerService.sendMail({
        to: provider.email,
        subject: `✅ Demande approuvée - ${demand.eventNature}`,
        template: 'approval-demand',
        context: {
          providerName: `${provider.firstName} ${provider.lastName}`,
          companyName: provider.companyName,
          eventNature: demand.eventNature,
          eventDate: this.formatDate(new Date(demand.eventDate)),
          approximateGuests: demand.approximateGuests || 'Non spécifié',
          location: demand.location || 'Non spécifié',
          geographicZone: demand.geographicZone || 'Non spécifié',
          budget: demand.budget
            ? this.formatCurrency(demand.budget)
            : 'Non spécifié',
          leadPrice: leadPrice ? this.formatCurrency(leadPrice) : 'Gratuit',
          // Coordonnées organisateur
          organizerName: `${organizer.firstName} ${organizer.lastName}`,
          organizerPhone: organizer.phone || 'Non spécifié',
          organizerEmail: organizer.email || 'Non spécifié',
          organizerCommune: organizer.commune || 'Non spécifié',
          organizerDepartment: organizer.department || 'Non spécifié',
          additionalInfo: filteredAdditionalInfo || 'Aucune information supplémentaire',
          platformUrl: this.platformUrl,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(
        `Approval notification sent to provider ${provider.email} for demand ${demand.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send approval notification to ${provider.email}: ${error.message}`,
      );
      throw error;
    }
  }

  async sendDemandNotificationToAdmin(
    demand: Demand,
    organizer: Organizer,
    providers: Provider[],
    demandBudgets?: DemandBudget[],
  ): Promise<void> {
    try {
      const providersData = providers.map((provider) => ({
        companyName: provider.companyName || 'Non spécifié',
        fullName: `${provider.firstName} ${provider.lastName}`,
        email: provider.email || 'Non spécifié',
        phone: provider.phone || 'Non spécifié',
        category: provider.activity || 'Non spécifié',
      }));

      // Formater les budgets par catégorie
      const categoryBudgetsData = demandBudgets
        ? demandBudgets.map((db) => ({
            categoryName: db.category?.name || 'Catégorie',
            budgetInterval: `${this.formatCurrency(Number(db.minAmount))} – ${this.formatCurrency(Number(db.maxAmount))}`,
          }))
        : [];

      await this.mailerService.sendMail({
        to: this.adminEmail,
        subject: `[Admin] Nouvelle demande - ${demand.eventNature} - ${organizer.firstName} ${organizer.lastName}`,
        template: 'admin-new-demand',
        context: {
          // Infos organisateur
          organizerName: `${organizer.firstName} ${organizer.lastName}`,
          organizerPhone: organizer.phone || 'Non spécifié',
          organizerEmail: organizer.email || 'Non spécifié',
          organizerCommune: organizer.commune || 'Non spécifié',
          organizerDepartment: organizer.department || 'Non spécifié',
          // Infos événement
          contactName: demand.contactName,
          eventNature: demand.eventNature,
          eventDate: this.formatDate(new Date(demand.eventDate)),
          approximateGuests: demand.approximateGuests || 'Non spécifié',
          location: demand.location || 'Non spécifié',
          geographicZone: demand.geographicZone || 'Non spécifié',
          budget: demand.budget
            ? this.formatCurrency(demand.budget)
            : 'Non spécifié',
          categoryBudgets: categoryBudgetsData,
          hasCategoryBudgets: categoryBudgetsData.length > 0,
          additionalInfo:
            demand.additionalInfo || 'Aucune information supplémentaire',
          // Prestataires
          providers: providersData,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Admin notification sent for demand ${demand.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send admin notification for demand ${demand.id}: ${error.message}`,
      );
      // Ne pas faire échouer la création de la demande si l'email admin échoue
    }
  }

  // ==================== ORGANIZER CONFIRMATION EMAIL ====================

  async sendDemandConfirmationToOrganizer(
    organizer: Organizer,
    demand: Demand,
    demandBudgets?: DemandBudget[],
  ): Promise<void> {
    if (!organizer.email) {
      this.logger.warn(
        `Organizer ${organizer.id} has no email address, skipping demand confirmation email`,
      );
      return;
    }

    // Formater les budgets par catégorie
    const categoryBudgetsData = demandBudgets
      ? demandBudgets.map((db) => ({
          categoryName: db.category?.name || 'Catégorie',
          budgetInterval: `${this.formatCurrency(Number(db.minAmount))} – ${this.formatCurrency(Number(db.maxAmount))}`,
        }))
      : [];

    try {
      await this.mailerService.sendMail({
        to: organizer.email,
        subject: `Confirmation de votre demande - ${demand.eventNature} - HGPD`,
        template: 'organizer-demand-confirmation',
        context: {
          organizerName: `${organizer.firstName} ${organizer.lastName}`,
          contactName: demand.contactName,
          eventNature: demand.eventNature,
          eventDate: this.formatDate(new Date(demand.eventDate)),
          approximateGuests: demand.approximateGuests || 'Non specifie',
          location: demand.location || 'Non specifie',
          geographicZone: demand.geographicZone || 'Non specifie',
          budget: demand.budget
            ? this.formatCurrency(demand.budget)
            : 'Non specifie',
          categoryBudgets: categoryBudgetsData,
          hasCategoryBudgets: categoryBudgetsData.length > 0,
          additionalInfo: demand.additionalInfo || '',
          platformUrl: this.platformUrl,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(
        `Demand confirmation email sent to organizer ${organizer.email} for demand ${demand.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send demand confirmation email to ${organizer.email}: ${error.message}`,
      );
      // Ne pas faire echouer la creation de la demande si l'email echoue
    }
  }

  // ==================== MISSION CONFIRMED EMAIL ====================

  async sendMissionConfirmedEmail(
    provider: Provider,
    demand: Demand,
    organizer: Organizer,
  ): Promise<void> {
    if (!provider.email) {
      this.logger.warn(
        `Provider ${provider.id} has no email address, skipping mission confirmed email`,
      );
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: provider.email,
        subject: `Mission confirmee - ${demand.eventNature} - HGPD`,
        template: 'mission-confirmed',
        context: {
          // Infos prestataire
          providerName: `${provider.firstName} ${provider.lastName}`,
          companyName: provider.companyName,
          // Infos organisateur
          organizerName: `${organizer.firstName} ${organizer.lastName}`,
          organizerPhone: organizer.phone || 'Non specifie',
          organizerEmail: organizer.email || 'Non specifie',
          organizerCommune: organizer.commune || 'Non specifie',
          organizerDepartment: organizer.department || 'Non specifie',
          // Infos evenement
          contactName: demand.contactName,
          eventNature: demand.eventNature,
          eventDate: this.formatDate(new Date(demand.eventDate)),
          approximateGuests: demand.approximateGuests || 'Non specifie',
          location: demand.location || 'Non specifie',
          geographicZone: demand.geographicZone || 'Non specifie',
          budget: demand.budget
            ? this.formatCurrency(demand.budget)
            : 'Non specifie',
          additionalInfo: demand.additionalInfo || '',
          platformUrl: this.platformUrl,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(
        `Mission confirmed email sent to provider ${provider.email} for demand ${demand.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send mission confirmed email to ${provider.email}: ${error.message}`,
      );
      throw error;
    }
  }

  // ==================== AUTH EMAILS ====================

  async sendEmailVerification(
    provider: Provider,
    token: string,
  ): Promise<void> {
    if (!provider.email) {
      this.logger.warn(
        `Provider ${provider.id} has no email address, skipping verification email`,
      );
      return;
    }

    const verificationUrl = `${this.platformUrl}/verify-email?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: provider.email,
        subject: 'Verification de votre adresse email - HGPD',
        template: 'email-verification',
        context: {
          firstName: provider.firstName,
          lastName: provider.lastName,
          verificationUrl,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Email verification sent to ${provider.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email verification to ${provider.email}: ${error.message}`,
      );
      throw error;
    }
  }

  async sendPasswordResetEmail(
    provider: Provider,
    token: string,
  ): Promise<void> {
    if (!provider.email) {
      this.logger.warn(
        `Provider ${provider.id} has no email address, skipping password reset email`,
      );
      return;
    }

    const resetUrl = `${this.platformUrl}/reset-password?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: provider.email,
        subject: 'Reinitialisation de votre mot de passe - HGPD',
        template: 'password-reset',
        context: {
          firstName: provider.firstName,
          lastName: provider.lastName,
          resetUrl,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Password reset email sent to ${provider.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${provider.email}: ${error.message}`,
      );
      throw error;
    }
  }

  // ==================== CONTACT ====================

  async sendContactMessage(data: {
    fullName: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: this.adminEmail,
        replyTo: data.email,
        subject: `[Contact HGPD] ${data.subject}`,
        template: 'contact-message',
        context: {
          fullName: data.fullName,
          email: data.email,
          subject: data.subject,
          message: data.message,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Contact message from ${data.email} forwarded to admin`);
    } catch (error) {
      this.logger.error(
        `Failed to send contact message from ${data.email}: ${error.message}`,
      );
      throw error;
    }
  }

  async sendProviderAcceptanceEmail(
    provider: Provider,
    demand: Demand,
    organizer?: Organizer,
  ): Promise<void> {
    if (!provider.email) {
      this.logger.warn(
        `Provider ${provider.id} has no email address, skipping acceptance notification`,
      );
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: provider.email,
        subject: `Demande acceptée - ${demand.eventNature}`,
        template: 'provider-acceptance',
        context: {
          providerName: `${provider.firstName} ${provider.lastName}`,
          companyName: provider.companyName,
          eventNature: demand.eventNature,
          eventDate: this.formatDate(new Date(demand.eventDate)),
          approximateGuests: demand.approximateGuests || 'Non spécifié',
          location: demand.location || 'Non spécifié',
          organizerName: organizer
            ? `${organizer.firstName} ${organizer.lastName}`
            : 'Organisateur',
          platformUrl: this.platformUrl,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(
        `Provider acceptance email sent to ${provider.email} for demand ${demand.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send provider acceptance email to ${provider.email}: ${error.message}`,
      );
      throw error;
    }
  }

  async sendAdminAcceptanceNotification(
    provider: Provider,
    demand: Demand,
    organizer?: Organizer,
  ): Promise<void> {
    const adminEmail = 'sdr@beussdoutouti.com';

    try {
      await this.mailerService.sendMail({
        to: adminEmail,
        subject: `Demande acceptée par prestataire - ${demand.eventNature}`,
        template: 'admin-acceptance-notification',
        context: {
          providerName: `${provider.firstName} ${provider.lastName}`,
          companyName: provider.companyName,
          providerEmail: provider.email,
          providerPhone: provider.phone || 'Non fourni',
          eventNature: demand.eventNature,
          eventDate: this.formatDate(new Date(demand.eventDate)),
          approximateGuests: demand.approximateGuests || 'Non spécifié',
          location: demand.location || 'Non spécifié',
          budget: demand.budget
            ? this.formatCurrency(demand.budget)
            : 'Non spécifié',
          organizerName: organizer
            ? `${organizer.firstName} ${organizer.lastName}`
            : 'Organisateur',
          organizerEmail: organizer?.email || 'Non fourni',
          organizerPhone: organizer?.phone || 'Non fourni',
          platformUrl: this.platformUrl,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(
        `Admin acceptance notification sent for demand ${demand.id} to ${adminEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send admin acceptance notification: ${error.message}`,
      );
      throw error;
    }
  }

  // ==================== HELPERS ====================

  /**
   * Parse additionalInfo and filter by provider's category names
   * Format: "Budget [CategoryName]: xxx\nMessage [CategoryName]: yyy\nPrix du lead: zzz"
   * Returns only lines matching provider's categories
   */
  private parseAndFilterAdditionalInfo(
    additionalInfo: string,
    providerCategoryNames: string[],
  ): string {
    if (!additionalInfo || providerCategoryNames.length === 0) {
      return additionalInfo || '';
    }

    const lines = additionalInfo.split('\n').filter((l) => l.trim());
    const filteredLines: string[] = [];

    for (const line of lines) {
      // Handle "Budget [CategoryName]: xxx" and "Message [CategoryName]: yyy" lines
      if (line.startsWith('Budget ') || line.startsWith('Message ')) {
        // Extract category name from "Budget [CategoryName]: xxx" format
        const match = line.match(/^(Budget|Message)\s+([^:]+):\s*(.*)$/);
        if (match) {
          const categoryInLine = match[2].trim();
          // Check if this category is in provider's categories (case-insensitive)
          const isCategoryMatch = providerCategoryNames.some(
            (name) =>
              name.toLowerCase() === categoryInLine.toLowerCase() ||
              categoryInLine.toLowerCase().includes(name.toLowerCase()),
          );
          if (isCategoryMatch) {
            filteredLines.push(line);
          }
        }
      } else {
        // Keep other lines (like "Prix du lead: xxx")
        filteredLines.push(line);
      }
    }

    return filteredLines.join('\n');
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}
