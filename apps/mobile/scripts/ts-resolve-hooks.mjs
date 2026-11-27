// Node's type stripping runs `.ts` files but does not guess extensions, and Interlace's native files
// import each other without one (`./contrast`), because Metro resolves them. This lets a test import
// those files as they are, so the vendored copies stay byte for byte what Interlace released.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(specifier))
      return next(`${specifier}.ts`, context);
    throw error;
  }
}
