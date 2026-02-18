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
  ParseIntPipe,
  ParseBoolPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { LegalService } from '../legal/legal.service';
import { ResponseMessage } from '../common/decorators/api-response.decorator';
import {
  CreateProviderDto,
  UpdateProviderDto,
  CreateProviderPhotoDto,
  CreateProviderVideoDto,
  AddProviderCategoryDto,
  UpdateProviderCategoryDto,
} from './dto';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';

@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly legalService: LegalService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Créer un prestataire' })
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Prestataire créé avec succès')
  create(@Body() dto: CreateProviderDto) {
    console.log('Creating provider with data:', dto);
    return this.providersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste paginée des prestataires' })
  @ApiQuery({ name: 'department', required: false, example: 'Dakar' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number, example: 3 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ResponseMessage('Liste des prestataires récupérée avec succès')
  async findAll(
    @Query('department') department?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.providersService.findAll({
      department,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: "Détails d'un prestataire" })
  @ResponseMessage('Prestataire récupéré avec succès')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const provider = await this.providersService.findById(id);
    const legalStatus =
      await this.legalService.hasProviderAcceptedActiveDocuments(id);
    return {
      ...provider,
      legalStatus,
    };
  }

  @Get(':id/stats')
  getStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.getStats(id);
  }

  @Post(':id/view')
  incrementViews(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.incrementProfileViews(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un prestataire' })
  @ResponseMessage('Prestataire modifié avec succès')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.providersService.update(id, dto);
  }

  @Patch(':id/active')
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive', ParseBoolPipe) isActive: boolean,
  ) {
    return this.providersService.setActive(id, isActive);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un prestataire' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Prestataire supprimé avec succès')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.remove(id);
  }

  // Photos
  @Post(':id/photos')
  addPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProviderPhotoDto,
  ) {
    return this.providersService.addPhoto(id, dto);
  }

  @Delete(':id/photos/:photoId')
  removePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.providersService.removePhoto(id, photoId);
  }

  @Patch(':id/photos/:photoId/main')
  setMainPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.providersService.setMainPhoto(id, photoId);
  }

  // Videos
  @Post(':id/videos')
  addVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProviderVideoDto,
  ) {
    return this.providersService.addVideo(id, dto);
  }

  @Delete(':id/videos/:videoId')
  removeVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('videoId', ParseUUIDPipe) videoId: string,
  ) {
    return this.providersService.removeVideo(id, videoId);
  }

  // Categories
  @Post(':id/categories')
  addCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddProviderCategoryDto,
  ) {
    return this.providersService.addCategory(id, dto);
  }

  @Delete(':id/categories/:pcId')
  removeCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pcId', ParseIntPipe) pcId: number,
  ) {
    return this.providersService.removeCategory(id, pcId);
  }

  @Patch(':id/categories/:pcId')
  @ApiOperation({ summary: 'Mettre à jour une catégorie du prestataire' })
  @ResponseMessage('Catégorie mise à jour avec succès')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pcId', ParseIntPipe) pcId: number,
    @Body() dto: UpdateProviderCategoryDto,
  ) {
    return this.providersService.updateCategory(id, pcId, dto);
  }

  // Category Photos
  @Post(':id/categories/:pcId/photos')
  addCategoryPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pcId', ParseIntPipe) pcId: number,
    @Body() dto: CreateProviderPhotoDto,
  ) {
    return this.providersService.addCategoryPhoto(id, pcId, dto);
  }

  @Delete(':id/categories/:pcId/photos/:photoId')
  removeCategoryPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pcId', ParseIntPipe) pcId: number,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.providersService.removeCategoryPhoto(id, pcId, photoId);
  }
}
