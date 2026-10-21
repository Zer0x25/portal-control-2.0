declare global {
  /**
   * Version de despliegue inyectada por Vite (`define`) en dev y build.
   * En tests sin `define` el acceso via `typeof` es seguro y cae a "dev".
   */
  const __BUILD_VERSION__: string;
}

export const BUILD_VERSION: string =
  typeof __BUILD_VERSION__ === "string" && __BUILD_VERSION__.length > 0 ? __BUILD_VERSION__ : "dev";
