import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { DemandsService } from './demands.service';
import {
  CreateDemandDto,
  UpdateDemandDto,
  AssignProviderDto,
  UpdateDemandProviderDto,
} from './dto';
import { DemandStatus } from '../common/enums';

@Controller('demands')
export class DemandsController {
  constructor(private readonly demandsService: DemandsService) { }

  @Post()
  create(@Body() dto: CreateDemandDto) {
    return this.demandsService.create(dto);
  }

  @Get()
  findAll(
    @Query('organizerId') organizerId?: string,
    @Query('status') status?: DemandStatus,
  ) {
    return this.demandsService.findAll({ organizerId, status });
  }

  @Get('all-providers')
  findAllDemandProviders() {
    return this.demandsService.findAllDemandProviders();
  }

  @Get('provider/:providerId')
  findByProvider(
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Query('status') status?: DemandStatus,
  ) {
    return this.demandsService.findDemandsByProvider(providerId, status);
  }

  @Get('provider/:providerId/stats')
  getProviderStats(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.demandsService.getProviderStats(providerId);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.demandsService.findById(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDemandDto) {
    return this.demandsService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: DemandStatus,
  ) {
    return this.demandsService.updateStatus(id, status);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.demandsService.remove(id);
  }

  // DemandProvider endpoints
  @Post(':id/providers')
  assignProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignProviderDto,
  ) {
    return this.demandsService.assignProvider(id, dto);
  }

  @Get(':id/providers/:providerId')
  getDemandProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('providerId', ParseUUIDPipe) providerId: string,
  ) {
    return this.demandsService.getDemandProvider(id, providerId);
  }

  @Get('demand-providers/:dpId')
  getDemandProviderById(@Param('dpId', ParseUUIDPipe) dpId: string) {
    return this.demandsService.getDemandProviderById(dpId);
  }

  @Patch('demand-providers/:dpId')
  updateDemandProvider(
    @Param('dpId', ParseUUIDPipe) dpId: string,
    @Body() dto: UpdateDemandProviderDto,
  ) {
    return this.demandsService.updateDemandProvider(dpId, dto);
  }

  @Post('demand-providers/:dpId/unlock-contact')
  unlockContact(@Param('dpId', ParseUUIDPipe) dpId: string) {
    return this.demandsService.unlockContact(dpId);
  }

  @Delete(':id/providers/:providerId')
  removeProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('providerId', ParseUUIDPipe) providerId: string,
  ) {
    return this.demandsService.removeProvider(id, providerId);
  }
}
