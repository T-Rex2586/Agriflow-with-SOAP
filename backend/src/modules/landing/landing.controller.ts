import { Request, Response, NextFunction } from 'express';
import { LandingService } from './landing.service';

const landingService = new LandingService();

export class LandingController {
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await landingService.getStats();

      res.json({
        message: 'Berhasil mengambil statistik',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAbout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const about = await landingService.getAbout();

      res.json({
        message: 'Berhasil mengambil informasi tentang AgriFlow',
        data: about,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFertilizers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fertilizers = await landingService.getFertilizers();

      res.json({
        message: 'Berhasil mengambil daftar pupuk',
        data: fertilizers,
      });
    } catch (error) {
      next(error);
    }
  }
}
