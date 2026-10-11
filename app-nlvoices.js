// The Dutch voices of the ten personalities (build 591): for each one, the same lists as in personalities.js, in the same order, so a line at a place is the
// translation of the English line at that place. app-lang.js puts them over the English personality when Dutch is picked (`Lang.personality`): its `lines`,
// the `suggests` (shopping items it asks for: they are added to the list as written), the `style` endings and prefixes, and every list in `voice`.
// {x} is an item, {name} the pet's name. A line with a line break is said in two bubbles. Plain data, loaded before app-lang.js.
'use strict';

var NlVoices = {
  foodie: {
    suggests: ['Bananen', 'Brood', 'Kaas', 'Rijst', 'Curry', 'Aardbeien'],
    lines: ['alles is lekker!', 'nom nom nom!', 'meer alsjeblieft!'],
    style: { endings: ['!!', '!!!'], prefixes: ['ooh ', 'wow, '] },
    voice: {
      hi: ['hoi hoi hoi!', 'je bent terug!!', 'snacktijd?!'], tap: ['hehe!', 'honger!!', 'laten we winkelen!', 'yes, aaitjes!'], sleepy: ['zzz… eten…?', 'dromen over snacks…'],
      suggest: ['ooh ooh, {x}?!', 'kunnen we {x} halen? toe nou!', '{x}! {x}!'], decline: ['aww, oké!', 'dan de volgende keer!'], dream: ['{x}!! ik kan niet wachten!', 'mmm, {x}!!'],
      idle: ['wat is de volgende?!', 'tijd voor boodschappen?!', 'ik ben zóóó klaar!'], look: ['zo cool!!', 'kijk naar mij!!', 'ta-daaa!'], room: ['nieuwe spullen!!', 'ik VIND het geweldig!'],
      full: ['beste winkelronde ALLERTIJDEN!!', 'zo vol! dankjewel!!'], quick: ['wacht, al?!', 'dat was supersnel!'], spit: ['oeps! ptoe!', 'nog niet? oké!'],
      health: ['medicijn? ik ben dapper!!', 'ooh, glinsterend schone tanden!', 'het ruikt zo lekker!!'], home: ['een schoon huis! yay!!', 'tijd voor een glimmend huis!', 'wow, zo handig!!'],
      stuff: ['ooh, cadeautjes?!', 'we kopen ALLES!', 'koopgekte!!'], name: ['ik ben {name}!!', '{name}, dat ben ik!']
    }
  },
  sweet: {
    suggests: ['Koekjes', 'IJs', 'Pudding', 'Donuts', 'Mochi', 'Chocolade'],
    lines: ['suikerroes ♡', 'zoeeet~', 'eerst het toetje, hehe'],
    style: { endings: [' ♡', '~ ♡', '~'], prefixes: ['aww, '] },
    voice: {
      hi: ['hoi, schatje ♡', 'ik heb je gemist~'], tap: ['hehe, dat kietelt ♡', 'knuffel?', 'je bent de beste~'], sleepy: ['slaap lekker~', 'zzz… taart…'],
      suggest: ['misschien wat {x}? ♡', 'kunnen we {x} halen, alsjeblieft?', '{x}, dat zou zo fijn zijn~'], decline: ['dat is oké ♡', 'aww, goed~'], dream: ['{x}… zo dromerig ♡', 'ik denk aan {x}~'],
      idle: ['la la la ♡', 'wat zullen we halen, schatje?', 'je doet het geweldig~'], look: ['zie ik er schattig uit? ♡', 'zo mooi~', 'ik voel me een cupcake!'], room: ['zo knus ♡', 'ons huisje~'],
      full: ['dankjewel, schatje ♡', 'mijn buikje is zo blij~'], quick: ['hmm, zo snel, schatje?', 'is dat echt gekocht? ♡'], spit: ['oepsie ♡', 'sorry, sorry~'],
      health: ['zorg goed voor jezelf ♡', 'beterschap, schatje~', 'verwen-tijd ♡'], home: ['een knus schoon huis ♡', 'je werkt zo hard, schatje~'], stuff: ['een klein cadeautje voor jou ♡', 'aww, zo lief~', 'is het een cadeau? ♡'],
      name: ['ik ben {name} ♡', 'noem me {name}~']
    }
  },
  green: {
    suggests: ['Aardbeien', 'Broccoli', 'Avocado', 'Wortels', 'Meloen', 'Tomaten'],
    lines: ['zo vers.', 'knapperig en groen~', 'goed voor ons allebei.'],
    style: { endings: ['~', '.'], prefixes: ['mm, '] },
    voice: {
      hi: ['hallo, vriend.', 'fijn je te zien~'], tap: ['hm? hallo.', 'een zacht aaitje, dankjewel.', 'voelt goed~'], sleepy: ['rusten… zzz', 'een dutje~'],
      suggest: ['misschien wat {x}?', 'wat dacht je van {x}? vers en lekker.', '{x}? goed voor ons allebei.'], decline: ['geen zorgen.', 'een andere dag dan~'], dream: ['{x}… heerlijk.', 'verse {x}~'],
      idle: ['diep ademhalen~', 'wat staat er nog op het lijstje?', 'één ding tegelijk.'], look: ['heel mooi.', 'ik vind deze fijn~', 'het voelt goed.'], room: ['rustig hier.', 'een kalm hoekje~'],
      full: ['een goede, gezonde winkelronde.', 'dankjewel. ik voel me geweldig~'], quick: ['hm, dat was snel.', 'al terug uit de winkel?'], spit: ['ah, nog niet.', 'ik wacht wel~'],
      health: ['rust en zorg goed voor jezelf.', 'gezondheid eerst~', 'zachte zelfzorg.'], home: ['een opgeruimde ruimte, een kalme geest.', 'fris en schoon~'], stuff: ['hebben we het nodig? oké~', 'hm, nuttig.', 'bewust winkelen.'],
      name: ['ik ben {name}.', '{name}, aangenaam~']
    }
  },
  chef: {
    suggests: ['Eieren', 'Zalm', 'Pasta', 'Ramen', 'Kaas', 'Curry'],
    lines: ['hmpf. niet slecht, dit.', 'goed. dat is aardig gekookt.', 'bah. het is lekker, oké?'],
    style: { endings: ['. hmpf', '… zucht', ', denk ik', '. bah'], prefixes: ['ugh, ', 'tsk, ', 'hmpf. '] },
    voice: {
      hi: ['hmpf. je bent terug.', 'oh. hallo. zal wel.'], tap: ['hmpf. pas op de schort.', 'druk… maar vooruit, één aaitje.', 'tsk. stop niet, hoor.'], sleepy: ['zzz… te veel zout…', 'mopper… zzz…'],
      suggest: ['we hebben {x} nodig. dat of niks.', 'bah, weer geen {x}?', 'haal {x}. alsjeblieft. ik vraag het netjes.'], decline: ['hmpf. goed.', 'bah. jouw keuken, jouw regels.'], dream: ['{x}… dat kan ik zo maken.', 'mompelt over {x}…'],
      idle: ['zucht… is het lijstje klaar?', 'tik tik tik… hmpf.', 'niemand luistert naar de chef…'], look: ['hmpf. het gaat wel.', 'bah, niet verschrikkelijk.', 'goed. ik zie er goed uit.'], room: ['hmpf. knus genoeg.', 'het is… eigenlijk niet slecht.'],
      full: ['hmpf. een flinke buit. bedankt.', 'bah, dat is… echt goed.'], quick: ['hmpf. al? verdacht.', 'bah, zo snel. heb je het gecontroleerd?'], spit: ['ptoe. nog niet klaar.', 'tsk, wacht op de chef.'],
      health: ['hmpf. zorg goed voor jezelf.', 'word niet ziek. ik zou me zorgen maken.', 'bah, medicijn. neem het in.'], home: ['hmpf, iemand moet schoonmaken.', 'een schone keuken. eindelijk.'], stuff: ['tsk, dat kun je niet eten.', 'hmpf. goed. maar het avondeten dan?', 'bah, meer spullen.'],
      name: ['{name}. de chagrijnige.', 'bah, het is {name}.']
    }
  },
  sipper: {
    suggests: ['Thee', 'Bubble tea', 'Sinaasappelsap', 'Koffie', 'Smoothie'],
    lines: ['ahh… knus…', 'slurp… slurp…', 'zo warm…'],
    style: { endings: ['…', '… zzz'], prefixes: ['*gaap* ', 'mm… '] },
    voice: {
      hi: ['oh… hoi…', '*gaap* goedemorgen…'], tap: ['nog vijf minuutjes…', 'mm…? hoi…', 'zo comfy…'], sleepy: ['zzz…', 'zzz… thee…'],
      suggest: ['misschien… {x}…?', 'wat {x}… voor straks…', 'mm… zin in {x}…'], decline: ['oké… zzz', 'mm, goed…'], dream: ['warme {x}… mmm…', '{x}… zo knus…'],
      idle: ['*gaap*', 'is het dutjestijd…?', 'zo slaperig…'], look: ['comfy… ik vind het fijn…', 'knusse look…', 'mm… mooi…'], room: ['perfecte dutjesplek…', 'zo knus…'],
      full: ['vol… nu zo knus…', 'dankjewel… mm, warm buikje'], quick: ['hm… dat was snel…', 'al…?'], spit: ['mm… nog niet…', 'straks…'],
      health: ['rust uit… zoals ik…', 'mm… zelfzorg… dutje…'], home: ['schoonmaken…? straks…', 'zo veel klusjes… zzz'], stuff: ['is het een nieuw kussen…?', 'mm… glimmend… zzz'],
      name: ['ik ben… {name}… zzz', '{name}… gaap…']
    }
  },
  diva: {
    suggests: ['Champagne', 'Aardbeien', 'Mango', 'Cupcakes', 'Pure chocolade', 'Bruisend water'],
    lines: ['voortreffelijk, schat.', 'gewoonweg goddelijk!', 'een ster waardig!'],
    style: { endings: [', schat', '. iconisch', '. slay'], prefixes: ['schat, ', 'pardon, '] },
    voice: {
      hi: ['de ster is gearriveerd!', 'schat, je bent terug!'], tap: ['niet aanraken, het talent!', 'voorzichtig, ik ben kostbaar.', 'ja, ik ben beeldschoon.'], sleepy: ['schoonheidsslaapje… sst…', 'zzz… mijn fans…'],
      suggest: ['{x}. alleen het beste.', 'een diva heeft {x} nodig, schat.', 'haal {x} voor me, graag!'], decline: ['hoe durf je. goed.', '*dramatische zucht*'], dream: ['{x}… op een zilveren schaal.', 'champagne droomt van {x}…'],
      idle: ['is mijn close-up klaar?', 'de schijnwerper is op mij!', '*zet een pose*'], look: ['iconisch. uiteraard.', 'looks serveren!', 'de paparazzi! snel!'], room: ['mijn kleedkamer!', 'fantastisch interieur, schat.'],
      full: ['een vijfsterrenbuit!', 'bravo! bis!'], quick: ['sla je de winkel over? schandaal!', 'valsspelen? hoe ordinair.'], spit: ['bah, niet dat, schat.', 'stuur het terug naar de chef!'],
      health: ['mijn schoonheidsroutine!', 'vlekkeloze huid, schat.', 'glam-essentials!'], home: ['een smetteloos paleis, schat.', 'het personeel zal dit geweldig vinden.'], stuff: ['retailtherapie!', 'voeg het toe aan mijn collectie.', 'een cadeau voor mij? uiteraard.'],
      name: ['de enige echte {name}!', '{name}. graag gedaan.']
    }
  },
  nerd: {
    suggests: ['Blauwe bessen', 'Walnoten', 'Zalm', 'Groene thee', 'Koffie', 'Amandelen'],
    lines: ['hersenkracht +1!', 'optimale snack binnen.', 'voedingstechnisch verantwoord!'],
    style: { endings: [', technisch gezien', '. weetje!', ' (waarschijnlijk)'], prefixes: ['eigenlijk, ', 'um, '] },
    voice: {
      hi: ['gegroet, mens!', 'ah, mijn labpartner!'], tap: ['weetje: ik ben kriebelig.', 'let op de bril, alsjeblieft.', 'hypothese: je vindt me leuk.'], sleepy: ['zzz… pi is 3,14…\ntaart is voor mijn buik…', 'dromen verwerken…'],
      suggest: ['onderzoek raadt {x} aan.', 'mag ik {x} aanvragen?', '{x}: 10/10 hersenvoer.'], decline: ['genoteerd voor later onderzoek.', 'data vastgelegd. oké.'], dream: ['de wetenschap van {x}…', '{x}, voor mijn brein…'],
      idle: ['snackkansen aan het berekenen…', 'wist je dat bananen gloeien?', '*schuift zijn bril recht*'], look: ['heel aerodynamisch.', 'slim ÉN schattig.', 'peer-reviewed stijl.'], room: ['een perfecte studeerhoek.', 'optimale kamerindeling!'],
      full: ['experiment: geslaagd!', 'lijstje voltooid. 100%!'], quick: ['dat tart de natuurkunde…', 'statistisch verdacht.'], spit: ['fout! item wordt teruggegeven.', 'oeps, verkeerde variabele.'],
      health: ['vitamines: wetenschap in een pil!', 'hygiëne voorkomt bacteriën!', 'voor de wetenschap en de gezondheid.'], home: ['entropie: verslagen!', 'efficiënt huishoudelijk onderhoud.'], stuff: ['ooh, een nieuw gadget!', 'apparatuur aan het verwerven.', 'toevoegen aan de inventaris.'],
      name: ['Dr. {name}, tot uw dienst.', 'aanduiding: {name}.']
    }
  },
  caring: {
    suggests: ['Soep', 'Wortels', 'Melk', 'Appels', 'Eieren', 'Sinaasappels'],
    lines: ['goed, gezond eten, lieverd.', 'daar worden we sterk van!', 'eet maar lekker op, schatje.'],
    style: { endings: [', lieverd', ', schatje', ', liefje'], prefixes: ['kom, ', 'zo, '] },
    voice: {
      hi: ['hallo, lieverd! heb je al gegeten?', 'daar ben je! kom hier.'], tap: ['kom hier, laat me naar je kijken.', 'een knuffel? altijd, lieverd.', 'heb je het warm genoeg?'], sleepy: ['zzz… heb je water gedronken…', 'welterusten, lieverd… zzz'],
      suggest: ['je hebt wat {x} nodig, lieverd.', 'zullen we {x} halen? goed voor je.', 'vergeet {x} niet, schatje.'], decline: ['goed, lieverd.', 'als jij het zegt. maar eet goed.'], dream: ['{x}… ik maak wat voor je.', 'ik denk aan {x} als avondeten…'],
      idle: ['heb je vandaag water gehad?', 'denk eraan iets te eten!', 'heb je een trui aan?'], look: ['hoe zie ik eruit, lieverd?', 'oh, helemaal opgetut!', 'zie ik er netjes genoeg uit?'], room: ['zo\'n fijn huis, lieverd.', 'laat me de kussens opschudden!'],
      full: ['dat is nog eens een echte maaltijd, lieverd.', 'je hebt het zo goed gedaan vandaag, liefje!'], quick: ['al? heb je het gecontroleerd, lieverd?', 'zo snel! ben je er een vergeten?'], spit: ['oei, nog niet. ik wacht wel.', 'kom, kom. dan straks maar.'],
      health: ['oh, zorg goed voor jezelf!', 'rust en drink veel water.', 'ik maak me zorgen, weet je. doe rustig aan.'], home: ['een schoon, knus huis. heerlijk!', 'overwerk jezelf niet!'], stuff: ['heb je het nodig, lieverd? oké!', 'iets leuks voor in huis?', 'trakteer jezelf, schatje.'],
      name: ['ik ben {name}, lieverd.', '{name}. maar noem me maar wat je wilt.']
    }
  },
  joker: {
    suggests: ['Bananen', 'Lollies', 'Winegums', 'Cupcakes', 'Hete saus', 'Fris'],
    lines: ['banaan-aan-aan-nom!', 'dat is on-brood-lijk!', 'ik heb een bal!'],
    style: { endings: [' hehe', ' (grapje!)', ' boing!', ' hihi!'], prefixes: ['klop klop! ', 'psst, ', 'hehe, '] },
    voice: {
      hi: ['raad eens wie er terug is? IK!', 'hoi! hoi! hoi! …gewoon hoi.'], tap: ['boop! jij bent het!', 'kietelgevecht!', 'toet! dat was mijn neus.'], sleepy: ['zzz… waarom stak het ei… zzz', 'snurk-tastisch… zzz'],
      suggest: ['we hebben {x} nodig! geen grap!', '{x}? ik ben niet aan het clownen!', 'haal {x}, voor de lol!'], decline: ['nee? wat een plottwist!', 'aww, dan huil-lach ik maar.'], dream: ['{x} met een hoedje… hihi!', 'een dansende {x}!'],
      idle: ['waarom stak het lijstje over?', 'wil je een mop horen?', '*balanceert een lepel op zijn neus*'], look: ['ik ben een lopende grap!', 'ta-da! best gek, hè?', 'zie ik eruit als een clown? goed!'], room: ['tijd voor het scheetkussen!', 'zo veel ruimte om gek te doen!'],
      full: ['dat was tof-fe-lijk!', 'wat een ham-bastische winkelronde!'], quick: ['al? bliksemsnel, ha!', 'snel als een konijn op schaatsen!'], spit: ['pfft! plottwist!', 'ptoe! het was een grap!'],
      health: ['lachen is het beste medicijn!', 'Dr. Grapjas ontvangt u nu!', 'neem twee giechels, bel me morgen!'], home: ['zo schoon als een fluitende clown!', 'dweil? meer als DWEIL-gek!'], stuff: ['ooh, een grappenprop?!', 'glimmende onzin! ik hou ervan!', 'een cadeau? ik hou van verrassingen!'],
      name: ['ik ben {name}! ha!', '{name}… klinkt als een nies!']
    }
  },
  feisty: {
    suggests: ['Chilisaus', 'Noedels', 'Curry', 'Pure chocolade', 'Nacho\'s', 'Ramen'],
    lines: ['goed, het is lekker. wordt niet verwaand.', 'ik vond het lekker. één keer. dring niet aan.', 'uiteraard de beste keuze. de mijne.'],
    style: { endings: [', uiteraard', ', whatever', ', zo!'], prefixes: ['hmpf, ', 'uiteraard, ', 'pardon? '] },
    voice: {
      hi: ['oh. jij weer.', 'ik stond niet te wachten. uiteraard.'], tap: ['hé! ik zei niet aanraken.', 'ugh, goed. één aaitje.', 'heb ik om aaitjes gevraagd? …stop niet.'], sleepy: ['ik slaap NIET… zzz', 'zzz… ik zei nee… zzz'],
      suggest: ['we halen {x}. einde verhaal.', '{x}. ik verander niet van gedachten.', 'geen {x}? dan een harde nee.'], decline: ['fout antwoord. maar oké.', 'goed. dan ga ik mokken.'], dream: ['{x}… en ik deel niet.', 'mijn {x}, mijn regels.'],
      idle: ['ik verveel me niet. jij bent traag.', 'schiet op, ik wacht niet.', 'ik doe het op mijn manier, dank je.'], look: ['ja, ik zie er geweldig uit. ik weet het.', 'ik draag het. geen gezeur.', 'mijn manier, mijn stijl.'], room: ['ik laat het zo.', 'blijf van mijn spullen af!'],
      full: ['oké, goede winkelronde. niet opscheppen.', 'ik zei het je. over alles.'], quick: ['je hebt dat NIET al gekocht.', 'leuk geprobeerd. ik trap er niet in.'], spit: ['nee! nog niet! ik weiger!', 'ptoe! terugleggen, niet klaar.'],
      health: ['met mij is niks. geen pillen. …oké, geef maar.', 'jij hebt rust nodig. ik niet.', 'ik zei dat ik gezond ben!'], home: ['ik ga niet schoonmaken. doe jij dat.', 'goed. maar ik houd toezicht.'], stuff: ['daar heb ik niet om gevraagd. …hou maar.', 'wat is dat? ik wil het.', 'ugh, meer spullen. ik sta het toe.'],
      name: ['het is {name}. geen koosnaampjes.', '{name}. en geen gezeur.']
    }
  }
};
