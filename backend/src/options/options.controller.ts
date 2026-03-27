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
import { OptionsService } from './options.service';
import {
  CreateOptionSchema,
  UpdateOptionSchema,
  CreateOptionDto,
  UpdateOptionDto,
} from './dto/options.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@UseGuards(JwtAuthGuard)
@Controller('rooms/:roomId/options')
export class OptionsController {
  constructor(private optionsService: OptionsService) {}

  @Post()
  create(
    @Param('roomId') roomId: string,
    @Body(new ZodValidationPipe(CreateOptionSchema)) dto: CreateOptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.optionsService.create(roomId, user.userId, dto);
  }

  @Get()
  findAll(@Param('roomId') roomId: string) {
    return this.optionsService.findAll(roomId);
  }

  @Patch(':optionId')
  update(
    @Param('roomId') roomId: string,
    @Param('optionId') optionId: string,
    @Body(new ZodValidationPipe(UpdateOptionSchema)) dto: UpdateOptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.optionsService.update(roomId, optionId, user.userId, dto);
  }

  @Delete(':optionId')
  remove(
    @Param('roomId') roomId: string,
    @Param('optionId') optionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.optionsService.remove(roomId, optionId, user.userId);
  }
}
