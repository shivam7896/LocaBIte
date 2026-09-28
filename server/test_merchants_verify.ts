import { connectDatabase, disconnectDatabase } from './src/config/db';
import { Restaurant } from './src/models/Restaurant';
import { MenuItem } from './src/models/MenuItem';
import { Product } from './src/models/Product';
import { Category } from './src/models/Category';

async function main() {
  await connectDatabase();
  console.log('Connected to MongoDB.\n');

  const restaurants = await Restaurant.find().lean();
  console.log(`=== ACTIVE MERCHANTS (${restaurants.length}) ===`);
  for (const r of restaurants) {
    const itemCount = await MenuItem.countDocuments({ restaurantId: r.id });
    console.log(`✅ [${r.id}] ${r.name}`);
    console.log(`   Slug: ${r.slug} | Pure Veg: ${r.isPureVeg} | Cuisines: ${r.cuisines?.join(', ')}`);
    console.log(`   Menu Count: ${itemCount} items | Delivery: ${r.deliveryTime} | Distance: ${r.distance}`);
  }

  const totalProducts = await Product.countDocuments();
  const totalMenuItems = await MenuItem.countDocuments();
  console.log(`\n=== CATALOG TOTALS ===`);
  console.log(`Unified Products in DB: ${totalProducts}`);
  console.log(`Menu Items in DB: ${totalMenuItems}`);

  // Dummy products verification
  const dummyProducts = await Product.find({
    $or: [
      { id: /^bj-/ },
      { id: /^ss-/ },
      { id: /^gf-/ },
      { id: /^bi-/ },
      { id: /^item-179/ },
      { name: /lauda/i },
      { price: { $lte: 0 } }
    ]
  }).lean();

  console.log(`\n=== DUMMY PRODUCTS VERIFICATION ===`);
  console.log(`Dummy products found: ${dummyProducts.length} (Should be 0)`);
  if (dummyProducts.length > 0) {
    console.error('Found remaining dummy products:', dummyProducts);
  }

  // Sample items across different merchants
  console.log(`\n=== SAMPLE REAL PRODUCTS PER MERCHANT ===`);
  for (const r of restaurants) {
    const sample = await Product.findOne({ merchantId: r.id }).lean();
    if (sample) {
      console.log(`🏪 ${r.name}:`);
      console.log(`   Product: ${sample.name}`);
      console.log(`   Price: ₹${sample.price} (MRP: ₹${sample.mrp}, Discount: ₹${sample.discount})`);
      console.log(`   Category: ${sample.category} | Dietary: ${sample.dietary}`);
      console.log(`   Description: ${sample.description}`);
      console.log(`   Image: ${sample.image}\n`);
    }
  }

  await disconnectDatabase();
  console.log('Verification completed successfully!');
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
