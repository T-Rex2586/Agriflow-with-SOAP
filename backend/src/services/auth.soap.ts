import prisma from '../database/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

function esc(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

export interface LoginUserArgs {
  Email: string;
  Password: string;
}

export interface RegisterUserArgs {
  Fullname: string;
  Email: string;
  Password: string;
  Role: string; // DISTRIBUTOR | PENGECER
}

export async function loginUserSoap(args: LoginUserArgs) {
  try {
    const { Email, Password } = args;

    if (!Email || !Password) {
      return {
        Success: false,
        Message: 'Email dan Password wajib diisi',
      };
    }

    const user = await prisma.user.findUnique({
      where: { Email },
      include: { Role: true },
    });

    if (!user) {
      return {
        Success: false,
        Message: 'Email atau password salah',
      };
    }

    if (user.Status === 'Rejected') {
      return {
        Success: false,
        Message: 'Akun Anda telah ditolak',
      };
    }

    if (user.Status === 'Pending') {
      return {
        Success: false,
        Message: 'Akun Anda masih menunggu persetujuan pemerintah',
      };
    }

    const isMatch = user.HashedPassword
      ? await bcrypt.compare(Password, user.HashedPassword)
      : false;

    if (!isMatch) {
      return {
        Success: false,
        Message: 'Email atau password salah',
      };
    }

    const fullName = [user.FirstName, user.MiddleName, user.LastName]
      .filter(Boolean)
      .join(' ');

    const token = jwt.sign(
      {
        userId: user.UserId,
        email: user.Email,
        role: user.Role.RoleName.toUpperCase(),
      },
      config.jwt.secret,
      { expiresIn: '8h' }
    );

    // Catat log aktivitas login ke evt.LOG_AKTIVITAS persis seperti agriflow
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          'LOGIN',
          ${esc(`Pengguna login via SOAP: ${Email}`)},
          ${user.UserId},
          GETDATE()
        )
      `);
    } catch (logErr: any) {
      console.error('[SOAP-LOG-ERROR] Gagal mencatat log login:', logErr?.message);
    }

    return {
      Success: true,
      Message: 'Login berhasil via SOAP Web Service',
      UserId: user.UserId,
      Email: user.Email,
      Name: fullName,
      Role: user.Role.RoleName.toUpperCase(),
      Status: user.Status,
      AccessToken: token,
    };
  } catch (error: any) {
    return {
      Success: false,
      Message: `Terjadi kesalahan sistem SOAP: ${error.message}`,
    };
  }
}

export async function registerUserSoap(args: RegisterUserArgs) {
  try {
    const { Fullname, Email, Password, Role } = args;

    if (!Fullname || !Email || !Password || !Role) {
      return {
        Success: false,
        Message: 'Nama lengkap, email, password, dan role wajib diisi',
      };
    }

    const roleTarget = Role.toUpperCase();
    const roleRecord = await prisma.role.findFirst({
      where: {
        RoleName: {
          equals: roleTarget,
        },
      },
    });

    if (!roleRecord) {
      return {
        Success: false,
        Message: `Role '${Role}' tidak valid. Pilihan role: DISTRIBUTOR, PENGECER`,
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { Email },
    });

    if (existingUser) {
      return {
        Success: false,
        Message: 'Email sudah terdaftar dalam sistem',
      };
    }

    const nameParts = Fullname.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : null;
    const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null;

    const hashedPassword = await bcrypt.hash(Password, 10);

    const maxUser = await prisma.user.aggregate({
      _max: { UserId: true },
    });
    const nextUserId = (maxUser._max.UserId || 0) + 1;

    const newUser = await prisma.user.create({
      data: {
        UserId: nextUserId,
        FirstName: firstName,
        MiddleName: middleName,
        LastName: lastName,
        Email,
        HashedPassword: hashedPassword,
        RoleId: roleRecord.RoleId,
        Status: 'Pending',
      },
    });

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO evt.LOG_AKTIVITAS (LogId, Aksi, Deskripsi, UserId, Timestamp)
        VALUES (
          (SELECT ISNULL(MAX(LogId), 0) + 1 FROM evt.LOG_AKTIVITAS WITH (TABLOCKX)),
          'REGISTER',
          ${esc(`Pendaftaran user baru via SOAP: ${Email} (${roleTarget})`)},
          ${newUser.UserId},
          GETDATE()
        )
      `);
    } catch (logErr: any) {
      console.error('[SOAP-LOG-ERROR] Gagal mencatat log register:', logErr?.message);
    }

    return {
      Success: true,
      Message: 'Registrasi berhasil via SOAP. Akun menunggu persetujuan pemerintah.',
      UserId: newUser.UserId,
      Email: newUser.Email,
      Name: Fullname,
      Role: roleTarget,
      Status: 'Pending',
    };
  } catch (error: any) {
    return {
      Success: false,
      Message: `Gagal memproses registrasi: ${error.message}`,
    };
  }
}
