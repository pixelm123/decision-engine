import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CriteriaService } from './criteria.service';
import {
  CreateCriterionSchema,
  UpdateCriterionSchema,
  ReorderCriteriaSchema,
  CreateCriterionDto,
  UpdateCriterionDto,
  ReorderCriteriaDto,
} from './dto/criteria.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@UseGuards(JwtAuthGuard)
@Controller('rooms/:roomId/criteria')
export class CriteriaController {
  constructor(private criteriaService: CriteriaService) {}

  @Post()
  create(
    @Param('roomId') roomId: string,
    @Body(new ZodValidationPipe(CreateCriterionSchema)) dto: CreateCriterionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.criteriaService.create(roomId, user.userId, dto);
  }

  @Get()
  findAll(@Param('roomId') roomId: string) {
    return this.criteriaService.findAll(roomId);
  }

  @Patch('reorder')
  reorder(
    @Param('roomId') roomId: string,
    @Body(new ZodValidationPipe(ReorderCriteriaSchema)) dto: ReorderCriteriaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.criteriaService.reorder(roomId, user.userId, dto);
  }

  @Get('validate-weights')
  validateWeights(@Param('roomId') roomId: string) {
    return this.criteriaService.validateWeights(roomId);
  }

  @Patch(':criterionId')
  update(
    @Param('roomId') roomId: string,
    @Param('criterionId') criterionId: string,
    @Body(new ZodValidationPipe(UpdateCriterionSchema)) dto: UpdateCriterionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.criteriaService.update(roomId, criterionId, user.userId, dto);
  }

  @Delete(':criterionId')
  remove(
    @Param('roomId') roomId: string,
    @Param('criterionId') criterionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.criteriaService.remove(roomId, criterionId, user.userId);
  }
}
