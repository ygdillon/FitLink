import { pool } from '../config/database.js'

// Comprehensive food database seed
// Based on USDA nutrition data and common foods

const foods = [
  // ============================================
  // PROTEIN SOURCES
  // ============================================
  
  // Poultry
  { name: 'Chicken Breast (skinless, boneless)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 187, protein: 35, carbs: 0, fats: 4, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  { name: 'Chicken Thigh (skinless, boneless)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 209, protein: 26, carbs: 0, fats: 10, quality_tier: 'moderate_fat', is_vegetarian: false, is_vegan: false },
  { name: 'Turkey Breast (skinless)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 135, protein: 30, carbs: 0, fats: 1, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  { name: 'Ground Turkey (93% lean)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 176, protein: 24, carbs: 0, fats: 8, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  { name: 'Duck Breast', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 201, protein: 19, carbs: 0, fats: 13, quality_tier: 'moderate_fat', is_vegetarian: false, is_vegan: false },
  
  // Beef
  { name: 'Beef Sirloin (lean)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 207, protein: 26, carbs: 0, fats: 10, quality_tier: 'moderate_fat', is_vegetarian: false, is_vegan: false },
  { name: 'Ground Beef (93% lean)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 200, protein: 23, carbs: 0, fats: 11, quality_tier: 'moderate_fat', is_vegetarian: false, is_vegan: false },
  { name: 'Ground Beef (80% lean)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 254, protein: 20, carbs: 0, fats: 18, quality_tier: 'high_fat', is_vegetarian: false, is_vegan: false },
  { name: 'Beef Tenderloin', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 179, protein: 25, carbs: 0, fats: 8, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  { name: 'Beef Ribeye', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 291, protein: 23, carbs: 0, fats: 21, quality_tier: 'high_fat', is_vegetarian: false, is_vegan: false },
  
  // Pork
  { name: 'Pork Tenderloin', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 143, protein: 26, carbs: 0, fats: 3, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  { name: 'Pork Chop (boneless)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 231, protein: 26, carbs: 0, fats: 12, quality_tier: 'moderate_fat', is_vegetarian: false, is_vegan: false },
  { name: 'Ground Pork (85% lean)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 212, protein: 20, carbs: 0, fats: 14, quality_tier: 'moderate_fat', is_vegetarian: false, is_vegan: false },
  
  // Fish & Seafood
  { name: 'Salmon (Atlantic, farmed)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 206, protein: 23, carbs: 0, fats: 12, quality_tier: 'moderate_fat', is_vegetarian: false, is_vegan: false },
  { name: 'Salmon (wild)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 182, protein: 25, carbs: 0, fats: 8, quality_tier: 'moderate_fat', is_vegetarian: false, is_vegan: false },
  { name: 'Tuna (yellowfin, fresh)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 108, protein: 24, carbs: 0, fats: 1, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  { name: 'Tuna (canned in water)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 99, protein: 22, carbs: 0, fats: 1, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  { name: 'Cod', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 82, protein: 18, carbs: 0, fats: 1, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  { name: 'Tilapia', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 128, protein: 26, carbs: 0, fats: 3, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  { name: 'Shrimp (cooked)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 99, protein: 24, carbs: 0, fats: 0, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  { name: 'Scallops', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 94, protein: 18, carbs: 4, fats: 1, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  { name: 'Crab (cooked)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 97, protein: 20, carbs: 0, fats: 1, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  { name: 'Lobster (cooked)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 98, protein: 21, carbs: 1, fats: 1, quality_tier: 'lean', is_vegetarian: false, is_vegan: false },
  
  // Eggs & Dairy
  { name: 'Egg (whole, large)', category: 'protein', serving_size: 1, serving_unit: 'piece', calories: 72, protein: 6, carbs: 0, fats: 5, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: false },
  { name: 'Egg White (large)', category: 'protein', serving_size: 1, serving_unit: 'piece', calories: 17, protein: 4, carbs: 0, fats: 0, quality_tier: 'lean', is_vegetarian: true, is_vegan: false },
  { name: 'Greek Yogurt (0% fat)', category: 'protein', serving_size: 170, serving_unit: 'g', calories: 100, protein: 17, carbs: 7, fats: 0, quality_tier: 'lean', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  { name: 'Greek Yogurt (2% fat)', category: 'protein', serving_size: 170, serving_unit: 'g', calories: 130, protein: 17, carbs: 7, fats: 3, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  { name: 'Cottage Cheese (1% fat)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 81, protein: 14, carbs: 3, fats: 1, quality_tier: 'lean', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  { name: 'Cottage Cheese (4% fat)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 111, protein: 13, carbs: 3, fats: 5, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  { name: 'Milk (skim)', category: 'protein', serving_size: 240, serving_unit: 'ml', calories: 83, protein: 8, carbs: 12, fats: 0, quality_tier: 'lean', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  { name: 'Milk (2%)', category: 'protein', serving_size: 240, serving_unit: 'ml', calories: 122, protein: 8, carbs: 12, fats: 5, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  { name: 'Milk (whole)', category: 'protein', serving_size: 240, serving_unit: 'ml', calories: 149, protein: 8, carbs: 12, fats: 8, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  
  // Plant Proteins
  { name: 'Tofu (firm)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 94, protein: 10, carbs: 2, fats: 5, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true },
  { name: 'Tempeh', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 193, protein: 19, carbs: 9, fats: 11, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true },
  { name: 'Seitan', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 104, protein: 21, carbs: 4, fats: 1, quality_tier: 'lean', is_vegetarian: true, is_vegan: true, is_gluten_free: false },
  { name: 'Edamame (shelled, cooked)', category: 'protein', serving_size: 113, serving_unit: 'g', calories: 122, protein: 11, carbs: 10, fats: 5, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true },
  { name: 'Lentils (cooked)', category: 'protein', serving_size: 198, serving_unit: 'g', calories: 230, protein: 18, carbs: 40, fats: 1, quality_tier: 'lean', is_vegetarian: true, is_vegan: true },
  { name: 'Black Beans (cooked)', category: 'protein', serving_size: 172, serving_unit: 'g', calories: 227, protein: 15, carbs: 41, fats: 1, quality_tier: 'lean', is_vegetarian: true, is_vegan: true },
  { name: 'Chickpeas (cooked)', category: 'protein', serving_size: 164, serving_unit: 'g', calories: 269, protein: 15, carbs: 45, fats: 4, quality_tier: 'lean', is_vegetarian: true, is_vegan: true },
  { name: 'Kidney Beans (cooked)', category: 'protein', serving_size: 177, serving_unit: 'g', calories: 225, protein: 15, carbs: 40, fats: 1, quality_tier: 'lean', is_vegetarian: true, is_vegan: true },
  { name: 'Pinto Beans (cooked)', category: 'protein', serving_size: 171, serving_unit: 'g', calories: 245, protein: 15, carbs: 45, fats: 1, quality_tier: 'lean', is_vegetarian: true, is_vegan: true },
  
  // Protein Powders
  { name: 'Whey Protein Powder', category: 'protein', serving_size: 30, serving_unit: 'g', calories: 120, protein: 25, carbs: 3, fats: 1.5, quality_tier: 'lean', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  { name: 'Casein Protein Powder', category: 'protein', serving_size: 30, serving_unit: 'g', calories: 120, protein: 24, carbs: 3, fats: 1, quality_tier: 'lean', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  { name: 'Pea Protein Powder', category: 'protein', serving_size: 30, serving_unit: 'g', calories: 110, protein: 24, carbs: 2, fats: 1, quality_tier: 'lean', is_vegetarian: true, is_vegan: true },
  { name: 'Hemp Protein Powder', category: 'protein', serving_size: 30, serving_unit: 'g', calories: 120, protein: 15, carbs: 8, fats: 3, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true },
  
  // ============================================
  // CARBOHYDRATE SOURCES
  // ============================================
  
  // Grains
  { name: 'White Rice (cooked)', category: 'carb', serving_size: 158, serving_unit: 'g', calories: 205, protein: 4, carbs: 45, fats: 0, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Brown Rice (cooked)', category: 'carb', serving_size: 195, serving_unit: 'g', calories: 216, protein: 5, carbs: 45, fats: 2, fiber: 4, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Jasmine Rice (cooked)', category: 'carb', serving_size: 158, serving_unit: 'g', calories: 205, protein: 4, carbs: 45, fats: 0, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Quinoa (cooked)', category: 'carb', serving_size: 185, serving_unit: 'g', calories: 222, protein: 8, carbs: 39, fats: 4, fiber: 5, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Oats (dry)', category: 'carb', serving_size: 40, serving_unit: 'g', calories: 150, protein: 5, carbs: 27, fats: 3, fiber: 4, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: false },
  { name: 'Oatmeal (cooked)', category: 'carb', serving_size: 234, serving_unit: 'g', calories: 166, protein: 6, carbs: 28, fats: 4, fiber: 4, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: false },
  { name: 'Pasta (white, cooked)', category: 'carb', serving_size: 140, serving_unit: 'g', calories: 221, protein: 8, carbs: 43, fats: 1, quality_tier: 'processed', is_vegetarian: true, is_vegan: true, is_gluten_free: false },
  { name: 'Whole Wheat Pasta (cooked)', category: 'carb', serving_size: 140, serving_unit: 'g', calories: 174, protein: 7, carbs: 37, fats: 1, fiber: 6, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: false },
  { name: 'Bread (white)', category: 'carb', serving_size: 28, serving_unit: 'g', calories: 75, protein: 2, carbs: 14, fats: 1, quality_tier: 'processed', is_vegetarian: true, is_vegan: true, is_gluten_free: false },
  { name: 'Whole Wheat Bread', category: 'carb', serving_size: 28, serving_unit: 'g', calories: 69, protein: 4, carbs: 12, fats: 1, fiber: 2, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: false },
  { name: 'Bagel (plain)', category: 'carb', serving_size: 105, serving_unit: 'g', calories: 289, protein: 11, carbs: 56, fats: 2, quality_tier: 'processed', is_vegetarian: true, is_vegan: true, is_gluten_free: false },
  
  // Potatoes & Starches
  { name: 'Potato (white, baked)', category: 'carb', serving_size: 173, serving_unit: 'g', calories: 161, protein: 4, carbs: 37, fats: 0, fiber: 4, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Sweet Potato (baked)', category: 'carb', serving_size: 200, serving_unit: 'g', calories: 180, protein: 4, carbs: 41, fats: 0, fiber: 6, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Corn (cooked)', category: 'carb', serving_size: 164, serving_unit: 'g', calories: 143, protein: 5, carbs: 31, fats: 2, fiber: 4, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Peas (cooked)', category: 'carb', serving_size: 160, serving_unit: 'g', calories: 134, protein: 9, carbs: 25, fats: 0, fiber: 9, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  
  // Fruits
  { name: 'Banana (medium)', category: 'carb', serving_size: 118, serving_unit: 'g', calories: 105, protein: 1, carbs: 27, fats: 0, fiber: 3, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Apple (medium)', category: 'carb', serving_size: 182, serving_unit: 'g', calories: 95, protein: 0, carbs: 25, fats: 0, fiber: 4, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Orange (medium)', category: 'carb', serving_size: 131, serving_unit: 'g', calories: 62, protein: 1, carbs: 15, fats: 0, fiber: 3, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Berries (mixed)', category: 'carb', serving_size: 150, serving_unit: 'g', calories: 85, protein: 1, carbs: 21, fats: 0, fiber: 4, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Strawberries', category: 'carb', serving_size: 144, serving_unit: 'g', calories: 46, protein: 1, carbs: 11, fats: 0, fiber: 3, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Blueberries', category: 'carb', serving_size: 148, serving_unit: 'g', calories: 84, protein: 1, carbs: 21, fats: 0, fiber: 4, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Grapes', category: 'carb', serving_size: 150, serving_unit: 'g', calories: 104, protein: 1, carbs: 27, fats: 0, fiber: 1, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Mango', category: 'carb', serving_size: 165, serving_unit: 'g', calories: 99, protein: 1, carbs: 25, fats: 0, fiber: 3, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  
  // ============================================
  // FAT SOURCES
  // ============================================
  
  // Nuts & Seeds
  { name: 'Almonds', category: 'fat', serving_size: 28, serving_unit: 'g', calories: 164, protein: 6, carbs: 6, fats: 14, fiber: 4, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_nut_free: false },
  { name: 'Peanuts', category: 'fat', serving_size: 28, serving_unit: 'g', calories: 161, protein: 7, carbs: 5, fats: 14, fiber: 2, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_nut_free: false },
  { name: 'Walnuts', category: 'fat', serving_size: 28, serving_unit: 'g', calories: 185, protein: 4, carbs: 4, fats: 18, fiber: 2, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_nut_free: false },
  { name: 'Cashews', category: 'fat', serving_size: 28, serving_unit: 'g', calories: 157, protein: 5, carbs: 9, fats: 12, fiber: 1, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_nut_free: false },
  { name: 'Peanut Butter', category: 'fat', serving_size: 32, serving_unit: 'g', calories: 188, protein: 8, carbs: 6, fats: 16, fiber: 2, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_nut_free: false },
  { name: 'Almond Butter', category: 'fat', serving_size: 32, serving_unit: 'g', calories: 196, protein: 7, carbs: 6, fats: 18, fiber: 3, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_nut_free: false },
  { name: 'Chia Seeds', category: 'fat', serving_size: 28, serving_unit: 'g', calories: 138, protein: 5, carbs: 12, fats: 9, fiber: 10, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Flax Seeds', category: 'fat', serving_size: 28, serving_unit: 'g', calories: 150, protein: 5, carbs: 8, fats: 12, fiber: 8, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Pumpkin Seeds', category: 'fat', serving_size: 28, serving_unit: 'g', calories: 158, protein: 9, carbs: 3, fats: 14, fiber: 1, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  
  // Oils
  { name: 'Olive Oil', category: 'fat', serving_size: 14, serving_unit: 'g', calories: 119, protein: 0, carbs: 0, fats: 14, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Coconut Oil', category: 'fat', serving_size: 14, serving_unit: 'g', calories: 117, protein: 0, carbs: 0, fats: 14, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Avocado Oil', category: 'fat', serving_size: 14, serving_unit: 'g', calories: 120, protein: 0, carbs: 0, fats: 14, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Butter', category: 'fat', serving_size: 14, serving_unit: 'g', calories: 102, protein: 0, carbs: 0, fats: 12, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  
  // Avocado
  { name: 'Avocado (medium)', category: 'fat', serving_size: 150, serving_unit: 'g', calories: 240, protein: 3, carbs: 13, fats: 22, fiber: 10, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  
  // Cheese
  { name: 'Cheddar Cheese', category: 'fat', serving_size: 28, serving_unit: 'g', calories: 113, protein: 7, carbs: 1, fats: 9, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  { name: 'Mozzarella Cheese', category: 'fat', serving_size: 28, serving_unit: 'g', calories: 85, protein: 6, carbs: 1, fats: 6, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  { name: 'Feta Cheese', category: 'fat', serving_size: 28, serving_unit: 'g', calories: 75, protein: 4, carbs: 1, fats: 6, quality_tier: 'moderate_fat', is_vegetarian: true, is_vegan: false, is_dairy_free: false },
  
  // ============================================
  // VEGETABLES (Low Calorie, High Volume)
  // ============================================
  
  { name: 'Broccoli (cooked)', category: 'vegetable', serving_size: 156, serving_unit: 'g', calories: 55, protein: 4, carbs: 11, fats: 1, fiber: 5, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Spinach (raw)', category: 'vegetable', serving_size: 30, serving_unit: 'g', calories: 7, protein: 1, carbs: 1, fats: 0, fiber: 1, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Kale (raw)', category: 'vegetable', serving_size: 67, serving_unit: 'g', calories: 33, protein: 3, carbs: 6, fats: 1, fiber: 1, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Asparagus (cooked)', category: 'vegetable', serving_size: 180, serving_unit: 'g', calories: 40, protein: 4, carbs: 8, fats: 0, fiber: 4, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Brussels Sprouts (cooked)', category: 'vegetable', serving_size: 156, serving_unit: 'g', calories: 56, protein: 4, carbs: 11, fats: 1, fiber: 4, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Cauliflower (cooked)', category: 'vegetable', serving_size: 124, serving_unit: 'g', calories: 29, protein: 2, carbs: 6, fats: 0, fiber: 3, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Zucchini (cooked)', category: 'vegetable', serving_size: 180, serving_unit: 'g', calories: 27, protein: 2, carbs: 5, fats: 0, fiber: 2, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Bell Peppers (raw)', category: 'vegetable', serving_size: 149, serving_unit: 'g', calories: 31, protein: 1, carbs: 7, fats: 0, fiber: 3, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Carrots (raw)', category: 'vegetable', serving_size: 128, serving_unit: 'g', calories: 52, protein: 1, carbs: 12, fats: 0, fiber: 4, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Cucumber (raw)', category: 'vegetable', serving_size: 119, serving_unit: 'g', calories: 16, protein: 1, carbs: 4, fats: 0, fiber: 1, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Tomatoes (raw)', category: 'vegetable', serving_size: 180, serving_unit: 'g', calories: 32, protein: 2, carbs: 7, fats: 0, fiber: 2, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Mushrooms (cooked)', category: 'vegetable', serving_size: 156, serving_unit: 'g', calories: 44, protein: 3, carbs: 8, fats: 0, fiber: 2, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  { name: 'Onions (raw)', category: 'vegetable', serving_size: 160, serving_unit: 'g', calories: 64, protein: 2, carbs: 15, fats: 0, fiber: 3, quality_tier: 'whole_food', is_vegetarian: true, is_vegan: true, is_gluten_free: true },
  
  // ============================================
  // COMBINATION FOODS
  // ============================================
  
  { name: 'Pizza Slice (cheese)', category: 'combination', serving_size: 107, serving_unit: 'g', calories: 272, protein: 12, carbs: 33, fats: 10, quality_tier: 'processed', is_vegetarian: true, is_vegan: false, is_gluten_free: false },
  { name: 'Burger (beef patty, bun)', category: 'combination', serving_size: 150, serving_unit: 'g', calories: 354, protein: 19, carbs: 33, fats: 15, quality_tier: 'processed', is_vegetarian: false, is_vegan: false },
  { name: 'Chicken Sandwich', category: 'combination', serving_size: 200, serving_unit: 'g', calories: 350, protein: 25, carbs: 35, fats: 12, quality_tier: 'processed', is_vegetarian: false, is_vegan: false },
]

async function seedFoods() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    
    console.log('Seeding food database...')
    
    for (const food of foods) {
      await client.query(
        `INSERT INTO foods (
          name, category, serving_size, serving_unit, calories, protein, carbs, fats, fiber,
          quality_tier, is_vegetarian, is_vegan, is_gluten_free, is_dairy_free, is_nut_free
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT DO NOTHING`,
        [
          food.name,
          food.category,
          food.serving_size,
          food.serving_unit,
          food.calories,
          food.protein || 0,
          food.carbs || 0,
          food.fats || 0,
          food.fiber || 0,
          food.quality_tier || 'moderate_fat',
          food.is_vegetarian !== undefined ? food.is_vegetarian : true,
          food.is_vegan !== undefined ? food.is_vegan : false,
          food.is_gluten_free !== undefined ? food.is_gluten_free : false,
          food.is_dairy_free !== undefined ? food.is_dairy_free : false,
          food.is_nut_free !== undefined ? food.is_nut_free : true
        ]
      )
    }
    
    await client.query('COMMIT')
    console.log(`Successfully seeded ${foods.length} foods`)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error seeding foods:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFoods()
    .then(() => {
      console.log('Food seeding complete')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Food seeding failed:', error)
      process.exit(1)
    })
}

export { seedFoods, foods }

