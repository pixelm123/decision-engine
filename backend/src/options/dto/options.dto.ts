import { z } from 'zod';

export const CreateOptionSchema = z.object({
  label: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
});

export const UpdateOptionSchema = CreateOptionSchema.partial();

export type CreateOptionDto = z.infer<typeof CreateOptionSchema>;
export type UpdateOptionDto = z.infer<typeof UpdateOptionSchema>;
