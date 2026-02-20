import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Demand } from './entities/demand.entity';
import { DemandProvider } from './entities/demand-provider.entity';
import { DemandBudget } from './entities/demand-budget.entity';
import { Provider } from '../providers/entities/provider.entity';
import { Organizer } from '../organizers/entities/organizer.entity';
import { ProviderCategory } from '../providers/entities/provider-category.entity';
import { DemandStatus } from '../common/enums';
import {
  CreateDemandDto,
  UpdateDemandDto,
  AssignProviderDto,
  UpdateDemandProviderDto,
} from './dto';
import { MailService } from '../mail/mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationType, NotificationChannel } from '../common/enums';
import { ProvidersService } from '../providers/providers.service';
import { Admin } from '../auth/entities/admin.entity';

const MAX_PROVIDERS_PER_DEMAND = 5;

@Injectable()
export class DemandsService {
  private readonly logger = new Logger(DemandsService.name);

  constructor(
    @InjectRepository(Demand)
    private readonly demandRepository: Repository<Demand>,
    @InjectRepository(DemandProvider)
    private readonly demandProviderRepository: Repository<DemandProvider>,
    @InjectRepository(DemandBudget)
    private readonly demandBudgetRepository: Repository<DemandBudget>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Organizer)
    private readonly organizerRepository: Repository<Organizer>,
    @InjectRepository(ProviderCategory)
    private readonly providerCategoryRepository: Repository<ProviderCategory>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly mailService: MailService,
    private readonly whatsAppService: WhatsAppService,
    private readonly notificationsService: NotificationsService,
    private readonly eventsGateway: EventsGateway,
    private readonly providersService: ProvidersService,
  ) { }

  // Demands CRUD
  async create(dto: CreateDemandDto): Promise<Demand> {
    this.logger.log(`Creating demand: ${JSON.stringify(dto)}`);
    const { providerIds, categoryBudgets, providerBudgets, budget, ...demandData } = dto;

    // Valider les prestataires si fournis
    if (providerIds && providerIds.length > 0) {
      await this.validateProvidersHaveBudget(providerIds, categoryBudgets);
    }

    const demand = this.demandRepository.create(demandData);
    const savedDemand = await this.demandRepository.save(demand);

    try {
      // Sauvegarder les budgets par catégorie
      await this.saveCategoryBudgets(savedDemand.id, categoryBudgets);
    } catch (error) {
      this.logger.error(`Error saving budgets for demand ${savedDemand.id}: ${error.message}`);
      throw new BadRequestException(`Erreur lors de la sauvegarde des budgets: ${error.message}`);
    }

    // Récupérer les budgets sauvegardés avec les relations (catégories)
    const savedBudgets = await this.demandBudgetRepository.find({
      where: { demandId: savedDemand.id },
      relations: ['category'],
    });

    // Récupérer l'organisateur pour les notifications
    const [organizer, providers] = await Promise.all([
      this.organizerRepository.findOne({ where: { id: savedDemand.organizerId } }),
      providerIds && providerIds.length > 0
        ? this.providerRepository.find({ where: { id: In(providerIds) } })
        : Promise.resolve([]),
    ]);

    // Créer les associations DemandProvider de manière SYNCHRONE
    let savedDemandProviders: DemandProvider[] = [];
    if (providers.length > 0) {
      // S'assurer de ne traiter que les prestataires trouvés en base
      const demandProvidersEntries = providers.map((provider) => {
        const providerBudgetData = providerBudgets?.find(pb => pb.providerId === provider.id);
        const specificBudget = providerBudgetData?.budget;
        const specificLeadPrice = providerBudgetData?.leadPrice;
        const specificMessage = providerBudgetData?.message;
        const specificCategoryId = providerBudgetData?.categoryId;
        return this.demandProviderRepository.create({
          demandId: savedDemand.id,
          providerId: provider.id,
          budget: specificBudget,
          leadPrice: specificLeadPrice,
          message: specificMessage,
          categoryId: specificCategoryId,
        });
      });
      savedDemandProviders = await this.demandProviderRepository.save(demandProvidersEntries);
      this.logger.log(`Assigned ${providers.length} providers to demand ${savedDemand.id} synchronously`);
    } else if (providerIds && providerIds.length > 0) {
      this.logger.warn(`No valid providers found in database for IDs: ${providerIds.join(', ')}. Demand will have no provider associations.`);
    }

    // Récupérer les catégories des prestataires pour les notifications (avec relations)
    const providerCategories = providers.length > 0
      ? await this.providerCategoryRepository.find({
        where: { providerId: In(providers.map(p => p.id)) },
        relations: ['category'],
      })
      : [];

    const providerCategoriesMap = new Map<string, number[]>();
    const providerCategoryNamesMap = new Map<string, string[]>();
    const providerMessagesMap = new Map<string, string>();

    for (const pc of providerCategories) {
      if (!providerCategoriesMap.has(pc.providerId)) {
        providerCategoriesMap.set(pc.providerId, []);
        providerCategoryNamesMap.set(pc.providerId, []);
      }
      providerCategoriesMap.get(pc.providerId)!.push(pc.categoryId);
      if (pc.category?.name) {
        providerCategoryNamesMap.get(pc.providerId)!.push(pc.category.name);
      }
    }

    // Collect specific messages from the created demand providers
    for (const dp of savedDemandProviders) {
      if (dp.message) {
        providerMessagesMap.set(dp.providerId, dp.message);
      }
    }

    // Notifications en arrière-plan (TRÈS non-bloquant : uniquement les appels réseau externes)
    const runExternalNotifications = async () => {
      try {
        const notificationPromises: Promise<any>[] = [];

        // 1. Confirmation Organisateur
        if (organizer) {
          notificationPromises.push(
            this.mailService.sendDemandConfirmationToOrganizer(organizer, savedDemand, savedBudgets)
              .catch(e => this.logger.error(`Organizer mail failed: ${e.message}`))
          );
        }

        // 2. Notifications Prestataires
        if (providers.length > 0) {
          // Mails prestataires
          notificationPromises.push(
            this.mailService.sendDemandNotificationToMultipleProviders(
              providers,
              savedDemand,
              savedBudgets,
              providerCategoriesMap,
              providerCategoryNamesMap,
              providerMessagesMap,
            )
              .catch(e => this.logger.error(`Providers mail failed: ${e.message}`))
          );
          // WhatsApp prestataires
          notificationPromises.push(
            this.whatsAppService.sendDemandNotificationToMultipleProviders(
              providers,
              savedDemand,
              providerMessagesMap,
            )
              .catch(e => this.logger.error(`Providers WhatsApp failed: ${e.message}`))
          );
        }

        // 3. Notifications Admin
        if (organizer) {
          notificationPromises.push(
            this.mailService.sendDemandNotificationToAdmin(savedDemand, organizer, providers, savedBudgets)
              .catch(e => this.logger.error(`Admin mail failed: ${e.message}`))
          );
          notificationPromises.push(
            this.whatsAppService.sendDemandNotificationToAdmin(savedDemand, organizer, providers)
              .catch(e => this.logger.error(`Admin WhatsApp failed: ${e.message}`))
          );
        }

        // 4. In-app Notification for Admin & WebSocket Event
        this.eventsGateway.emitToAdmin('demand_created', { demandId: savedDemand.id, organizer: organizer?.firstName });

        // Notify ALL active admins
        const activeAdmins = await this.adminRepository.find({ where: { isActive: true } });
        for (const admin of activeAdmins) {
          await this.notificationsService.createNotification({
            recipientId: admin.id,
            recipientType: 'admin',
            type: NotificationType.NEW_DEMAND,
            channel: NotificationChannel.EMAIL, // Placeholder channel
            content: {
              demandId: savedDemand.id,
              message: `Nouvelle demande de ${organizer?.firstName || 'Client'} pour ${savedDemand.eventNature}`,
            },
          });
        }

        // Exécuter toutes les notifications en parallèle en tâche de fond
        await Promise.all(notificationPromises);
      } catch (error) {
        this.logger.error(`Background notification handler failed for demand ${savedDemand.id}: ${error.message}`);
      }
    };

    // Lancer sans await
    void runExternalNotifications();

    return this.findById(savedDemand.id);
  }


  async findAll(options?: {
    organizerId?: string;
    status?: DemandStatus;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<Demand[]> {
    const query = this.demandRepository
      .createQueryBuilder('demand')
      .leftJoinAndSelect('demand.organizer', 'organizer')
      .leftJoinAndSelect('demand.demandProviders', 'dp')
      .leftJoinAndSelect('dp.provider', 'provider');

    if (options?.organizerId) {
      query.andWhere('demand.organizerId = :organizerId', {
        organizerId: options.organizerId,
      });
    }

    if (options?.status) {
      query.andWhere('demand.status = :status', { status: options.status });
    }

    if (options?.fromDate) {
      query.andWhere('demand.eventDate >= :fromDate', {
        fromDate: options.fromDate,
      });
    }

    if (options?.toDate) {
      query.andWhere('demand.eventDate <= :toDate', { toDate: options.toDate });
    }

    return query.orderBy('demand.createdAt', 'DESC').getMany();
  }

  async findById(id: string): Promise<Demand> {
    const demand = await this.demandRepository.findOne({
      where: { id },
      relations: [
        'organizer',
        'demandProviders',
        'demandProviders.provider',
        'demandProviders.payment',
        'demandBudgets',
        'demandBudgets.category',
      ],
    });
    if (!demand) {
      throw new NotFoundException(`Demand with ID ${id} not found`);
    }
    return demand;
  }

  async update(id: string, dto: UpdateDemandDto): Promise<Demand> {
    const demand = await this.findById(id);
    Object.assign(demand, dto);
    return this.demandRepository.save(demand);
  }

  async updateStatus(id: string, status: DemandStatus): Promise<Demand> {
    const demand = await this.findById(id);
    demand.status = status;
    return this.demandRepository.save(demand);
  }

  async remove(id: string): Promise<void> {
    const demand = await this.findById(id);
    await this.demandRepository.remove(demand);
  }

  // DemandProvider operations
  async assignProvider(
    demandId: string,
    dto: AssignProviderDto,
  ): Promise<DemandProvider> {
    const demand = await this.findById(demandId);

    // Vérifier la limite de prestataires
    const currentProviderCount = await this.demandProviderRepository.count({
      where: { demandId },
    });

    if (currentProviderCount >= MAX_PROVIDERS_PER_DEMAND) {
      throw new BadRequestException(
        `Cette demande a déjà atteint la limite de ${MAX_PROVIDERS_PER_DEMAND} prestataires`,
      );
    }

    const existing = await this.demandProviderRepository.findOne({
      where: { demandId, providerId: dto.providerId },
    });
    if (existing) {
      return existing;
    }

    // Vérifier que le prestataire a un budget correspondant à sa catégorie
    await this.validateProviderHasBudgetForDemand(dto.providerId, demandId);

    const dp = this.demandProviderRepository.create({
      demandId,
      providerId: dto.providerId,
    });
    return this.demandProviderRepository.save(dp);
  }

  async findDemandsByProvider(
    providerId: string,
    status?: DemandStatus,
  ): Promise<DemandProvider[]> {
    const query = this.demandProviderRepository
      .createQueryBuilder('dp')
      .leftJoinAndSelect('dp.demand', 'demand')
      .leftJoinAndSelect('demand.organizer', 'organizer')
      .where('dp.providerId = :providerId', { providerId });

    if (status) {
      query.andWhere('dp.status = :status', { status });
    }

    return query.orderBy('demand.createdAt', 'DESC').getMany();
  }

  async findAllDemandProviders(): Promise<DemandProvider[]> {
    return this.demandProviderRepository
      .createQueryBuilder('dp')
      .leftJoinAndSelect('dp.demand', 'demand')
      .leftJoinAndSelect('demand.organizer', 'organizer')
      .leftJoinAndSelect('dp.provider', 'provider')
      .leftJoinAndSelect('dp.category', 'category')
      .orderBy('demand.createdAt', 'DESC')
      .getMany();
  }

  async getDemandProvider(
    demandId: string,
    providerId: string,
  ): Promise<DemandProvider> {
    const dp = await this.demandProviderRepository.findOne({
      where: { demandId, providerId },
      relations: ['demand', 'provider', 'payment', 'review'],
    });
    if (!dp) {
      throw new NotFoundException(`DemandProvider not found`);
    }
    return dp;
  }

  async getDemandProviderById(id: string): Promise<DemandProvider> {
    const dp = await this.demandProviderRepository.findOne({
      where: { id },
      relations: [
        'demand',
        'demand.organizer',
        'provider',
        'payment',
        'review',
      ],
    });
    if (!dp) {
      throw new NotFoundException(`DemandProvider with ID ${id} not found`);
    }
    return dp;
  }

  async updateDemandProvider(
    id: string,
    dto: UpdateDemandProviderDto,
  ): Promise<DemandProvider> {
    const dp = await this.getDemandProviderById(id);
    const previousStatus = dp.status;

    Object.assign(dp, dto);
    const savedDp = await this.demandProviderRepository.save(dp);

    // Update stats based on status change
    if (dto.status && dto.status !== previousStatus) {
      await this.updateProviderStats(savedDp.providerId, previousStatus, dto.status);
    }

    // Envoyer email au prestataire si statut passe a MISSION_CONFIRMED
    if (
      dto.status === DemandStatus.MISSION_CONFIRMED &&
      previousStatus !== DemandStatus.MISSION_CONFIRMED
    ) {
      await this.sendMissionConfirmedNotification(savedDp);
    }

    // Envoyer notification quand acceptée par le prestataire
    if (
      dto.status === DemandStatus.ACCEPTED_BY_PROVIDER &&
      previousStatus !== DemandStatus.ACCEPTED_BY_PROVIDER
    ) {
      await this.sendProviderAcceptanceNotification(savedDp);
    }

    // Envoyer notification quand refusée par le prestataire
    if (
      dto.status === DemandStatus.REFUSED_BY_PROVIDER &&
      previousStatus !== DemandStatus.REFUSED_BY_PROVIDER
    ) {
      await this.sendProviderRefusalNotification(savedDp);
    }

    // Notify Admin of status change
    if (dto.status && dto.status !== previousStatus) {
      this.eventsGateway.emitToAdmin('demand_status_changed', {
        demandProviderId: id,
        status: dto.status
      });

      // Notify ALL active admins of status change
      const activeAdmins = await this.adminRepository.find({ where: { isActive: true } });
      for (const admin of activeAdmins) {
        await this.notificationsService.createNotification({
          recipientId: admin.id,
          recipientType: 'admin',
          type: NotificationType.DEMAND_STATUS_CHANGED,
          channel: NotificationChannel.EMAIL,
          content: {
            demandProviderId: id,
            status: dto.status,
            message: `La demande ${id} est passée au statut ${dto.status}`,
          },
        });
      }
    }

    return savedDp;
  }

  private async sendMissionConfirmedNotification(
    dp: DemandProvider,
  ): Promise<void> {
    try {
      // Charger les relations necessaires si pas deja chargees
      const demandProvider = await this.demandProviderRepository.findOne({
        where: { id: dp.id },
        relations: ['demand', 'demand.organizer', 'provider'],
      });

      if (!demandProvider?.demand?.organizer || !demandProvider?.provider) {
        this.logger.warn(
          `Cannot send mission confirmed email: missing demand, organizer or provider for DemandProvider ${dp.id}`,
        );
        return;
      }

      await this.mailService.sendMissionConfirmedEmail(
        demandProvider.provider,
        demandProvider.demand,
        demandProvider.demand.organizer,
      );

      this.logger.log(
        `Mission confirmed email sent for DemandProvider ${dp.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send mission confirmed email for DemandProvider ${dp.id}: ${error.message}`,
      );
      // Ne pas faire echouer la mise a jour si l'email echoue
    }
  }

  private async sendProviderAcceptanceNotification(
    dp: DemandProvider,
  ): Promise<void> {
    try {
      // Charger les relations necessaires
      const demandProvider = await this.demandProviderRepository.findOne({
        where: { id: dp.id },
        relations: ['demand', 'demand.organizer', 'provider'],
      });

      if (!demandProvider?.demand || !demandProvider?.provider) {
        this.logger.warn(
          `Cannot send acceptance notification: missing demand or provider for DemandProvider ${dp.id}`,
        );
        return;
      }

      const demand = demandProvider.demand;
      const provider = demandProvider.provider;
      const organizer = demand.organizer;

      // 1. Envoyer email au prestataire
      if (provider.email) {
        try {
          await this.mailService.sendProviderAcceptanceEmail(provider, demand, organizer);
          this.logger.log(`Provider acceptance email sent to ${provider.email}`);
        } catch (error) {
          this.logger.error(`Failed to send provider acceptance email: ${error.message}`);
        }
      }

      // 2. Envoyer email à sdr@beussdoutouti.com
      try {
        await this.mailService.sendAdminAcceptanceNotification(provider, demand, organizer);
        this.logger.log(`Admin acceptance notification sent for DemandProvider ${dp.id}`);
      } catch (error) {
        this.logger.error(`Failed to send admin acceptance notification: ${error.message}`);
      }

    } catch (error) {
      this.logger.error(
        `Failed to send provider acceptance notification for DemandProvider ${dp.id}: ${error.message}`,
      );
      // Ne pas faire echouer la mise a jour si les notifications echouent
    }
  }

  async unlockContact(demandProviderId: string): Promise<DemandProvider> {
    const dp = await this.getDemandProviderById(demandProviderId);
    dp.contactUnlockedAt = new Date();
    return this.demandProviderRepository.save(dp);
  }

  // Budget par catégorie - méthodes privées
  private async saveCategoryBudgets(
    demandId: string,
    categoryBudgets: { categoryId: number; minAmount: number; maxAmount: number }[],
  ): Promise<void> {
    const budgetEntities = categoryBudgets.map((cb) =>
      this.demandBudgetRepository.create({
        demandId,
        categoryId: cb.categoryId,
        minAmount: cb.minAmount,
        maxAmount: cb.maxAmount,
      }),
    );
    await this.demandBudgetRepository.save(budgetEntities);
  }

  private async validateProvidersHaveBudget(
    providerIds: string[],
    categoryBudgets: { categoryId: number; minAmount: number; maxAmount: number }[],
  ): Promise<void> {
    const budgetCategoryIds = new Set(
      categoryBudgets.map((cb) => cb.categoryId),
    );

    // Récupérer les catégories de tous les prestataires
    const providerCategories = await this.providerCategoryRepository.find({
      where: { providerId: In(providerIds) },
    });

    // Grouper par prestataire
    const categoriesByProvider = new Map<string, number[]>();
    for (const pc of providerCategories) {
      if (!categoriesByProvider.has(pc.providerId)) {
        categoriesByProvider.set(pc.providerId, []);
      }
      categoriesByProvider.get(pc.providerId)!.push(pc.categoryId);
    }

    // Vérifier que chaque prestataire trouvé en base a au moins une catégorie avec un budget
    for (const providerId of providerIds) {
      // Ignorer si le prestataire n'existe pas en base (pour supporter les données mock/dev)
      const providerCategoryIds = categoriesByProvider.get(providerId);
      if (!providerCategoryIds) {
        this.logger.warn(`Provider ${providerId} not found in database, skipping budget validation.`);
        continue;
      }

      const hasBudget = providerCategoryIds.some((catId) =>
        budgetCategoryIds.has(catId),
      );

      if (!hasBudget) {
        // Récupérer le nom du prestataire pour un message d'erreur plus clair
        const provider = await this.providerRepository.findOne({
          where: { id: providerId },
        });
        const providerName = provider
          ? `${provider.firstName} ${provider.lastName}`
          : providerId;

        throw new BadRequestException(
          `Le prestataire "${providerName}" n'a pas de budget défini pour sa catégorie. ` +
          `Veuillez ajouter un budget pour au moins une de ses catégories.`,
        );
      }
    }
  }

  private async validateProviderHasBudgetForDemand(
    providerId: string,
    demandId: string,
  ): Promise<void> {
    // Récupérer les catégories du prestataire
    const providerCategories = await this.providerCategoryRepository.find({
      where: { providerId },
    });

    if (providerCategories.length === 0) {
      throw new BadRequestException(
        `Le prestataire n'a aucune catégorie assignée`,
      );
    }

    const providerCategoryIds = providerCategories.map((pc) => pc.categoryId);

    // Récupérer les budgets de la demande
    const demandBudgets = await this.demandBudgetRepository.find({
      where: { demandId },
    });

    const budgetCategoryIds = new Set(demandBudgets.map((db) => db.categoryId));

    // Vérifier qu'au moins une catégorie du prestataire a un budget
    const hasBudget = providerCategoryIds.some((catId) =>
      budgetCategoryIds.has(catId),
    );

    if (!hasBudget) {
      const provider = await this.providerRepository.findOne({
        where: { id: providerId },
      });
      const providerName = provider
        ? `${provider.firstName} ${provider.lastName}`
        : providerId;

      throw new BadRequestException(
        `Le prestataire "${providerName}" n'a pas de budget défini pour sa catégorie dans cette demande.`,
      );
    }
  }

  async removeProvider(demandId: string, providerId: string): Promise<void> {
    const dp = await this.getDemandProvider(demandId, providerId);
    await this.demandProviderRepository.remove(dp);
  }

  // Stats
  async getProviderStats(providerId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
  }> {
    const total = await this.demandProviderRepository.count({
      where: { providerId },
    });

    const completed = await this.demandProviderRepository.count({
      where: { providerId, convertedToMission: true },
    });

    const pending = await this.demandProviderRepository.count({
      where: { providerId, status: DemandStatus.NEW_REQUEST },
    });

    return { total, completed, pending };
  }

  // Approve demand for provider and send notification
  async approveDemandForProvider(demandId: string, providerId: string): Promise<DemandProvider> {
    const demandProvider = await this.demandProviderRepository.findOne({
      where: { demandId, providerId },
      relations: ['demand', 'demand.organizer', 'provider'],
    });

    if (!demandProvider) {
      throw new NotFoundException(`Demand-Provider association not found`);
    }

    // Mark as approved by admin
    demandProvider.adminApprovedAt = new Date();
    demandProvider.status = DemandStatus.MISSION_CONFIRMED;
    demandProvider.contactUnlockedAt = new Date();
    const updated = await this.demandProviderRepository.save(demandProvider);

    // Charger les catégories du prestataire pour filtrer les messages
    const providerCategories = await this.providerCategoryRepository.find({
      where: { providerId },
      relations: ['category'],
    });
    const providerCategoryNames = providerCategories
      .filter((pc) => pc.category?.name)
      .map((pc) => pc.category!.name);

    // Send email notification to provider with organizer details
    try {
      if (demandProvider.provider?.email && demandProvider.demand?.organizer) {
        await this.mailService.sendApprovalNotificationWithOrganizerDetails(
          demandProvider.provider,
          demandProvider.demand,
          demandProvider.demand.organizer,
          demandProvider.leadPrice,
          providerCategoryNames,
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to send approval email: ${error.message}`);
    }

    // Create in-app notification
    try {
      await this.notificationsService.createNotification({
        recipientId: providerId,
        recipientType: 'provider',
        type: NotificationType.NEW_DEMAND,
        channel: NotificationChannel.EMAIL,
        content: {
          demandId: demandId,
          message: `Votre demande a été approuvée! Les coordonnées du client sont prêtes: ${demandProvider.demand?.eventNature}`,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to create notification: ${error.message}`);
    }

    return updated;
  }

  private async updateProviderStats(
    providerId: string,
    previousStatus: DemandStatus,
    newStatus: DemandStatus,
  ): Promise<void> {
    try {
      const stats = await this.providersService.getStats(providerId);

      // Décrementer l'ancien statut si applicable
      if (previousStatus === DemandStatus.ACCEPTED_BY_PROVIDER) {
        stats.demandsAccepted = Math.max(0, (stats.demandsAccepted || 0) - 1);
      } else if (previousStatus === DemandStatus.REFUSED_BY_PROVIDER) {
        stats.demandsRefused = Math.max(0, (stats.demandsRefused || 0) - 1);
      }

      // Incrémenter le nouveau statut
      if (newStatus === DemandStatus.ACCEPTED_BY_PROVIDER) {
        stats.demandsAccepted = (stats.demandsAccepted || 0) + 1;
      } else if (newStatus === DemandStatus.REFUSED_BY_PROVIDER) {
        stats.demandsRefused = (stats.demandsRefused || 0) + 1;
      }

      stats.lastUpdated = new Date();
      await this.providersService.updateStats(providerId, stats);

      // Notify provider of stats update via WebSocket
      this.eventsGateway.emitToProvider(providerId, 'stats_updated', stats);
    } catch (error) {
      this.logger.error(`Failed to update provider stats: ${error.message}`);
    }
  }

  private async sendProviderRefusalNotification(
    dp: DemandProvider,
  ): Promise<void> {
    try {
      const demandProvider = await this.demandProviderRepository.findOne({
        where: { id: dp.id },
        relations: ['demand', 'demand.organizer', 'provider'],
      });

      if (!demandProvider?.demand || !demandProvider?.provider) {
        this.logger.warn(
          `Cannot send refusal notification: missing demand or provider for DemandProvider ${dp.id}`,
        );
        return;
      }

      const demand = demandProvider.demand;
      const provider = demandProvider.provider;

      // 1. Log provider refusal
      this.logger.log(`Provider ${dp.providerId} refused demand ${dp.demandId}. Reason: ${dp.nonConversionComment}`);

      // 2. Send notification to admin about refusal
      const activeAdmins = await this.adminRepository.find({ where: { isActive: true } });
      for (const admin of activeAdmins) {
        await this.notificationsService.createNotification({
          recipientId: admin.id,
          recipientType: 'admin',
          type: NotificationType.DEMAND_STATUS_CHANGED,
          channel: NotificationChannel.EMAIL,
          content: {
            demandProviderId: dp.id,
            status: DemandStatus.REFUSED_BY_PROVIDER,
            message: `Le prestataire ${provider.companyName || `${provider.firstName} ${provider.lastName}`} a refusé la demande pour ${demand.eventNature}: ${dp.nonConversionComment}`,
          },
        });
      }

      this.logger.log(`Provider refusal notification sent for DemandProvider ${dp.id}`);
    } catch (error) {
      this.logger.error(`Error in sendProviderRefusalNotification: ${error.message}`);
    }
  }
}
