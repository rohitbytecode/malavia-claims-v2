export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getPaginationData = (
  page: number,
  limit: number,
  total: number
) => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const getSkipLimit = (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  return { skip, limit };
};

export const buildPaginatedResponse = <T>(
  data: T[],
  total: number,
  options: PaginationOptions,
  message = "Data fetched successfully"
): PaginatedResponse<T> => {
  return {
    success: true,
    message,
    data,
    pagination: getPaginationData(options.page, options.limit, total),
  };
};
