export type CuisineId =
  | 'italy'
  | 'france'
  | 'china'
  | 'india'
  | 'usa'
  | 'turkiye'
  | 'japan'
  | 'mexico';

export type IngredientType = 'ingredient' | 'flavor';
export type RecipeDifficulty = 'easy' | 'normal' | 'hard';

export interface IngredientDefinition {
  name: string;
  count: number;
  type: IngredientType;
  emoji: string;
  tags?: string[];
}

export interface RecipeDefinition {
  name: string;
  difficulty: RecipeDifficulty;
  emoji: string;
  tags?: string[];
  exactIngredient?: string;
}

export interface DrinkDefinition {
  name: string;
  emoji: string;
  requirement: string;
}

export interface CustomerDefinition {
  order: number;
}

export interface DeckDefinition {
  id: CuisineId;
  name: string;
  shortName: string;
  flag: string;
  color: string;
  ability: string;
  endCondition: string;
  tracking: string;
  ingredients: IngredientDefinition[];
  recipes: RecipeDefinition[];
  drinks: DrinkDefinition[];
  customers: CustomerDefinition[];
}

const customerPattern: CustomerDefinition[] = [
  { order: 1 },
  { order: 1 },
  { order: 2 },
  { order: 2 },
  { order: 3 },
  { order: 3 },
];

const repeat = (
  names: string[],
  total: number,
  type: IngredientType,
  emoji: string | Record<string, string>,
  tags: string[] = [],
): IngredientDefinition[] => {
  if (names.length === 0) {
    return [{
      name: type === 'flavor' ? 'Flavor Card' : 'Ingredient Card',
      count: total,
      type,
      emoji: typeof emoji === 'string' ? emoji : '🍲',
      tags,
    }];
  }

  const base = Math.floor(total / names.length);
  const remainder = total % names.length;
  return names.map((name, index) => ({
    name,
    count: base + (index < remainder ? 1 : 0),
    type,
    emoji: typeof emoji === 'string' ? emoji : emoji[name] ?? '🍲',
    tags,
  }));
};

export const DECKS: DeckDefinition[] = [
  {
    id: 'italy',
    name: 'Piazza Romana',
    shortName: 'Italy',
    flag: '🍝',
    color: '#1f7a4d',
    ability: 'Dishes served with their exact pasta Ingredient Card gain +1 serve value.',
    endCondition: 'Resolve 10 Customer Cards.',
    tracking: 'Exact pasta Ingredient Cards.',
    ingredients: [
      { name: 'Spaghetti', count: 2, type: 'ingredient', emoji: '🍝', tags: ['pasta', 'exact'] },
      { name: 'Fettuccine', count: 2, type: 'ingredient', emoji: '🍝', tags: ['pasta', 'exact'] },
      { name: 'Tagliatelle', count: 2, type: 'ingredient', emoji: '🍝', tags: ['pasta', 'exact'] },
      { name: 'Lasagna Sheets', count: 2, type: 'ingredient', emoji: '🍝', tags: ['pasta', 'exact'] },
      { name: 'Penne', count: 2, type: 'ingredient', emoji: '🍝', tags: ['pasta', 'exact'] },
      { name: 'Campanelle', count: 1, type: 'ingredient', emoji: '🍝', tags: ['pasta'] },
      { name: 'Gnocchi', count: 1, type: 'ingredient', emoji: '🥔', tags: ['pasta'] },
      { name: 'Ravioli', count: 1, type: 'ingredient', emoji: '🥟', tags: ['pasta'] },
      { name: 'Basil', count: 1, type: 'flavor', emoji: '🌿' },
      { name: 'Balsamic Vinegar', count: 1, type: 'flavor', emoji: '🍶' },
      { name: 'Parmigiano', count: 1, type: 'flavor', emoji: '🧀' },
    ],
    recipes: [
      { name: 'Farfalle al Salmone', difficulty: 'easy', emoji: '🍝🐟' },
      { name: 'Fusilli Caprese', difficulty: 'easy', emoji: '🍝🍅' },
      { name: 'Rigatoni alla Gricia', difficulty: 'easy', emoji: '🍝🥓' },
      { name: 'Cannelloni Ricotta e Spinaci', difficulty: 'easy', emoji: '🍝🧀' },
      { name: 'Spaghetti Carbonara', difficulty: 'normal', emoji: '🍝🥚', exactIngredient: 'Spaghetti' },
      { name: 'Fettuccine Alfredo', difficulty: 'normal', emoji: '🍝🧈', exactIngredient: 'Fettuccine' },
      { name: 'Lasagna Verde', difficulty: 'normal', emoji: '🍝🥬', exactIngredient: 'Lasagna Sheets' },
      { name: 'Tagliatelle alla Bolognese', difficulty: 'normal', emoji: '🍝🥩', exactIngredient: 'Tagliatelle' },
      { name: 'Cacio e Pepe', difficulty: 'normal', emoji: '🍝🧀', exactIngredient: 'Spaghetti' },
      { name: "Penne all'Arrabbiata", difficulty: 'normal', emoji: '🍝🌶️', exactIngredient: 'Penne' },
      { name: 'Penne al Pesto', difficulty: 'normal', emoji: '🍝🌿', exactIngredient: 'Penne' },
      { name: 'Lasagna al Forno', difficulty: 'hard', emoji: '🍝🧀', exactIngredient: 'Lasagna Sheets' },
      { name: 'Fettuccine ai Porcini e Tartufo', difficulty: 'hard', emoji: '🍝🍄', exactIngredient: 'Fettuccine' },
      { name: 'Tagliatelle ai Funghi Porcini', difficulty: 'hard', emoji: '🍝🍄', exactIngredient: 'Tagliatelle' },
    ],
    drinks: [
      { name: 'Cappuccino', emoji: '☕', requirement: 'At least 1 recipe with its exact matching pasta Ingredient Card.' },
      { name: 'Aperol Spritz', emoji: '🍹', requirement: 'At least 2 dishes with exactly 1 Ingredient Card each.' },
      { name: 'Limoncello', emoji: '🍋', requirement: 'At least 2 different pasta Ingredient Card types.' },
    ],
    customers: customerPattern,
  },
  {
    id: 'france',
    name: 'Le Petit Paris',
    shortName: 'France',
    flag: '🥖',
    color: '#3567b7',
    ability: 'Each adjacent course pair grants +1 serve value, to a maximum of +2 per meal.',
    endCondition: 'Resolve 10 Customer Cards.',
    tracking: 'Recipe Cards from a course not already promoted.',
    ingredients: [
      ...repeat([], 12, 'ingredient', '🥖'),
      { name: 'Herbs de Provence', count: 1, type: 'flavor', emoji: '🌿' },
      { name: 'Butter', count: 1, type: 'flavor', emoji: '🧈' },
      { name: 'Cream', count: 1, type: 'flavor', emoji: '🥛' },
    ],
    recipes: [
      { name: "Soupe a l'Oignon", difficulty: 'easy', emoji: '🥣🧅', tags: ['entree'] },
      { name: 'Bouillabaisse', difficulty: 'easy', emoji: '🍲🐟', tags: ['entree'] },
      { name: 'Garbure', difficulty: 'easy', emoji: '🥣🥔', tags: ['entree'] },
      { name: 'Tourin', difficulty: 'easy', emoji: '🥣🧄', tags: ['entree'] },
      { name: 'Quiche Lorraine', difficulty: 'normal', emoji: '🥧🥓', tags: ['appetizer'] },
      { name: 'Escargots de Bourguignon', difficulty: 'normal', emoji: '🧄🧈', tags: ['appetizer'] },
      { name: 'Salade Nicoise', difficulty: 'normal', emoji: '🥗', tags: ['appetizer'] },
      { name: 'Souffle au Fromage', difficulty: 'normal', emoji: '🧀🥚', tags: ['appetizer'] },
      { name: 'Ratatouille', difficulty: 'normal', emoji: '🍆', tags: ['main'] },
      { name: 'Boeuf Bourguignon', difficulty: 'normal', emoji: '🥩🍷', tags: ['main'] },
      { name: 'Chateaubriand', difficulty: 'normal', emoji: '🥩', tags: ['main'] },
      { name: 'Croque Monsieur', difficulty: 'normal', emoji: '🥪', tags: ['main'] },
      { name: 'Pain Perdu', difficulty: 'hard', emoji: '🍞🍯', tags: ['dessert'] },
      { name: 'Creme Brulee', difficulty: 'hard', emoji: '🍮', tags: ['dessert'] },
      { name: 'Tarte Tatin', difficulty: 'hard', emoji: '🥧', tags: ['dessert'] },
    ],
    drinks: [
      { name: 'Champagne', emoji: '🍾', requirement: 'An entrée + appetizer, appetizer + main, or main + dessert pair.' },
      { name: 'Cognac', emoji: '🥃', requirement: 'At least 1 dish with 2 Ingredient Cards added.' },
      { name: 'Pernod', emoji: '🍸', requirement: 'Every served Recipe Card has a different course tag.' },
    ],
    customers: customerPattern,
  },
  {
    id: 'china',
    name: 'Jin Long',
    shortName: 'China',
    flag: '🍜',
    color: '#c03a2b',
    ability: 'Each pair of served recipes grants +1 serve value.',
    endCondition: 'Resolve 10 Customer Cards.',
    tracking: 'A Recipe Card from a same-type rice or noodles pair.',
    ingredients: [
      ...repeat([], 12, 'ingredient', '🍚'),
      { name: 'Shiitake Mushrooms', count: 1, type: 'flavor', emoji: '🍄' },
      { name: 'Soy Sauce', count: 1, type: 'flavor', emoji: '🍶' },
      { name: 'Mung Bean Sprouts', count: 1, type: 'flavor', emoji: '🌱' },
    ],
    recipes: [
      { name: 'Mapo Tofu', difficulty: 'easy', emoji: '🌶️🍥', tags: [] },
      { name: 'Congee', difficulty: 'easy', emoji: '🥣', tags: ['rice'] },
      { name: 'Sticky Rice with Mango', difficulty: 'easy', emoji: '🥭', tags: ['rice'] },
      { name: 'Dry-Fried Green Beans', difficulty: 'easy', emoji: '🫘🌶️' },
      { name: 'Kung Pao Chicken', difficulty: 'easy', emoji: '🍗🌶️' },
      { name: 'Zha Jiang Mian', difficulty: 'easy', emoji: '🍜', tags: ['noodles'] },
      { name: 'Soup Noodles with Chicken', difficulty: 'normal', emoji: '🍜', tags: ['noodles'] },
      { name: 'Hainanese Chicken Rice', difficulty: 'normal', emoji: '🍚🍗', tags: ['rice'] },
      { name: 'Claypot Rice', difficulty: 'normal', emoji: '🍚🍲', tags: ['rice'] },
      { name: 'Yangzhou Fried Rice', difficulty: 'normal', emoji: '🍚🥚', tags: ['rice'] },
      { name: 'Cantonese Beef Chow Fun', difficulty: 'normal', emoji: '🍜🥩', tags: ['noodles'] },
      { name: 'Sichuan Dan Dan Noodles', difficulty: 'normal', emoji: '🍜🌶️', tags: ['noodles'] },
      { name: 'Lo Mein', difficulty: 'hard', emoji: '🍜', tags: ['noodles'] },
      { name: 'Peking Duck Fried Rice', difficulty: 'hard', emoji: '🍚🍖', tags: ['rice'] },
      { name: 'Dragon Beard Noodles', difficulty: 'hard', emoji: '🍜', tags: ['noodles'] },
    ],
    drinks: [
      { name: 'Baijiu', emoji: '🍶', requirement: 'At least 1 rice Recipe Card and 1 noodle Recipe Card.' },
      { name: 'Huangjiu', emoji: '🍶', requirement: 'At least 2 rice Recipe Cards or 2 noodle Recipe Cards.' },
      { name: 'Green Tea', emoji: '🍵', requirement: 'At least 1 dish with no Ingredient Cards added.' },
    ],
    customers: customerPattern,
  },
  {
    id: 'india',
    name: 'Raj Mahal',
    shortName: 'India',
    flag: '🍛',
    color: '#d77825',
    ability: 'Each distinct pair of different Ingredient Cards gains +1 serve value.',
    endCondition: 'Resolve 10 Customer Cards.',
    tracking: 'Spice Ingredient Cards.',
    ingredients: [
      { name: 'Cumin', count: 2, type: 'ingredient', emoji: '🌰', tags: ['spice'] },
      { name: 'Saffron', count: 2, type: 'ingredient', emoji: '🍯', tags: ['spice'] },
      { name: 'Coriander', count: 2, type: 'ingredient', emoji: '🌿', tags: ['spice'] },
      { name: 'Cinnamon', count: 2, type: 'ingredient', emoji: '🌰', tags: ['spice'] },
      { name: 'Cardamom', count: 2, type: 'ingredient', emoji: '🌿', tags: ['spice'] },
      { name: 'Turmeric', count: 2, type: 'ingredient', emoji: '🌿', tags: ['spice'] },
      { name: 'Ghee', count: 1, type: 'flavor', emoji: '🧈' },
      { name: 'Coconut Milk', count: 1, type: 'flavor', emoji: '🥥' },
      { name: 'Cashew', count: 1, type: 'flavor', emoji: '🥜' },
    ],
    recipes: [
      { name: 'Jeera Rice', difficulty: 'easy', emoji: '🍚🌰' },
      { name: 'Spiced Lentil Soup', difficulty: 'easy', emoji: '🥣🫘' },
      { name: 'Tamarind Rice', difficulty: 'easy', emoji: '🍚🌰' },
      { name: 'Lemon Rice', difficulty: 'easy', emoji: '🍚🍋' },
      { name: 'Chicken Curry', difficulty: 'easy', emoji: '🍗🍛' },
      { name: 'Biryani', difficulty: 'normal', emoji: '🍛🍯' },
      { name: 'Dal Tadka', difficulty: 'normal', emoji: '🥘🫘' },
      { name: 'Masoor Dal', difficulty: 'normal', emoji: '🥣🫘' },
      { name: 'Chana Masala', difficulty: 'normal', emoji: '🍛🧆' },
      { name: 'Aloo Gobi', difficulty: 'normal', emoji: '🥔🥦' },
      { name: 'Paneer Butter Masala', difficulty: 'normal', emoji: '🧀🧈' },
      { name: 'Vegetable Korma', difficulty: 'normal', emoji: '🥘🥕' },
      { name: 'Coconut Curry', difficulty: 'hard', emoji: '🥥🍛' },
      { name: 'Rogan Josh', difficulty: 'hard', emoji: '🍖🌶️' },
      { name: 'Malai Kofta', difficulty: 'hard', emoji: '🧆🍛' },
    ],
    drinks: [
      { name: 'Feni', emoji: '🥃', requirement: 'At least 2 Ingredient Cards added across the meal.' },
      { name: 'Lassi', emoji: '🥛', requirement: 'At least 1 dish with a Flavor Card added.' },
      { name: 'Masala Chai', emoji: '☕', requirement: 'At least 2 different spice Ingredient Card types.' },
    ],
    customers: customerPattern,
  },
  {
    id: 'usa',
    name: 'Liberty Grill',
    shortName: 'USA',
    flag: '🍔',
    color: '#274b8f',
    ability: 'Up to 2 Ingredient Cards can be added across a meal above printed ingredient limits.',
    endCondition: 'Resolve 10 Customer Cards.',
    tracking: 'Burger or steak Recipe Cards.',
    ingredients: [
      ...repeat([], 12, 'ingredient', '🍔'),
      { name: 'Ketchup', count: 1, type: 'flavor', emoji: '🍅' },
      { name: 'Mustard', count: 1, type: 'flavor', emoji: '🌭' },
      { name: 'Mayo', count: 1, type: 'flavor', emoji: '🥚' },
    ],
    recipes: [
      { name: 'Lobster Roll', difficulty: 'easy', emoji: '🦞🌭' },
      { name: 'Cornbread', difficulty: 'easy', emoji: '🌽🍞' },
      { name: 'Clam Chowder', difficulty: 'easy', emoji: '🥣🦪' },
      { name: 'Johnny Cakes', difficulty: 'easy', emoji: '🥞' },
      { name: 'Juicy Lucy', difficulty: 'normal', emoji: '🍔🧀', tags: ['burger'] },
      { name: 'Classic Cheeseburger', difficulty: 'normal', emoji: '🍔🧀', tags: ['burger'] },
      { name: 'Bacon Cheeseburger', difficulty: 'normal', emoji: '🍔🥓', tags: ['burger'] },
      { name: 'Green Chile Cheeseburger', difficulty: 'normal', emoji: '🍔🌶️', tags: ['burger'] },
      { name: 'Philly Cheesesteak', difficulty: 'normal', emoji: '🥩🧀', tags: ['steak'] },
      { name: 'Tomahawk Steak', difficulty: 'normal', emoji: '🥩🌽', tags: ['steak'] },
      { name: 'Porterhouse Steak', difficulty: 'normal', emoji: '🥩🥔', tags: ['steak'] },
      { name: 'Ribeye Steak', difficulty: 'normal', emoji: '🥩🧈', tags: ['steak'] },
      { name: 'Deep-fried Burger', difficulty: 'hard', emoji: '🍔🍟', tags: ['burger'] },
      { name: 'T-bone Steak', difficulty: 'hard', emoji: '🥩🥔', tags: ['steak'] },
      { name: 'Apple Pie', difficulty: 'hard', emoji: '🥧🍎' },
    ],
    drinks: [
      { name: 'Coke', emoji: '🥤', requirement: 'At least 2 burger Recipe Cards.' },
      { name: 'Bourbon', emoji: '🥃', requirement: 'At least 2 steak Recipe Cards.' },
      {
        name: 'Root Beer',
        emoji: '🍺',
        requirement: "At least 1 dish has more Ingredient Cards than its Recipe Card's printed slots.",
      },
    ],
    customers: customerPattern,
  },
  {
    id: 'turkiye',
    name: 'Sultan Saray',
    shortName: 'Turkiye',
    flag: '🥙',
    color: '#9f2530',
    ability: 'Kebab dishes gain +1 serve value for each non-kebab dish also served with them.',
    endCondition: 'Resolve 10 Customer Cards.',
    tracking: 'Kebab recipe cards.',
    ingredients: [
      ...repeat([], 12, 'ingredient', '🥙'),
      { name: 'Sumac', count: 1, type: 'flavor', emoji: '🍋' },
      { name: 'Paprika', count: 1, type: 'flavor', emoji: '🌶️' },
      { name: 'Pomegranate Juice', count: 1, type: 'flavor', emoji: '🍷' },
    ],
    recipes: [
      { name: 'Shish Kebab', difficulty: 'easy', emoji: '🍢', tags: ['kebab'] },
      { name: 'Adana Kebab', difficulty: 'easy', emoji: '🍢🌶️', tags: ['kebab'] },
      { name: 'Iskender Kebab', difficulty: 'easy', emoji: '🍢🥛', tags: ['kebab'] },
      { name: 'Ciger Kebab', difficulty: 'easy', emoji: '🍢🍖', tags: ['kebab'] },
      { name: 'Doner Kebab', difficulty: 'easy', emoji: '🥙', tags: ['kebab'] },
      { name: 'Beyti Kebab', difficulty: 'easy', emoji: '🍢', tags: ['kebab'] },
      { name: 'Patlican Dolmasi', difficulty: 'normal', emoji: '🍆🍚' },
      { name: 'Lahmacun', difficulty: 'normal', emoji: '🫓🍖' },
      { name: 'Pide', difficulty: 'normal', emoji: '🫓🧀' },
      { name: 'Koftesi', difficulty: 'normal', emoji: '🧆' },
      { name: 'Muhammara', difficulty: 'normal', emoji: '🌶️🥜' },
      { name: 'Imam Bayildi', difficulty: 'normal', emoji: '🍆🍅' },
      { name: 'Baklava', difficulty: 'hard', emoji: '🍯' },
      { name: 'Turkish Delight', difficulty: 'hard', emoji: '🍬' },
      { name: 'Kadayif', difficulty: 'hard', emoji: '🍰' },
    ],
    drinks: [
      { name: 'Raki', emoji: '🥛', requirement: 'At least 1 kebab Recipe Card and 1 non-kebab Recipe Card.' },
      { name: 'Salep', emoji: '☕', requirement: 'Every served Recipe Card is a kebab.' },
      { name: 'Ayran', emoji: '🥛', requirement: 'At least 2 non-kebab Recipe Cards.' },
    ],
    customers: customerPattern,
  },
  {
    id: 'japan',
    name: 'Sakura House',
    shortName: 'Japan',
    flag: '🍣',
    color: '#cc5f7a',
    ability: 'Gain +1 serve value if exactly 1 seasoning Ingredient Card is used in the meal.',
    endCondition: 'Resolve 10 Customer Cards.',
    tracking: 'Seasoning Ingredient Cards not already promoted.',
    ingredients: [
      ...repeat([], 5, 'ingredient', '🍣'),
      { name: 'Umami', count: 2, type: 'ingredient', emoji: '🍄', tags: ['seasoning'] },
      { name: 'Wasabi', count: 2, type: 'ingredient', emoji: '🌿', tags: ['seasoning', 'wasabi'] },
      { name: 'Ginger', count: 2, type: 'ingredient', emoji: '🫚', tags: ['seasoning', 'ginger'] },
      { name: 'Garlic', count: 2, type: 'ingredient', emoji: '🧄', tags: ['seasoning', 'garlic'] },
      { name: 'Nori', count: 1, type: 'flavor', emoji: '🍙' },
      { name: 'Sesame Oil', count: 1, type: 'flavor', emoji: '🍶' },
      { name: 'Yuzu', count: 1, type: 'flavor', emoji: '🍋' },
    ],
    recipes: [
      { name: 'Shoyu Ramen', difficulty: 'easy', emoji: '🍜🍶' },
      { name: 'Onigiri', difficulty: 'easy', emoji: '🍙' },
      { name: 'Edamame Salad', difficulty: 'easy', emoji: '🥗🫘' },
      { name: 'Tamago Sushi', difficulty: 'easy', emoji: '🍣🥚' },
      { name: 'Miso Ramen', difficulty: 'normal', emoji: '🍜🥣' },
      { name: 'Tonkotsu Ramen', difficulty: 'normal', emoji: '🍜🍖' },
      { name: 'California Roll', difficulty: 'normal', emoji: '🍣🥑' },
      { name: 'Spicy Tuna Roll', difficulty: 'normal', emoji: '🍣🌶️' },
      { name: 'Udon Noodles with Tempura', difficulty: 'normal', emoji: '🍜🍤' },
      { name: 'Okonomiyaki', difficulty: 'normal', emoji: '🥞' },
      { name: 'Takoyaki', difficulty: 'normal', emoji: '🐙🍘' },
      { name: 'Unagi Sushi Platter', difficulty: 'hard', emoji: '🍣🐟' },
      { name: 'Omurice', difficulty: 'hard', emoji: '🍳🍚' },
      { name: 'Gyoza', difficulty: 'hard', emoji: '🥟' },
    ],
    drinks: [
      { name: 'Sake', emoji: '🍶', requirement: 'A Wasabi Ingredient Card was added.' },
      { name: 'Matcha Tea', emoji: '🍵', requirement: 'At least 2 differently named Ingredient Cards were added.' },
      { name: 'Umeshu', emoji: '🍑', requirement: 'At least 1 dish with 2 Ingredient Cards added.' },
    ],
    customers: customerPattern,
  },
  {
    id: 'mexico',
    name: 'El Nopalito',
    shortName: 'Mexico',
    flag: '🌮',
    color: '#157f7a',
    ability: 'Up to 2 hot Ingredients per meal; hot Ingredients on zero-slot recipes gain +1.',
    endCondition: 'Resolve 10 Customer Cards.',
    tracking: 'Hot Ingredient Cards.',
    ingredients: [
      { name: 'Cayenne Pepper', count: 1, type: 'ingredient', emoji: '🌶️', tags: ['hot'] },
      { name: 'Chipotle', count: 1, type: 'ingredient', emoji: '🌶️', tags: ['hot'] },
      { name: 'Habanero', count: 1, type: 'ingredient', emoji: '🌶️', tags: ['hot'] },
      { name: 'Serrano', count: 1, type: 'ingredient', emoji: '🌶️', tags: ['hot'] },
      { name: 'Jalapeno', count: 1, type: 'ingredient', emoji: '🌶️', tags: ['hot'] },
      { name: 'Poblano', count: 1, type: 'ingredient', emoji: '🌶️', tags: ['hot'] },
      { name: 'Avocado', count: 4, type: 'ingredient', emoji: '🥑' },
      { name: 'Corn', count: 3, type: 'ingredient', emoji: '🌽' },
      { name: 'Lime', count: 1, type: 'flavor', emoji: '🍋' },
      { name: 'Cilantro', count: 1, type: 'flavor', emoji: '🌿' },
      { name: 'Sour Cream', count: 1, type: 'flavor', emoji: '🥛' },
    ],
    recipes: [
      { name: 'Quesadilla', difficulty: 'easy', emoji: '🫓🧀' },
      { name: 'Taco de Frijoles', difficulty: 'easy', emoji: '🌮🫘' },
      { name: 'Chilaquiles Verdes', difficulty: 'easy', emoji: '🥘🌿' },
      { name: 'Carne Asada Tacos', difficulty: 'easy', emoji: '🌮🥩' },
      { name: 'Enchiladas Rojas', difficulty: 'easy', emoji: '🫔🌶️' },
      { name: 'Mole Poblano with Rice', difficulty: 'normal', emoji: '🍛🌶️' },
      { name: 'Burrito de Frijoles', difficulty: 'normal', emoji: '🌯🫘' },
      { name: 'Chicken Fajitas', difficulty: 'normal', emoji: '🌮🍗' },
      { name: 'Tostadas de Pollo', difficulty: 'normal', emoji: '🫓🍗' },
      { name: 'Pico de Gallo Nachos', difficulty: 'normal', emoji: '🧀🍅' },
      { name: 'Taco al Pastor', difficulty: 'normal', emoji: '🌮🍍' },
      { name: 'Pozole Rojo', difficulty: 'hard', emoji: '🥣🌶️' },
      { name: 'Chiles Rellenos', difficulty: 'hard', emoji: '🌶️🧀' },
      { name: 'Tamales', difficulty: 'hard', emoji: '🫔🌽' },
    ],
    drinks: [
      { name: 'Mezcal', emoji: '🥃', requirement: 'At least 1 hot Ingredient Card was added.' },
      { name: 'Tequila', emoji: '🍸', requirement: 'At least 2 hot Ingredient Cards were added.' },
      { name: 'Tepache', emoji: '🍍', requirement: 'At least 1 dish with exactly 1 Ingredient Card and a Flavor Card added.' },
    ],
    customers: customerPattern,
  },
];
