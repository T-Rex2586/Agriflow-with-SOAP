import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { ShipmentService } from './shipment.service';
import { parseInputDate, isFutureDate } from '../../utils/date.util';

const shipmentService = new ShipmentService();

export class ShipmentController {
  async createShipment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const distributorId = Number(req.user!.userId);
      if (isNaN(distributorId)) {
        res.status(401).json({ message: 'User tidak valid' });
        return;
      }
      const retailerId = Number(req.body.retailerId);
      if (isNaN(retailerId)) {
        res.status(400).json({ message: 'Retailer ID tidak valid' });
        return;
      }
      const pupukId = Number(req.body.pupukId);
      if (isNaN(pupukId)) {
        res.status(400).json({ message: 'Pupuk ID tidak valid' });
        return;
      }
      const { jumlah } = req.body;

      const shipment = await shipmentService.createShipment(
        distributorId,
        retailerId,
        pupukId,
        jumlah
      );

      res.status(201).json({
        message: 'Kiriman berhasil dibuat',
        data: shipment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getShipmentHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user!.userId);
      if (isNaN(userId)) {
        res.status(401).json({ message: 'User tidak valid' });
        return;
      }
      const role = req.user!.role;

      const shipments = await shipmentService.getShipmentHistory(userId, role);

      res.json({
        message: 'Berhasil mengambil riwayat kiriman',
        data: shipments,
      });
    } catch (error) {
      next(error);
    }
  }

  async receiveShipment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const retailerId = Number(req.user!.userId);
      if (isNaN(retailerId)) {
        res.status(401).json({ message: 'User tidak valid' });
        return;
      }
      const kirimanId = Number(req.body.kirimanId);
      if (isNaN(kirimanId)) {
        res.status(400).json({ message: 'Kiriman ID tidak valid' });
        return;
      }
      const { jumlahDiterima, timestampDiterima } = req.body;

      const parsedTimestamp = parseInputDate(timestampDiterima);
      if (isFutureDate(parsedTimestamp)) {
        res.status(400).json({ message: 'Tanggal tidak boleh lebih dari tanggal sekarang' });
        return;
      }

      const shipment = await shipmentService.receiveShipment(
        kirimanId,
        retailerId,
        jumlahDiterima,
        parsedTimestamp
      );

      res.json({
        message: 'Kiriman berhasil diterima',
        data: shipment,
      });
    } catch (error) {
      next(error);
    }
  }
}
