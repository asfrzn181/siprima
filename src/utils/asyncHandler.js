export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const adalahAsync = (fn) => Boolean(fn) && fn.constructor?.name === 'AsyncFunction';

const bungkus = (fn) => (adalahAsync(fn) ? asyncHandler(fn) : fn);

// Express 4 tidak menangkap rejection dari handler async. Fungsi ini menelusuri
// stack router lalu membungkus setiap handler async dengan asyncHandler agar
// error diteruskan ke middleware errorHandler.
export const bungkusAsyncRouter = (router) => {
  for (const layer of router.stack || []) {
    if (layer.route) {
      for (const sub of layer.route.stack) sub.handle = bungkus(sub.handle);
      continue;
    }
    if (Array.isArray(layer.handle?.stack)) {
      bungkusAsyncRouter(layer.handle);
      continue;
    }
    layer.handle = bungkus(layer.handle);
  }
};
