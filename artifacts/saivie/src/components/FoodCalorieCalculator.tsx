import { useState } from "react";
import { z } from "zod/v4";
import { authenticatedFetch, readApiResponse } from "@/lib/authenticatedFetch";
import { estimateFoodCalories } from "@/lib/foodCalories";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const foodSchema = z.object({ id: z.string(), name: z.string(), brand: z.string(), description: z.string() });
const foodDetailsSchema = foodSchema.omit({ description: true }).extend({
  servings: z.array(z.object({ id: z.string(), description: z.string(), calories: z.number().nonnegative() })).min(1),
});
type Food = z.infer<typeof foodSchema>;
type FoodDetails = z.infer<typeof foodDetailsSchema>;
type Ingredient = { key: number; food: FoodDetails; servingId: string; quantity: string };

export function FoodCalorieCalculator({ currentMacros, onApply, onClose }: {
  currentMacros: string;
  onApply: (value: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [searched, setSearched] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function lookup(body: { action: "search"; query: string } | { action: "food"; id: string }) {
    const response = await authenticatedFetch("/api/nutrition/food-lookup", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return readApiResponse(response);
  }
  async function search() {
    if (query.trim().length < 2) { setError("Enter at least two characters for a food."); return; }
    setBusy(true); setError(""); setSearched(false); setResults([]);
    try { setResults(z.array(foodSchema).parse(await lookup({ action: "search", query: query.trim() }))); setSearched(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Food search failed."); }
    finally { setBusy(false); }
  }
  async function addFood(id: string) {
    setBusy(true); setError("");
    try {
      const food = foodDetailsSchema.parse(await lookup({ action: "food", id }));
      setIngredients((current) => [...current, { key: Date.now() + Math.random(), food, servingId: food.servings[0].id, quantity: "1" }]);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load serving sizes."); }
    finally { setBusy(false); }
  }
  function update(key: number, patch: Partial<Pick<Ingredient, "servingId" | "quantity">>) {
    setIngredients((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }
  const selected = ingredients.map((item) => ({
    calories: item.food.servings.find((serving) => serving.id === item.servingId)?.calories ?? NaN,
    quantity: item.quantity,
  }));
  const total = estimateFoodCalories(selected);

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Calculate calories for one meal option</DialogTitle>
        <DialogDescription>Search each ingredient, select its serving and enter the number of servings. Calculate alternatives separately; do not add them together.</DialogDescription>
      </DialogHeader>
      <p className="text-xs text-saivie-plum">Only enter food names in the search; do not include patient names or other patient details. Review matching foods, preparation and portions before applying.</p>
      <div>
        <Label htmlFor="food-calorie-search">Food search</Label>
        <div className="mt-1 flex gap-2">
          <Input id="food-calorie-search" value={query} disabled={busy} onChange={(event) => { setQuery(event.target.value); setResults([]); setSearched(false); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }}
            placeholder="e.g., cooked rice" maxLength={100} />
          <Button type="button" disabled={busy} onClick={() => void search()}>Search</Button>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {searched && results.length === 0 && <p className="text-sm text-saivie-plum">No foods found. Try a different food name.</p>}
      {results.length > 0 && <div className="max-h-48 divide-y overflow-y-auto rounded-xl border border-saivie-border">
        {results.map((food) => <div key={food.id} className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0"><p className="text-sm font-semibold">{food.name}{food.brand ? ` · ${food.brand}` : ""}</p>
            <p className="text-xs text-saivie-plum">{food.description}</p></div>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void addFood(food.id)}>Add</Button>
        </div>)}
      </div>}
      {ingredients.length > 0 && <div className="space-y-3">
        <h3 className="text-sm font-bold">Selected ingredients</h3>
        {ingredients.map((item, index) => <div key={item.key} className="rounded-xl border border-saivie-border p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{item.food.name}{item.food.brand ? ` · ${item.food.brand}` : ""}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIngredients((current) => current.filter((entry) => entry.key !== item.key))}>Remove</Button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px]">
            <div><Label htmlFor={`food-serving-${item.key}`}>Serving</Label>
              <select id={`food-serving-${item.key}`} value={item.servingId} onChange={(event) => update(item.key, { servingId: event.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-saivie-border bg-white px-3 text-sm">
                {item.food.servings.map((serving) => <option key={serving.id} value={serving.id}>{serving.description} · {serving.calories} kcal</option>)}
              </select></div>
            <div><Label htmlFor={`food-quantity-${item.key}`}>Servings</Label>
              <Input id={`food-quantity-${item.key}`} type="number" min="0.01" max="1000" step="any"
                value={item.quantity} onChange={(event) => update(item.key, { quantity: event.target.value })} /></div>
          </div>
          {(!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || Number(item.quantity) > 1000) &&
            <p className="mt-1 text-xs text-red-700">Enter a number greater than 0 and no more than 1000 for ingredient {index + 1}.</p>}
        </div>)}
      </div>}
      <p className="text-sm font-semibold">{total === null ? "Choose ingredients and valid servings to calculate." : `Estimated total for this option: ${total} kcal`}</p>
      {currentMacros.trim() && <p className="text-xs text-amber-700">Applying replaces the existing nutrition / macros field: {currentMacros}</p>}
      <p className="text-xs text-saivie-plum">Estimates depend on the chosen foods and preparation. Review clinically; this information is not a substitute for medical consultation, evaluation or treatment.</p>
      <a href="https://platform.fatsecret.com" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
        <img src="https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_brand.svg" alt="Nutrition information provided by FatSecret Platform API" referrerPolicy="no-referrer" className="h-6 w-auto" />
      </a>
      <a href="https://platform.fatsecret.com/terms" target="_blank" rel="noopener noreferrer" className="text-xs underline">FatSecret API terms</a>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="button" disabled={total === null || busy} onClick={() => { if (total !== null) onApply(`${total} kcal (FatSecret estimate, one option)`); }}>Apply estimate</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
