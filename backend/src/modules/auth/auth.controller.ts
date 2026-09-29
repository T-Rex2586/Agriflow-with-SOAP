import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fullname, email, password, role } = req.body;
      const proofPath = req.file?.filename;

      if (!proofPath) {
        res.status(400).json({
          error: 'Bukti registrasi wajib diunggah'
        });
        return;
      }

      const user = await authService.register({
        fullname,
        email,
        password,
        role,
        proofPath,
      });

      res.status(201).json({
        message: 'Registrasi berhasil. Menunggu persetujuan.',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      res.json({
        message: 'Login berhasil',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPendingUsers(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await authService.getPendingUsers();

      res.json({
        message: 'Berhasil mengambil daftar pengguna pending',
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'ID pengguna tidak valid' });
        return;
      }

      const approverId = Number(req.user!.userId);
      if (isNaN(approverId)) {
        res.status(401).json({ error: 'Token tidak valid, silakan login ulang' });
        return;
      }

      const user = await authService.approveUser(id, approverId);

      res.json({
        message: 'Pengguna berhasil disetujui',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'ID pengguna tidak valid' });
        return;
      }

      const approverId = Number(req.user!.userId);
      if (isNaN(approverId)) {
        res.status(401).json({ error: 'Token tidak valid, silakan login ulang' });
        return;
      }

      const user = await authService.rejectUser(id, approverId);

      res.json({
        message: 'Pengguna berhasil ditolak',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7) || '';
      const { refreshToken } = req.body || {};

      const userId = Number(req.user!.userId);
      if (isNaN(userId)) {
        res.status(401).json({ error: 'Token tidak valid, silakan login ulang' });
        return;
      }

      const result = await authService.logout(token, userId, refreshToken);

      res.json({
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: 'Refresh token wajib disertakan'
        });
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      res.json({
        message: 'Token berhasil diperbarui',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
