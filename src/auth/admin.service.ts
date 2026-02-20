import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from './entities/admin.entity';
import { AdminRole } from '../common/enums';
import { User } from '../users/entities/users.entities';
import { Provider } from '../providers/entities/provider.entity';
import { Demand } from '../demands/entities/demand.entity';
import { DemandStatus } from '../common/enums/demand-status.enum';

export interface CreateAdminDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: AdminRole;
}

export interface AdminStats {
  totalUsers: number;
  providers: {
    total: number;
    active: number;
    inactive: number;
  };
  demands: {
    total: number;
    accepted: number;
    refused: number;
    pending: number;
    pendingPayment: number;
  };
  payments: {
    totalRevenue: number;
    completed: number;
    pending: number;
  };
  totalAdmins: number;
  timestamp: Date;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Demand)
    private readonly demandRepository: Repository<Demand>,
  ) { }

  async create(dto: CreateAdminDto): Promise<Admin> {
    const existing = await this.adminRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Cet email est deja enregistre');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const admin = this.adminRepository.create({
      ...dto,
      password: hashedPassword,
      role: dto.role || AdminRole.ADMIN,
    });

    const savedAdmin = await this.adminRepository.save(admin);
    this.logger.log(`New admin created: ${savedAdmin.id} (${savedAdmin.role})`);

    return savedAdmin;
  }

  async findAll(): Promise<Admin[]> {
    return this.adminRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Admin> {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) {
      throw new NotFoundException('Admin non trouve');
    }
    return admin;
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return this.adminRepository.findOne({ where: { email } });
  }

  async setActive(id: string, isActive: boolean): Promise<Admin> {
    const admin = await this.findById(id);
    admin.isActive = isActive;
    const updatedAdmin = await this.adminRepository.save(admin);

    this.logger.log(`Admin ${id} active status changed to: ${isActive}`);
    return updatedAdmin;
  }

  async updateRole(id: string, role: AdminRole): Promise<Admin> {
    const admin = await this.findById(id);
    admin.role = role;
    const updatedAdmin = await this.adminRepository.save(admin);

    this.logger.log(`Admin ${id} role changed to: ${role}`);
    return updatedAdmin;
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const admin = await this.findById(id);
    admin.password = await bcrypt.hash(newPassword, 10);
    await this.adminRepository.save(admin);

    this.logger.log(`Admin ${id} password updated`);
  }

  async remove(id: string): Promise<void> {
    const admin = await this.findById(id);
    await this.adminRepository.remove(admin);

    this.logger.log(`Admin ${id} removed`);
  }

  async getGlobalStats(): Promise<AdminStats> {
    const [
      totalUsers,
      totalProviders,
      activeProviders,
      inactiveProviders,
      totalDemands,
      acceptedDemands,
      refusedDemands,
      newDemands,
      pendingPaymentDemands,
      totalAdmins,
    ] = await Promise.all([
      this.userRepository.count(),
      this.providerRepository.count(),
      this.providerRepository.count({ where: { isActive: true } }),
      this.providerRepository.count({ where: { isActive: false } }),
      this.demandRepository.count(),
      this.demandRepository.count({
        where: { status: DemandStatus.MISSION_CONFIRMED },
      }),
      this.demandRepository.count({
        where: [
          { status: DemandStatus.REFUSED_BY_PROVIDER },
          { status: DemandStatus.REFUSED_BY_CLIENT },
          { status: DemandStatus.CANCELLED_BY_CLIENT },
          { status: DemandStatus.CANCELLED_BY_PROVIDER },
        ],
      }),
      this.demandRepository.count({
        where: { status: DemandStatus.NEW_REQUEST },
      }),
      this.demandRepository.count({
        where: { status: DemandStatus.WAITING_PAYMENT },
      }),
      this.adminRepository.count(),
    ]);

    return {
      totalUsers,
      providers: {
        total: totalProviders,
        active: activeProviders,
        inactive: inactiveProviders,
      },
      demands: {
        total: totalDemands,
        accepted: acceptedDemands,
        refused: refusedDemands,
        pending: newDemands,
        pendingPayment: pendingPaymentDemands,
      },
      payments: {
        totalRevenue: 0,
        completed: 0,
        pending: 0,
      },
      totalAdmins,
      timestamp: new Date(),
    };
  }
}
