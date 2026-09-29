import { z } from 'zod';

export const registerSchema = z.object({
  fullname: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  role: z.enum(['DISTRIBUTOR', 'PENGECER'], {
    errorMap: () => ({ message: 'Role harus DISTRIBUTOR atau PENGECER' }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
