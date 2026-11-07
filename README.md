# Ramayana — The Path of Dharma

A browser game that tells the Ramayana in seven chapters, from Bala Kanda to the homecoming in Ayodhya. It mixes story, choices, mini-games and a **Learning Scroll at every checkpoint**.

## Play
Open `index.html` in any modern browser by double-clicking it. There's nothing to install. Fonts load from Google Fonts when you're online; the game also works offline with fallback fonts.

- **Advance dialogue:** click, tap or press Space/Enter
- **The story is staged in 3D:** characters walk in, gesture as they speak and turn toward whoever is talking, while the camera cuts between close-ups, two-shots and wide shots. The title screen and Journey Map show a 3D diorama.
- **Battles are in 3D** (Three.js) when your browser supports WebGL. Switch between 3D and 2D with the "3D mode" button on the Journey Map.
- **3D controls:** WASD to move, Space to jump, J or click to attack (archers auto-aim; hold to charge), K for the special move, Shift or L to roll, and click the battlefield for a full 360° mouse camera (Esc releases it). Right-drag or Q/E also turn the camera, and on touch screens you drag with one finger. Jatayu flies with WASD, Space (up) and C (down).
- **2D action stages:**
  - A/D or ←/→ to move, W/Space to jump, L/Shift to roll
  - J or click to attack. Rama can hold to charge a piercing arrow and aims with the mouse. Hanuman and Sugriva tap for a 3-hit combo, or attack in mid-air to slam.
  - K for the special move when the gold bar is full. Esc or P pauses.
  - On touch screens, on-screen buttons appear.
- **Other mini-games:** use mouse or touch. Some also use Space (the bow, Hanuman's leap).
- Progress, learnings, met characters and dharma lotuses are saved in your browser.

## Files
| File | Contents |
|---|---|
| `DESIGN.md` | Game plan, style guide and character bible |
| `js/art.js` | Hand-built SVG characters and scenes in miniature-painting style |
| `js/data.js` | Characters, learnings and all seven chapter scripts |
| `js/story3d.js` | 3D story staging: sets for every location, cast blocking, film-style camera |
| `js/action3d.js` | 3D combat: modelled characters with painted faces, toon shading and ink outlines, arenas, bosses, cinematics |
| `vendor/three.min.js` | Three.js r149 (MIT), bundled so the game works offline |
| `js/action.js` | Side-scrolling combat engine: animated figures with joints, waves, bosses, cinematics |
| `js/games.js` | Canvas mini-games: the bow, the deer, ornaments, the leap, Ram Setu, the lamps |
| `js/engine.js` | Dialogue, choices, map, gallery, Wisdom Scroll and saving |
| `js/audio.js` | WebAudio tanpura drone and sound effects |
| `css/style.css` | Visual styling |

## Sources
The story follows Valmiki's Ramayana. Details from later traditions are labelled where they appear in the game: Tulsidas's Ramcharitmanas, the Lakshmana Rekha, Shabari's tasted berries, the squirrel at Ram Setu, and the nectar in Ravana's navel.
