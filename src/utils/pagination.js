import { PAGINATION } from '../constants/index.js';

export const bacaPagination = (query = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limitMentah = Number.parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT;
  const limit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, limitMentah));
  return { page, limit, offset: (page - 1) * limit };
};

export const potongHalaman = (items, { page, limit }) => {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const mulai = (page - 1) * limit;
  return {
    items: items.slice(mulai, mulai + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages
    }
  };
};
