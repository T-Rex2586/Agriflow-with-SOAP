import { z } from 'zod';

export const validateFarmerSchema = z.object({
  petaniId: z
    .string()
    .length(16, 'ID Petani harus 16 digit')
    .regex(/^\d{16}$/, 'ID Petani harus berupa 16 digit angka'),
});

export const redeemFertilizerSchema = z.object({
  petaniId: z
    .string()
    .length(16, 'ID Petani harus 16 digit')
    .regex(/^\d{16}$/, 'ID Petani harus berupa 16 digit angka'),
  pupukId: z.number().int().positive('ID pupuk harus positif'),
  jumlah: z.number().positive('Jumlah harus lebih dari 0'),
});

export type ValidateFarmerDto = z.infer<typeof validateFarmerSchema>;
export type RedeemFertilizerDto = z.infer<typeof redeemFertilizerSchema>;
