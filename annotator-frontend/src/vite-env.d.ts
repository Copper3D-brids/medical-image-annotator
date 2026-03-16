/// <reference types="vite/client" />

declare const __IS_PLUGIN__: boolean;

interface ImportMetaEnv {
  readonly VITE_PLUGIN_ROUTE_PREFIX?: string;
  readonly VITE_PLUGIN_API_URL?: string;
  readonly VITE_PLUGIN_API_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "*.vert";
declare module "*.frag";
declare module "*.glsl";
declare module "*.hdr";
declare module "*.json";
declare module "jsfft";
declare module "fflate.module.min";
declare module "copper3d_plugin_nrrd";
declare module "copper3d_plugin_heart_k";
declare module "copper3d_plugin_heartjs_config";
declare module "static-kdtree";
declare module "intro.js"
