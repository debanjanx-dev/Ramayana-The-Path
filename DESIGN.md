# Ramayana — The Path of Dharma · Design Plan

## Pillars
1. **Faithful, detailed characters** — iconography drawn from Valmiki and the living tradition, with sources labelled where later retellings (Tulsidas, Kamban, folk) add details.
2. **Learn by playing** — each checkpoint ends with a *Learning Scroll*: value, sourced quote, story context and a reflection question.
3. **Short, varied play** — every chapter mixes story, "What would they do?" choices and one or two mini-games (2–5 min each).

## Visual style — Indian miniature painting
| Element | Treatment |
|---|---|
| Palette | vermilion `#b8321f`, saffron `#e8891c`, turmeric `#f2c14e`, indigo `#1d2457`, peacock `#0f6b6b`, leaf `#4a7c3a`, parchment `#f6e7c8`, gold leaf `#d4a017` |
| Line | dark ink outlines (`#2b1a10`), flat fills, gold ornament |
| Faces | almond "lotus" eyes with kajal tails, arched brows, tilak per sect |
| Frames | portraits in arched *jharokha* windows; dialogue on parchment scrolls; narration (Valmiki) on an indigo scroll |
| Type | *Yatra One* (titles), *Cormorant Garamond* (text), *Tiro Devanagari Hindi* (Sanskrit/Hindi) |
| Sound | WebAudio — tanpura drone (Sa–Pa), Bhupali pentatonic chimes, conch at chapter openings |

## Character bible (key details)
- **Rama** — blue *shyama* skin, yellow *pitambara*, sacred thread, Kodanda bow & quiver, halo; youthful side-locks (*kākapakṣa*) in Bala Kanda, matted *jaṭā* & bark cloth in exile; serene half-lowered eyes.
- **Lakshmana** — fair-golden, smaller crown, bow, ever-watchful stern brow.
- **Sita** — red saree, green blouse, jasmine, sindoor, nose-ring; in Ashoka Vatika: single faded yellow garment, single braid (*ekaveṇī*), no jewels (she dropped them).
- **Hanuman** — orange-red fur, sindoor tilak, gada, crown, curled tail; his name refers to his struck jaw (*hanu*).
- **Ravana** — ten heads, Shaiva *tripundra*, ornate crowns, curled moustache; scholar & veena player too.
- **Bharata** — resembles Rama, ascetic bark cloth, carries Rama's *pādukās*.
- **Sugriva** — wears the garland Rama gave him to tell him apart from Vali.
- **Jatayu** — crowned king of vultures, friend of Dasharatha.
- Also: Valmiki, Vishwamitra, Janaka, Dasharatha, Kaikeyi, Shabari, Jambavan, Vibhishana, the Golden Deer.

## Chapters & mechanics
| # | Kanda | Mechanic | Learning(s) |
|---|---|---|---|
| 1 | Bala | Archery — guard the yajna (Maricha is *banished*, not killed — he returns!) · Timing — string Shiva's bow | Strength is for protection · Humility before strength |
| 2 | Ayodhya | Choices — Rama's response to exile; Bharata & the padukas | Keep your word · Power is a trust |
| 3 | Aranya | Reflex — the golden deer (spare the real deer) · Jatayu · Shabari choice | Not all that glitters · Stand up for right · Love over ceremony |
| 4 | Kishkindha | Memory match — Sita's ornaments · anklet question · Jambavan | Respect in small habits · You are stronger than you remember |
| 5 | Sundara | Flyer — Hanuman's leap (Surasa's jaws, Simhika's shadow, Mainaka's blessing) · gentle approach to Sita | Wisdom over force · Gentleness builds trust |
| 6 | Yuddha | Choice — refuge for Vibhishana · Bridge — click stones bearing "राम" (+squirrel) · Boss — regrowing heads → Brahmastra at the navel | Refuge · No help is too small · Ego falls / enmity ends at death |
| 7 | Homecoming | Light the diyas before the Pushpaka lands | Light over darkness · The ruler serves |

## Systems
- Script engine: steps (`bg`, `n` narrate, `say`, `choice`, `game`, `learn`, `meet`, `fx`).
- Saves (localStorage): unlocked chapters, learnings, met characters, lotus points.
- Screens: Title · Journey Map · Story · Mini-game · Learning Scroll · Characters gallery · Wisdom Scroll (all learnings) · Finale.
- Fixed 1280×720 stage scaled to any screen; mouse, touch and keyboard (Space/Enter).

## Action layer (v2)
Every major battle is now a playable side-scrolling fight:

**Figures:** full-body figures with joints (hip, knee, shoulder, elbow), animated through poses: idle, run, jump, aim, wind-up, strike, combo, slam, roll, hurt, fall. Each figure wears the detailed portrait head.

**Feel:** hit-stop, knockback, screen shake, damage numbers and sparks. Every enemy attack is telegraphed with a red "!", ground shockwaves can be jumped, and low sweeps show a red danger zone. Lotus health drops and healing between waves keep it forgiving.

**Cinematics:** letterboxed stage intros, boss name cards (Devanagari plus English), slow-motion defeat captions and speech barks.

| Stage | Hero (style) | Boss and mechanic |
|---|---|---|
| Siddhashrama | Young Rama (archer) | Tataka (charge, rock throws, leap-slam); Subahu plus Maricha, who is hurled into the sea rather than killed |
| Janasthana | Rama (archer) | 4 waves of Khara's army, then Khara (dash, leap, combo, archers) |
| Sky over Panchavati | Jatayu (flyer) | Ravana's chariot with Sita; the stage ends when Chandrahasa falls |
| Kishkindha | Sugriva (brawler) | Vali can't be beaten; survive until Rama's arrow |
| Ashoka Vatika | Hanuman (brawler; giant form) | Akshaya Kumara |
| Lanka Dahan | Hanuman (runner) | Rooftops catch fire as you land |
| The Giant Awakes | Rama (archer) | Kumbhakarna (stomp waves, low sweep, boulders, march) |
| Rama and Ravana | Rama (archer) | 10 heads regrow; then charged arrows into the glowing amṛta navel |
