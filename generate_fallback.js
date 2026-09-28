const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Fetching live catalog from local backend...');

  // 1. Restaurants
  const restRes = await fetch('http://localhost:5000/api/restaurants').then(r => r.json());
  const basicRestaurants = restRes.data || [];
  console.log(`Fetched ${basicRestaurants.length} restaurants list.`);

  // 2. Fetch full details (with menu) for each restaurant
  const fullRestaurants = [];
  for (const r of basicRestaurants) {
    const id = r.id || r.slug || r._id;
    try {
      const detailRes = await fetch(`http://localhost:5000/api/restaurants/${id}`).then(res => res.json());
      if (detailRes.success && detailRes.data) {
        fullRestaurants.push(detailRes.data);
        console.log(`  - ${r.name}: ${detailRes.data.menu?.length || 0} menu items`);
      } else {
        fullRestaurants.push(r);
      }
    } catch (e) {
      console.warn(`  - Failed for ${r.name}:`, e.message);
      fullRestaurants.push(r);
    }
  }

  // 3. Categories
  const catRes = await fetch('http://localhost:5000/api/restaurants/categories').then(r => r.json());
  const categories = catRes.data || [];
  console.log(`Fetched ${categories.length} categories.`);

  // 4. Grocery Categories
  const grocCatRes = await fetch('http://localhost:5000/api/restaurants/categories?type=grocery').then(r => r.json());
  const groceryCategories = grocCatRes.data || [];
  console.log(`Fetched ${groceryCategories.length} grocery categories.`);

  // 5. Featured Dishes
  const dishRes = await fetch('http://localhost:5000/api/restaurants/featured-dishes?limit=50').then(r => r.json());
  const featuredDishes = dishRes.data || [];
  console.log(`Fetched ${featuredDishes.length} featured dishes.`);

  // 6. Groceries
  const grocRes = await fetch('http://localhost:5000/api/groceries').then(r => r.json());
  const groceries = grocRes.data || [];
  console.log(`Fetched ${groceries.length} groceries.`);

  // 7. Coupons
  const coupRes = await fetch('http://localhost:5000/api/cart/coupons').then(r => r.json());
  const coupons = coupRes.data || [];
  console.log(`Fetched ${coupons.length} coupons.`);

  // Generate TypeScript code
  const outDir = path.resolve(__dirname, 'Frontend/src/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const tsContent = `// Auto-generated offline fallback data for Vercel static deployment
import { Restaurant, MenuItem, GroceryItem } from '../types';

export const FALLBACK_RESTAURANTS: Restaurant[] = ${JSON.stringify(fullRestaurants, null, 2)};

export const FALLBACK_CATEGORIES = ${JSON.stringify(categories, null, 2)};

export const FALLBACK_GROCERY_CATEGORIES = ${JSON.stringify(groceryCategories, null, 2)};

export const FALLBACK_FEATURED_DISHES: MenuItem[] = ${JSON.stringify(featuredDishes, null, 2)};

export const FALLBACK_GROCERIES: GroceryItem[] = ${JSON.stringify(groceries, null, 2)};

export const FALLBACK_COUPONS = ${JSON.stringify(coupons, null, 2)};
`;

  const outFile = path.join(outDir, 'fallbackData.ts');
  fs.writeFileSync(outFile, tsContent, 'utf-8');
  console.log(`Successfully generated ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(1)} KB)!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
