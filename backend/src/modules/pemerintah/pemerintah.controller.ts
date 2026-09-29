import { Request, Response, NextFunction } from 'express';
import { PemerintahService } from './pemerintah.service';

const service = new PemerintahService();

export class PemerintahController {
  /**
   * GET /api/pemerintah/notifications/top
   * Get top 3 unread notifications
   */
  async getTopNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const data = await service.getTopNotifications(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pemerintah/dashboard
   * Get comprehensive dashboard with filters
   */
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const provinsi = req.query.provinsi as string | undefined;
      const tahunAwal = req.query.tahunAwal ? parseInt(req.query.tahunAwal as string) : undefined;
      const tahunAkhir = req.query.tahunAkhir ? parseInt(req.query.tahunAkhir as string) : undefined;
      const pupukId = req.query.pupukId ? parseInt(req.query.pupukId as string) : undefined;

      const data = await service.getDashboard({
        provinsi,
        tahunAwal,
        tahunAkhir,
        pupukId,
      });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pemerintah/anomalies
   * Get anomaly detection notifications
   */
  async getAnomalies(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.user?.userId);
      if (isNaN(userId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const pageNumber = parseInt(req.query.page as string) || 1;
      const data = await service.getAnomalies(userId, pageNumber);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pemerintah/users/list
   * Get users by status (Active / Rejected)
   */
  async getUsersByStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = (req.query.status as string) || 'Active';
      const pageNumber = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 6;
      const data = await service.getUsersByStatus(status, pageNumber, pageSize);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pemerintah/users/pending
   * Get pending users for verification
   */
  async getPendingUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const pageNumber = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 6;
      const data = await service.getPendingUsers(pageNumber, pageSize);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pemerintah/users/:userId/approve
   * Approve pending user
   */
  async approveUser(req: Request, res: Response, next: NextFunction) {
    try {
      const approverId = Number(req.user?.userId);
      if (isNaN(approverId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const userId = Number(req.params.userId);
      if (isNaN(userId)) return res.status(400).json({ success: false, message: 'userId tidak valid' });
      const data = await service.approveUser(userId, approverId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pemerintah/users/:userId/reject
   * Reject pending user
   */
  async rejectUser(req: Request, res: Response, next: NextFunction) {
    try {
      const approverId = Number(req.user?.userId);
      if (isNaN(approverId)) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const userId = Number(req.params.userId);
      if (isNaN(userId)) return res.status(400).json({ success: false, message: 'userId tidak valid' });
      const data = await service.rejectUser(userId, approverId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/pemerintah/users/:userId/edit
   * Update user name, email, role
   */
  async editUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.userId);
      if (isNaN(userId)) return res.status(400).json({ success: false, message: 'userId tidak valid' });
      const { namaLengkap, email, roleName } = req.body;
      const data = await service.editUser(userId, { namaLengkap, email, roleName });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pemerintah/users/:userId/reset-password
   * Reset user password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.userId);
      if (isNaN(userId)) return res.status(400).json({ success: false, message: 'userId tidak valid' });
      const data = await service.resetPassword(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pemerintah/users/:userId/toggle-status
   * Toggle user active/rejected status
   */
  async toggleUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.userId);
      if (isNaN(userId)) return res.status(400).json({ success: false, message: 'userId tidak valid' });
      const data = await service.toggleUserStatus(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pemerintah/stock-time-series
   * Get stock time series for dashboard chart
   */
  async getStockTimeSeries(req: Request, res: Response, next: NextFunction) {
    try {
      const weeks = parseInt(req.query.weeks as string) || 52;
      const data = await service.getStockTimeSeries(weeks);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pemerintah/users/nonaktifkan-candidates
   * Get users sorted by nonaktifkan criteria
   */
  async getNonaktifkanCandidates(req: Request, res: Response, next: NextFunction) {
    try {
      const role = (req.query.role as string) || 'DISTRIBUTOR';
      const data = await service.getNonaktifkanCandidates(role);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pemerintah/help-requests
   * Get help requests (bantuan)
   */
  async getHelpRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const pageNumber = parseInt(req.query.page as string) || 1;
      const data = await service.getHelpRequests(pageNumber);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
