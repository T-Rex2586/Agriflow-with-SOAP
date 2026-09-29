import { z } from 'zod';

const noHtmlRegex = /^[^<>]*$/;

export const createBantuanSchema = z.object({
  firstName: z.string().min(1, 'Nama depan wajib diisi'),
  middleName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email('Email tidak valid'),
  topik: z.string().min(1, 'Topik wajib diisi'),
  ringkasan: z.string()
    .min(1, 'Ringkasan wajib diisi')
    .regex(noHtmlRegex, 'Karakter HTML (< atau >) tidak diizinkan demi keamanan'),
});

export type CreateBantuanDto = z.infer<typeof createBantuanSchema>;
