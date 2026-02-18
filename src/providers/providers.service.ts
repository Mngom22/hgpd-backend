import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Provider } from './entities/provider.entity';
import { ProviderPhoto } from './entities/provider-photo.entity';
import { ProviderVideo } from './entities/provider-video.entity';
import { ProviderCategory } from './entities/provider-category.entity';
import { ProviderCategoryPhoto } from './entities/provider-category-photo.entity';
import { ProviderStats } from './entities/provider-stats.entity';
import {
  CreateProviderDto,
  UpdateProviderDto,
  CreateProviderPhotoDto,
  CreateProviderVideoDto,
  AddProviderCategoryDto,
  UpdateProviderCategoryDto,
} from './dto';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(ProviderPhoto)
    private readonly photoRepository: Repository<ProviderPhoto>,
    @InjectRepository(ProviderVideo)
    private readonly videoRepository: Repository<ProviderVideo>,
    @InjectRepository(ProviderCategory)
    private readonly providerCategoryRepository: Repository<ProviderCategory>,
    @InjectRepository(ProviderCategoryPhoto)
    private readonly categoryPhotoRepository: Repository<ProviderCategoryPhoto>,
    @InjectRepository(ProviderStats)
    private readonly statsRepository: Repository<ProviderStats>,
  ) { }

  // Provider CRUD
  async create(dto: CreateProviderDto): Promise<Provider> {
    const existing = await this.providerRepository.findOne({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const provider = this.providerRepository.create({
      ...dto,
      password: hashedPassword,
    });
    const savedProvider = await this.providerRepository.save(provider);

    // Create initial stats
    const stats = this.statsRepository.create({ providerId: savedProvider.id });
    await this.statsRepository.save(stats);

    return savedProvider;
  }

  async findAll(options?: {
    department?: string;
    categoryId?: number;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.providerRepository
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.photos', 'photos')
      .leftJoinAndSelect('provider.providerCategories', 'pc')
      .leftJoinAndSelect('pc.category', 'category')
      .leftJoinAndSelect('pc.subCategory', 'subCategory');

    if (options?.department) {
      query.andWhere('provider.department = :department', {
        department: options.department,
      });
    }

    if (options?.categoryId) {
      query.andWhere('pc.categoryId = :categoryId', {
        categoryId: options.categoryId,
      });
    }

    if (options?.isActive !== undefined) {
      query.andWhere('provider.isActive = :isActive', {
        isActive: options.isActive,
      });
    }

    const [items, total] = await query
      .orderBy('provider.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Retourner les données brutes, l'interceptor s'occupe du format
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Provider> {
    const provider = await this.providerRepository.findOne({
      where: { id },
      relations: [
        'photos',
        'videos',
        'providerCategories',
        'providerCategories.category',
        'providerCategories.subCategory',
        'providerCategories.photos',
        'stats',
      ],
    });
    if (!provider) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }
    return provider;
  }

  async findByPhone(phone: string): Promise<Provider | null> {
    return this.providerRepository.findOne({ where: { phone } });
  }

  async update(id: string, dto: UpdateProviderDto): Promise<Provider> {
    const provider = await this.findById(id);
    Object.assign(provider, dto);
    return this.providerRepository.save(provider);
  }

  async remove(id: string): Promise<void> {
    const provider = await this.findById(id);
    await this.providerRepository.remove(provider);
  }

  async setActive(id: string, isActive: boolean): Promise<Provider> {
    const provider = await this.findById(id);
    provider.isActive = isActive;
    return this.providerRepository.save(provider);
  }

  // Photos
  async addPhoto(
    providerId: string,
    dto: CreateProviderPhotoDto,
  ): Promise<ProviderPhoto> {
    await this.findById(providerId);

    if (dto.isMain) {
      await this.photoRepository.update(
        { providerId, isMain: true },
        { isMain: false },
      );
    }

    const photo = this.photoRepository.create({ ...dto, providerId });
    return this.photoRepository.save(photo);
  }

  async removePhoto(providerId: string, photoId: string): Promise<void> {
    const photo = await this.photoRepository.findOne({
      where: { id: photoId, providerId },
    });
    if (!photo) {
      throw new NotFoundException(`Photo not found`);
    }
    await this.photoRepository.remove(photo);
  }

  async setMainPhoto(providerId: string, photoId: string): Promise<void> {
    await this.photoRepository.update(
      { providerId, isMain: true },
      { isMain: false },
    );
    await this.photoRepository.update(
      { id: photoId, providerId },
      { isMain: true },
    );
  }

  // Videos
  async addVideo(
    providerId: string,
    dto: CreateProviderVideoDto,
  ): Promise<ProviderVideo> {
    await this.findById(providerId);
    const video = this.videoRepository.create({ ...dto, providerId });
    return this.videoRepository.save(video);
  }

  async removeVideo(providerId: string, videoId: string): Promise<void> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId, providerId },
    });
    if (!video) {
      throw new NotFoundException(`Video not found`);
    }
    await this.videoRepository.remove(video);
  }

  // Categories
  async addCategory(
    providerId: string,
    dto: AddProviderCategoryDto,
  ): Promise<ProviderCategory> {
    await this.findById(providerId);

    const existing = await this.providerCategoryRepository.findOne({
      where: {
        providerId,
        categoryId: dto.categoryId,
        subCategoryId: dto.subCategoryId ?? undefined,
      },
    });
    if (existing) {
      throw new ConflictException('Category already added');
    }

    const pc = this.providerCategoryRepository.create({ ...dto, providerId });
    return this.providerCategoryRepository.save(pc);
  }

  async removeCategory(providerId: string, pcId: number): Promise<void> {
    const pc = await this.providerCategoryRepository.findOne({
      where: { id: pcId, providerId },
    });
    if (!pc) {
      throw new NotFoundException(`Provider category not found`);
    }
    await this.providerCategoryRepository.remove(pc);
  }

  async updateCategory(
    providerId: string,
    pcId: number,
    dto: UpdateProviderCategoryDto,
  ): Promise<ProviderCategory> {
    const pc = await this.providerCategoryRepository.findOne({
      where: { id: pcId, providerId },
    });
    if (!pc) {
      throw new NotFoundException(`Provider category not found`);
    }
    Object.assign(pc, dto);
    return this.providerCategoryRepository.save(pc);
  }

  async addCategoryPhoto(
    providerId: string,
    pcId: number,
    dto: CreateProviderPhotoDto,
  ): Promise<ProviderCategoryPhoto> {
    // Vérifier que la catégorie existe et appartient au prestataire
    const pc = await this.providerCategoryRepository.findOne({
      where: { id: pcId, providerId },
    });
    if (!pc) {
      throw new NotFoundException(`Provider category not found`);
    }

    // Vérifier la limite de 5 photos par catégorie
    const photoCount = await this.categoryPhotoRepository.count({
      where: { providerCategoryId: pcId },
    });
    if (photoCount >= 5) {
      throw new ConflictException('Maximum 5 photos per category');
    }

    const photo = this.categoryPhotoRepository.create({
      providerCategoryId: pcId,
      url: dto.url,
      displayOrder: dto.displayOrder || 0,
    });
    return this.categoryPhotoRepository.save(photo);
  }

  async removeCategoryPhoto(
    providerId: string,
    pcId: number,
    photoId: string,
  ): Promise<void> {
    // Vérifier que la catégorie existe et appartient au prestataire
    const pc = await this.providerCategoryRepository.findOne({
      where: { id: pcId, providerId },
    });
    if (!pc) {
      throw new NotFoundException(`Provider category not found`);
    }

    // Trouver et supprimer la photo
    const photo = await this.categoryPhotoRepository.findOne({
      where: { id: photoId, providerCategoryId: pcId },
    });
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    await this.categoryPhotoRepository.remove(photo);
  }

  // Stats
  async getStats(providerId: string): Promise<ProviderStats> {
    let stats = await this.statsRepository.findOne({ where: { providerId } });
    // If stats don't exist, create them automatically
    if (!stats) {
      stats = this.statsRepository.create({ providerId });
      await this.statsRepository.save(stats);
    }
    return stats;
  }

  async incrementProfileViews(providerId: string): Promise<void> {
    await this.statsRepository.increment({ providerId }, 'profileViews', 1);
  }

  async updateStats(
    providerId: string,
    data: Partial<ProviderStats>,
  ): Promise<ProviderStats> {
    const stats = await this.getStats(providerId);
    Object.assign(stats, data);
    return this.statsRepository.save(stats);
  }
}
