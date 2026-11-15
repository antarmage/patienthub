export function estimateFoodCalories(ingredients: { calories: number; quantity: string }[]): number | null {
  if (!ingredients.length || ingredients.some(({ calories, quantity }) =>
    !Number.isFinite(calories) || calories < 0 || !quantity.trim() ||
    !Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || Number(quantity) > 1000)) return null;
  return Math.round(ingredients.reduce((sum, item) => sum + item.calories * Number(item.quantity), 0));
}

export function summarizePlannedCalories(meals: { item?: string; macros?: string }[]) {
  const planned = meals.filter((meal) => meal.item?.trim());
  const values = planned.map((meal) => (meal.macros || "").match(/(\d+(?:\.\d+)?)\s*kcal/i))
    .filter((match): match is RegExpMatchArray => match !== null);
  return { total: values.reduce((sum, match) => sum + Number(match[1]), 0), recorded: values.length, meals: planned.length };
}
