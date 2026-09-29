import { z } from 'zod';

/**
 * Pengecer Request Validators
 */

export const receiveShipmentSchema = z.object({
  kirimanId: z.string().uuid('Invalid shipment ID format'),
  jumlahDiterima: z.number()
    .positive('Jumlah diterima must be positive')
    .max(100000, 'Amount exceeds maximum allowed'),
  timestampDiterima: z.string().datetime().optional()
});

export const createRedemptionSchema = z.object({
  petaniId: z.string()
    .length(16, 'Petani ID must be exactly 16 characters')
    .regex(/^\d{16}$/, 'Petani ID must contain only digits'),
  pupukId: z.number().int().positive('Pupuk ID must be positive'),
  jumlah: z.number()
    .positive('Jumlah must be positive')
    .max(10000, 'Jumlah exceeds maximum per transaction')
});

export const addStockSchema = z.object({
  pupukId: z.number().int().positive('Pupuk ID must be positive'),
  jumlahMasuk: z.number()
    .positive('Jumlah masuk must be positive')
    .max(100000, 'Amount exceeds maximum allowed'),
  waktu: z.string().datetime().optional()
});

export const stockDashboardQuerySchema = z.object({
  page: z.number().int().positive().max(10000).default(1),
  sortColumn: z.enum(['JumlahStok', 'LastUpdated']).default('LastUpdated'),
  sortDirection: z.enum(['ASC', 'DESC']).default('DESC')
});

export type ReceiveShipmentInput = z.infer<typeof receiveShipmentSchema>;
export type CreateRedemptionInput = z.infer<typeof createRedemptionSchema>;
export type AddStockInput = z.infer<typeof addStockSchema>;
export type StockDashboardQuery = z.infer<typeof stockDashboardQuerySchema>;
