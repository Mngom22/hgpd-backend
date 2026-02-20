import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Demand } from '../demands/entities/demand.entity';
import { Provider } from '../providers/entities/provider.entity';
import { Organizer } from '../organizers/entities/organizer.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface WhatsAppMessage {
  to: string;
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };
  text?: { body: string };
}

interface WhatsAppApiResponse {
  messages?: { id: string }[];
  contacts?: { wa_id: string }[];
  error?: {
    code: number;
    message: string;
    type: string;
  };
  [key: string]: any;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly adminPhone: string;
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('whatsapp.apiUrl') || '';
    this.phoneNumberId =
      this.configService.get<string>('whatsapp.phoneNumberId') || '';
    this.accessToken =
      this.configService.get<string>('whatsapp.accessToken') || '';
    this.adminPhone =
      this.configService.get<string>('WHATSAPP_ADMIN_PHONE') || '';

    // WhatsApp est active seulement si les credentials sont configures
    this.isEnabled = !!(this.phoneNumberId && this.accessToken);

    if (!this.isEnabled) {
      this.logger.warn('WhatsApp service is disabled - missing credentials');
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Supprimer les espaces et le + au debut
    let formatted = phone.replace(/\s+/g, '').replace(/^\+/, '');

    // S'assurer que le numero commence par le code pays
    if (!formatted.startsWith('221') && formatted.length === 9) {
      formatted = '221' + formatted;
    }

    return formatted;
  }

  private async sendMessage(message: WhatsAppMessage): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.debug('WhatsApp disabled, skipping message');
      return false;
    }

    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.to,
      type: message.template ? 'template' : 'text',
      ...(message.template && { template: message.template }),
      ...(message.text && { text: message.text }),
    };

    this.logger.debug(`Sending WhatsApp message to ${message.to}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );

      const data = response.data as WhatsAppApiResponse;

      // Logger la reponse complete pour debug
      this.logger.log(
        `WhatsApp API response for ${message.to}: ${JSON.stringify(data)}`,
      );

      // Verifier si le message a ete accepte
      if (data?.messages?.[0]?.id) {
        this.logger.log(
          `WhatsApp message sent to ${message.to} - Message ID: ${data.messages[0].id}`,
        );
        return true;
      } else {
        this.logger.warn(
          `WhatsApp message to ${message.to} - Unexpected response: ${JSON.stringify(data)}`,
        );
        return false;
      }
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const errorData =
        error.response?.data?.error || error.response?.data || error.message;
      this.logger.error(
        `Failed to send WhatsApp message to ${message.to}: ${JSON.stringify(errorData)}`,
      );

      // Diagnostic des erreurs courantes
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const code = errorData?.code;

      if (code === 131030) {
        this.logger.error(
          "ERREUR: Le destinataire doit d'abord envoyer un message a votre numero WhatsApp Business (fenetre de 24h)",
        );
      } else if (code === 131047) {
        this.logger.error(
          "ERREUR: Le numero n'est pas enregistre sur WhatsApp",
        );
      } else if (code === 131026) {
        this.logger.error(
          "ERREUR: Le message n'a pas pu etre delivre - verifiez le numero",
        );
      }

      return false;
    }
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // ==================== NOTIFICATIONS PRESTATAIRES ====================

  async sendDemandNotificationToProvider(
    provider: Provider,
    demand: Demand,
    providerMessage?: string,
  ): Promise<boolean> {
    if (!provider.phone) {
      this.logger.warn(`Provider ${provider.id} has no phone number`);
      return false;
    }

    const phone = this.formatPhoneNumber(provider.phone);

    // Essayer d'abord avec un template (pour messages proactifs)
    // Template "nouvelle_demande" doit etre cree et approuve dans Meta Business
    const templateName = this.configService.get<string>(
      'WHATSAPP_TEMPLATE_NEW_DEMAND',
    );

    if (templateName) {
      // Les parametres sont passes dans l'ordre des variables du template
      // {{nom_prestataire}}, {{type_evenement}}, {{date_evenement}}, {{lieu_evenement}}
      return this.sendMessage({
        to: phone,
        template: {
          name: templateName,
          language: { code: 'fr' },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: `${provider.firstName} ${provider.lastName}`,
                },
                { type: 'text', text: demand.eventNature || 'Non precise' },
                { type: 'text', text: this.formatDate(demand.eventDate) },
                { type: 'text', text: demand.location || 'Non precise' },
              ],
            },
          ],
        },
      });
    }

    // Sinon, envoyer un message texte (fonctionne seulement si conversation active)
    const messageBody = `🎉 *Nouvelle demande de prestation !*

Bonjour ${provider.firstName} ${provider.lastName},

Vous avez recu une nouvelle demande sur HGPD :

📋 *Type d'evenement :* ${demand.eventNature}
📅 *Date :* ${this.formatDate(demand.eventDate)}
📍 *Lieu :* ${demand.location || 'Non precise'}
👥 *Nombre d'invites :* ${demand.approximateGuests || 'Non precise'}
💰 *Budget :* ${demand.budget ? this.formatCurrency(demand.budget) : 'Non precise'}

👤 *Contact :* ${demand.contactName}

${(providerMessage || demand.additionalInfo) ? `📝 *Message :* ${providerMessage || demand.additionalInfo}` : ''}

Connectez-vous a votre espace HGPD pour consulter les details et repondre a cette demande.

_L'equipe HGPD_`;

    return this.sendMessage({
      to: phone,
      text: { body: messageBody },
    });
  }

  async sendDemandNotificationToMultipleProviders(
    providers: Provider[],
    demand: Demand,
    providerMessagesMap?: Map<string, string>,
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    for (const provider of providers) {
      const sent = await this.sendDemandNotificationToProvider(
        provider,
        demand,
        providerMessagesMap?.get(provider.id),
      );
      if (sent) {
        results.success.push(provider.phone);
      } else if (provider.phone) {
        results.failed.push(provider.phone);
      }
    }

    return results;
  }

  // ==================== NOTIFICATIONS ADMIN HGPD ====================

  async sendDemandNotificationToAdmin(
    demand: Demand,
    organizer: Organizer,
    providers: Provider[],
  ): Promise<boolean> {
    if (!this.adminPhone) {
      this.logger.warn(
        'Admin phone not configured, skipping admin WhatsApp notification',
      );
      return false;
    }

    const phone = this.formatPhoneNumber(this.adminPhone);

    // Template pour admin
    const templateName = this.configService.get<string>(
      'WHATSAPP_TEMPLATE_ADMIN_DEMAND',
    );

    if (templateName) {
      // {{nom_organisateur}}, {{type_evenement}}, {{date_evenement}}, {{nombre_prestataires}}
      return this.sendMessage({
        to: phone,
        template: {
          name: templateName,
          language: { code: 'fr' },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: `${organizer.firstName} ${organizer.lastName}`,
                },
                { type: 'text', text: demand.eventNature || 'Non precise' },
                { type: 'text', text: this.formatDate(demand.eventDate) },
                { type: 'text', text: `${providers.length}` },
              ],
            },
          ],
        },
      });
    }

    // Fallback: message texte (si conversation active)
    const providersList =
      providers.length > 0
        ? providers
          .map((p) => `  - ${p.companyName} (${p.firstName} ${p.lastName})`)
          .join('\n')
        : '  Aucun prestataire assigne';

    const messageBody = `[ADMIN] Nouvelle demande recue

Organisateur:
  - Nom: ${organizer.firstName} ${organizer.lastName}
  - Tel: ${organizer.phone || 'Non renseigne'}
  - Email: ${organizer.email || 'Non renseigne'}
  - Localisation: ${organizer.commune}, ${organizer.department}

Details evenement:
  - Type: ${demand.eventNature}
  - Date: ${this.formatDate(demand.eventDate)}
  - Lieu: ${demand.location || 'Non precise'}
  - Zone: ${demand.geographicZone || 'Non precise'}
  - Invites: ${demand.approximateGuests || 'Non precise'}
  - Budget: ${demand.budget ? this.formatCurrency(demand.budget) : 'Non precise'}
  - Contact: ${demand.contactName}

Prestataires notifies (${providers.length}):
${providersList}

${demand.additionalInfo ? `Infos supplementaires:\n${demand.additionalInfo}` : ''}`;

    return this.sendMessage({
      to: phone,
      text: { body: messageBody },
    });
  }

  // ==================== AUTRES NOTIFICATIONS ====================

  async sendWelcomeMessage(provider: Provider): Promise<boolean> {
    if (!provider.phone) {
      return false;
    }

    const phone = this.formatPhoneNumber(provider.phone);

    const messageBody = `🎉 *Bienvenue sur HGPD !*

Bonjour ${provider.firstName},

Votre compte prestataire "${provider.companyName}" a ete cree avec succes !

Vous pouvez maintenant :
✅ Recevoir des demandes de prestation
✅ Gerer votre profil et portfolio
✅ Communiquer avec les organisateurs

Connectez-vous sur notre plateforme pour completer votre profil.

_L'equipe HGPD_`;

    return this.sendMessage({
      to: phone,
      text: { body: messageBody },
    });
  }

  async sendPasswordResetNotification(
    phone: string,
    token: string,
  ): Promise<boolean> {
    const formattedPhone = this.formatPhoneNumber(phone);

    const messageBody = `🔐 *Reinitialisation de mot de passe*

Vous avez demande la reinitialisation de votre mot de passe HGPD.

Votre code de verification : *${token.substring(0, 6).toUpperCase()}*

Ce code expire dans 1 heure.

Si vous n'avez pas fait cette demande, ignorez ce message.

_L'equipe HGPD_`;

    return this.sendMessage({
      to: formattedPhone,
      text: { body: messageBody },
    });
  }
}
