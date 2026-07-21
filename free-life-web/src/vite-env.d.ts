/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_HOMEPAGE: string;
  readonly VITE_APP_BASE_PATH: string;
  readonly VITE_APP_ENV: "development" | "production";
  readonly VITE_SUPER_ADMIN_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
