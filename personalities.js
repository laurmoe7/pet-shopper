/* Personalities: how your pet behaves, earned by how you feed it.
 * `likes` are the food categories it gets excited about (in daydreams and when
 * eating). `earn` says what to feed it, and how many, to unlock it; the first
 * one is there from the start. `suggests` are things it asks for, and `lines`
 * what it says when it eats a favourite. You can swap between unlocked ones.
 * `blurb` is the short description shown when picking one.
 * `voice` is how it talks: its own lines for each moment (`{x}` is an item,
 * `{name}` the pet's name) and a `style` that gives every other line its tone:
 *   endings  added to the end of a line now and then
 *   prefixes added to the start of a line now and then
 *   lower    all lower case
 *   bang     what '!' turns into (sleepy pets don't shout)
 * A line with a line break is said in two bubbles, one after the other.
 * Add a new personality here and it shows up in the pet sheet.
 */
(function (root) {
  'use strict';

  root.Personalities = [
    {
      id: 'foodie', label: 'Hyper Foodie', icon: '🍙',
      blurb: 'Bouncy and loud. Loves every food!',
      text: 'Loves a bit of everything',
      likes: ['fruit', 'veg', 'baked', 'dairy', 'protein', 'pantry', 'sweets', 'drink', 'spicy'],
      earn: null,
      suggests: ['Bananas', 'Bread', 'Cheese', 'Rice', 'Curry', 'Strawberries'],
      lines: ['everything is yummy!', 'nom nom nom!', 'more please!'],
      voice: {
        tone: 'excited',
        style: { endings: ['!!', '!!!'], prefixes: ['ooh ', 'wow, '], lower: false, bang: '!' },
        hi: ['hi hi hi!', 'you\'re back!!', 'snack time?!'],
        tap: ['hehe!', 'hungry!!', 'let\'s shop!', 'yay, pats!'],
        sleepy: ['zzz… food…?', 'dreaming of snacks…'],
        suggest: ['ooh ooh, {x}?!', 'can we get {x}? pleeease!', '{x}! {x}!'],
        decline: ['aww, okay!', 'next time then!'],
        dream: ['{x}!! can\'t wait!', 'mmm, {x}!!'],
        idle: ['what\'s next?!', 'shopping time?!', 'I\'m soooo ready!'],
        look: ['so cool!!', 'look at me!!', 'ta-daaa!'],
        room: ['new stuff!!', 'I LOVE it!'],
        full: ['best trip EVER!!', 'so full! thank you!!'],
        quick: ['wait, already?!', 'that was super quick!'],
        spit: ['oops! ptoo!', 'not yet? okay!'],
        name: ['I\'m {name}!!', '{name}, that\'s me!']
      }
    },
    {
      id: 'sweet', label: 'Sweetie Pie', icon: '🍰',
      blurb: 'Gushy and kind. Dessert first ♡',
      text: 'Feed it 10 sweets or baked treats',
      likes: ['sweets', 'baked'],
      earn: { cats: ['sweets', 'baked'], count: 10 },
      suggests: ['Cookies', 'Ice cream', 'Pudding', 'Donuts', 'Mochi', 'Chocolate'],
      lines: ['sugar rush ♡', 'sweeet~', 'dessert first, hehe'],
      voice: {
        tone: 'sweet',
        style: { endings: [' ♡', '~ ♡', '~'], prefixes: ['aww, '], lower: false, bang: '!' },
        hi: ['hi, sweetie ♡', 'missed you~'],
        tap: ['hehe, that tickles ♡', 'hug?', 'you\'re the best~'],
        sleepy: ['sweet dreams~', 'zzz… cake…'],
        suggest: ['maybe some {x}? ♡', 'could we get {x}, pretty please?', '{x} would be so lovely~'],
        decline: ['that\'s okay ♡', 'aww, alright~'],
        dream: ['{x}… so dreamy ♡', 'thinking of {x}~'],
        idle: ['la la la ♡', 'what shall we get, sweetie?', 'you\'re doing great~'],
        look: ['do I look cute? ♡', 'so pretty~', 'I feel like a cupcake!'],
        room: ['so cosy ♡', 'our little home~'],
        full: ['thank you, sweetie ♡', 'my tummy is so happy~'],
        quick: ['hmm, so quick, sweetie?', 'was that really bought? ♡'],
        spit: ['oopsie ♡', 'sorry, sorry~'],
        name: ['I\'m {name} ♡', 'call me {name}~']
      }
    },
    {
      id: 'green', label: 'Zen Sprout', icon: '🥦',
      blurb: 'Calm and wholesome. Fresh fruit and veg.',
      text: 'Feed it 15 fruit or vegetables',
      likes: ['fruit', 'veg'],
      earn: { cats: ['fruit', 'veg'], count: 15 },
      suggests: ['Strawberries', 'Broccoli', 'Avocado', 'Carrots', 'Melon', 'Tomatoes'],
      lines: ['so fresh.', 'crunchy and green~', 'good for us both.'],
      voice: {
        tone: 'calm',
        style: { endings: ['~', '.'], prefixes: ['mm, '], lower: false, bang: '.' },
        hi: ['hello, friend.', 'nice to see you~'],
        tap: ['hm? hello.', 'a gentle pat, thank you.', 'feeling good~'],
        sleepy: ['resting… zzz', 'a little nap~'],
        suggest: ['some {x}, perhaps?', 'how about {x}? fresh and nice.', '{x} would be good for us.'],
        decline: ['no worries.', 'another day, then~'],
        dream: ['{x}… lovely.', 'fresh {x}~'],
        idle: ['deep breaths~', 'what\'s next on the list?', 'one thing at a time.'],
        look: ['very nice.', 'I like this one~', 'feels right.'],
        room: ['peaceful here.', 'a calm little corner~'],
        full: ['a good, wholesome trip.', 'thank you. I feel great~'],
        quick: ['hm, that was fast.', 'from the shop already?'],
        spit: ['ah, not yet.', 'I\'ll wait~'],
        name: ['I\'m {name}.', '{name}, nice to meet you~']
      }
    },
    {
      id: 'chef', label: 'Sassy Chef', icon: '🍳',
      blurb: 'Bossy and cheeky. Serious about cooking.',
      text: 'Feed it 15 proteins, dairy or pantry foods',
      likes: ['protein', 'dairy', 'pantry'],
      earn: { cats: ['protein', 'dairy', 'pantry'], count: 15 },
      suggests: ['Eggs', 'Salmon', 'Pasta', 'Ramen', 'Cheese', 'Curry'],
      lines: ['chef\'s kiss. obviously.', 'finally, real food!', 'now THAT\'s cooking.'],
      voice: {
        tone: 'sassy',
        style: { endings: [', obviously', ', duh', '. hmph', ', chop chop'], prefixes: ['ugh, ', 'listen, '], lower: false, bang: '!' },
        hi: ['oh, it\'s you. hi.', 'took you long enough!'],
        tap: ['hands off the chef!', 'do you mind?', 'busy cooking here.'],
        sleepy: ['chef is resting. shh.', 'zzz… more salt…'],
        suggest: ['we need {x}. trust me.', '{x}. write it down, chop chop!', 'no {x}? amateur.'],
        decline: ['your loss.', 'fine. hmph.'],
        dream: ['{x}… I could cook that.', 'imagine my {x}!'],
        idle: ['is that list done yet?', 'tap tap tap…', 'I\'m waiting, darling.'],
        look: ['obviously stunning.', 'I look fabulous, duh.', 'a chef needs style.'],
        room: ['it\'ll do.', 'acceptable. barely.'],
        full: ['not bad. not bad at all.', 'a proper haul, finally!'],
        quick: ['you did NOT buy that yet.', 'nice try, cheeky.'],
        spit: ['ptoo! not cooked yet.', 'rude. take it back then.'],
        name: ['it\'s chef {name} to you.', '{name}. remember it.']
      }
    },
    {
      id: 'sipper', label: 'Sleepy Head', icon: '🍵',
      blurb: 'Slow and yawny. Lives for cosy drinks.',
      text: 'Feed it 10 drinks',
      likes: ['drink'],
      earn: { cats: ['drink'], count: 10 },
      suggests: ['Tea', 'Bubble tea', 'Orange juice', 'Coffee', 'Smoothie'],
      lines: ['ahh… cosy…', 'sip… sip…', 'so warm…'],
      voice: {
        tone: 'sleepy',
        style: { endings: ['…', '… zzz'], prefixes: ['*yawn* ', 'mm… '], lower: true, bang: '…' },
        hi: ['oh… hi…', '*yawn* morning…'],
        tap: ['five more minutes…', 'mm…? hi…', 'so comfy…'],
        sleepy: ['zzz…', 'zzz… tea…'],
        suggest: ['maybe… {x}…?', 'some {x}… for later…', 'mm… {x} sounds nice…'],
        decline: ['okay… zzz', 'mm, fine…'],
        dream: ['warm {x}… mmm…', '{x}… so cosy…'],
        idle: ['*yawn*', 'is it nap time…?', 'so sleepy…'],
        look: ['comfy… I like it…', 'cosy look…', 'mm… nice…'],
        room: ['perfect nap spot…', 'so snug…'],
        full: ['full… time for a nap…', 'thank you… zzz'],
        quick: ['hm… that was fast…', 'already…?'],
        spit: ['mm… not yet…', 'later…'],
        name: ['i\'m… {name}… zzz', '{name}… yawn…']
      }
    },
    {
      id: 'diva', label: 'Diva', icon: '🥂',
      blurb: 'Dramatic and fabulous. Only the finest.',
      text: 'Feed it 15 drinks',
      likes: ['fruit', 'drink', 'sweets'],
      earn: { cats: ['drink'], count: 15 },
      suggests: ['Champagne', 'Strawberries', 'Mango', 'Cupcakes', 'Dark chocolate', 'Sparkling water'],
      lines: ['exquisite, darling.', 'simply divine!', 'fit for a star!'],
      voice: {
        tone: 'diva',
        style: { endings: [', darling', '. iconic', '. slay'], prefixes: ['darling, ', 'excuse me, '], lower: false, bang: '!' },
        hi: ['the star has arrived!', 'darling, you\'re back!'],
        tap: ['no touching the talent!', 'careful, I\'m precious.', 'yes, I\'m gorgeous.'],
        sleepy: ['beauty sleep… shh…', 'zzz… my fans…'],
        suggest: ['{x}. only the finest.', 'a diva needs {x}, darling.', 'fetch me {x}, please!'],
        decline: ['how dare you. fine.', '*dramatic sigh*'],
        dream: ['{x}… on a silver plate.', 'champagne dreams of {x}…'],
        idle: ['is my close-up ready?', 'the spotlight is on me!', '*strikes a pose*'],
        look: ['iconic. obviously.', 'serving looks!', 'the paparazzi! quick!'],
        room: ['my dressing room!', 'fabulous decor, darling.'],
        full: ['a five-star haul!', 'bravo! encore!'],
        quick: ['you skipped the shop? scandal!', 'cheating? how tacky.'],
        spit: ['ew, not that, darling.', 'send it back to the chef!'],
        name: ['the one, the only {name}!', '{name}. you\'re welcome.']
      }
    },
    {
      id: 'nerd', label: 'Nerd', icon: '💡',
      blurb: 'Full of fun facts. Brain food, please!',
      text: 'Feed it 12 proteins or fruit',
      likes: ['protein', 'fruit', 'drink'],
      earn: { cats: ['protein', 'fruit'], count: 12 },
      suggests: ['Blueberries', 'Walnuts', 'Salmon', 'Green tea', 'Coffee', 'Almonds'],
      lines: ['brain power +1!', 'optimal snack acquired.', 'nutritionally sound!'],
      voice: {
        tone: 'nerdy',
        style: { endings: [', technically', '. fun fact!', ' (probably)'], prefixes: ['actually, ', 'um, '], lower: false, bang: '!' },
        hi: ['greetings, human!', 'ah, my lab partner!'],
        tap: ['fun fact: I\'m ticklish.', 'please mind the glasses.', 'hypothesis: you like me.'],
        sleepy: ['zzz… pi is 3.14…\npie is for my belly…', 'processing dreams…'],
        suggest: ['studies say {x} is great.', 'may I request {x}?', '{x}: 10/10 brain food.'],
        decline: ['noted for later research.', 'data logged. okay.'],
        dream: ['the science of {x}…', '{x}, for my brain…'],
        idle: ['calculating snack odds…', 'did you know bananas glow?', '*adjusts glasses*'],
        look: ['very aerodynamic.', 'smart AND cute.', 'peer-reviewed style.'],
        room: ['a perfect study nook.', 'optimal room layout!'],
        full: ['experiment: success!', 'list completed. 100%!'],
        quick: ['that defies physics…', 'statistically suspicious.'],
        spit: ['error! returning item.', 'oops, wrong variable.'],
        name: ['Dr. {name}, at your service.', 'designation: {name}.']
      }
    }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
