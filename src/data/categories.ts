import type { Category, CategoryId } from "../types";

/**
 * Categories are declared here; their colours live in CSS as custom properties
 * (`--c-<id>`, `--c-<id>-tint`, `--c-<id>-ink`) so light and dark themes can
 * each provide WCAG-compliant values. See `index.css`.
 */
export const CATEGORIES: Category[] = [
  { id: "prehistory", label: "Prehistory & early Britain" },
  { id: "monarchy", label: "Monarchy & politics" },
  { id: "war", label: "War & conflict" },
  { id: "rights", label: "Rights & society" },
  { id: "religion", label: "Religion" },
  { id: "science", label: "Science & invention" },
  { id: "arts", label: "Arts & literature" },
  { id: "sport", label: "Sport" },
  { id: "population", label: "Population" },
];

export const CATEGORY_BY_ID: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

/** Marker / accent colour for a category. */
export const categoryColor = (id: CategoryId): string => `var(--c-${id})`;
/** Faint chip background for a category. */
export const categoryTint = (id: CategoryId): string => `var(--c-${id}-tint)`;
/** Accessible text colour on a category tint. */
export const categoryInk = (id: CategoryId): string => `var(--c-${id}-ink)`;
