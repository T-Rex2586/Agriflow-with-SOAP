import { z } from 'zod';

export const addStockSchema = z.object({
  pupukId: z.number().int().positive('ID pupuk harus positif'),
  jumlah: z.number().positive('Jumlah harus lebih dari 0'),
});

export const updateStockSchema = z.object({
  jumlah: z.number().min(0, 'Jumlah tidak boleh negatif'),
});

export type AddStockDto = z.infer<typeof addStockSchema>;
export type UpdateStockDto = z.infer<typeof updateStockSchema>;
