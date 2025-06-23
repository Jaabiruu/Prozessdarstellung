export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VersionedEntity extends BaseEntity {
  version: number;
  isActive: boolean;
  parentId?: string;
}

export interface AuditableEntity extends BaseEntity {
  createdBy: string;
  updatedBy: string;
  reason?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
