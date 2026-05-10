import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const catalogPath = resolve(here, "../../../packages/module-catalog/catalog.json");

export function loadCatalog() {
  return JSON.parse(readFileSync(catalogPath, "utf8"));
}

export function summarizeCatalog(catalog = loadCatalog()) {
  const modules = catalog.modules || [];
  const byCategory = modules.reduce((acc, mod) => {
    acc[mod.category] = (acc[mod.category] || 0) + 1;
    return acc;
  }, {});
  const byState = modules.reduce((acc, mod) => {
    acc[mod.state] = (acc[mod.state] || 0) + 1;
    return acc;
  }, {});
  const highRisk = modules.filter((mod) => mod.risk === "high").length;
  const narrowband = modules.filter((mod) => mod.narrowbandSuitability).length;

  return {
    product: catalog.product,
    moduleCount: modules.length,
    categoryCount: catalog.categories.length,
    byCategory,
    byState,
    highRisk,
    narrowband,
  };
}

export function findModule(catalog, id) {
  return (catalog.modules || []).find((mod) => mod.id === id);
}

