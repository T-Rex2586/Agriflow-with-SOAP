import { Request, Response, NextFunction } from 'express';
import { PupukService } from './pupuk.service';

const pupukService = new PupukService();

export class PupukController {
  async getAllPupuk(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pupukService.getAllPupuk();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createPupuk(req: Request, res: Response, next: NextFunction) {
    try {
      const { jenisPupuk } = req.body;
      if (!jenisPupuk || typeof jenisPupuk !== 'string') {
        res.status(400).json({ success: false, message: 'jenisPupuk wajib diisi' });
        return;
      }

      const data = await pupukService.createPupuk(jenisPupuk);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
