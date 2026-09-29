import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DistributorService } from '../distributor.service';
import prisma from '../../../config/database';
import { AppError } from '../../../common/middleware/error.middleware';

// Mock Prisma
vi.mock('../../../config/database', () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}));

// Mock Logger
vi.mock('../../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('DistributorService', () => {
  let service: DistributorService;

  beforeEach(() => {
    service = new DistributorService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDashboard', () => {
    it('should return dashboard data successfully', async () => {
      const mockData = [
        { TotalStok: '1000', PersentasePerubahan: '5%' },
        [{ KirimanId: '123', JenisPupuk: 'Urea', JumlahDikirimKg: 100 }],
        [{ PupukId: 1, NamaPupuk: 'Urea', StokSekarang: 900 }],
        [{ JudulNotifikasi: 'Test', PesanNotifikasi: 'Test message' }]
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockData);

      const result = await service.getDashboard('user-123');

      expect(result).toEqual({
        stockSummary: mockData[0],
        recentShipments: mockData[1],
        recentStockOut: mockData[2],
        notifications: mockData[3],
      });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should throw AppError on database failure', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Database error'));

      await expect(service.getDashboard('user-123')).rejects.toThrow(AppError);
      await expect(service.getDashboard('user-123')).rejects.toThrow('Gagal mengambil data dashboard');
    });
  });

  describe('createShipment', () => {
    it('should create shipment successfully', async () => {
      const mockResult = [{
        KirimanId: 'shipment-123',
        JenisPupuk: 'Urea',
        JumlahPupuk: 100,
        WaktuPengiriman: '2026-06-02'
      }];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const data = {
        distributorId: 'user-123',
        pengecerId: 'pengecer-456',
        pupukId: 1,
        jumlah: 100,
      };

      const result = await service.createShipment(data);

      expect(result).toEqual(mockResult[0]);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should throw AppError when stock insufficient', async () => {
      const error = new Error('Stok tidak mencukupi. Stok tersedia: 50 kg');
      vi.mocked(prisma.$queryRaw).mockRejectedValue(error);

      const data = {
        distributorId: 'user-123',
        pengecerId: 'pengecer-456',
        pupukId: 1,
        jumlah: 100,
      };

      await expect(service.createShipment(data)).rejects.toThrow(AppError);
      await expect(service.createShipment(data)).rejects.toThrow('Stok tidak mencukupi');
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection timeout'));

      const data = {
        distributorId: 'user-123',
        pengecerId: 'pengecer-456',
        pupukId: 1,
        jumlah: 100,
      };

      await expect(service.createShipment(data)).rejects.toThrow(AppError);
      await expect(service.createShipment(data)).rejects.toThrow('Gagal membuat pengiriman');
    });
  });

  describe('validatePengecer', () => {
    it('should validate pengecer successfully', async () => {
      const mockResult = [{
        IsValid: 1,
        Message: 'Valid'
      }];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await service.validatePengecer('pengecer-123');

      expect(result).toEqual(mockResult[0]);
      expect(result.IsValid).toBe(1);
    });

    it('should throw AppError when pengecer is invalid', async () => {
      const mockResult = [{
        IsValid: 0,
        Message: 'User tidak aktif.'
      }];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      await expect(service.validatePengecer('pengecer-123')).rejects.toThrow(AppError);
      await expect(service.validatePengecer('pengecer-123')).rejects.toThrow('User tidak aktif');
    });
  });

  describe('addStock', () => {
    it('should add stock successfully', async () => {
      const mockResult = [{ JumlahStokKg: 150 }];
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const data = {
        userId: 'user-123',
        pupukId: 1,
        jumlahMasuk: 50,
      };

      const result = await service.addStock(data);

      expect(result).toEqual(mockResult[0]);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should throw AppError when jumlahMasuk is zero or negative', async () => {
      const data = {
        userId: 'user-123',
        pupukId: 1,
        jumlahMasuk: 0,
      };

      await expect(service.addStock(data)).rejects.toThrow(AppError);
      await expect(service.addStock(data)).rejects.toThrow('Jumlah stok masuk harus lebih dari 0');
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock positively', async () => {
      const mockResult = [{ JumlahStokKg: 150 }];
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const data = {
        userId: 'user-123',
        pupukId: 1,
        jumlahPenyesuaian: 50,
      };

      const result = await service.adjustStock(data);

      expect(result).toEqual(mockResult[0]);
    });

    it('should adjust stock negatively', async () => {
      const mockResult = [{ JumlahStokKg: 50 }];
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const data = {
        userId: 'user-123',
        pupukId: 1,
        jumlahPenyesuaian: -50,
      };

      const result = await service.adjustStock(data);

      expect(result).toEqual(mockResult[0]);
    });

    it('should throw AppError when adjustment exceeds available stock', async () => {
      const error = new Error('Stok tidak mencukupi. Stok saat ini: 50 kg');
      vi.mocked(prisma.$queryRaw).mockRejectedValue(error);

      const data = {
        userId: 'user-123',
        pupukId: 1,
        jumlahPenyesuaian: -100,
      };

      await expect(service.adjustStock(data)).rejects.toThrow(AppError);
    });
  });

  describe('getStockDashboard', () => {
    it('should return stock dashboard with pagination', async () => {
      const mockData = [
        { TotalStokTon: '1.5' },
        [
          { PupukId: 1, JenisPupuk: 'Urea', JumlahStokKg: 1000, TotalRows: 10 },
          { PupukId: 2, JenisPupuk: 'NPK', JumlahStokKg: 500, TotalRows: 10 }
        ]
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockData);

      const result = await service.getStockDashboard('user-123', 1);

      expect(result).toEqual({
        totalStockTon: mockData[0],
        stockItems: mockData[1],
      });
      expect(result.stockItems).toHaveLength(2);
    });
  });

  describe('markNotificationRead', () => {
    it('should mark notification as read successfully', async () => {
      const mockResult = [{ Pesan: 'Notifikasi berhasil dibaca' }];
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await service.markNotificationRead('notif-123', 'user-123');

      expect(result).toEqual(mockResult[0]);
    });

    it('should handle errors when marking notification as read', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Database error'));

      await expect(
        service.markNotificationRead('notif-123', 'user-123')
      ).rejects.toThrow(AppError);
    });
  });
});
