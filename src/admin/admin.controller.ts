import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  ParseUUIDPipe,
  ParseBoolPipe,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../common/enums';
import { AdminService } from '../auth/admin.service';
import { ProvidersService } from '../providers/providers.service';
import { DemandsService } from '../demands/demands.service';
import { ReviewsService } from '../reviews/reviews.service';
import { LegalService } from '../legal/legal.service';
import { Provider } from '../providers/entities/provider.entity';

@ApiTags('admin')
@Controller('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly providersService: ProvidersService,
    private readonly demandsService: DemandsService,
    private readonly reviewsService: ReviewsService,
    private readonly legalService: LegalService,
  ) { }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Get global admin stats' })
  async getGlobalStats() {
    return this.adminService.getGlobalStats();
  }

  @Get('providers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'List all providers for admin' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async getProvidersForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.providersService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get('providers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Get provider details for admin' })
  async getProviderDetails(@Param('id', ParseUUIDPipe) id: string) {
    const provider = await this.providersService.findById(id);
    const legalStatus =
      await this.legalService.hasProviderAcceptedActiveDocuments(id);
    return {
      ...provider,
      legalStatus,
    };
  }

  @Get('providers/:id/demands')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Get all demands for a provider' })
  async getProviderDemands(@Param('id', ParseUUIDPipe) id: string) {
    return this.demandsService.findDemandsByProvider(id);
  }

  @Get('demands/all-providers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Get all demand-provider entries for admin' })
  async getAllDemandProviders() {
    return this.demandsService.findAllDemandProviders();
  }

  @Get('providers/:id/reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Get provider reviews (max 2 latest)' })
  async getProviderReviews(@Param('id', ParseUUIDPipe) id: string) {
    const reviews = await this.reviewsService.findByProvider(id);
    // Return only last 2 reviews
    return reviews.slice(0, 2);
  }

  @Patch('providers/:id/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Activate/Deactivate provider' })
  async setProviderActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive', ParseBoolPipe) isActive: boolean,
  ) {
    return this.providersService.setActive(id, isActive);
  }

  @Delete('providers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Delete provider (SUPER_ADMIN only) - for bad behavior',
  })
  async deleteProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    return this.providersService.remove(id);
  }

  @Get('export/providers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Export all providers data (CSV)' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'json'],
    example: 'csv',
  })
  async exportProviders(
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ) {
    const providers = await this.providersService.findAll({
      page: 1,
      limit: 10000,
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="providers.json"',
      );
      return res.json(providers);
    }

    // CSV format
    const csvContent = this.generateProvidersCsv(providers.items);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="providers.csv"',
    );
    return res.send(csvContent);
  }

  private generateProvidersCsv(providers: Provider[]): string {
    const headers = [
      'ID',
      'Company Name',
      'Owner',
      'Email',
      'Phone',
      'Department',
      'Active',
      'Created At',
    ];
    const rows = providers.map((p) => [
      p.id,
      p.companyName,
      `${p.firstName} ${p.lastName}`,
      p.email,
      p.phone,
      p.department,
      p.isActive ? 'Yes' : 'No',
      new Date(p.createdAt).toLocaleDateString('fr-FR'),
    ]);

    const csvRows = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ];

    return csvRows.join('\n');
  }

  @Get('legal/acceptances')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Get providers who have accepted legal documents' })
  @ApiQuery({
    name: 'docType',
    required: false,
    enum: ['CGU', 'CGV'],
    description: 'Legal document type',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getProvidersWithLegalAcceptances(
    @Query('docType') docType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const skip = (pageNum - 1) * limitNum;

    // If docType is specified, get acceptances for that document type
    if (docType) {
      const activeDoc = await this.legalService.findActiveDocument(
        docType as any,
      );
      const acceptances = await this.legalService.findAcceptancesByDocument(
        activeDoc.id,
      );

      const paginatedAcceptances = acceptances.slice(skip, skip + limitNum);

      return {
        items: paginatedAcceptances.map((acc) => ({
          id: acc.id,
          providerId: acc.providerId,
          provider: acc.provider,
          documentType: activeDoc.type,
          documentVersion: activeDoc.version,
          acceptedAt: acc.acceptedAt,
        })),
        total: acceptances.length,
        page: pageNum,
        limit: limitNum,
      };
    }

    // If no docType, return all acceptances with provider details
    const allAcceptances = await this.legalService.findAllAcceptances(
      skip,
      limitNum,
    );
    return allAcceptances;
  }

  @Get('legal/acceptances/by-provider/:providerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Get legal acceptances for a specific provider' })
  async getProviderLegalAcceptances(
    @Param('providerId', ParseUUIDPipe) providerId: string,
  ) {
    return this.legalService.findAcceptancesByProvider(providerId);
  }

  @Patch('demands/:demandId/providers/:providerId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Approve a demand for a provider and send notification' })
  async approveDemandForProvider(
    @Param('demandId', ParseUUIDPipe) demandId: string,
    @Param('providerId', ParseUUIDPipe) providerId: string,
  ) {
    return this.demandsService.approveDemandForProvider(demandId, providerId);
  }
}
