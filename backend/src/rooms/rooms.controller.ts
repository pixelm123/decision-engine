import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import {
  CreateRoomSchema,
  UpdateRoomStatusSchema,
  CreateRoomDto,
  UpdateRoomStatusDto,
} from './dto/rooms.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateRoomSchema)) dto: CreateRoomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.findAllForUser(user.userId);
  }

  @Get(':roomId')
  findOne(
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.findOne(roomId, user.userId);
  }

  @Patch(':roomId/status')
  updateStatus(
    @Param('roomId') roomId: string,
    @Body(new ZodValidationPipe(UpdateRoomStatusSchema)) dto: UpdateRoomStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.updateStatus(roomId, user.userId, dto);
  }

  @Get(':roomId/audit')
  getAuditLog(
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.getAuditLog(roomId, user.userId);
  }
}
