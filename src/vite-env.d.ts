/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEFAULT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const DataTable: any;

interface Window {
  DataTable: any;
}

