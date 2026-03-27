import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class HostGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'HOST') {
      throw new ForbiddenException('Only the room host can perform this action');
    }

    return true;
  }
}
