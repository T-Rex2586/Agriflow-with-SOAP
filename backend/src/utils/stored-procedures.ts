import prisma from '../config/database';
import { Prisma } from '@prisma/client';

/**
 * Utility class to execute stored procedures
 * Provides type-safe wrappers around raw SQL execution
 */
export class StoredProcedureExecutor {
  /**
   * Execute a stored procedure that returns multiple result sets
   */
  static async executeMultiple<T = any>(
    procedureName: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    if (!/^[a-zA-Z0-9_.\[\]]+$/.test(procedureName)) {
      throw new Error('Invalid stored procedure name');
    }

    const entries = Object.entries(params);
    if (entries.length === 0) {
      return await prisma.$queryRaw<T>(Prisma.raw(`EXEC ${procedureName}`));
    }

    const sqlParams = entries.map(([key, value]) => {
      if (!/^[a-zA-Z0-9_]+$/.test(key)) {
        throw new Error(`Invalid parameter key: ${key}`);
      }
      return Prisma.sql`@${Prisma.raw(key)} = ${value}`;
    });

    const result = await prisma.$queryRaw<T>(
      Prisma.sql`EXEC ${Prisma.raw(procedureName)} ${Prisma.join(sqlParams, ', ')}`
    );
    return result;
  }

  /**
   * Execute a stored procedure that returns a single result set
   */
  static async executeSingle<T = any>(
    procedureName: string,
    params: Record<string, any> = {}
  ): Promise<T[]> {
    return this.executeMultiple<T[]>(procedureName, params);
  }

  /**
   * Execute a stored procedure with pagination support
   */
  static async executePaginated<T = any>(
    procedureName: string,
    params: Record<string, any> & { PageNumber?: number }
  ): Promise<{
    data: T[];
    totalRows: number;
    currentPage: number;
  }> {
    const pageNumber = params.PageNumber || 1;
    const result = await this.executeSingle<T & { TotalRows?: number }>(
      procedureName,
      params
    );

    const totalRows = result.length > 0 ? (result[0].TotalRows || 0) : 0;

    return {
      data: result,
      totalRows,
      currentPage: pageNumber,
    };
  }
}
