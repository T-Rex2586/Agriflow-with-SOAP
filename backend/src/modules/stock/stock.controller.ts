import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { StockService } from './stock.service';

const stockService = new StockService();

export class StockController {
  async getStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user!.userId);
      if (isNaN(userId)) {
        res.status(401).json({ message: 'User tidak valid' });
        return;
      }
      const { pupukId, search } = req.query;

      const stock = await stockService.getStock(
        userId,
        pupukId ? parseInt(pupukId as string) : undefined,
        search as string
      );

      res.json({
        message: 'Berhasil mengambil data stok',
        data: stock,
      });
    } catch (error) {
      next(error);
    }
  }

  async addStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user!.userId);
      if (isNaN(userId)) {
        res.status(401).json({ message: 'User tidak valid' });
        return;
      }
      const pupukId = Number(req.body.pupukId);
      if (isNaN(pupukId)) {
        res.status(400).json({ message: 'Pupuk ID tidak valid' });
        return;
      }
      const { jumlah } = req.body;

      const stock = await stockService.addStock(userId, pupukId, jumlah);

      res.status(201).json({
        message: 'Stok berhasil ditambahkan',
        data: stock,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.userId);
      if (isNaN(userId)) {
        res.status(400).json({ message: 'User ID tidak valid' });
        return;
      }
      const pupukId = Number(req.params.pupukId);
      if (isNaN(pupukId)) {
        res.status(400).json({ message: 'Pupuk ID tidak valid' });
        return;
      }
      const { jumlah } = req.body;
      const requesterId = Number(req.user!.userId);
      if (isNaN(requesterId)) {
        res.status(401).json({ message: 'User tidak valid' });
        return;
      }

      const stock = await stockService.updateStock(
        userId,
        pupukId,
        jumlah,
        requesterId
      );

      res.json({
        message: 'Stok berhasil diperbarui',
        data: stock,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStockHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user!.userId);
      if (isNaN(userId)) {
        res.status(401).json({ message: 'User tidak valid' });
        return;
      }
      const { startDate, endDate, pupukId } = req.query;

      const history = await stockService.getStockHistory(
        userId,
        startDate as string,
        endDate as string,
        pupukId ? parseInt(pupukId as string) : undefined
      );

      res.json({
        message: 'Berhasil mengambil riwayat stok',
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
}
