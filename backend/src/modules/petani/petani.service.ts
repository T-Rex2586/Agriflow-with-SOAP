import prisma from '../../config/database';
import logger from '../../utils/logger';

interface GetFarmersParams {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

interface CreateFarmerInput {
  petaniId: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  nomorHp: string;
  jalan: string;
  rt: string;
  rw: string;
  kodePosId: string;
  sektor: string;
  luasLahan: number;
  userIdPengecer: number;
  awalTerdaftar: Date;
  akhirTerdaftar: Date;
  status: string;
}

export class PetaniService {
  async searchFarmers(userIdPengecer: number, query: string) {
    const farmers = await prisma.petani.findMany({
      where: {
        UserIdPengecer: userIdPengecer,
        OR: [
          { FirstName: { contains: query } },
          { MiddleName: { contains: query } },
          { LastName: { contains: query } },
        ],
      },
      select: {
        PetaniId: true,
        FirstName: true,
        MiddleName: true,
        LastName: true,
        Jalan: true,
      },
      take: 20,
    });

    return farmers.map(f => ({
      petaniId: f.PetaniId,
      nama: [f.FirstName, f.MiddleName, f.LastName].filter(Boolean).join(' '),
      alamat: f.Jalan || '',
    }));
  }

  async getFarmersByRetailer(
    userIdPengecer: number,
    params: GetFarmersParams
  ) {
    try {
      const { page, limit, status, search } = params;
      const skip = (page - 1) * limit;

      const where: any = {
        UserIdPengecer: userIdPengecer,
      };

      if (status) {
        where.Status = status;
      }

      if (search) {
        where.OR = [
          { PetaniId: { contains: search } },
          { FirstName: { contains: search } },
          { LastName: { contains: search } },
        ];
      }

      const [data, total] = await Promise.all([
        prisma.petani.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            AwalTerdaftar: 'desc',
          },
          include: {
            KodePos: true,
            KuotaPetani: {
              include: {
                Pupuk: true,
              },
            },
          },
        }),
        prisma.petani.count({ where }),
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error(`Error getting farmers: ${error.message}`);
      throw new Error('Gagal mengambil data petani');
    }
  }

  async getFarmerById(petaniId: string, userIdPengecer: number) {
    try {
      const farmer = await prisma.petani.findFirst({
        where: {
          PetaniId: petaniId,
          UserIdPengecer: userIdPengecer,
        },
        include: {
          KodePos: true,
          Pengecer: {
            select: {
              UserId: true,
              FirstName: true,
              MiddleName: true,
              LastName: true,
              Email: true,
            },
          },
          KuotaPetani: {
            include: {
              Pupuk: true,
            },
          },
        },
      });

      return farmer;
    } catch (error: any) {
      logger.error(`Error getting farmer by ID: ${error.message}`);
      throw new Error('Gagal mengambil data petani');
    }
  }

  async getFarmerQuota(petaniId: string, userIdPengecer: number) {
    try {
      // Verify farmer belongs to retailer
      const farmer = await prisma.petani.findFirst({
        where: {
          PetaniId: petaniId,
          UserIdPengecer: userIdPengecer,
        },
      });

      if (!farmer) {
        throw new Error('Petani tidak ditemukan');
      }

      const quota = await prisma.kuotaPetani.findMany({
        where: {
          PetaniId: petaniId,
        },
        include: {
          Pupuk: true,
        },
      });

      return quota;
    } catch (error: any) {
      logger.error(`Error getting farmer quota: ${error.message}`);
      throw error;
    }
  }

  async createFarmer(input: CreateFarmerInput) {
    try {
      // Validate 16-digit ID
      if (!/^\d{16}$/.test(input.petaniId)) {
        throw new Error('ID Petani harus 16 digit angka');
      }

      // Check if farmer already exists
      const existing = await prisma.petani.findUnique({
        where: {
          PetaniId: input.petaniId,
        },
      });

      if (existing) {
        throw new Error('ID Petani sudah terdaftar');
      }

      const farmer = await prisma.petani.create({
        data: {
          PetaniId: input.petaniId,
          FirstName: input.firstName,
          MiddleName: input.middleName,
          LastName: input.lastName,
          NomorHp: input.nomorHp,
          Jalan: input.jalan,
          Rt: input.rt,
          Rw: input.rw,
          KodePosId: input.kodePosId,
          Sektor: input.sektor,
          LuasLahan: input.luasLahan,
          UserIdPengecer: input.userIdPengecer,
          AwalTerdaftar: input.awalTerdaftar,
          AkhirTerdaftar: input.akhirTerdaftar,
          Status: input.status,
        },
        include: {
          KodePos: true,
        },
      });

      logger.info(`Farmer created: ${farmer.PetaniId}`);

      return farmer;
    } catch (error: any) {
      logger.error(`Error creating farmer: ${error.message}`);
      throw error;
    }
  }

  async updateFarmer(
    petaniId: string,
    userIdPengecer: number,
    updateData: Partial<CreateFarmerInput>
  ) {
    try {
      // Verify farmer belongs to retailer
      const existing = await prisma.petani.findFirst({
        where: {
          PetaniId: petaniId,
          UserIdPengecer: userIdPengecer,
        },
      });

      if (!existing) {
        throw new Error('Petani tidak ditemukan');
      }

      const farmer = await prisma.petani.update({
        where: {
          PetaniId: petaniId,
        },
        data: {
          FirstName: updateData.firstName,
          MiddleName: updateData.middleName,
          LastName: updateData.lastName,
          NomorHp: updateData.nomorHp,
          Jalan: updateData.jalan,
          Rt: updateData.rt,
          Rw: updateData.rw,
          KodePosId: updateData.kodePosId,
          Sektor: updateData.sektor,
          LuasLahan: updateData.luasLahan,
          AwalTerdaftar: updateData.awalTerdaftar,
          AkhirTerdaftar: updateData.akhirTerdaftar,
          Status: updateData.status,
        },
        include: {
          KodePos: true,
        },
      });

      logger.info(`Farmer updated: ${farmer.PetaniId}`);

      return farmer;
    } catch (error: any) {
      logger.error(`Error updating farmer: ${error.message}`);
      throw error;
    }
  }

  async deleteFarmer(petaniId: string, userIdPengecer: number) {
    try {
      // Verify farmer belongs to retailer
      const existing = await prisma.petani.findFirst({
        where: {
          PetaniId: petaniId,
          UserIdPengecer: userIdPengecer,
        },
      });

      if (!existing) {
        throw new Error('Petani tidak ditemukan');
      }

      // Delete farmer quotas first
      await prisma.kuotaPetani.deleteMany({
        where: {
          PetaniId: petaniId,
        },
      });

      // Delete farmer
      await prisma.petani.delete({
        where: {
          PetaniId: petaniId,
        },
      });

      logger.info(`Farmer deleted: ${petaniId}`);
    } catch (error: any) {
      logger.error(`Error deleting farmer: ${error.message}`);
      throw error;
    }
  }
}
