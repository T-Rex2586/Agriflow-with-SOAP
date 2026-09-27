import prisma from '../database/prisma';

export interface GetPetaniByNIKArgs {
  NIK: string;
}

export interface CekKuotaPetaniArgs {
  PetaniId: string;
}

export interface GetPetaniListArgs {
  UserIdPengecer: number;
}

export async function getPetaniByNIKSoap(args: GetPetaniByNIKArgs) {
  try {
    const { NIK } = args;

    if (!NIK) {
      return {
        Found: false,
      };
    }

    const petani = await prisma.petani.findFirst({
      where: {
        PetaniId: NIK,
      },
      include: {
        KodePos: true,
      },
    });

    if (!petani) {
      return {
        Found: false,
      };
    }

    const namaLengkap = [petani.FirstName, petani.MiddleName, petani.LastName]
      .filter(Boolean)
      .join(' ');

    return {
      Found: true,
      PetaniId: petani.PetaniId,
      NIK: petani.PetaniId,
      NamaLengkap: namaLengkap,
      NomorHp: petani.NomorHp || '',
      Alamat: `${petani.Jalan || ''} RT ${petani.Rt || '-'}/RW ${petani.Rw || '-'}`,
      DesaKelurahan: petani.KodePos?.KelurahanDesa || '',
      Kecamatan: petani.KodePos?.Kecamatan || '',
      KabupatenKota: petani.KodePos?.KabupatenKota || '',
      Provinsi: petani.KodePos?.Provinsi || '',
      LuasLahan: Number(petani.LuasLahan || 0),
      Sektor: petani.Sektor || '',
      Status: petani.Status,
      UserIdPengecer: petani.UserIdPengecer,
      AwalTerdaftar: petani.AwalTerdaftar ? petani.AwalTerdaftar.toISOString() : '',
      AkhirTerdaftar: petani.AkhirTerdaftar ? petani.AkhirTerdaftar.toISOString() : '',
    };
  } catch (error: any) {
    return {
      Found: false,
    };
  }
}

export async function cekKuotaPetaniSoap(args: CekKuotaPetaniArgs) {
  try {
    const { PetaniId } = args;

    const petani = await prisma.petani.findUnique({
      where: { PetaniId },
      include: {
        KuotaPetani: {
          include: {
            Pupuk: true,
          },
        },
      },
    });

    if (!petani) {
      return {
        PetaniId: PetaniId || '',
        NamaPetani: 'Petani Tidak Ditemukan',
        ListKuota: [],
      };
    }

    const namaPetani = [petani.FirstName, petani.MiddleName, petani.LastName]
      .filter(Boolean)
      .join(' ');

    const listKuota = petani.KuotaPetani.map((k) => ({
      PupukId: k.PupukId,
      NamaPupuk: k.Pupuk.JenisPupuk,
      SisaKuota: Number(k.SisaKuota),
    }));

    return {
      PetaniId: petani.PetaniId,
      NamaPetani: namaPetani,
      ListKuota: listKuota,
    };
  } catch (error: any) {
    return {
      PetaniId: args.PetaniId || '',
      NamaPetani: 'Error',
      ListKuota: [],
    };
  }
}

export async function getPetaniListSoap(args: GetPetaniListArgs) {
  try {
    const { UserIdPengecer } = args;
    const retailerIdNum = Number(UserIdPengecer);

    const where: any = {};
    if (retailerIdNum && retailerIdNum > 0) {
      where.UserIdPengecer = retailerIdNum;
    }

    const farmers = await prisma.petani.findMany({
      where,
      include: {
        KodePos: true,
      },
      orderBy: {
        FirstName: 'asc',
      },
    });

    const listPetani = farmers.map((f) => {
      const nama = [f.FirstName, f.MiddleName, f.LastName].filter(Boolean).join(' ');
      const alamat = `${f.Jalan || ''}, RT ${f.Rt || '-'}/RW ${f.Rw || '-'}, ${f.KodePos?.KelurahanDesa || ''}, ${f.KodePos?.Kecamatan || ''}`;
      return {
        PetaniId: f.PetaniId,
        NamaLengkap: nama,
        NomorHp: f.NomorHp || '',
        Alamat: alamat,
        LuasLahan: Number(f.LuasLahan || 0),
        Sektor: f.Sektor || '',
        Status: f.Status,
        UserIdPengecer: f.UserIdPengecer,
      };
    });

    return {
      Total: listPetani.length,
      ListPetani: listPetani,
    };
  } catch (error: any) {
    return {
      Total: 0,
      ListPetani: [],
    };
  }
}
