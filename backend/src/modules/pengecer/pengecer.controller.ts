import { Request, Response, NextFunction } from 'express';
import { PengecerService } from './pengecer.service';
import { parseInputDate, isFutureDate } from '../../utils/date.util';

const service = new PengecerService();

export class PengecerController {
  /**
   * GET /api/pengecer/dashboard
   * Get pengecer dashboard data
   */
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const data = await service.getDashboard(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pengecer/receipts/recent
   * Get recent receipts
   */
  async getRecentReceipts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const data = await service.getRecentReceipts(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pengecer/receipts/history
   * Get receipt history with pagination
   */
  async getReceiptHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const pageNumber = parseInt(req.query.page as string) || 1;
      const data = await service.getReceiptHistory(userId, pageNumber);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pengecer/kiriman/search
   * Search shipments by ID or distributor name
   */
  async searchKiriman(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const q = (req.query.q as string || '').trim();
      const data = await service.searchKiriman(userId, q);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pengecer/validate-shipment/:kirimanId
   * Validate shipment before receiving
   */
  async validateShipment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const kirimanId = Number(req.params.kirimanId);
      if (isNaN(kirimanId)) return res.status(400).json({ success: false, message: 'kirimanId tidak valid' });
      const data = await service.validateShipment(userId, kirimanId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pengecer/receipts
   * Receive shipment from distributor
   */
  async receiveShipment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { kirimanId, jumlahDiterima, timestampDiterima } = req.body;
      const numKirimanId = Number(kirimanId);
      if (isNaN(numKirimanId)) return res.status(400).json({ success: false, message: 'kirimanId tidak valid' });

      const parsedTimestamp = parseInputDate(timestampDiterima);
      if (isFutureDate(parsedTimestamp)) {
        return res.status(400).json({ success: false, message: 'Tanggal tidak boleh lebih dari tanggal sekarang' });
      }

      const data = await service.receiveShipment({
        pengecerId: userId,
        kirimanId: numKirimanId,
        jumlahDiterima,
        timestampDiterima: parsedTimestamp,
      });

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pengecer/stock
   * Get stock dashboard with sorting
   */
  async getStockDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const pageNumber = parseInt(req.query.page as string) || 1;
      const sortColumn = (req.query.sortColumn as 'JumlahStok' | 'LastUpdated') || 'LastUpdated';
      const sortDirection = (req.query.sortDirection as 'ASC' | 'DESC') || 'DESC';

      const data = await service.getStockDashboard(userId, pageNumber, sortColumn, sortDirection);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pengecer/stock/add
   * Add incoming stock
   */
  async addStock(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { pupukId, jumlahMasuk, waktu } = req.body;
      const numPupukId = Number(pupukId);
      if (isNaN(numPupukId)) return res.status(400).json({ success: false, message: 'pupukId tidak valid' });

      const parsedWaktu = parseInputDate(waktu);
      if (isFutureDate(parsedWaktu)) {
        return res.status(400).json({ success: false, message: 'Tanggal tidak boleh lebih dari tanggal sekarang' });
      }

      const data = await service.addStock({
        userId,
        pupukId: numPupukId,
        jumlahMasuk,
        waktu: parsedWaktu,
      });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pengecer/redemptions/history
   * Get redemption history
   */
  async getRedemptionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const pageNumber = parseInt(req.query.page as string) || 1;
      const data = await service.getRedemptionHistory(userId, pageNumber);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pengecer/validate-petani/:petaniId
   * Validate farmer for redemption
   */
  async validatePetani(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { petaniId } = req.params;
      const data = await service.validatePetani(userId, petaniId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pengecer/redemptions
   * Create fertilizer redemption
   */
  async createRedemption(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { petaniId, pupukId, jumlah } = req.body;
      const numPupukId = Number(pupukId);
      if (isNaN(numPupukId)) return res.status(400).json({ success: false, message: 'pupukId tidak valid' });

      const data = await service.createRedemption({
        pengecerId: userId,
        petaniId,
        pupukId: numPupukId,
        jumlah,
      });

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pengecer/notifications
   * Get notifications with pagination
   */
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const pageNumber = parseInt(req.query.page as string) || 1;
      const data = await service.getNotifications(userId, pageNumber);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/pengecer/notifications/:notifikasiId/read
   * Mark notification as read
   */
  async markNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const notifikasiId = Number(req.params.notifikasiId);
      if (isNaN(notifikasiId)) return res.status(400).json({ success: false, message: 'notifikasiId tidak valid' });
      const data = await service.markNotificationRead(notifikasiId, userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
