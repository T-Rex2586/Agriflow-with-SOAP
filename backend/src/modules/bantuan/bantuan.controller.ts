import { Request, Response } from 'express';
import { BantuanService } from './bantuan.service';

export class BantuanController {
  private bantuanService: BantuanService;

  constructor() {
    this.bantuanService = new BantuanService();
  }

  submitBantuan = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = Number(req.user?.userId) || undefined;
      const { firstName, middleName, lastName, email, topik, ringkasan } = req.body;

      const bantuan = await this.bantuanService.createBantuan({
        firstName,
        middleName,
        lastName,
        email,
        topik,
        ringkasan,
        userId,
      });

      res.status(201).json({
        success: true,
        message: 'Bantuan berhasil dikirim',
        data: bantuan,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengirim bantuan',
      });
    }
  };

  getAllBantuan = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 10, topik } = req.query;

      const result = await this.bantuanService.getAllBantuan({
        page: Number(page),
        limit: Number(limit),
        topik: topik as string,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil data bantuan',
      });
    }
  };

  getBantuanById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'ID bantuan tidak valid',
        });
        return;
      }

      const bantuan = await this.bantuanService.getBantuanById(id);

      if (!bantuan) {
        res.status(404).json({
          success: false,
          message: 'Bantuan tidak ditemukan',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: bantuan,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil data bantuan',
      });
    }
  };

  getMyBantuan = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = Number(req.user?.userId);

      if (!userId || isNaN(userId)) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const bantuan = await this.bantuanService.getBantuanByUserId(userId);

      res.status(200).json({
        success: true,
        data: bantuan,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil data bantuan',
      });
    }
  };
}
