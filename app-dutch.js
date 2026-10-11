// The Dutch word list (build 591): English text on the page -> Dutch text, used by app-lang.js when Dutch is picked.
// An entry is the exact English text (as the page shows it) and its Dutch; a {name} hole stands for a changing part and is carried over
// (and translated by itself if it has an entry). Texts with no entry stay English, so the list can grow a bit at a time.
// Keep the tone like the rest of the app: short, friendly, informal ("je"). The pet's own name and what the player types are never in here.
// Plain data, loaded before app-lang.js.
'use strict';

var Dutch = {
  // ---------- the page: dock, tabs, sheets ----------
  'Shopping': 'Boodschappen', 'To-do': 'Taken', 'shopping list': 'boodschappenlijstje', 'To buy': 'Te kopen', 'Bought': 'Gekocht',
  'Pet': 'Huisdier', 'Room': 'Kamer', 'Shop': 'Winkel', 'Calendar': 'Kalender', 'Profile': 'Profiel',
  'Pet and dress-up': 'Huisdier en verkleden', 'Pet and outfits': 'Huisdier en outfits', 'Hats': 'Hoeden', 'Clothes': 'Kleren', 'Face': 'Gezicht', 'Neck': 'Nek', 'Feet': 'Voeten',
  'Species': 'Soort', 'Skin': 'Uiterlijk', 'Persona': 'Karakter', 'Personality': 'Karakter', 'Name': 'Naam', 'Edit': 'Aanpassen', 'Edit name': 'Naam aanpassen',
  'Fumu, your pet': 'Fumu, jouw huisdier', 'Fumufumu': 'Fumufumu', 'Loading': 'Laden', 'Search': 'Zoeken', 'Search results': 'Zoekresultaten',
  'Closet': 'Kast', 'Closet: saved outfits': 'Kast: opgeslagen outfits', 'Photo': 'Foto', 'Photoshoot': 'Fotoshoot', 'Close the photoshoot': 'Fotoshoot sluiten',
  'Nothing like that here.': 'Zoiets is er niet.', 'Nothing like that in the wardrobe yet.': 'Zoiets zit nog niet in de garderobe.',
  'Earned by what you feed it. Each one has its own favourite foods and way of talking. Tap one to read about it.': 'Verdiend met wat je hem voert. Elk karakter heeft eigen lievelingseten en praat op zijn eigen manier. Tik er een aan om erover te lezen.',
  'Name this outfit': 'Geef deze outfit een naam', 'Name for the outfit you are wearing': 'Naam voor de outfit die je draagt', 'Save what I\'m wearing': 'Bewaar wat ik draag',
  'Placed things sit behind your pet. Drag them around the room to move them.': 'Spullen staan achter je huisdier. Sleep ze door de kamer om ze te verplaatsen.',
  'Next background': 'Volgende achtergrond', 'Previous background': 'Vorige achtergrond', 'Pose': 'Pose', 'Frame': 'Lijst', 'Retake': 'Opnieuw', 'Turn the camera round': 'Camera omdraaien',
  'Share': 'Delen', 'Save': 'Bewaren', 'Your photo': 'Jouw foto', '📷 Camera': '📷 Camera',

  // ---------- adding things ----------
  'Add': 'Toevoegen', 'Add an item': 'Iets toevoegen', 'Add an item…': 'Voeg toe…', 'Add item': 'Item toevoegen', 'Add to list': 'Aan lijst toevoegen', 'Add by voice': 'Toevoegen met je stem',
  'Add from a recipe': 'Toevoegen uit een recept', 'Add to this day': 'Aan deze dag toevoegen', 'Add a plan or birthday…': 'Voeg een plan of verjaardag toe…',
  'Change emoji': 'Emoji veranderen', 'Pick an emoji for': 'Kies een emoji voor', 'Tap an item\'s emoji, or long-press the item, to pick a different one.': 'Tik op de emoji van een item, of houd het item ingedrukt, om een andere te kiezen.',
  'Amount': 'Aantal', 'like 2, or 500 g': 'zoals 2, of 500 g', 'Units': 'Eenheden', 'Metric': 'Metrisch', 'US': 'VS', 'Delete': 'Verwijderen', 'Delete item': 'Item verwijderen', 'Clear list': 'Lijst leegmaken', 'Clear': 'Wissen',
  'Cancel': 'Annuleren', 'Close': 'Sluiten', 'Copy': 'Kopiëren', 'Try again': 'Opnieuw proberen', 'No thanks': 'Nee, dank je', 'Stop': 'Stoppen', 'Send': 'Versturen', 'Feed': 'Voeren',
  'Switch between the shopping list and the to-do list': 'Wissel tussen het boodschappenlijstje en de takenlijst', 'Lists': 'Lijsten',
  'Task': 'Taak', 'Item': 'Item', 'Due': 'Klaar op', 'Time': 'Tijd', 'Time (optional)': 'Tijd (optioneel)', 'No time': 'Geen tijd', 'Until': 'Tot', 'At': 'Om', 'For how long': 'Hoe lang',
  'Repeat': 'Herhalen', 'A repeating task comes back on its next day when you tick it off.': 'Een herhalende taak komt terug op de volgende dag als je hem afvinkt.',
  'Tick it anyway': 'Toch afvinken', 'Not yet': 'Nog niet', 'Not time yet!': 'Nog niet de tijd!', 'Items count as soon as you tick them off.': 'Items tellen meteen mee zodra je ze afvinkt.',
  'Items count once they\'ve been on your list for 15 minutes, and each item once a day.': 'Items tellen mee als ze 15 minuten op je lijstje staan, en elk item één keer per dag.',
  'Skip the 15-minute wait': 'De wachttijd van 15 minuten overslaan',

  // ---------- recipes ----------
  'New recipe': 'Nieuw recept', 'Let\'s cook': 'Laten we koken', 'Find ingredients': 'Ingrediënten zoeken', 'Paste a recipe link…': 'Plak een receptlink…', 'or type one ingredient per line': 'of typ één ingrediënt per regel',
  'As written': 'Zoals geschreven', 'will find the ingredients ✦': 'zoekt de ingrediënten ✦', 'What is it?': 'Wat is het?', '🎂 Birthday': '🎂 Verjaardag', '📌 Plan': '📌 Plan',
  'Links need a small helper online (see worker/README.md). Pasted ingredients work without it.': 'Links hebben een klein hulpprogramma online nodig (zie worker/README.md). Geplakte ingrediënten werken zonder.',
  'Recipe helper address': 'Adres van de receptenhulp', 'Paste a link or type a note.': 'Plak een link of typ een notitie.', 'https://… or a note': 'https://… of een notitie',

  // ---------- calendar ----------
  'Calendar: birthdays and plans': 'Kalender: verjaardagen en plannen', 'Previous month': 'Vorige maand', 'Next month': 'Volgende maand', 'Days of the week': 'Dagen van de week', 'Or pick a day': 'Of kies een dag',
  'Hour': 'Uur', 'Minute': 'Minuut', 'Month': 'Maand', 'Year': 'Jaar', 'AM or PM': 'AM of PM', 'Stamp Book': 'Stempelboek',

  // ---------- profile, gifts, goals ----------
  'Profile: your name and birthday': 'Profiel: je naam en verjaardag', 'Your name': 'Jouw naam', 'Your birthday': 'Jouw verjaardag', 'Edit your name': 'Je naam aanpassen', 'Edit your birthday': 'Je verjaardag aanpassen',
  'Hello, friend!': 'Hallo, vriend!', 'Daily gift': 'Dagelijks cadeautje', 'Gift': 'Cadeau', 'Goals': 'Doelen', 'Top 10': 'Top 10', 'Collection': 'Verzameling', 'Receipt': 'Bonnetje',
  'Add your birthday in your profile for extra boxes on the day.': 'Vul je verjaardag in bij je profiel voor extra doosjes op die dag.',
  '✦ a preview, nothing is for sale yet ✦': '✦ een voorproefje, er is nog niets te koop ✦', '✦ little things to work towards ✦': '✦ kleine dingen om naartoe te werken ✦', '✦ the things you love most ✦': '✦ de dingen waar je het meest van houdt ✦',
  'what you buy most': 'wat je het meest koopt', 'your trips and tasks': 'jouw winkelrondes en taken', 'unlock new pets and hats': 'ontgrendel nieuwe huisdieren en hoeden',
  'to unlock new friends and hats. Only a few count each day, so come back tomorrow for more.': 'om nieuwe vriendjes en hoeden te ontgrendelen. Er tellen maar een paar per dag mee, dus kom morgen terug voor meer.',
  'hasn\'t seen you buy anything yet. Tick things off and your favourites show up here.': 'heeft je nog niets zien kopen. Vink dingen af en je favorieten verschijnen hier.',
  'Tap to feed': 'Tik om te voeren', 'Throw the toy': 'Gooi het speeltje', 'Lamp: pull the cord down to switch it': 'Lamp: trek aan het koord om hem aan of uit te doen',

  // ---------- options ----------
  'Options': 'Opties', 'Language': 'Taal', 'Appearance': 'Uiterlijk van de app', 'Sounds': 'Geluid', 'Vibration': 'Trillen', 'Sort by aisle': 'Sorteren per schap', '24-hour time': '24-uurs tijd',
  'Goal progress display': 'Voortgang van doelen tonen', 'Shopping suggestions': 'Boodschappensuggesties', 'Fair-play tips': 'Eerlijk-spelen-tips', 'The rules still apply when off.': 'De regels gelden ook als dit uit staat.',
  'Voice language': 'Spraaktaal', 'Auto': 'Automatisch', 'English': 'English', 'Nederlands': 'Nederlands', 'Light': 'Licht', 'Dark': 'Donker', 'Sweet': 'Snoepjes', 'Quest': 'Quest', 'Old School': 'Old School', 'Bonfire': 'Kampvuur',
  'Developer tools': 'Ontwikkelaarstools', 'For testing only. These change your pet\'s progress and list right away.': 'Alleen om te testen. Dit verandert meteen de voortgang en de lijst van je huisdier.',
  'Animation player': 'Animatiespeler', 'Animation player (developer tool)': 'Animatiespeler (ontwikkelaarstool)', 'Find an animation': 'Zoek een animatie', 'Find an animation by name…': 'Zoek een animatie op naam…',
  'Recent errors': 'Recente fouten', 'Copy details': 'Details kopiëren', 'Sync log': 'Synchronisatielog', 'Clear the log': 'Log wissen', 'Check merging': 'Samenvoegen controleren',

  // ---------- backup, sync, send ----------
  'Backup & sync': 'Back-up en synchronisatie', 'Start a backup': 'Back-up starten', 'Show my code': 'Toon mijn code', 'Copy code': 'Code kopiëren', 'Already have a code?': 'Heb je al een code?',
  'Join with this code': 'Meedoen met deze code', 'Sync now': 'Nu synchroniseren', 'Sign out of this device': 'Uitloggen op dit apparaat', 'Delete my backup': 'Mijn back-up verwijderen', 'Your backup code': 'Je back-upcode',
  'Keep this code safe. It is the only way to restore your data, and anyone with it can see your list and pet.': 'Bewaar deze code goed. Het is de enige manier om je gegevens terug te zetten, en iedereen met de code kan je lijstje en huisdier zien.',
  'Syncs your shopping list and': 'Synchroniseert je boodschappenlijstje en', 'between devices. No password: you get a code.': 'tussen apparaten. Geen wachtwoord: je krijgt een code.', 'brings it to your other device.': 'brengt het naar je andere apparaat.',
  'Send to another device': 'Naar ander apparaat', 'What to send': 'Wat wil je sturen', 'Copy link for another device': 'Link kopiëren voor een ander apparaat', 'Received lately': 'Onlangs ontvangen',
  'Server address': 'Serveradres', 'Sync server address': 'Adres van de synchronisatieserver',

  // ---------- credits ----------
  'Emoji by': 'Emoji van', 'OpenMoji': 'OpenMoji', ', CC BY-SA 4.0': ', CC BY-SA 4.0',

  // ---------- species ----------
  'Birdie': 'Vogeltje', 'Cat': 'Kat', 'Dog': 'Hond', 'Mochi': 'Mochi', 'Pig': 'Varken', 'Bunny': 'Konijn', 'Cow': 'Koe', 'Hamster': 'Hamster', 'Frog': 'Kikker', 'Hedgehog': 'Egel', 'Axolotl': 'Axolotl', 'Mouse': 'Muis', 'Monkey': 'Aap', 'Dragon': 'Draak',

  // ---------- skins ----------
  'Original': 'Origineel', 'Penguin': 'Pinguïn', 'Parrot': 'Papegaai', 'Kiwi': 'Kiwi', 'Pigeon': 'Duif', 'Pigeon (old)': 'Duif (oud)', 'Chicken': 'Kip', 'Strawberry': 'Aardbei', 'Chocolate': 'Chocolade', 'Taro': 'Taro',
  'Black cat': 'Zwarte kat', 'Calico': 'Lapjeskat', 'Orange cat': 'Rode kat', 'Munchkin': 'Munchkin', 'Ragdoll': 'Ragdoll', 'Scottish fold': 'Scottish fold', 'Siamese': 'Siamees',
  'Chihuahua': 'Chihuahua', 'Pomeranian': 'Pomeriaan', 'Golden retriever': 'Golden retriever', 'Pink shiba': 'Roze shiba', 'French bulldog': 'Franse bulldog', 'German shepherd': 'Duitse herder', 'Cairn terrier': 'Cairn terriër',
  'Chocolate milk': 'Chocolademelk', 'Highland cattle': 'Schotse hooglander', 'Strawberry milk': 'Aardbeienmelk', 'Dirty piggy': 'Vies varkentje', 'Boar': 'Everzwijn', 'Potbelly pig': 'Hangbuikzwijn',
  'Floppy ears': 'Hangoren', 'Dutch': 'Hollander', 'Himalayan': 'Himalaya', 'Poison dart frog': 'Pijlgifkikker', 'Toad': 'Pad', 'Fast hedgehog': 'Snelle egel', 'Brandt\'s hedgehog': 'Brandts egel', 'Rainbow': 'Regenboog',
  'White hamster': 'Witte hamster', 'Long-haired': 'Langharig', 'Thrush': 'Lijster', 'Snow monkey': 'Sneeuwaap', 'Red dragon': 'Rode draak',

  // ---------- goals ----------
  'Fish fan': 'Visfan', 'Feed your pet 20 fish or seafood': 'Voer je huisdier 20 keer vis of zeevruchten', 'Veggie hero': 'Groentenheld', 'Feed your pet 15 vegetables': 'Voer je huisdier 15 keer groente',
  'Bakery buddy': 'Bakkerijvriendje', 'Feed your pet 10 breads or pastries': 'Voer je huisdier 10 keer brood of gebak', 'Milk & cheese': 'Melk en kaas', 'Feed your pet 15 dairy foods': 'Voer je huisdier 15 keer zuivel',
  'Snack stash': 'Snoepvoorraad', 'Feed your pet 12 nuts, grains or cereals': 'Voer je huisdier 12 keer noten, granen of ontbijtgranen', 'Fruit basket': 'Fruitmand', 'Feed your pet 20 pieces of fruit': 'Voer je huisdier 20 stukken fruit',
  'Tidy shopper': 'Nette shopper', 'Finish a list of 3 or more items on 5 different days': 'Rond op 5 verschillende dagen een lijstje van 3 of meer items af',

  // ---------- personalities ----------
  'Hyper Foodie': 'Dolle Lekkerbek', 'Bouncy and loud. Loves every food!': 'Stuiterend en luid. Houdt van al het eten!', 'Loves a bit of everything': 'Houdt een beetje van alles',
  'Sweetie Pie': 'Schatje', 'Gushy and kind. Dessert first ♡': 'Zacht en lief. Eerst het toetje ♡', 'Feed it 10 sweets or baked treats': 'Voer hem 10 keer snoep of gebak',
  'Zen Sprout': 'Zen Scheutje', 'Calm and wholesome. Fresh fruit and veg.': 'Rustig en gezond. Vers fruit en groente.', 'Feed it 15 fruit or vegetables': 'Voer hem 15 keer fruit of groente',
  'Grumpy Chef': 'Mopperende Chef', 'Grumbly but loving. Serious about cooking.': 'Moppert maar is lief. Serieus over koken.', 'Feed it 15 proteins, dairy or pantry foods': 'Voer hem 15 keer eiwit, zuivel of houdbaar eten',
  'Sleepy Head': 'Slaapkop', 'Slow and yawny. Lives for cozy drinks.': 'Traag en gapend. Leeft voor gezellige drankjes.', 'Feed it 10 drinks': 'Voer hem 10 drankjes',
  'Diva': 'Diva', 'Dramatic and fabulous. Only the finest.': 'Dramatisch en fantastisch. Alleen het beste.', 'Feed it 15 drinks': 'Voer hem 15 drankjes',
  'Nerd': 'Nerd', 'Full of fun facts. Brain food, please!': 'Vol leuke weetjes. Hersenvoer, graag!', 'Feed it 12 proteins or fruit': 'Voer hem 12 keer eiwit of fruit',
  'Caring': 'Zorgzaam', 'Warm and motherly. Always looks after you.': 'Warm en moederlijk. Zorgt altijd voor je.', 'Feed it 12 vegetables or dairy': 'Voer hem 12 keer groente of zuivel',
  'Joker': 'Grappenmaker', 'Super silly. Jokes and giggles all day.': 'Supergek. De hele dag grapjes en gegiechel.', 'Feed it 12 sweets or spicy foods': 'Voer hem 12 keer snoep of pittig eten',
  'Feisty': 'Pittig', 'Sassy and stubborn. Never backs down.': 'Brutaal en koppig. Geeft nooit op.', 'Feed it 10 spicy or pantry foods': 'Voer hem 10 keer pittig of houdbaar eten',

  // ---------- room and gifts ----------
  'Rug': 'Kleedje', 'Window': 'Raam', 'Beanbag': 'Zitzak', 'Cuckoo clock': 'Koekoeksklok', 'Gaming desk': 'Gamebureau', 'Burger phone': 'Burgertelefoon',
  'Star sticker': 'Sterrenstickertje', 'Candy': 'Snoepje', 'Cookie': 'Koekje', 'Ribbon': 'Lintje', 'Cupcake (rare)': 'Cupcake (zeldzaam)', 'Party popper': 'Knaller', 'Balloon': 'Ballon', 'Cake': 'Taart',
  'Daily box': 'Dagelijks doosje', 'Special box': 'Speciaal doosje', 'Birthday box': 'Verjaardagsdoosje',
  'New Year\'s Day': 'Nieuwjaarsdag', 'Valentine\'s Day': 'Valentijnsdag', 'Good Friday': 'Goede Vrijdag', 'Easter': 'Pasen', 'Easter Monday': 'Tweede paasdag', 'King\'s Day': 'Koningsdag', 'Halloween': 'Halloween',
  'Sinterklaas': 'Sinterklaas', 'Christmas': 'Kerst', 'New Year\'s Eve': 'Oudejaarsavond', 'Birthday!': 'Verjaardag!',

  // ---------- wardrobe ----------
  'Top hat': 'Hoge hoed', 'Butterfly clip': 'Vlinderspeldje', 'Red ribbon': 'Rode strik', 'Goggles': 'Stofbril', 'Cat friend': 'Kattenvriendje', 'Maid\'s hairband': 'Dienstmeisjeshaarband', 'Sun hat': 'Zonnehoed',
  'Lad\'s cap': 'Jongenspet', 'Cow hoodie': 'Koeienhoodie', 'Pig hoodie': 'Varkenshoodie', 'Strawberry dress': 'Aardbeienjurk', 'Lilac dress': 'Lila jurk', 'Overalls dress': 'Tuinbroekjurk', 'Hard hat': 'Bouwhelm',
  'Bandana': 'Bandana', 'Head­phones': 'Koptelefoon', 'Chef hat': 'Koksmuts', 'Knight helmet': 'Ridderhelm', 'Strawberry beret': 'Aardbeienbaret', 'Banana peel': 'Bananenschil', 'Trash can lid': 'Prullenbakdeksel',
  'Clown wig': 'Clownspruik', 'Jester cap': 'Nar-muts', 'Cowboy hat': 'Cowboyhoed', 'Orange cap': 'Oranje pet', 'Winter scarf': 'Wintersjaal', 'Feather boa': 'Veren boa', 'Toast in mouth': 'Toast in de mond',
  'Leaf in mouth': 'Blaadje in de mond', 'Hay in mouth': 'Hooi in de mond', 'Necktie': 'Stropdas', 'Hideous tie': 'Afschuwelijke das', 'Fake mustache': 'Nepsnor', 'Boots': 'Laarzen', 'Feather slides': 'Veren slippers',
  'Bunny slippers': 'Konijnenpantoffels', 'Cowboy boots': 'Cowboylaarzen', 'Wooden clogs': 'Klompen', 'Clown shoes': 'Clownsschoenen', 'Heart shades': 'Hartjesbril', 'Red specs': 'Rode bril', 'Eye patch': 'Ooglapje',
  'Taped specs': 'Gerepareerde bril', 'Round tints': 'Ronde glazen', 'Face bandage': 'Pleister', 'Clown nose': 'Clownsneus',
  'ooh, so fancy!': 'ooh, zo chic!', 'very distinguished': 'heel deftig', 'a hat for tea time?': 'een hoed voor het theeuurtje?', 'so sparkly!': 'zo glinsterend!', 'flutter flutter': 'fladder fladder', 'y2k cutie': 'y2k-schatje',
  'tied up nicely!': 'netjes vastgestrikt!', 'a present for me?': 'een cadeautje voor mij?', 'so dainty!': 'zo sierlijk!', 'ready for takeoff!': 'klaar voor de start!', 'wheee, goggles!': 'wheee, stofbril!', 'safety first!': 'veiligheid voorop!',
  'a friend on my head!': 'een vriendje op mijn hoofd!', 'mew! (not me)': 'miauw! (ik niet)', 'shh, it is napping': 'sst, hij slaapt', 'at your service!': 'tot uw dienst!', 'so frilly!': 'zo fladderig!', 'I\'ll tidy the snacks': 'ik ruim de snacks op',
  'beach day?!': 'strandweer?!', 'picnic time!': 'picknicktijd!', 'so summery!': 'zo zomers!', 'very proper!': 'heel netjes!', 'off to the market!': 'op naar de markt!', 'class is in session!': 'de les begint!',
  'moo! so cozy!': 'boe! zo knus!', 'a cow? me?!': 'een koe? ik?!', 'so soft and fluffy!': 'zo zacht en pluizig!', 'oink oink!': 'knor knor!', 'in the pink!': 'in het roze!', 'snout cute!': 'snuitig schattig!',
  'berry pretty!': 'bessie mooi!', 'twirl twirl!': 'draai draai!', 'sweet as can be': 'zo zoet als maar kan', 'tulle-y fabulous!': 'tule-lijk fantastisch!', 'a proper sailor!': 'een echte matroos!', 'tea party ready!': 'klaar voor het theekransje!',
  'pocket full of snacks!': 'zakken vol snacks!', 'so handy!': 'zo handig!', 'ready to work!': 'klaar om te werken!', 'let\'s build a snack fort!': 'laten we een snackfort bouwen!', 'construction crew!': 'bouwploeg!',
  'ready for adventure!': 'klaar voor avontuur!', 'so cool, so comfy!': 'zo cool, zo comfy!', 'tied it myself!': 'zelf gestrikt!', 'my jam!': 'mijn lied!', 'turn it up!': 'zet hem harder!', '♪ shopping beats ♪': '♪ boodschappenbeats ♪',
  'oui, chef!': 'oui, chef!', 'what are we cooking?': 'wat gaan we koken?', 'taste test time!': 'tijd om te proeven!', 'for the snacks!': 'voor de snacks!', 'I shall guard the fridge': 'ik bewaak de koelkast', 'brave and shiny!': 'dapper en glimmend!',
  'berry chic!': 'bessie chic!', 'très sweet!': 'très zoet!', 'ooh la la!': 'ooh la la!', 'slippery when worn!': 'glad als je hem draagt!', 'a-peeling, right?': 'aan-schil-lijk, toch?', 'going bananas!': 'ik word helemaal bananas!',
  'one man\'s trash!': 'des ene zijn vuil!', 'clang clang!': 'kling klang!', 'raccoon approved': 'goedgekeurd door wasberen', 'honk honk!': 'toet toet!', 'send in the clowns!': 'stuur de clowns maar binnen!', 'big top energy!': 'circustent-energie!',
  'jingle jingle!': 'bel bel!', 'the royal fool!': 'de koninklijke nar!', 'jest for you!': 'grapje voor jou!', 'yeehaw!': 'jiehaa!', 'howdy, partner!': 'hoi, maat!', 'giddy up!': 'vooruit paardje!',
  'hup Holland hup!': 'hup Holland hup!', 'oranje boven!': 'oranje boven!', 'lekker bezig!': 'lekker bezig!', 'gezellig!': 'gezellig!', 'so toasty!': 'zo lekker warm!', 'snow day?': 'sneeuwdag?', 'cozy cozy cozy': 'knus knus knus',
  'dahling!': 'schatje!', 'fabulous, simply fabulous': 'fantastisch, gewoon fantastisch', 'strike a pose!': 'zet een pose!', 'mmf mmf!': 'mmf mmf!', 'late for the shop!': 'te laat voor de winkel!', 'buttery!': 'boterachtig!',
  'nom… leafy': 'nom… bladerig', 'very natural': 'heel natuurlijk', 'crunchy greens!': 'knapperig groen!', 'yeehaw…': 'jiehaa…', 'just chillin': 'lekker chillen', 'farm life': 'boerenleven',
  'dressed for success!': 'gekleed voor succes!', 'meeting at nine!': 'vergadering om negen uur!', 'very businesslike': 'heel zakelijk', 'it was a gift': 'ik kreeg hem cadeau', 'bold choice, right?': 'gedurfde keuze, hè?', 'my lucky tie!': 'mijn geluksdas!',
  'ahem, good day!': 'ahum, goedendag!', 'is it on straight?': 'zit hij recht?', 'puddle time!': 'tijd voor plassen!', 'stomp stomp!': 'stamp stamp!', 'ready for a walk!': 'klaar voor een wandeling!',
  'dahling, I have arrived': 'schatje, ik ben er', 'fabulous toes!': 'fantastische tenen!', 'only the fluffiest': 'alleen de pluizigste', 'so fuzzy!': 'zo pluizig!', 'cozy toes!': 'knusse tenen!', 'hop hop hop!': 'hop hop hop!',
  'boot scootin!': 'laarzen-dansen!', 'line dance time!': 'tijd voor linedance!', 'clip clop!': 'klipperdeklop!', 'very dutch!': 'heel Nederlands!', 'tulip time!': 'tulpentijd!', 'flap flap flap!': 'flap flap flap!', 'tripping on purpose!': 'expres struikelen!',
  'too cool for school!': 'te cool voor school!', 'the future is bright!': 'de toekomst is rooskleurig!', 'no paparazzi, please!': 'geen paparazzi, alsjeblieft!', 'very studious!': 'heel leergierig!', 'peering over my glasses…': 'over mijn bril heen kijkend…',
  'sharp eyes, sharp mind.': 'scherpe ogen, scherpe geest.', 'arr, matey!': 'arr, maatje!', 'yo ho, snacks ho!': 'joho, snacks hoho!', 'I see half the treats!': 'ik zie de helft van de lekkers!', 'well, actually…': 'nou, eigenlijk…',
  'I read the label!': 'ik lees het etiket!', 'these have seen things.': 'deze hebben dingen gezien.', 'rose-tinted world!': 'de wereld door een roze bril!', 'very mysterious': 'heel mysterieus', 'groovy, baby!': 'groovy, schatje!',
  'tough cookie!': 'stoere kerel!', 'it doesn\'t even hurt': 'het doet niet eens pijn', 'battle scar!': 'gevechtslitteken!', 'squeeze my nose!': 'knijp in mijn neus!', 'send in the clown!': 'stuur de clown maar binnen!'
};

// ---------- more: the rest of the sheets, backgrounds, faces, repeats ----------
Object.assign(Dutch, {
  'Add a plan…': 'Voeg een plan toe…', 'Bell': 'Bel', 'Teddy': 'Knuffelbeer', 'Night light': 'Nachtlampje', 'Play': 'Spelen', 'Species, skin and persona': 'Soort, uiterlijk en karakter',
  'No skins for this one yet.': 'Hier zijn nog geen uiterlijken voor.', 'Hello': 'Hallo', 'Happy': 'Blij', 'Hearts': 'Hartjes', 'Love': 'Verliefd', 'Shy': 'Verlegen', 'Smile': 'Glimlach', 'Sparkle': 'Fonkelend',
  'Mouth': 'Mond', 'Glasses': 'Brillen', 'Bare feet': 'Blote voeten', 'Bare neck': 'Blote nek', 'No glasses': 'Geen bril', 'No frame': 'Geen lijst', 'None': 'Geen', 'Nothing': 'Niets', 'Never': 'Nooit', 'Off': 'Uit',
  'Every day': 'Elke dag', 'Every 3 days': 'Elke 3 dagen', 'Every week': 'Elke week', 'Every month': 'Elke maand', 'Every year': 'Elk jaar', 'Weekdays (Mon to Fri)': 'Doordeweeks (ma t/m vr)', 'Weekends': 'Weekenden',
  'Nothing planned yet.': 'Nog niets gepland.', '0 items': '0 items', 'Show fewer': 'Minder tonen', 'Clear the list': 'Lijst leegmaken', 'Background': 'Achtergrond', 'Polaroid': 'Polaroid',
  'Beach': 'Strand', 'Farm': 'Boerderij', 'Kitchen': 'Keuken', 'Meadow': 'Weide', 'Starry night': 'Sterrennacht', 'Aquarium': 'Aquarium', 'Pantry': 'Voorraadkast', 'Household': 'Huishouden',
  'Fruit & veg': 'Groente en fruit', 'Dairy & eggs': 'Zuivel en eieren', 'Treats': 'Lekkers',
  'Meat & fish': 'Vlees en vis', 'Bakery': 'Brood en gebak', 'Drinks': 'Drinken', 'Health': 'Gezondheid', 'Other': 'Overig',
  'Hyper Foodie:': 'Dolle Lekkerbek:', 'Fumufumu Plus': 'Fumufumu Plus', 'Premium': 'Premium', '€2.99 / month': '€2,99 / maand', 'Cosmetic packs': 'Cosmetische pakketten',
  'Household syncing': 'Synchroniseren met je huishouden', 'Extra goals and rewards': 'Extra doelen en beloningen', 'Mini Fumu on your desktop': 'Mini Fumu op je bureaublad', 'Syncing between your phone and computer': 'Synchroniseren tussen je telefoon en computer',
  'Cosy Night pack': 'Gezellige-nacht-pakket', 'Pyjamas, a night cap and a teddy': 'Pyjama, een slaapmuts en een knuffelbeer', 'Dress-up pack': 'Verkleedpakket', 'Fancy hats and bows': 'Chique hoeden en strikken',
  'Tea Time pack': 'Theetijd-pakket', 'Cup, apron and a little hat': 'Kopje, schort en een klein hoedje', '· set up': '· ingesteld', 'Send a link or note': 'Stuur een link of notitie', 'Receive from my other devices': 'Ontvangen van mijn andere apparaten',
  'is ready when you are. Add something to the list to go shopping together!': 'staat klaar als jij er klaar voor bent. Zet iets op het lijstje om samen boodschappen te doen!',
  'one, two, one, two!': 'één, twee, één, twee!', 'left, left~': 'links, links~', 'right, right~': 'rechts, rechts~',

  // ---------- what he says (the common ones; his personalities' own lines are still English) ----------
  'fumu fumu~': 'fumu fumu~', 'mhm, mhm!': 'mhm, mhm!', 'for me?': 'voor mij?', 'yes please': 'ja graag', 'noted!': 'genoteerd!', 'ooh, new look!': 'ooh, een nieuwe look!',
  'on the calendar!': 'op de kalender!', 'I\'ll remind you!': 'ik herinner je eraan!', 'noted ✦': 'genoteerd ✦', 'every year, got it!': 'elk jaar, begrepen!', 'got it!': 'begrepen!',
  'so dizzy…': 'wat duizelig…', 'wheee!': 'wheee!', 'hehe, up we go': 'hehe, daar gaan we', 'where to?': 'waarheen?', 'how do I look?': 'hoe zie ik eruit?', 'like this?': 'zo?',
  'Ow! I\'m okay': 'Au! Het gaat wel', 'Ow! …I\'m okay!': 'Au! …het gaat wel!', 'Ouch! I\'m okay~': 'Auw! Het gaat wel~',
  'downloading something new…': 'iets nieuws aan het downloaden…', 'a new me is on the way~': 'een nieuwe ik is onderweg~', 'getting an update…': 'ik haal een update op…',
  'a new version is ready! restart me when you like': 'er is een nieuwe versie! start me opnieuw op wanneer je wilt', 'I have an update! ♡': 'ik heb een update! ♡', 'new me incoming~': 'nieuwe ik komt eraan~',
  'good job!': 'goed gedaan!', 'yay, done!': 'yes, klaar!', 'well done ♡': 'knap hoor ♡', 'ok, I\'ll remind you!': 'oké, ik herinner je eraan!', 'back in 10 minutes!': 'over 10 minuten terug!', 'I\'ll poke you later ♡': 'ik porrel je straks wel ♡',
  'nice walk~': 'fijne wandeling~', 'hmm hm hm ♪': 'hmm hm hm ♪', 'hehe, boo!': 'hehe, boe!', 'peekaboo!': 'kiekeboe!', 'found you!': 'gevonden!', 'up here!': 'hierboven!', 'nice view~': 'mooi uitzicht~', 'hehe, a perch': 'hehe, een zitstokje',
  'you can click me now!': 'je kunt me nu aanklikken!', 'here I am~': 'hier ben ik~', 'grab me!': 'pak me!', 'back to the game!': 'terug naar het spel!', 'I\'ll stay out of the way': 'ik blijf uit de weg', 'shh, play on~': 'sst, speel maar door~', 'back down~': 'weer naar beneden~',
  'the natural look?': 'de natuurlijke look?', 'just me!': 'gewoon ik!', 'all natural!': 'helemaal natuurlijk!', 'comfy… *yawn*': 'comfy… *gaap*', 'fresh look!': 'frisse look!',
  'ooh, what is it?': 'ooh, wat is het?', 'a present!': 'een cadeautje!', 'thank you! ♡': 'dankjewel! ♡', 'so exciting!': 'zo spannend!',
  '*yaaawn*': '*gaaap*', 'hwaaa~ good nap': 'hwaaa~ lekker geslapen', '*stretch*': '*rek*', '♪ hm hm hmm ♪': '♪ hm hm hmm ♪', 'nap time?': 'tijd voor een dutje?', 'squee~': 'jippie~',
  'what\'s in the cart?': 'wat zit er in het karretje?', 'so much loot!': 'wat een buit!', 'cart buddy!': 'karretjesmaatje!', 'achoo!': 'hatsjoe!', 'a-choo!': 'ha-tsjoe!', 'hatchoo!': 'hatsjoeoe!', 'burp! oops': 'boer! oeps', 'hehe, full': 'hehe, vol',
  '*yawn*… sleepy': '*gaap*… slaperig', 'hwaaa~': 'hwaaa~', 'hmm… ♪': 'hmm… ♪', 'mmm… ♡': 'mmm… ♡', 'mmm… teddy ♡': 'mmm… knuffel ♡', 'there you are…': 'daar ben je…', '…teddy ♡': '…knuffel ♡', 'teddy… ♡': 'knuffel… ♡',
  'oh… you came back…': 'oh… je bent terug…', 'hey… teddy?': 'hé… knuffel?', 'mm? …teddy…': 'mm? …knuffel…', 'where… teddy…': 'waar… knuffel…', 'mm… warm… ♡': 'mm… warm… ♡', 'ding ding~': 'ding ding~', 'tinkle~': 'tingel~',
  'huh… mm…': 'huh… mm…', '…ding…?': '…ding…?', 'wha—? who rang?': 'wat—? wie belde er?', 'ding…? I\'m awake…': 'ding…? ik ben wakker…',
  'A test reminder: time for your task!': 'Een testherinnering: tijd voor je taak!', 'jiggle jiggle!': 'wiebel wiebel!', 'wobble wobble~': 'wiebel wobbel~', 'squishy tummy!': 'zacht buikje!', 'boing boing': 'boing boing', 'mm… yum…': 'mm… lekker…',
  'no more snacks today…': 'geen snacks meer vandaag…', 'I\'m full for today ♡': 'ik zit vol voor vandaag ♡', 'dance dance!': 'dansen dansen!', 'hello~': 'hallo~', 'hi hi!': 'hoi hoi!', 'hello~ ': 'hallo~', 'hi! ♡': 'hoi! ♡',
  'off it goes!': 'daar gaat ie!', 'on its way ♡': 'onderweg ♡', 'fumu fumu~ sent!': 'fumu fumu~ verstuurd!',
  'all that shopping ♡': 'al die boodschappen ♡', 'one stamp per trip!': 'één stempel per winkelronde!', 'no trips yet… soon?': 'nog geen winkelrondes… binnenkort?', 'buy everything on the list!': 'koop alles van het lijstje!',
  'look at all those!': 'kijk eens hoeveel!', 'so many stamps!': 'zo veel stempels!', 'not yet… soon?': 'nog niet… binnenkort?', 'an empty spot!': 'een lege plek!', '*yaaawn* hi!': '*gaaap* hoi!',
  '*tiptoe*': '*op de tenen*', 'nom nom nom~': 'nom nom nom~', 'mmm, stolen tastes best': 'mmm, gestolen smaakt het lekkerst', 'don\'t tell anyone~': 'vertel het aan niemand~', '*munch munch* hehe': '*knabbel knabbel* hehe',
  'mine now~': 'nu van mij~', 'yoink was worth it': 'hap-snap was het waard', '…what?': '…wat?', '*gulp* nothing happened': '*slik* er is niets gebeurd', 'hehe… yum': 'hehe… lekker', 'I didn\'t see anything~': 'ik heb niets gezien~',
  'a-ah! it wasn\'t me!': 'a-ah! ik was het niet!', 's-sorry! ♡': 'sorry! ♡', 'I was only keeping it safe!': 'ik hield het alleen maar veilig!', '*whistles*': '*fluit*', 'hm? nothing here~': 'hm? hier is niets~', 'nothing to steal…': 'niets om te stelen…',
  'proud of you… zzz': 'trots op je… zzz', 'back to sleep… ♡': 'weer slapen… ♡', 'nn… good job… zzz': 'nn… goed gedaan… zzz', 'sweet dreams… yay you…': 'slaap lekker… hoera jij…', 'hmm, let me look…': 'hmm, laat me kijken…',
  'note to self…': 'notitie voor mezelf…', 'writing it down!': 'ik schrijf het op!', 'tap "+ date/time" to set a reminder!': 'tik op "+ datum/tijd" om een herinnering te maken!', 'I will remind you!': 'ik herinner je eraan!', 'on my calendar!': 'op mijn kalender!', 'on my clock!': 'op mijn klok!',
  'grab it and throw it!': 'pak hem en gooi hem!', 'throw me… I mean it!': 'gooi me… echt waar!', 'hey, that\'s too high!': 'hé, dat is te hoog!', 'hmph… give it?': 'hmpf… geef je hem?', 'no fair~': 'niet eerlijk~', 'can I have it now?': 'mag ik hem nu?',
  'tap my thought cloud to feed me!': 'tik op mijn gedachtewolk om me te voeren!', 'hm? say it again?': 'hm? zeg het nog eens?',
  'the wrecking ball… careful!': 'de sloopkogel… voorzichtig!', 'ooh, a big spiky one!': 'ooh, een grote stekelige!', 'no toy, then~': 'dan geen speeltje~', 'all put away!': 'allemaal opgeruimd!', 'the nice ball again ♡': 'weer de lieve bal ♡', 'back to the ball~': 'terug naar de bal~',
  'my eyes are closed to windows…': 'mijn ogen zijn dicht voor vensters…', 'oh no, it broke!': 'o nee, het ging kapot!', 'stop! stop!': 'stop! stop!', 'my windows!!': 'mijn vensters!!', 'stop it!': 'hou op!', 'come back!': 'kom terug!', 'bad ball!': 'stoute bal!', 'wait wait wait!': 'wacht wacht wacht!',
  'phew… ok, fixing it~': 'pfoe… oké, ik repareer het~', 'abracadabra!': 'abracadabra!', 'time for magic~': 'tijd voor magie~', 'my things!!': 'mijn spullen!!',
  'easy one! just a few things': 'makkelijk! maar een paar dingen', 'quick and simple, I like it': 'snel en simpel, mooi zo', 'ooh, that looks yummy!': 'ooh, dat ziet er lekker uit!', 'yum! what are we making?': 'lekker! wat gaan we maken?', 'sounds tasty!': 'klinkt lekker!',
  'ooh, how about {x}?': 'ooh, wat dacht je van {x}?', 'can we get {x}?': 'kunnen we {x} halen?', '{x}, please?': '{x}, alsjeblieft?', 'could I have {x}?': 'mag ik {x}?', 'ooh… {x}?': 'ooh… {x}?',
  'psst… tap the cloud, I want {x}!': 'psst… tik op de wolk, ik wil {x}!', 'I\'m peckish…': 'ik heb trek…', 'snack time?': 'snacktijd?',
  'I\'m {name}!!': 'ik ben {name}!!', '{name}, that\'s me!': '{name}, dat ben ik!', 'Gift: {n} box to open': 'Cadeau: {n} doosje om te openen', 'Gift: {n} boxes to open': 'Cadeau: {n} doosjes om te openen', 'Profile: your name and birthday ({x})': 'Profiel: je naam en verjaardag ({x})',
  '{n} plans further ahead in the calendar': '{n} plannen verderop in de kalender', '{n} plan further ahead in the calendar': '{n} plan verderop in de kalender', 'Build {n}': 'Versie {n}', 'Trip #{n} stamped!': 'Winkelronde #{n} gestempeld!', '{n} items': '{n} items', '{n} item': '{n} item'
});

// month and day names (the calendar writes them in English)
(function () {
  var M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  var D = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var DN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  M.forEach(function (m, i) { Dutch[m] = MN[i]; Dutch[m + ' {y}'] = MN[i] + ' {y}'; });
  D.forEach(function (d, i) { Dutch[d] = DN[i]; Dutch[d + ' {d} {m}'] = DN[i] + ' {d} {m}'; });
})();

// ---------- more: to-do list, stamp book, goals ----------
Object.assign(Dutch, {
  'Add a to-do, like call mum': 'Voeg een taak toe, zoals mama bellen', 'Add to-do': 'Taak toevoegen', 'Add a to-do': 'Taak toevoegen', 'Done': 'Klaar', '{n} of {m} today': '{n} van {m} vandaag',
  'Care': 'Zorg', 'Chores': 'Klusjes', 'Cooking': 'Koken', 'Errands': 'Karweitjes', 'Fitness': 'Sport', 'Fun': 'Plezier', 'Money': 'Geld', 'Social': 'Sociaal', 'Travel': 'Reizen', 'Trips': 'Winkelrondes', 'Work': 'Werk',
  '{x}, up to {n} a day': '{x}, maximaal {n} per dag',
  'Everything is unlocked for now. Your progress still counts, so rewards can come back later. Only a few count each day.': 'Alles is nu ontgrendeld. Je voortgang telt nog steeds mee, dus beloningen kunnen later terugkomen. Er tellen maar een paar per dag mee.',
  'Finish a shopping trip or tick off tasks for your first stamp ♡': 'Rond een winkelronde af of vink taken af voor je eerste stempel ♡',
  'Nothing noted yet. Tick something off or add an item.': 'Nog niets genoteerd. Vink iets af of voeg een item toe.', 'Nothing saved yet. Dress up, name the outfit and save it here.': 'Nog niets bewaard. Kleed je huisdier aan, geef de outfit een naam en bewaar hem hier.',
  'Pink studio': 'Roze studio', 'Tap “+ date/time” on a task to set when it\'s due, a time and a repeat. Tap its emoji, or long-press it, to pick a different one.': 'Tik op “+ datum/tijd” bij een taak om te kiezen wanneer hij klaar moet zijn, een tijd en een herhaling. Tik op de emoji, of houd hem ingedrukt, voor een andere.',
  'has nothing to do! Add a task, like "call mum", then tap it to give it a date, a time or a repeat.': 'heeft niets te doen! Voeg een taak toe, zoals "mama bellen", en tik erop voor een datum, tijd of herhaling.',
  'to-do list': 'takenlijst', 'touch your toes!': 'raak je tenen aan!', 'wiggle wiggle~': 'wiebel wiebel~', 'yaaay!': 'jaaa!', '★ {x}': '★ {x}', '{x} skin': '{x}-uiterlijk', 'Wrecking ball': 'Sloopkogel'
});
Object.assign(Dutch, { 'Check off {x}': 'Vink {x} af', 'Change emoji for {x}': 'Emoji van {x} veranderen' });
