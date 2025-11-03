import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import cssInjected from 'vite-plugin-css-injected-by-js'
import glslify from 'rollup-plugin-glslify'
import { fileURLToPath, URL } from 'node:url'
import { replaceNamedImportsFromGlobals } from './vite-plugin-replace-imports'

const filesNeedToExclude = ["src/ts"]
const filesPathToExclude = filesNeedToExclude.map((src) =>
  fileURLToPath(new URL(src, import.meta.url))
)

export default defineConfig(({ command, mode }) => {
  const isBuild = command === 'build'

  return {
    plugins: [
      vue(
        isBuild
          ? {}
          : {
              template: {
                transformAssetUrls,
                compilerOptions: {
                  isCustomElement: (tag) => tag.startsWith("ion-"),
                },
              },
            }
      ),
      ...(isBuild
        ? [
            vueJsx(),
            cssInjected(),
            replaceNamedImportsFromGlobals({
              pinia: ["defineStore", "storeToRefs"],
              vuetify: ["useTheme"],
            }),
          ]
        : [
            vuetify({
              autoImport: true,
              styles: { configFile: "src/styles/settings.scss" },
            }),
          ]),
      glslify({
        include: ["**/*.vs", "**/*.fs", "**/*.vert", "**/*.frag", "**/*.glsl"],
        exclude: "node_modules/**",
        compress: true,
      }),
    ],
    define: {
      "process.env": {
        BASE_URL: "/",
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
      extensions: [".js", ".json", ".jsx", ".mjs", ".ts", ".tsx", ".vue"],
    },
    base: "/",
    build: isBuild
      ? {
          lib: {
            entry: './src/index.ts',
            name: 'SegmentationApp',
            formats: ['umd'],
            fileName: (format) => `my-app.${format}.js`,
          },
          rollupOptions: {
            external: ['vue', 'vuetify', 'pinia'],
            output: {
              globals: {
                vue: 'Vue',
                vuetify: 'Vuetify',
                pinia: 'Pinia',
              },
            },
          },
        }
      : {
          outDir: "./build",
          rollupOptions: {
            external: [...filesPathToExclude],
          },
        },
    optimizeDeps: isBuild
      ? {}
      : {
          exclude: [
            '@vuetify/loader-shared/runtime',
            'vuetify',
          ],
        },
  }
})
