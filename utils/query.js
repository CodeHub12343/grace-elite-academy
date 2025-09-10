function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function parseSort(sortParam) {
  if (!sortParam) return { createdAt: -1 };
  const fields = sortParam.split(',');
  const sort = {};
  for (const f of fields) {
    if (!f) continue;
    if (f.startsWith('-')) sort[f.substring(1)] = -1;
    else sort[f] = 1;
  }
  return sort;
}

module.exports = { parsePagination, parseSort };


