import { z } from 'zod';

export const complaintSchema = z.object({
  firstName: z.string().min(1, 'Nama depan wajib diisi'),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Email tidak valid'),
  topik: z.string().min(1, 'Topik wajib diisi'),
  ringkasan: z
    .string()
    .min(1, 'Ringkasan wajib diisi')
    .max(100, 'Ringkasan maksimal 100 karakter'),
});

export type ComplaintDto = z.infer<typeof complaintSchema>;
