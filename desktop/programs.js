// The programs Fumu can recognise when one is in front: a curated list of games and common apps, matched by the program's file name
// (nothing else: never its window title, its tabs or what is in it). Anything not on the list is just "something else", and its name
// is never passed on. Plain data and functions with no Electron in them, so it can be tested.
'use strict';

/** Games: program file name (lower case) -> the name Fumu says. */
var GAMES = {
  'minecraft.windows.exe': 'Minecraft', 'minecraft.exe': 'Minecraft', 'valorant-win64-shipping.exe': 'Valorant', 'league of legends.exe': 'League of Legends',
  'fortniteclient-win64-shipping.exe': 'Fortnite', 'r5apex.exe': 'Apex Legends', 'cs2.exe': 'Counter-Strike 2', 'csgo.exe': 'Counter-Strike',
  'dota2.exe': 'Dota 2', 'overwatch.exe': 'Overwatch', 'gta5.exe': 'GTA V', 'rdr2.exe': 'Red Dead Redemption 2', 'eldenring.exe': 'Elden Ring',
  'genshinimpact.exe': 'Genshin Impact', 'starrail.exe': 'Honkai: Star Rail', 'zenlesszonezero.exe': 'Zenless Zone Zero', 'wuthering waves.exe': 'Wuthering Waves',
  'stardew valley.exe': 'Stardew Valley', 'terraria.exe': 'Terraria', 'among us.exe': 'Among Us', 'robloxplayerbeta.exe': 'Roblox',
  'rocketleague.exe': 'Rocket League', 'wow.exe': 'World of Warcraft', 'ffxiv_dx11.exe': 'Final Fantasy XIV', 'hades.exe': 'Hades', 'hades2.exe': 'Hades II',
  'celeste.exe': 'Celeste', 'hollow_knight.exe': 'Hollow Knight', 'cyberpunk2077.exe': 'Cyberpunk 2077', 'bg3.exe': "Baldur's Gate 3", 'bg3_dx11.exe': "Baldur's Gate 3",
  'palworld-win64-shipping.exe': 'Palworld', 'helldivers2.exe': 'Helldivers 2', 'lethal company.exe': 'Lethal Company', 'balatro.exe': 'Balatro',
  'skyrimse.exe': 'Skyrim', 'fallout4.exe': 'Fallout 4', 'witcher3.exe': 'The Witcher 3', 'hogwartslegacy.exe': 'Hogwarts Legacy', 'diablo iv.exe': 'Diablo IV',
  'pathofexile.exe': 'Path of Exile', 'pathofexile_x64.exe': 'Path of Exile', 'lostark.exe': 'Lost Ark', 'destiny2.exe': 'Destiny 2', 'rainbowsix.exe': 'Rainbow Six Siege',
  'tslgame.exe': 'PUBG', 'warframe.x64.exe': 'Warframe', 'ts4_x64.exe': 'The Sims 4', 'civilizationvi.exe': 'Civilization VI', 'factorio.exe': 'Factorio',
  'rimworldwin64.exe': 'RimWorld', 'factorygame-win64-shipping.exe': 'Satisfactory', 'valheim.exe': 'Valheim', 'subnautica.exe': 'Subnautica',
  'ittakestwo.exe': 'It Takes Two', 'davethediver.exe': 'Dave the Diver', 'cuphead.exe': 'Cuphead', 'undertale.exe': 'Undertale', 'osu!.exe': 'osu!',
  'fallguys_client_game.exe': 'Fall Guys', 'hearthstone.exe': 'Hearthstone', 'overcooked2.exe': 'Overcooked 2', 'cultofthelamb.exe': 'Cult of the Lamb', 'spiritfarer.exe': 'Spiritfarer',
  'monsterhunterworld.exe': 'Monster Hunter World', 'monsterhunterrise.exe': 'Monster Hunter Rise',
  'eldenring_dx12.exe': 'Elden Ring', 'sekiro.exe': 'Sekiro', 'darksoulsiii.exe': 'Dark Souls III', 'darksoulsii.exe': 'Dark Souls II', 'darksoulsremastered.exe': 'Dark Souls Remastered', 'darksouls.exe': 'Dark Souls',
  'data.exe': 'Dark Souls',   // the original PC release (Prepare to Die Edition) really is called DATA.exe
  'wowclassic.exe': 'World of Warcraft Classic', 'wow-64.exe': 'World of Warcraft', 'marvelrivals-win64-shipping.exe': 'Marvel Rivals'
};

/** Everyday programs: file name -> [what kind, the name Fumu says]. */
var APPS = {
  'chrome.exe': ['browser', 'Chrome'], 'msedge.exe': ['browser', 'Edge'], 'firefox.exe': ['browser', 'Firefox'], 'brave.exe': ['browser', 'Brave'],
  'opera.exe': ['browser', 'Opera'], 'vivaldi.exe': ['browser', 'Vivaldi'], 'arc.exe': ['browser', 'Arc'],
  'code.exe': ['code', 'VS Code'], 'cursor.exe': ['code', 'Cursor'], 'devenv.exe': ['code', 'Visual Studio'], 'idea64.exe': ['code', 'IntelliJ'],
  'pycharm64.exe': ['code', 'PyCharm'], 'webstorm64.exe': ['code', 'WebStorm'], 'rider64.exe': ['code', 'Rider'], 'sublime_text.exe': ['code', 'Sublime Text'],
  'notepad++.exe': ['code', 'Notepad++'], 'windowsterminal.exe': ['code', 'the terminal'], 'cmd.exe': ['code', 'the terminal'], 'powershell.exe': ['code', 'the terminal'],
  'pwsh.exe': ['code', 'the terminal'],
  'discord.exe': ['chat', 'Discord'], 'slack.exe': ['chat', 'Slack'], 'teams.exe': ['chat', 'Teams'], 'ms-teams.exe': ['chat', 'Teams'],
  'whatsapp.exe': ['chat', 'WhatsApp'], 'telegram.exe': ['chat', 'Telegram'], 'signal.exe': ['chat', 'Signal'], 'zoom.exe': ['call', 'Zoom'],
  'spotify.exe': ['music', 'Spotify'], 'itunes.exe': ['music', 'iTunes'], 'tidal.exe': ['music', 'Tidal'],
  'vlc.exe': ['video', 'VLC'], 'mpc-hc64.exe': ['video', 'the video player'], 'potplayermini64.exe': ['video', 'PotPlayer'], 'plex.exe': ['video', 'Plex'],
  'winword.exe': ['office', 'Word'], 'excel.exe': ['office', 'Excel'], 'powerpnt.exe': ['office', 'PowerPoint'], 'onenote.exe': ['office', 'OneNote'],
  'outlook.exe': ['mail', 'Outlook'], 'thunderbird.exe': ['mail', 'Thunderbird'], 'notion.exe': ['office', 'Notion'], 'obsidian.exe': ['office', 'Obsidian'],
  'acrobat.exe': ['office', 'Acrobat'], 'sumatrapdf.exe': ['office', 'a PDF'],
  'photoshop.exe': ['art', 'Photoshop'], 'illustrator.exe': ['art', 'Illustrator'], 'clipstudiopaint.exe': ['art', 'Clip Studio'], 'krita.exe': ['art', 'Krita'],
  'mspaint.exe': ['art', 'Paint'], 'gimp-2.10.exe': ['art', 'GIMP'], 'inkscape.exe': ['art', 'Inkscape'], 'aseprite.exe': ['art', 'Aseprite'],
  'figma.exe': ['art', 'Figma'], 'blender.exe': ['art', 'Blender'], 'medibangpaint.exe': ['art', 'MediBang'],
  'premiere pro.exe': ['video-edit', 'Premiere'], 'resolve.exe': ['video-edit', 'DaVinci Resolve'], 'obs64.exe': ['video-edit', 'OBS'],
  'steam.exe': ['launcher', 'Steam'], 'epicgameslauncher.exe': ['launcher', 'Epic Games'], 'battle.net.exe': ['launcher', 'Battle.net'],
  'riotclientservices.exe': ['launcher', 'the Riot launcher'], 'leagueclient.exe': ['launcher', 'the League client'], 'galaxyclient.exe': ['launcher', 'GOG Galaxy'],
  'eadesktop.exe': ['launcher', 'EA'],
  'explorer.exe': ['files', 'the file explorer']
};

/**
 * @param {string} exe  A program's file name (not its path).
 * @returns {{kind: string, name: string}|null} What it is when it is on the list ('game' for games), otherwise null.
 */
function identify(exe, mine) {
  if (typeof exe !== 'string') return null;
  var key = exe.toLowerCase();
  if (mine && Object.prototype.hasOwnProperty.call(mine, key)) return { kind: 'game', name: String(mine[key]).slice(0, 40) };   // games she taught him
  if (Object.prototype.hasOwnProperty.call(GAMES, key)) return { kind: 'game', name: GAMES[key] };
  if (Object.prototype.hasOwnProperty.call(APPS, key)) return { kind: APPS[key][0], name: APPS[key][1] };
  return null;
}

/**
 * What the page is told about the front program: a kind and a name for programs on the list; for any other program only that it is
 * "something else" (and whether it fills the screen). Its file name never leaves the shell.
 * @param {string|null} exe
 * @param {boolean} fullscreen  Whether its window fills a whole screen.
 * @param {Object} [mine]  Games the player taught him: file name (lower case) -> name.
 * @returns {{kind: string, name: string, fullscreen: boolean}}
 */
function describe(exe, fullscreen, mine) {
  var known = identify(exe, mine);
  if (known) return { kind: known.kind, name: known.name, fullscreen: !!fullscreen };
  return { kind: exe ? (fullscreen ? 'fullscreen' : 'other') : 'none', name: '', fullscreen: !!fullscreen };
}

module.exports = { GAMES: GAMES, APPS: APPS, identify: identify, describe: describe };
