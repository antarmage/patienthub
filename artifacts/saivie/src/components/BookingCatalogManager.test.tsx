import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingCatalogManager } from "./BookingCatalogManager";

test("owner manager displays persisted categories and service assignments separately from billing", () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  client.setQueryData(["/api/owner/booking-catalog", "synthetic"], {
    categories: [{ id: 1, name: "Midlife review", sortOrder: 0, isActive: true, careArea: "Menopause", description: "", version: 1 },
      { id: 2, name: "Prior category", sortOrder: 1, isActive: false, careArea: "", description: "", version: 1 }],
    assignments: [{ serviceId: 12, categoryIds: [1], version: 1 }],
  });
  try {
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><BookingCatalogManager token="synthetic" services={[{ id: 12, name: "Clinic consultation" }, { id: 13, name: "New service" }]} /></QueryClientProvider>);
    assert.match(html, /Midlife review/); assert.match(html, /Archived/);
    assert.match(html, /Assign categories/); assert.match(html, /Unassigned/);
    assert.match(html, /fees and service IDs stay unchanged/);
    assert.match(html, /Add booking category/);
  } finally { client.clear(); }
});
