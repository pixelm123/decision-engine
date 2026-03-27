import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(50).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const GuestJoinSchema = z.object({
  displayName: z.string().min(1).max(50),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type GuestJoinDto = z.infer<typeof GuestJoinSchema>;
