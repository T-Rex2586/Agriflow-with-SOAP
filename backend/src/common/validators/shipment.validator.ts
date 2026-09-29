import { z } from 'zod';

export const createShipmentSchema = z.object({
  retailerId: z.string().uuid('ID pengecer tidak valid'),
  pupukId: z.number().int().positive('ID pupuk harus positif'),
  jumlah: z.number().positive('Jumlah harus lebih dari 0'),
});

export const receiveShipmentSchema = z.object({
  kirimanId: z.string().uuid('ID kiriman tidak valid'),
  jumlahDiterima: z.number().positive('Jumlah diterima harus lebih dari 0'),
});

export type CreateShipmentDto = z.infer<typeof createShipmentSchema>;
export type ReceiveShipmentDto = z.infer<typeof receiveShipmentSchema>;
