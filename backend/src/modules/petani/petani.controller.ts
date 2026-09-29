import { Request, Response } from 'express';
import { PetaniService } from './petani.service';

export class PetaniController {
  private petaniService: PetaniService;

  constructor() {
    this.petaniService = new PetaniService();
  }

  // GET /api/petani/search
  searchFarmers = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = Number(req.user?.userId);
      if (!userId || isNaN(userId)) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const q = (req.query.q as string || '').trim();
      const data = await this.petaniService.searchFarmers(userId, q);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal mencari petani' });
    }
  };

  // Get all farmers for logged-in retailer
  getMyFarmers = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = Number(req.user?.userId);

      if (!userId || isNaN(userId)) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const { page = 1, limit = 10, status, search } = req.query;

      const result = await this.petaniService.getFarmersByRetailer(userId, {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        search: search as string,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil data petani',
      });
    }
  };

  // Get farmer by ID (16-digit)
  getFarmerById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { petaniId } = req.params;
      const userId = Number(req.user?.userId);

      if (!userId || isNaN(userId)) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const farmer = await this.petaniService.getFarmerById(petaniId, userId);

      if (!farmer) {
        res.status(404).json({
          success: false,
          message: 'Petani tidak ditemukan',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: farmer,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil data petani',
      });
    }
  };

  // Get farmer quota
  getFarmerQuota = async (req: Request, res: Response): Promise<void> => {
    try {
      const { petaniId } = req.params;
      const userId = Number(req.user?.userId);

      if (!userId || isNaN(userId)) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const quota = await this.petaniService.getFarmerQuota(petaniId, userId);

      res.status(200).json({
        success: true,
        data: quota,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Gagal mengambil kuota petani',
      });
    }
  };

  // Create new farmer
  createFarmer = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = Number(req.user?.userId);

      if (!userId || isNaN(userId)) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const farmerData = {
        ...req.body,
        userIdPengecer: userId,
      };

      const farmer = await this.petaniService.createFarmer(farmerData);

      res.status(201).json({
        success: true,
        message: 'Petani berhasil ditambahkan',
        data: farmer,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Gagal menambahkan petani',
      });
    }
  };

  // Update farmer
  updateFarmer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { petaniId } = req.params;
      const userId = Number(req.user?.userId);

      if (!userId || isNaN(userId)) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const farmer = await this.petaniService.updateFarmer(
        petaniId,
        userId,
        req.body
      );

      res.status(200).json({
        success: true,
        message: 'Data petani berhasil diupdate',
        data: farmer,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Gagal mengupdate data petani',
      });
    }
  };

  // Delete farmer
  deleteFarmer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { petaniId } = req.params;
      const userId = Number(req.user?.userId);

      if (!userId || isNaN(userId)) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      await this.petaniService.deleteFarmer(petaniId, userId);

      res.status(200).json({
        success: true,
        message: 'Petani berhasil dihapus',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Gagal menghapus petani',
      });
    }
  };
}
