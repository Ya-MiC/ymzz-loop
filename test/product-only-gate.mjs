import { existsSync, readFileSync } from "node:fs";

export function skipShowcase(root = ".") {
  if (existsSync(`${root}/site/index.html`)) return false;
  if (!existsSync(`${root}/PRODUCT_BRANCH`)) return false;
  return /no site/i.test(readFileSync(`${root}/PRODUCT_BRANCH`, "utf8"));
}
