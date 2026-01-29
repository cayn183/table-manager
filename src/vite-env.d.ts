interface ImportMetaEnv {
  readonly VITE_BUILD_VERSION?: string
  readonly VITE_BUILD_SHA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
