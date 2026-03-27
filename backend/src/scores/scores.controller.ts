import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScoresService } from './scores.service';
import { SubmitScoreBatchSchema, SubmitScoreBatchDto } from './dto/scores.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@UseGuards(JwtAuthGuard)
@Controller('rooms/:roomId/scores')
export class ScoresController {
  constructor(private scoresService: ScoresService) {}

  @Post('batch')
  submitBatch(
    @Param('roomId') roomId: string,
    @Body(new ZodValidationPipe(SubmitScoreBatchSchema)) dto: SubmitScoreBatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scoresService.submitBatch(roomId, user.userId, dto);
  }

  @Get('status')
  getSubmissionStatus(
    @Param('roomId') roomId: string,
    @Query('round') round?: string,
  ) {
    return this.scoresService.getSubmissionStatus(roomId, round ? parseInt(round) : undefined);
  }

  @Get('breakdown')
  getBreakdown(
    @Param('roomId') roomId: string,
    @Query('round') round?: string,
  ) {
    return this.scoresService.getBreakdown(roomId, round ? parseInt(round) : undefined);
  }

  @Get('results')
  getResults(
    @Param('roomId') roomId: string,
    @Query('round') round?: string,
  ) {
    return this.scoresService.getResults(roomId, round ? parseInt(round) : undefined);
  }

  @Get('mine')
  getMyScores(
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('round') round?: string,
  ) {
    return this.scoresService.getMyScores(
      roomId,
      user.userId,
      round ? parseInt(round) : undefined,
    );
  }
}
