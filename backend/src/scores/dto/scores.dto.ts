import { z } from 'zod';

export const SubmitScoreSchema = z.object({
  optionId: z.string().cuid(),
  criterionId: z.string().cuid(),
  value: z.number().int().min(1).max(10),
});

// Batch submission: a participant submits the full scoring matrix at once
export const SubmitScoreBatchSchema = z.object({
  scores: z
    .array(
      z.object({
        optionId: z.string().cuid(),
        criterionId: z.string().cuid(),
        value: z.number().int().min(1).max(10),
      }),
    )
    .min(1),
});

export type SubmitScoreDto = z.infer<typeof SubmitScoreSchema>;
export type SubmitScoreBatchDto = z.infer<typeof SubmitScoreBatchSchema>;
