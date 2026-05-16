export const buildDateRangeQuery = (
  field: string,
  startDate?: string,
  endDate?: string
) => {
  const query: Record<string, any> = {};

  if (startDate || endDate) {
    query[field] = {};
    if (startDate) {
      query[field].$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query[field].$lte = end;
    }
  }

  return Object.keys(query).length > 0 ? query : {};
};

export const buildSearchQuery = (fields: string[], keyword?: string) => {
  if (!keyword || fields.length === 0) return {};

  const regex = new RegExp(keyword, "i");
  const orConditions = fields.map((field) => ({ [field]: regex }));

  return { $or: orConditions };
};

export const buildStatusQuery = (field: string, status?: string | string[]) => {
  if (!status) return {};

  if (Array.isArray(status)) {
    return { [field]: { $in: status } };
  }

  return { [field]: status };
};

export const buildSortOptions = (sortBy?: string, sortOrder: "asc" | "desc" = "desc") => {
  if (!sortBy) return { createdAt: -1 };
  return { [sortBy]: sortOrder === "asc" ? 1 : -1 };
};

export const combineQueries = (...queries: Record<string, any>[]) => {
  const combined = queries.filter((q) => Object.keys(q).length > 0);
  if (combined.length === 0) return {};
  if (combined.length === 1) return combined[0];
  return { $and: combined };
};
