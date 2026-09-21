import { z } from 'zod';

export const CreateStudyMaterialSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  subjectId: z.string().optional(),
});

export type CreateStudyMaterialInput = z.infer<typeof CreateStudyMaterialSchema>;