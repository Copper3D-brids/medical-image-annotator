// vite-plugin-replace-imports.ts
import type { Plugin } from 'vite';

export type ReplaceOptions = Record<string, string[] | { globalName: string; symbols: string[] }>;

export function replaceNamedImportsFromGlobals(options: ReplaceOptions): Plugin {
  return {
    name: 'replace-named-imports-from-globals',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.ts') && !id.endsWith('.vue')) return;

      let transformed = code;
      let modified = false;

      for (const [moduleName, config] of Object.entries(options)) {
        let symbols: string[];
        let globalAccess = 'window';

        if (Array.isArray(config)) {
          symbols = config;
        } else {
          symbols = config.symbols;
          globalAccess = `window['${config.globalName}']`;
        }

        const importRegex = new RegExp(
          `import\\s*\\{([^}]*?)\\}\\s*from\\s*['"]${moduleName}['"];?`,
          'g'
        );

        transformed = transformed.replace(importRegex, (_, imports) => {
          const names = imports.split(',').map((s: string) => s.trim()).filter(Boolean);
          const replacements = names
            .filter((name: string) => symbols.includes(name))
            .map((name: string) => {
              // TYPE is a plain enum — hardcode it to avoid any window access at module init time
              if (name === 'TYPE') {
                return `const TYPE = { SUCCESS: "success", ERROR: "error", DEFAULT: "default", INFO: "info", WARNING: "warning" };`;
              }
              // Use a Proxy so that window globals are only accessed lazily (at call time),
              // not eagerly at module evaluation time (when window.Pinia etc. may not be ready yet).
              return `const ${name} = new Proxy(function(){}, {
              apply(_t, _thisArg, args) {
                if ('${name}' === 'defineStore') {
                  // defineStore() returns a useStore() composable — wrap that too so even
                  // the returned function defers access to window.Pinia until component setup.
                  let storeFn;
                  return new Proxy(function(){}, {
                    apply(_t2, _thisArg2, args2) {
                      if (!storeFn) storeFn = ${globalAccess} && ${globalAccess}.${name} ? ${globalAccess}.${name}.apply(_thisArg, args) : function(){ return {}; };
                      return storeFn.apply(_thisArg2, args2);
                    },
                    get(_t2, prop2) {
                      if (!storeFn) storeFn = ${globalAccess} && ${globalAccess}.${name} ? ${globalAccess}.${name}.apply(_thisArg, args) : function(){ return {}; };
                      return storeFn[prop2];
                    }
                  });
                }
                return ${globalAccess} && ${globalAccess}.${name} ? ${globalAccess}.${name}.apply(_thisArg, args) : undefined;
              },
              get(_t, prop) {
                return ${globalAccess} && ${globalAccess}.${name} ? ${globalAccess}.${name}[prop] : undefined;
              }
            });`})
            .join('\n');

          modified = true;
          return replacements;
        });
      }

      if (modified) {
        return {
          code: transformed,
          map: null,
        };
      }

      return null;
    },
  };
}
