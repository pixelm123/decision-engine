import { z } from 'zod';
import { RoomStatus } from '@prisma/client';

export const CreateRoomSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const UpdateRoomStatusSchema = z.object({
  status: z.nativeEnum(RoomStatus),
});

export type CreateRoomDto = z.infer<typeof CreateRoomSchema>;
export type UpdateRoomStatusDto = z.infer<typeof UpdateRoomStatusSchema>;
