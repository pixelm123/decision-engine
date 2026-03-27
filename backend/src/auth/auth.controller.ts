import { Controller, Post, Body, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterSchema,
  LoginSchema,
  GuestJoinSchema,
  RegisterDto,
  LoginDto,
  GuestJoinDto,
} from './dto/auth.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  // POST /api/auth/rooms/:roomId/join
  // Called when a participant clicks the shareable room link
  @Post('rooms/:roomId/join')
  guestJoin(
    @Param('roomId') roomId: string,
    @Body(new ZodValidationPipe(GuestJoinSchema)) dto: GuestJoinDto,
  ) {
    return this.authService.guestJoin(roomId, dto);
  }
}
