export type ID = string;

export type RequestWithUser = Request & {
  user: {
    id: ID;
    email: string;
    role: string;
  };
};

export type GraphQLContext = {
  req: RequestWithUser;
  res: Response;
};

export type ServiceResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export type SearchFilters = Record<string, unknown>;

export interface CreateInput {
  reason: string;
}

export interface UpdateInput extends CreateInput {
  id: ID;
}