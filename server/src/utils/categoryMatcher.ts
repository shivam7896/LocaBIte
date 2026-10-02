/**
 * Centralized Category Matching Utility
 * Maps category filter slugs (e.g. 'pizzas', 'south-indian', 'paneer') to MongoDB query conditions
 * ensuring accurate, comprehensive filtering across both MenuItems and Unified Products.
 */

export function getCategoryMatcher(category: string): any {
  const c = category.toLowerCase().trim();

  // 1. Pizzas & Italian
  if (/^pizza/i.test(c) || c === 'italian' || c === 'pizzas') {
    return {
      $or: [
        { category: { $regex: /pizza|garlic bread|pasta/i } },
        { name: { $regex: /pizza|garlic bread|kulhad/i } },
        { tags: { $in: [/^pizza$/i, /^italian$/i] } }
      ]
    };
  }

  // 2. Burgers & Sandwiches
  if (/^burger/i.test(c) || /^sandwich/i.test(c) || c === 'fast-food' || c === 'burgers-fast-food') {
    return {
      $or: [
        { category: { $regex: /burger|sandwich/i } },
        { name: { $regex: /burger|sandwich|chizza|tostee/i } },
        { tags: { $in: [/^burger$/i, /^fast food$/i, /^sandwich$/i] } }
      ]
    };
  }

  // 3. Dosa & South Indian
  if (/dosa/i.test(c) || /south-?indian/i.test(c) || c === 'idli') {
    return {
      $or: [
        { category: { $regex: /dosa|south indian|breakfast/i } },
        { name: { $regex: /dosa|idli|vada|sambar|uttapam/i } },
        { tags: { $in: [/^south indian$/i, /^dosa$/i] } }
      ]
    };
  }

  // 4. Crispy Fried Chicken & Starters
  if (/chicken/i.test(c) || /fried/i.test(c) || /starter/i.test(c)) {
    return {
      $or: [
        { category: { $regex: /starter|fried chicken|wings|crispy/i } },
        { name: { $regex: /popcorn|wings|lollipop|kabab|kebab|crispy|boneless/i } },
        { tags: { $in: [/^chicken$/i, /^non-veg$/i] } }
      ]
    };
  }

  // 5. Biryani & Rice Bowls
  if (/biryani/i.test(c) || /rice/i.test(c) || /pulao/i.test(c) || /chawal/i.test(c)) {
    return {
      $or: [
        { category: { $regex: /biryani|rice|pulao/i } },
        { name: { $regex: /biryani|pulao|rice|chawal/i } },
        { tags: { $in: [/^rice$/i, /^biryani$/i] } }
      ]
    };
  }

  // 6. Paneer Specials
  if (/paneer/i.test(c)) {
    return {
      $or: [
        { category: { $regex: /paneer/i } },
        { name: { $regex: /paneer/i } },
        { tags: { $in: [/^paneer$/i] } }
      ]
    };
  }

  // 7. Dals & Homestyle Sabzis
  if (/dal/i.test(c) || /sabzi/i.test(c) || /curry/i.test(c) || /lentil/i.test(c) || /main-course/i.test(c)) {
    return {
      $or: [
        { category: { $regex: /dal|curry|sabzi|main course/i } },
        { name: { $regex: /dal|makhani|tadka|chana|aloo|bhindi|gobhi|baingan|sev bhaji|mix veg|kadhi/i } },
        { tags: { $in: [/^dal$/i, /^north indian$/i] } }
      ]
    };
  }

  // 8. Parathas & Tandoori Breads
  if (/paratha/i.test(c) || /roti/i.test(c) || /naan/i.test(c) || /bread/i.test(c)) {
    return {
      $or: [
        { category: { $regex: /paratha|bread|roti|naan/i } },
        { name: { $regex: /paratha|roti|naan|kulcha/i } },
        { tags: { $in: [/^paratha$/i, /^bread$/i, /^tandoor$/i] } }
      ]
    };
  }

  // 9. Thalis & Meal Combos
  if (/thali/i.test(c) || /combo/i.test(c)) {
    return {
      $or: [
        { category: { $regex: /thali|combo/i } },
        { name: { $regex: /thali|combo/i } }
      ]
    };
  }

  // 10. Momos, Rolls & Snacks
  if (/momo/i.test(c) || /snack/i.test(c) || /roll/i.test(c) || /pakora/i.test(c)) {
    return {
      $or: [
        { category: { $regex: /momo|snack|roll/i } },
        { name: { $regex: /momo|pakora|pakoda|maggi|roll|fries|cutlet/i } },
        { tags: { $in: [/^momos$/i, /^quick bite$/i] } }
      ]
    };
  }

  // 11. Shakes, Lassi & Cold Drinks
  if (/shake/i.test(c) || /beverage/i.test(c) || /drink/i.test(c) || /lassi/i.test(c) || /coffee/i.test(c)) {
    return {
      $or: [
        { category: { $regex: /shake|beverage|lassi|coffee|drink|curd|raita/i } },
        { name: { $regex: /shake|lassi|coffee|kheer/i } },
        { tags: { $in: [/^shake$/i, /^cold$/i] } }
      ]
    };
  }

  // Exact fallback with safe regex escaping
  const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const safeRegex = new RegExp(escapedCategory, 'i');
  return {
    $or: [
      { category: { $regex: safeRegex } },
      { tags: { $in: [safeRegex] } },
      { name: { $regex: safeRegex } }
    ]
  };
}
