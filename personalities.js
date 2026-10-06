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
 * `health`, `home` and `stuff` are its comments on pharmacy, household and other shop items.
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
        health: ['medicine? I\'ll be brave!!', 'ooh, sparkly clean teeth!', 'it smells so good!!'],
        home: ['a clean home! yay!!', 'shiny house time!', 'wow, so useful!!'],
        stuff: ['ooh, presents?!', 'we\'re getting EVERYTHING!', 'shopping spree!!'],
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
        room: ['so cozy ♡', 'our little home~'],
        full: ['thank you, sweetie ♡', 'my tummy is so happy~'],
        quick: ['hmm, so quick, sweetie?', 'was that really bought? ♡'],
        spit: ['oopsie ♡', 'sorry, sorry~'],
        health: ['take care of yourself ♡', 'get well soon, sweetie~', 'pamper time ♡'],
        home: ['a cozy clean home ♡', 'you work so hard, sweetie~'],
        stuff: ['a little treat for you ♡', 'aww, so lovely~', 'is it a gift? ♡'],
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
        health: ['rest and look after yourself.', 'health first~', 'gentle self-care.'],
        home: ['a tidy space, a calm mind.', 'fresh and clean~'],
        stuff: ['do we need it? okay~', 'hm, useful.', 'mindful shopping.'],
        name: ['I\'m {name}.', '{name}, nice to meet you~']
      }
    },
    {
      id: 'chef', label: 'Grumpy Chef', icon: '🍳',
      blurb: 'Grumbly but loving. Serious about cooking.',
      text: 'Feed it 15 proteins, dairy or pantry foods',
      likes: ['protein', 'dairy', 'pantry'],
      earn: { cats: ['protein', 'dairy', 'pantry'], count: 15 },
      suggests: ['Eggs', 'Salmon', 'Pasta', 'Ramen', 'Cheese', 'Curry'],
      lines: ['hmph. not bad, that.', 'fine. that\'s decent cooking.', 'bah. it\'s good, okay?'],
      voice: {
        tone: 'grumpy',
        style: { endings: ['. hmph', '… sigh', ', I suppose', '. bah'], prefixes: ['ugh, ', 'tch, ', 'hmph. '], lower: false, bang: '.' },
        hi: ['hmph. you\'re back.', 'oh. hello. I suppose.'],
        tap: ['hmph. mind the apron.', 'busy… but fine, one pat.', 'tch. don\'t stop, though.'],
        sleepy: ['zzz… too much salt…', 'grumble… zzz…'],
        suggest: ['we need {x}. it\'s that or nothing.', 'bah, no {x} again?', 'get {x}. please. I\'m asking.'],
        decline: ['hmph. fine.', 'bah. your kitchen, your rules.'],
        dream: ['{x}… I could make that right.', 'mutters about {x}…'],
        idle: ['sigh… is the list done?', 'tap tap tap… hmph.', 'nobody listens to the chef…'],
        look: ['hmph. it\'ll do.', 'bah, not terrible.', 'fine. I look fine.'],
        room: ['hmph. cosy enough.', 'it\'s… not bad, actually.'],
        full: ['hmph. a proper haul. thanks.', 'bah, that\'s… really good.'],
        quick: ['hmph. already? suspicious.', 'bah, so fast. did you check?'],
        spit: ['ptoo. not ready yet.', 'tch, wait for the chef.'],
        health: ['hmph. look after yourself.', 'don\'t get sick. I\'d worry.', 'bah, medicine. take it.'],
        home: ['hmph, someone has to clean.', 'a clean kitchen. finally.'],
        stuff: ['tch, you can\'t eat that.', 'hmph. fine. but dinner?', 'bah, more stuff.'],
        name: ['{name}. the grumpy one.', 'bah, it\'s {name}.']
      }
    },
    {
      id: 'sipper', label: 'Sleepy Head', icon: '🍵',
      blurb: 'Slow and yawny. Lives for cozy drinks.',
      text: 'Feed it 10 drinks',
      likes: ['drink'],
      earn: { cats: ['drink'], count: 10 },
      suggests: ['Tea', 'Bubble tea', 'Orange juice', 'Coffee', 'Smoothie'],
      lines: ['ahh… cozy…', 'sip… sip…', 'so warm…'],
      voice: {
        tone: 'sleepy',
        style: { endings: ['…', '… zzz'], prefixes: ['*yawn* ', 'mm… '], lower: true, bang: '…' },
        hi: ['oh… hi…', '*yawn* morning…'],
        tap: ['five more minutes…', 'mm…? hi…', 'so comfy…'],
        sleepy: ['zzz…', 'zzz… tea…'],
        suggest: ['maybe… {x}…?', 'some {x}… for later…', 'mm… {x} sounds nice…'],
        decline: ['okay… zzz', 'mm, fine…'],
        dream: ['warm {x}… mmm…', '{x}… so cozy…'],
        idle: ['*yawn*', 'is it nap time…?', 'so sleepy…'],
        look: ['comfy… I like it…', 'cozy look…', 'mm… nice…'],
        room: ['perfect nap spot…', 'so snug…'],
        full: ['full… so cozy now…', 'thank you… mm, warm tummy'],
        quick: ['hm… that was fast…', 'already…?'],
        spit: ['mm… not yet…', 'later…'],
        health: ['get some rest… like me…', 'mm… self-care… nap…'],
        home: ['cleaning…? later…', 'so many chores… zzz'],
        stuff: ['is it a new pillow…?', 'mm… shiny… zzz'],
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
        health: ['my beauty routine!', 'flawless skin, darling.', 'glam essentials!'],
        home: ['a spotless palace, darling.', 'the help will love this.'],
        stuff: ['retail therapy!', 'add it to my collection.', 'a gift for me? obviously.'],
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
        health: ['vitamins: science in a pill!', 'hygiene prevents germs!', 'for science and health.'],
        home: ['entropy: defeated!', 'efficient household upkeep.'],
        stuff: ['ooh, a new gadget!', 'acquiring equipment.', 'adding to inventory.'],
        name: ['Dr. {name}, at your service.', 'designation: {name}.']
      }
    },
    {
      id: 'caring', label: 'Caring', icon: '🥣',
      blurb: 'Warm and motherly. Always looks after you.',
      text: 'Feed it 12 vegetables or dairy',
      likes: ['veg', 'dairy', 'fruit', 'pantry'],
      earn: { cats: ['veg', 'dairy'], count: 12 },
      suggests: ['Soup', 'Carrots', 'Milk', 'Apples', 'Eggs', 'Oranges'],
      lines: ['good, healthy food, dear.', 'that\'ll keep us strong!', 'eat up, sweetheart.'],
      voice: {
        tone: 'caring',
        style: { endings: [', dear', ', sweetheart', ', love'], prefixes: ['now, ', 'there, '], lower: false, bang: '!' },
        hi: ['hello, dear! have you eaten?', 'there you are! come here.'],
        tap: ['come here, let me look at you.', 'a cuddle? always, dear.', 'are you warm enough?'],
        sleepy: ['zzz… did you drink water…', 'night night, dear… zzz'],
        suggest: ['you need some {x}, dear.', 'shall we get {x}? good for you.', 'don\'t forget {x}, sweetheart.'],
        decline: ['all right, dear.', 'if you say so. but eat well.'],
        dream: ['{x}… I\'ll make you some.', 'thinking of {x} for dinner…'],
        idle: ['have you had water today?', 'remember to eat something!', 'are you wearing a jumper?'],
        look: ['how do I look, dear?', 'oh, all dressed up!', 'do I look neat enough?'],
        room: ['such a lovely home, dear.', 'let me fluff the cushions!'],
        full: ['now that\'s a proper meal, dear.', 'you did so well today, love!'],
        quick: ['already? did you check, dear?', 'so quick! did you forget one?'],
        spit: ['oh dear, not yet. I\'ll wait.', 'there, there. later, then.'],
        health: ['oh, take care of yourself!', 'rest and drink lots of water.', 'I worry, you know. take it easy.'],
        home: ['a clean, cosy home. lovely!', 'don\'t overwork yourself!'],
        stuff: ['do you need it, dear? okay!', 'something nice for the house?', 'treat yourself, sweetheart.'],
        name: ['I\'m {name}, dear.', '{name}. but call me anything.']
      }
    },
    {
      id: 'joker', label: 'Joker', icon: '🃏',
      blurb: 'Super silly. Jokes and giggles all day.',
      text: 'Feed it 12 sweets or spicy foods',
      likes: ['sweets', 'spicy', 'fruit', 'drink', 'baked'],
      earn: { cats: ['sweets', 'spicy'], count: 12 },
      suggests: ['Bananas', 'Lollipops', 'Gummy bears', 'Cupcakes', 'Hot sauce', 'Soda'],
      lines: ['banana-na-na-nom!', 'that\'s un-bun-lievable!', 'I\'m having a ball!'],
      voice: {
        tone: 'silly',
        style: { endings: [' hehe', ' (joke!)', ' boing!', ' hee hee!'], prefixes: ['knock knock! ', 'psst, ', 'hehe, '], lower: false, bang: '!' },
        hi: ['guess who\'s back? ME!', 'hi! hi! hi! …just hi.'],
        tap: ['boop! you\'re it!', 'tickle fight!', 'honk! that was my nose.'],
        sleepy: ['zzz… why did the egg… zzz', 'snore-nanza… zzz'],
        suggest: ['we need {x}! no joke!', '{x}? not clowning around!', 'get {x}, for the giggles!'],
        decline: ['no? what a plot twist!', 'aww, I\'ll cry-laugh then.'],
        dream: ['{x} wearing a hat… hee hee!', 'a dancing {x}!'],
        idle: ['why did the list cross the road?', 'wanna hear a joke?', '*balances a spoon on nose*'],
        look: ['I\'m a walking joke!', 'ta-da! pretty silly, huh?', 'do I look clownish? good!'],
        room: ['whoopee cushion time!', 'so much room to goof around!'],
        full: ['that was a-peel-ing!', 'what a ham-azing trip!'],
        quick: ['already? lightning fast, ha!', 'quick as a bunny on skates!'],
        spit: ['pfft! plot twist!', 'ptoo! it was a prank!'],
        health: ['laughter is the best medicine!', 'Dr. Joker will see you now!', 'take two giggles, call me later!'],
        home: ['clean as a whistle-blowing clown!', 'mop? more like MOP-silly!'],
        stuff: ['ooh, a prank prop?!', 'shiny nonsense! I love it!', 'a gift? I love surprises!'],
        name: ['I\'m {name}! ha!', '{name}… sounds like a sneeze!']
      }
    },
    {
      id: 'feisty', label: 'Feisty', icon: '💅',
      blurb: 'Sassy and stubborn. Never backs down.',
      text: 'Feed it 10 spicy or pantry foods',
      likes: ['spicy', 'pantry', 'sweets'],
      earn: { cats: ['spicy', 'pantry'], count: 10 },
      suggests: ['Chilli sauce', 'Noodles', 'Curry', 'Dark chocolate', 'Nachos', 'Ramen'],
      lines: ['fine, it\'s good. don\'t get smug.', 'I liked it. once. don\'t push it.', 'obviously the best pick. mine.'],
      voice: {
        tone: 'sassy',
        style: { endings: [', obviously', ', whatever', ', so there'], prefixes: ['hmph, ', 'obviously, ', 'excuse me? '], lower: false, bang: '!' },
        hi: ['oh. you again.', 'I wasn\'t waiting. obviously.'],
        tap: ['hey! I said no touching.', 'ugh, fine. one pat.', 'did I ask for pats? …don\'t stop.'],
        sleepy: ['I\'m NOT asleep… zzz', 'zzz… I said no… zzz'],
        suggest: ['we\'re getting {x}. end of story.', '{x}. I\'m not changing my mind.', 'no {x}? hard no, then.'],
        decline: ['wrong answer. but okay.', 'fine. I\'ll sulk, then.'],
        dream: ['{x}… and I\'m not sharing.', 'my {x}, my rules.'],
        idle: ['I\'m not bored. you\'re slow.', 'hurry up, I don\'t wait.', 'I\'ll do it my way, thanks.'],
        look: ['yes, I look amazing. I know.', 'I\'m wearing it. don\'t argue.', 'my way, my style.'],
        room: ['I\'m keeping it like this.', 'don\'t move my stuff!'],
        full: ['okay, good trip. don\'t gloat.', 'I told you so. about all of it.'],
        quick: ['you did NOT buy that already.', 'nice try. I\'m not buying it.'],
        spit: ['no! not yet! I refuse!', 'ptoo! put it back, not ready.'],
        health: ['I\'m fine. no meds. …okay, give.', 'you need rest. not me.', 'I said I\'m healthy!'],
        home: ['I\'m not cleaning. you do it.', 'fine. but I\'m supervising.'],
        stuff: ['I didn\'t ask for that. …keep it.', 'what is that? I want it.', 'ugh, more stuff. I\'ll allow it.'],
        name: ['it\'s {name}. no nicknames.', '{name}. and don\'t argue.']
      }
    }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
