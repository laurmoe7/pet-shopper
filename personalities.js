/* Personalities: how your pet behaves, earned by how you feed it.
 * `likes` are the food categories it gets excited about (in daydreams and when
 * eating). `earn` says what to feed it, and how many, to unlock it; the first
 * one is there from the start. `suggests` are things it asks for, and `lines`
 * what it says when it eats a favourite. You can swap between unlocked ones.
 * Add a new personality here and it shows up in the pet sheet.
 */
(function (root) {
  'use strict';

  root.Personalities = [
    {
      id: 'foodie', label: 'Foodie', icon: '🍙',
      text: 'Loves a bit of everything',
      likes: ['fruit', 'veg', 'baked', 'dairy', 'protein', 'pantry', 'sweets', 'drink', 'spicy'],
      earn: null,
      suggests: ['Bananas', 'Bread', 'Cheese', 'Rice', 'Curry', 'Strawberries'],
      lines: ['everything is yummy!', 'nom nom nom!', 'more please!']
    },
    {
      id: 'sweet', label: 'Sweet tooth', icon: '🍰',
      text: 'Feed it 10 sweets or baked treats',
      likes: ['sweets', 'baked'],
      earn: { cats: ['sweets', 'baked'], count: 10 },
      suggests: ['Cookies', 'Ice cream', 'Pudding', 'Donuts', 'Mochi', 'Chocolate'],
      lines: ['sugar rush!', 'sweeet!', 'dessert first!']
    },
    {
      id: 'green', label: 'Veggie lover', icon: '🥦',
      text: 'Feed it 15 fruit or vegetables',
      likes: ['fruit', 'veg'],
      earn: { cats: ['fruit', 'veg'], count: 15 },
      suggests: ['Strawberries', 'Broccoli', 'Avocado', 'Carrots', 'Melon', 'Tomatoes'],
      lines: ['so fresh!', 'crunchy and green!', 'vitamins!']
    },
    {
      id: 'chef', label: 'Little chef', icon: '🍳',
      text: 'Feed it 15 proteins, dairy or pantry foods',
      likes: ['protein', 'dairy', 'pantry'],
      earn: { cats: ['protein', 'dairy', 'pantry'], count: 15 },
      suggests: ['Eggs', 'Salmon', 'Pasta', 'Ramen', 'Cheese', 'Curry'],
      lines: ['chef\'s kiss!', 'what shall we cook?', 'so hearty!']
    },
    {
      id: 'sipper', label: 'Cosy sipper', icon: '🍵',
      text: 'Feed it 10 drinks',
      likes: ['drink'],
      earn: { cats: ['drink'], count: 10 },
      suggests: ['Tea', 'Bubble tea', 'Orange juice', 'Coffee', 'Smoothie'],
      lines: ['ahh, cosy!', 'sip sip!', 'so warm!']
    }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
