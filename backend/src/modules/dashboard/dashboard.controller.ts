import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { DashboardService } from './dashboard.service';

const dashboardService = new DashboardService();

export class DashboardController {
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = Number(req.user!.userId);
      if (isNaN(userId)) {
        res.status(401).json({ error: 'Token tidak valid, silakan login ulang' });
        return;
      }
      const role = req.user!.role;

      let dashboard;

      switch (role) {
        case 'DISTRIBUTOR':
          dashboard = await dashboardService.getDistributorDashboard(userId);
          break;
        case 'PENGECER':
          dashboard = await dashboardService.getRetailerDashboard(userId);
          break;
        case 'PEMERINTAH':
          dashboard = await dashboardService.getGovernmentDashboard();
          break;
        default:
          res.status(403).json({ error: 'Role tidak dikenali' });
          return;
      }

      res.json({
        message: 'Berhasil mengambil data dashboard',
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }
}
