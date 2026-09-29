import { z } from 'zod';

/**
 * Distributor Request Validators
 * Using Zod for type-safe validation
 */

export const createShipmentSchema = z.object({
  pengecerId: z.string().uuid('Invalid pengecer ID format'),
  pupukId: z.number().int().positive('Pupuk ID must be positive'),
  jumlah: z.number()
    .positive('Jumlah must be positive')
    .max(100000, 'Jumlah exceeds maximum allowed (100,000 kg)'),
  timestamp: z.string().datetime().optional()
});

export const adjustStockSchema = z.object({
  pupukId: z.number().int().positive('Pupuk ID must be positive'),
  jumlahPenyesuaian: z.number()
    .refine(val => val !== 0, 'Jumlah penyesuaian cannot be zero')
    .refine(val => Math.abs(val) <= 100000, 'Adjustment exceeds limit'),
  waktu: z.string().datetime().optional()
});

export const addStockSchema = z.object({
  pupukId: z.number().int().positive('Pupuk ID must be positive'),
  jumlahMasuk: z.number()
    .positive('Jumlah masuk must be positive')
    .max(100000, 'Amount exceeds maximum allowed'),
  waktu: z.string().datetime().optional()
});

export const paginationSchema = z.object({
  page: z.number().int().positive().max(10000).default(1),
  limit: z.number().int().positive().max(100).default(10)
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type AddStockInput = z.infer<typeof addStockSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
