export type CuisineId =
  | 'italy'
  | 'france'
  | 'china'
  | 'india'
  | 'usa'
  | 'turkiye'
  | 'japan'
  | 'mexico';

export type IngredientType = 'primary' | 'secondary' | 'optional';
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
  tips: number;
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
  { order: 1, tips: 2 },
  { order: 1, tips: 3 },
  { order: 2, tips: 2 },
  { order: 2, tips: 2 },
  { order: 3, tips: 1 },
  { order: 3, tips: 2 },
];

const repeat = (
  names: string[],
  total: number,
  type: IngredientType,
  emoji: string | Record<string, string>,
  tags: string[] = [],
): IngredientDefinition[] => {
  if (names.length === 0) {
    return [{ name: `${type[0].toUpperCase()}${type.slice(1)} Ingredient`, count: total, type, emoji: typeof emoji === 'string' ? emoji : '🍲', tags }];
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
    ability: 'Recipes cooked with exact pasta ingredients grant +1 serve value.',
    endCondition: 'Serve 4 meals with different exact pasta ingredients.',
    tracking: 'Exact pasta ingredient cards.',
    ingredients: [
      { name: 'Spaghetti', count: 1, type: 'primary', emoji: '🍝', tags: ['pasta', 'exact'] },
      { name: 'Fettuccine', count: 1, type: 'primary', emoji: '🍝', tags: ['pasta', 'exact'] },
      { name: 'Tagliatelle', count: 1, type: 'primary', emoji: '🍝', tags: ['pasta', 'exact'] },
      { name: 'Lasagna Sheets', count: 1, type: 'primary', emoji: '🍝', tags: ['pasta', 'exact'] },
      { name: 'Penne', count: 1, type: 'primary', emoji: '🍝', tags: ['pasta', 'exact'] },
      { name: 'Campanelle', count: 1, type: 'primary', emoji: '🍝', tags: ['pasta', 'exact'] },
      { name: 'Gnocchi', count: 1, type: 'primary', emoji: '🥔', tags: ['pasta', 'exact'] },
      { name: 'Ravioli', count: 1, type: 'primary', emoji: '🥟', tags: ['pasta', 'exact'] },
      ...repeat([], 5, 'secondary', '🍅'),
      { name: 'Basil', count: 1, type: 'optional', emoji: '🌿' },
      { name: 'Balsamic Vinegar', count: 1, type: 'optional', emoji: '🍶' },
      { name: 'Parmigiano', count: 1, type: 'optional', emoji: '🧀' },
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
      { name: 'Cappuccino', emoji: '☕', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Aperol Spritz', emoji: '🍹', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Limoncello', emoji: '🍋', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
    ],
    customers: customerPattern,
  },
  {
    id: 'france',
    name: 'Le Petit Paris',
    shortName: 'France',
    flag: '🥖',
    color: '#3567b7',
    ability: 'Each adjacent course pair served in the same meal grants +1 serve value.',
    endCondition: 'Serve a complete 4-course meal in order.',
    tracking: 'Recipe cards.',
    ingredients: [
      ...repeat([], 7, 'primary', '🥖'),
      ...repeat([], 5, 'secondary', '🧀'),
      { name: 'Herbs de Provence', count: 1, type: 'optional', emoji: '🌿' },
      { name: 'Butter', count: 1, type: 'optional', emoji: '🧈' },
      { name: 'Cream', count: 1, type: 'optional', emoji: '🥛' },
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
      { name: 'Champagne', emoji: '🍾', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Cognac', emoji: '🥃', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Pernod', emoji: '🍸', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
    ],
    customers: customerPattern,
  },
  {
    id: 'china',
    name: 'Jin Long',
    shortName: 'China',
    flag: '🍜',
    color: '#c03a2b',
    ability: 'A pair of recipes of the same type grants +1 serve value.',
    endCondition: 'Serve a noodles and a rice recipe in the same turn 4 times.',
    tracking: 'Normal and hard recipe cards.',
    ingredients: [
      ...repeat([], 7, 'primary', '🍚'),
      ...repeat([], 5, 'secondary', '🍜'),
      { name: 'Shiitake Mushrooms', count: 1, type: 'optional', emoji: '🍄' },
      { name: 'Soy Sauce', count: 1, type: 'optional', emoji: '🍶' },
      { name: 'Mung Bean Sprouts', count: 1, type: 'optional', emoji: '🌱' },
    ],
    recipes: [
      { name: 'Mapo Tofu', difficulty: 'easy', emoji: '🌶️🍥', tags: [] },
      { name: 'Congee', difficulty: 'easy', emoji: '🥣' },
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
      { name: 'Baijiu', emoji: '🍶', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Huangjiu', emoji: '🍶', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Green Tea', emoji: '🍵', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
    ],
    customers: customerPattern,
  },
  {
    id: 'india',
    name: 'Raj Mahal',
    shortName: 'India',
    flag: '🍛',
    color: '#d77825',
    ability: 'Each pair of Secondary Ingredients used in served dishes grants +1 serve value.',
    endCondition: 'Collect 2 pairs of secondary ingredients of the same type.',
    tracking: 'Secondary ingredient cards.',
    ingredients: [
      ...repeat([], 6, 'primary', '🍚'),
      { name: 'Cumin', count: 2, type: 'secondary', emoji: '🌰' },
      { name: 'Saffron', count: 2, type: 'secondary', emoji: '🍯' },
      { name: 'Coriander', count: 1, type: 'secondary', emoji: '🌿' },
      { name: 'Cinnamon', count: 1, type: 'secondary', emoji: '🌰' },
      { name: 'Cardamom', count: 1, type: 'secondary', emoji: '🌿' },
      { name: 'Ghee', count: 1, type: 'optional', emoji: '🧈' },
      { name: 'Coconut Milk', count: 1, type: 'optional', emoji: '🥥' },
      { name: 'Cashew', count: 1, type: 'optional', emoji: '🥜' },
    ],
    recipes: [
      { name: 'Jeera Rice', difficulty: 'easy', emoji: '🍚🌰' },
      { name: 'Spiced Lentil Soup', difficulty: 'easy', emoji: '🥣🫘' },
      { name: 'Tamarind Rice', difficulty: 'easy', emoji: '🍚🌰' },
      { name: 'Lemon Rice', difficulty: 'easy', emoji: '🍚🍋' },
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
      { name: 'Feni', emoji: '🥃', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Lassi', emoji: '🥛', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Masala Chai', emoji: '☕', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
    ],
    customers: customerPattern,
  },
  {
    id: 'usa',
    name: 'Liberty Grill',
    shortName: 'USA',
    flag: '🍔',
    color: '#274b8f',
    ability: '1 extra Primary or Secondary Ingredient can be added to a dish above its requirements.',
    endCondition: 'Serve 4 different recipes of the same type.',
    tracking: 'Recipe cards.',
    ingredients: [
      ...repeat([], 6, 'primary', '🍔'),
      ...repeat([], 6, 'secondary', '🥩'),
      { name: 'Ketchup', count: 1, type: 'optional', emoji: '🍅' },
      { name: 'Mustard', count: 1, type: 'optional', emoji: '🌭' },
      { name: 'Mayo', count: 1, type: 'optional', emoji: '🥚' },
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
      { name: 'Coke', emoji: '🥤', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Bourbon', emoji: '🥃', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Root Beer', emoji: '🍺', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
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
    endCondition: 'Serve 4 Turkish customers from the central queue.',
    tracking: 'Kebab recipe cards.',
    ingredients: [
      ...repeat([], 6, 'primary', '🥙'),
      ...repeat([], 6, 'secondary', '🍅'),
      { name: 'Sumac', count: 1, type: 'optional', emoji: '🍋' },
      { name: 'Paprika', count: 1, type: 'optional', emoji: '🌶️' },
      { name: 'Pomegranate Juice', count: 1, type: 'optional', emoji: '🍷' },
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
      { name: 'Raki', emoji: '🥛', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Salep', emoji: '☕', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Ayran', emoji: '🥛', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
    ],
    customers: customerPattern,
  },
  {
    id: 'japan',
    name: 'Sakura House',
    shortName: 'Japan',
    flag: '🍣',
    color: '#cc5f7a',
    ability: 'Each pair of different Secondary Ingredients used in a meal grants +1 serve value.',
    endCondition: 'Cook 2 recipes with wasabi and 2 recipes with ginger.',
    tracking: 'Wasabi and ginger ingredient cards.',
    ingredients: [
      ...repeat([], 6, 'primary', '🍣'),
      { name: 'Umami', count: 2, type: 'secondary', emoji: '🍄' },
      { name: 'Wasabi', count: 3, type: 'secondary', emoji: '🌿', tags: ['wasabi'] },
      { name: 'Ginger', count: 2, type: 'secondary', emoji: '🫚', tags: ['ginger'] },
      { name: 'Nori', count: 1, type: 'optional', emoji: '🍙' },
      { name: 'Sesame Oil', count: 1, type: 'optional', emoji: '🍶' },
      { name: 'Yuzu', count: 1, type: 'optional', emoji: '🍋' },
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
      { name: 'Sake', emoji: '🍶', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Matcha Tea', emoji: '🍵', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Umeshu', emoji: '🍑', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
    ],
    customers: customerPattern,
  },
  {
    id: 'mexico',
    name: 'El Nopalito',
    shortName: 'Mexico',
    flag: '🌮',
    color: '#157f7a',
    ability: 'Hot secondary ingredients gain +1 serve value and up to 2 can be added to dishes in a meal.',
    endCondition: 'Cook 4 recipes with 2 hot ingredients.',
    tracking: 'Hot secondary ingredient cards.',
    ingredients: [
      ...repeat([], 5, 'primary', '🌮'),
      { name: 'Cayenne Pepper', count: 3, type: 'secondary', emoji: '🌶️', tags: ['hot'] },
      { name: 'Jalapeno', count: 3, type: 'secondary', emoji: '🌶️', tags: ['hot'] },
      { name: 'Avocado', count: 2, type: 'secondary', emoji: '🥑' },
      { name: 'Lime', count: 1, type: 'optional', emoji: '🍋' },
      { name: 'Cilantro', count: 1, type: 'optional', emoji: '🌿' },
      { name: 'Sour Cream', count: 1, type: 'optional', emoji: '🥛' },
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
      { name: 'Mezcal', emoji: '🥃', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Tequila', emoji: '🍸', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
      { name: 'Tepache', emoji: '🍍', requirement: 'Tie-breaker: +1 serve value when tied after reveal.' },
    ],
    customers: customerPattern,
  },
];
