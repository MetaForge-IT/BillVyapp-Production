import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Lazy-load a named page export (most BillVyapp pages are `export function X`, not default).
 */
export function lazyNamed<TModule extends Record<string, unknown>, TName extends keyof TModule>(
  loader: () => Promise<TModule>,
  exportName: TName,
): LazyExoticComponent<ComponentType<any>> {
  return lazy(async () => {
    const mod = await loader();
    const Comp = mod[exportName];
    if (typeof Comp !== "function" && typeof Comp !== "object") {
      throw new Error(`lazyNamed: "${String(exportName)}" is not a valid component export`);
    }
    return { default: Comp as ComponentType<any> };
  });
}
