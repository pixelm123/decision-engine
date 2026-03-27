import { z } from 'zod';

export const CreateCriterionSchema = z.object({
  label: z.string().min(1).max(100),
  weight: z.number().min(0).max(1),
  order: z.number().int().min(0).optional(),
  config: z.record(z.unknown()).optional(),
});

export const UpdateCriterionSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  weight: z.number().min(0).max(1).optional(),
  config: z.record(z.unknown()).optional(),
});

export const ReorderCriteriaSchema = z.object({
  // Array of { id, order } pairs - client sends new ordering after drag-and-drop
  order: z.array(z.object({ id: z.string(), order: z.number().int().min(0) })),
});

export type CreateCriterionDto = z.infer<typeof CreateCriterionSchema>;
export type UpdateCriterionDto = z.infer<typeof UpdateCriterionSchema>;
export type ReorderCriteriaDto = z.infer<typeof ReorderCriteriaSchema>;
