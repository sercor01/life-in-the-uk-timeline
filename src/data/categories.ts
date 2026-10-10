import type { Category, CategoryId } from "../types";

export const CATEGORIES: Category[] = [
  { id: "prehistory", label: "Prehistory & early Britain", color: "#8a6d3b", tint: "#f3ecd8" },
  { id: "monarchy", label: "Monarchy & politics", color: "#7c3aed", tint: "#ede9fe" },
  { id: "war", label: "War & conflict", color: "#dc2626", tint: "#fee2e2" },
  { id: "rights", label: "Rights & society", color: "#0891b2", tint: "#cffafe" },
  { id: "religion", label: "Religion", color: "#16a34a", tint: "#dcfce7" },
  { id: "science", label: "Science & invention", color: "#2563eb", tint: "#dbeafe" },
  { id: "arts", label: "Arts & literature", color: "#db2777", tint: "#fce7f3" },
  { id: "sport", label: "Sport", color: "#ea580c", tint: "#ffedd5" },
];

export const CATEGORY_BY_ID: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;
