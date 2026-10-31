export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const candidates = [
      specifier + '/index.ts',
      specifier + '/index.js',
      specifier + '.ts',
      specifier + '.js'
    ];

    if (specifier.endsWith('.js')) {
      candidates.unshift(specifier.slice(0, -3) + '.ts');
    }

    for (const cand of candidates) {
      try {
        return await nextResolve(cand, context);
      } catch {}
    }

    throw err;
  }
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (result.source) {
    let text = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
    if (text.includes('import.meta.env')) {
      text = text.replaceAll('import.meta.env', '(globalThis.importMetaEnv || {})');
    }
    // Safety net: ensure any type-only module imports from types/ are treated as type imports
    text = text.replace(/import\s+\{([^}]+)\}\s+from\s+(['"][^'"]*\/types\/[^'"]*['"])/g, 'import type { $1 } from $2');
    return {
      ...result,
      source: text
    };
  }
  return result;
}
