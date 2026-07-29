/**
 * Inventory module integration test — run with:
 *   npx tsx scripts/test-inventory-api.ts
 *
 * Requires backend .env with valid DATABASE_URL and API running on PORT (default 3000).
 */
const API = process.env.API_BASE ?? "http://localhost:3000/api";
const EMAIL = process.env.TEST_EMAIL ?? "manager@starrkuts.com";
const PASSWORD = process.env.TEST_PASSWORD ?? "Du@24m#";

type Json = Record<string, unknown>;

async function request(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; json: Json }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Json;
  return { status: res.status, json };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const results: { name: string; ok: boolean; detail?: string }[] = [];
  const pass = (name: string, detail?: string) => results.push({ name, ok: true, detail });
  const fail = (name: string, detail: string) => results.push({ name, ok: false, detail });

  let token = "";
  let categoryId = "";
  let vendorId = "";
  let productId = "";
  let initialStock = 0;

  try {
    const login = await request("POST", "/auth/login", { email: EMAIL, password: PASSWORD });
    assert(login.status === 200, `Login failed: ${JSON.stringify(login.json)}`);
    token = (login.json.data as { accessToken: string }).accessToken;
    pass("Auth login");
  } catch (e) {
    fail("Auth login", String(e));
    printResults(results);
    process.exit(1);
  }

  const run = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      pass(name);
    } catch (e) {
      fail(name, String(e));
    }
  };

  await run("Category CRUD", async () => {
    const suffix = Date.now();
    const created = await request("POST", "/product-categories", {
      name: `Test Cat ${suffix}`,
      description: "Integration test",
    }, token);
    assert(created.status === 201, JSON.stringify(created.json));
    categoryId = (created.json.data as { id: string }).id;

    const listed = await request("GET", "/product-categories", undefined, token);
    assert(listed.status === 200, JSON.stringify(listed.json));
    const categories = listed.json.data as { id: string }[];
    assert(categories.some((c) => c.id === categoryId), "Category not in list");

    const updated = await request("PATCH", `/product-categories/${categoryId}`, {
      description: "Updated",
    }, token);
    assert(updated.status === 200, JSON.stringify(updated.json));

    const deleted = await request("DELETE", `/product-categories/${categoryId}`, undefined, token);
    assert(deleted.status === 204, JSON.stringify(deleted.json));

    const recreated = await request("POST", "/product-categories", {
      name: `Persist Cat ${suffix}`,
    }, token);
    assert(recreated.status === 201, JSON.stringify(recreated.json));
    categoryId = (recreated.json.data as { id: string }).id;
  });

  await run("Vendor CRUD", async () => {
    const suffix = Date.now();
    const created = await request("POST", "/vendors", {
      name: `Test Vendor ${suffix}`,
      phone: "9876543210",
      email: `vendor${suffix}@test.com`,
    }, token);
    assert(created.status === 201, JSON.stringify(created.json));
    vendorId = (created.json.data as { id: string }).id;

    const listed = await request("GET", "/vendors", undefined, token);
    assert(listed.status === 200, JSON.stringify(listed.json));

    const updated = await request("PATCH", `/vendors/${vendorId}`, { contactPerson: "QA" }, token);
    assert(updated.status === 200, JSON.stringify(updated.json));
  });

  await run("Product CRUD", async () => {
    const suffix = Date.now();
    const created = await request("POST", "/products", {
      name: `Test Product ${suffix}`,
      sku: `SKU-${suffix}`,
      categoryId,
      brand: "TestBrand",
      vendorId,
      purchasePrice: 100,
      sellingPrice: 200,
      currentStock: 10,
      minimumStock: 5,
      unit: "pcs",
    }, token);
    assert(created.status === 201, JSON.stringify(created.json));
    const data = created.json.data as { id: string; currentStock: number };
    productId = data.id;
    initialStock = data.currentStock;

    const got = await request("GET", `/products/${productId}`, undefined, token);
    assert(got.status === 200, JSON.stringify(got.json));

    const updated = await request("PATCH", `/products/${productId}`, { brand: "UpdatedBrand" }, token);
    assert(updated.status === 200, JSON.stringify(updated.json));
  });

  await run("Purchase Entry + Stock Increase", async () => {
    const purchase = await request("POST", "/stock-purchases", {
      vendorId,
      orderDate: new Date().toISOString().slice(0, 10),
      items: [{ productId, quantity: 5, unitCost: 100 }],
      notes: "Integration test purchase",
    }, token);
    assert(purchase.status === 201, JSON.stringify(purchase.json));

    const product = await request("GET", `/products/${productId}`, undefined, token);
    const stock = (product.json.data as { currentStock: number }).currentStock;
    assert(stock === initialStock + 5, `Expected ${initialStock + 5}, got ${stock}`);
    initialStock = stock;
  });

  await run("Stock Adjustment (decrease)", async () => {
    const adj = await request("POST", "/stock-adjustments", {
      productId,
      quantityChange: -3,
      note: "Test decrease",
    }, token);
    assert(adj.status === 201, JSON.stringify(adj.json));

    const product = await request("GET", `/products/${productId}`, undefined, token);
    const stock = (product.json.data as { currentStock: number }).currentStock;
    assert(stock === initialStock - 3, `Expected ${initialStock - 3}, got ${stock}`);
    initialStock = stock;
  });

  await run("Search products", async () => {
    const search = await request("GET", `/products?search=Test%20Product`, undefined, token);
    assert(search.status === 200, JSON.stringify(search.json));
    const items = search.json.data as { id: string }[];
    assert(items.some((p) => p.id === productId), "Product not found in search");
  });

  await run("Filter by stockStatus (low stock alert)", async () => {
    await request("PATCH", `/products/${productId}`, { minimumStock: 20 }, token);
    const productBefore = await request("GET", `/products/${productId}`, undefined, token);
    const current = (productBefore.json.data as { currentStock: number }).currentStock;
    const targetStock = 12;
    if (current !== targetStock) {
      await request("POST", "/stock-adjustments", {
        productId,
        quantityChange: targetStock - current,
        note: "Set stock for low-stock test",
      }, token);
    }

    const low = await request("GET", "/products?stockStatus=low", undefined, token);
    assert(low.status === 200, JSON.stringify(low.json));
    const lowItems = low.json.data as { id: string }[];
    const isLow = lowItems.some((p) => p.id === productId);

    const critical = await request("GET", "/products?stockStatus=critical", undefined, token);
    const criticalItems = critical.json.data as { id: string }[];
    const isCritical = criticalItems.some((p) => p.id === productId);
    assert(isLow || isCritical, "Product should be low or critical stock");

    const stats = await request("GET", "/inventory/stats", undefined, token);
    assert(stats.status === 200, JSON.stringify(stats.json));
    const lowStockProducts = (stats.json.data as { lowStockProducts: { id: string }[] }).lowStockProducts;
    assert(lowStockProducts.some((p) => p.id === productId), "Low stock alert missing in stats");
  });

  await run("Stock movement history", async () => {
    const movements = await request("GET", "/stock-adjustments", undefined, token);
    assert(movements.status === 200, JSON.stringify(movements.json));
    const rows = movements.json.data as { productId: string }[];
    assert(rows.some((m) => m.productId === productId), "No movements for product");
  });

  await run("Cleanup product", async () => {
    const deactivated = await request("PATCH", `/products/${productId}`, { status: "inactive" }, token);
    assert(deactivated.status === 200, JSON.stringify(deactivated.json));
  });

  printResults(results);
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length > 0 ? 1 : 0);
}

function printResults(results: { name: string; ok: boolean; detail?: string }[]) {
  console.log("\n=== Inventory Integration Test Results ===\n");
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} passed\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
