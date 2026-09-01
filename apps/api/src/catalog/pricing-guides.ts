import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type PricingGuide = {
  itemType: number;
  markdown: string;
};

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

const pricingGuideDirectoryCandidates = [
  path.resolve(moduleDirectory, "../../catalog/pricing-guides"),
  path.resolve(process.cwd(), "catalog/pricing-guides"),
  path.resolve(process.cwd(), "apps/api/catalog/pricing-guides"),
];

async function existingPricingGuideDirectory(): Promise<string> {
  for (const directory of pricingGuideDirectoryCandidates) {
    try {
      await access(directory);
      return directory;
    } catch {
      // Try the next runtime layout.
    }
  }
  return pricingGuideDirectoryCandidates[0];
}

async function readPricingGuideMarkdown(itemType: number): Promise<string> {
  const directory = await existingPricingGuideDirectory();
  const guidePath = path.join(directory, `${itemType}.md`);
  const defaultGuidePath = path.join(directory, "default.md");

  try {
    return await readFile(guidePath, "utf8");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return readFile(defaultGuidePath, "utf8");
    }
    throw error;
  }
}

export async function pricingGuideForItemType(
  itemType: number,
): Promise<PricingGuide> {
  return {
    itemType,
    markdown: await readPricingGuideMarkdown(itemType),
  };
}
