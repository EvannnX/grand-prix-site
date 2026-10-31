# PRD: NYU Shanghai Grand Prix (AI Writathon Racing Game)

<!-- tab: PRD: NYU Shanghai Grand Prix (AI Writathon Racing Game) -->

# PRD: NYU Shanghai Grand Prix (AI Writathon Racing Game)

2026-10-21 · @someone

## 1. Overview

A browser-based 3D cartoon racing game for one player against three AI opponents. The player picks a driver and a car, votes on a map within 10 seconds alongside the AI drivers, and races three laps. All cars and drivers are generated with GenAI (Image 2 for chibi portraits, Tripo for 3D), and maps come from open-source track assets. Online multiplayer is kept as a future extension. Working title: NYU Shanghai Grand Prix.

**Mapping to the assignment**: this is the Creative Coding Project option in Part 1. It is due Wednesday, 2026-10-28, 11:59 PM, submitted through Google Docs, which leaves 7 days from today.

| Assignment deliverable | What this project provides |
| --- | --- |
| Part 1 proposal (about 150 words) | Draft in Section 11 |
| Part 2 creative piece | Playable game link + screen recording + screenshots |
| Part 2 documentation | Log of prompts, outputs and edits (template in Section 11) |
| Part 3 reflection (about 1,000 words) | Written from the process log |

Reflection is 50% of the grade and Collaboration 30%; the product itself counts for only 10% + 10%. This PRD therefore treats a recordable process as a requirement equal to a working game.

## 2. Goals and non-goals

The core goal: during in-class Peer Review on 10-28, a classmate sits at the laptop and finishes a full race against three AI drivers, with no setup and no other players needed.

**Goals**

- Single-player races against 3 AI opponents that drive competently and never get stuck for long
- Drivers and cars can be swapped and freely combined before every race; the AI takes the remaining drivers
- 10-second map vote in which the AI drivers also vote; ties are broken at random
- 3-lap races with rankings, a results screen, and race again
- One consistent cartoon look across AI-generated assets, open-source maps and UI
- Every car and driver asset is GenAI-generated, with a complete generation record

**Non-goals (not in these 7 days)**

- Online multiplayer (kept as an extension; see Section 7)
- Accounts or persistent leaderboards
- Machine-learned AI drivers (rule-based racing lines only)
- Mobile touch controls
- Realistic physics or rendering (arcade handling, cartoon shading)
- More than 3 maps, or an item system (listed as P2 if time allows)

## 3. User flow

Every race starts at driver + car selection, so swapping characters and cars is a fixed step of each round. The three AI opponents take the three drivers the player did not pick, each in a random car, so the grid always shows all four drivers.

[Embedded widget: Race flow · 6 stages, 1 loop](node/a33d0ce4-6b9b)

In code these are 6 phase states: MENU → SELECT → VOTE → COUNTDOWN → RACE → RESULTS, held in one game-state module. The race ends when the player crosses the line; AI cars still on track are ranked by their current progress.

## 4. Functional requirements and priorities

P0 is the minimum loop that must run before class on 10-26; P1 is completed before submission; P2 is only for spare time.

| ID | Module | Requirement | Priority |
| --- | --- | --- | --- |
| F1 | Start screen | Title, Play, difficulty (Easy / Normal / Hard), Credits | P0 |
| F2 | Driver select | Card carousel of 4 chibi drivers (Tong Shijun, Jeffrey S. Lehman, Bei Wu, David G. Atwill) with a 3D turntable preview | P0 |
| F3 | Car select | 3–4 cars; the chosen driver sits in the chosen car in a live preview | P0 |
| F4 | AI grid | The 3 AI opponents take the remaining drivers, each in a random car; nameplates show driver names | P0 |
| F5 | Map vote | 10-second countdown; each AI casts a random vote, revealed one by one; tie or no vote → random | P0 |
| F6 | Start | 4 grid slots, 3-2-1-GO countdown, input locked during countdown | P0 |
| F7 | Driving | WASD / arrow keys, arcade handling; off-track for 2 s → reset to last checkpoint | P0 |
| F8 | AI driving | Each AI follows the map's racing line: steers toward a look-ahead waypoint and brakes before sharp turns | P0 |
| F9 | AI difficulty | Difficulty sets AI top speed and how far it drifts from the racing line; light rubber-banding keeps races close | P1 |
| F10 | AI recovery | An AI stuck for 2 s reverses; still stuck after 4 s → reset to last checkpoint | P1 |
| F11 | Lap logic | A lap counts only after passing checkpoints in order (no shortcuts); 3 laps; same rule for AI | P0 |
| F12 | Live ranking | Sort by laps → checkpoint index → distance to next checkpoint; HUD shows place and lap | P1 |
| F13 | Results | Shown when the player finishes; place, time, driver + car for all 4 racers | P0 |
| F14 | Race again | Results return to driver select | P1 |
| F15 | Audio | Cartoon engine sounds, countdown and finish jingles | P1 |
| F16 | Minimap | Top-down minimap in the corner with every car | P2 |
| F17 | Boost | Boost pads or pickups on the track | P2 |
| F18 | Online multiplayer | Room codes and synced races; extension after the assignment | Extension |

**How drivers and cars combine**: drivers are generated as separate models and attached at runtime to a `seat` anchor on each car. The oversized chibi head sticks out of the car for a bobblehead look. 4 drivers × M cars therefore need only 4 + M models, not 4 × M.

## 5. AI asset pipeline: Image 2 + Tripo

Every asset goes through the same 6-step pipeline, and every step is logged. The pipeline itself is the evidence for the reflection's question of whether I acted as author or editor.

1. **Set a style anchor**: generate one chibi driver in Image 2 that I am happy with. Every later generation reuses this image plus the same style prompt (e.g. cartoon chibi, cel-shaded, bold outlines, 2.5 head-to-body ratio, racing suit in NYU violet, front view, neutral background, seated pose).
2. **Generate drivers in 2D**: 3–4 candidates per driver, pick one. Front-facing, unobstructed, plain background, so Tripo reads it cleanly.
3. **Convert to 3D in Tripo**: image-to-3D for drivers; text-to-3D for cars, or an Image 2 concept sketch first. Target a low-poly cartoon style that matches the drivers.
4. **Clean up in Blender**: unify scale (1 unit = 1 m) and orientation (car nose toward −Z), origin at the car's bottom center. Decimate to ≤ 20k triangles per car and ≤ 10k per driver. Add an empty named `seat` on each car as the driver mount.
5. **Export and compress**: export GLB and compress with gltf-transform (Draco / meshopt). Keep each file under about 2 MB so it loads quickly on campus Wi-Fi.
6. **Register in a manifest**: add to `assets/manifest.json` (id, display name, file path, thumbnail, tool and date). The selection screens are rendered from this list.

**Quantity targets**: 4 drivers (the four leaders, or 4 original fallback drivers; see Section 9) and 3–4 cars. When a generation fails (clipping, extra fingers, warped wheels), record the reason and take a screenshot; failures are the most useful material for the reflection.

**Open question**: what do Tripo's current terms say about ownership and commercial use on my plan (free and paid tiers may differ)? This directly answers the assignment's "Who owns the content" question, so screenshot the terms page.

## 6. Art direction: cartoon style

The whole game uses one cartoon look, enforced in code at load time, so Tripo models, Kenney maps and the UI match even when the AI outputs do not. Tripo models often come back semi-realistic; converting them to toon materials is a deliberate human style decision worth noting in the reflection.

| Element | Rule |
| --- | --- |
| Shading | Three.js `MeshToonMaterial` with a 3-step gradient map on every model; Tripo's PBR materials are swapped on load, keeping only the base color |
| Outlines | Dark violet outline on cars, drivers and track props (inverted-hull mesh or an outline post-process) |
| Color | Saturated, flat colors; NYU violet (#57068C) as the accent on suits, UI and finish line; gradient sky, no realistic skybox |
| Proportions | Drivers 2.5 heads tall, heads clearly visible above the cockpit; cars chunky, short and on oversized wheels |
| Textures | Flat colors or simple painted textures; simplify noisy Tripo textures in Blender |
| Effects | Puffy smoke clouds, speed lines at high speed, squash-and-stretch on landing, a bouncy chase camera |
| UI | Rounded heavy font, thick outlines, sticker-like buttons, a big bouncing 3-2-1 |
| Acceptance check | Every new asset is placed beside the style anchor in the same scene before it is accepted; anything that looks photoreal goes back through cleanup |

## 7. Architecture

The game runs entirely in the browser with no server: the player and three AI drivers share one physics world, and the AI produces steering and throttle the same way the keyboard does.

[Embedded widget: System architecture · browser game, AI opponents, static assets](node/5f0e52b9-e068)

Each map stores an ordered racing line of waypoints (placed by hand in Blender or a small in-game editor). Every frame, each AI looks a few waypoints ahead, steers toward that point, and slows down when the angle to the next segment is sharp. Difficulty only changes AI top speed and random offset from the line, so one controller serves all three levels.

| Layer | Choice | Alternative | Why |
| --- | --- | --- | --- |
| Rendering | Three.js with `MeshToonMaterial` | React Three Fiber | Mature GLB support; built-in toon material; AI coding assistants know it best |
| Physics | Rapier (built-in vehicle controller) | cannon-es RaycastVehicle | Arcade vehicles out of the box |
| AI drivers | Custom waypoint follower | Yuka steering library | About 100 lines; easy to tune and explain |
| Build | Vite | — | Fast hot reload |
| Deployment | Any static host, or run locally from the laptop | — | No server needed for the demo |

**Multiplayer extension**: keep phases, timers and lap logic in one game-state module that does not touch rendering. A Colyseus room server can later take over that module, and AI slots become empty seats for human players.

**Deployment note**: with no WebSocket, the earlier hosting risk mostly disappears. For the 10-26 playtest, run it from your own laptop so slow network access from Shanghai cannot break the demo.

## 8. Map sources and licenses

CC0 modular track kits come first: no attribution, free to modify, fastest to import. SuperTuxKart tracks look better but cost more to convert, so they are the third map. The license notes below are from experience; check each license file before downloading.

| Candidate | Source | License (to verify) | Work needed | Plan |
| --- | --- | --- | --- | --- |
| Modular track A | Kenney Racing Kit | CC0 | Assemble a track from pieces, add checkpoints | Map 1 |
| Modular track B | Same Kenney kit, new layout | CC0 | New layout and color scheme | Map 2 |
| Full track | Official SuperTuxKart tracks | Mostly CC BY-SA / GPL, check each | Convert Blender files to GLB; attribution and share-alike | Map 3 (P1) |
| Other | CC BY tracks on Sketchfab | CC BY | Attribution, check polygon count | Backup |

**Every map must have**: a drivable collision mesh, 4 grid slots, ordered checkpoint triggers, a finish line, an AI racing line of ordered waypoints, out-of-bounds reset zones, and a thumbnail for the vote screen.

A Credits screen lists every map source and license. It also gives the reflection a comparison between open-source assets and AI-generated ones.

## 9. Likeness and ethical risks

Turning real NYU Shanghai leaders into chibi drivers is the project's most fun idea and its biggest risk to settle early; decide the approach before generating drivers on 10-24.

| Risk | What it means | Mitigation |
| --- | --- | --- |
| Consent | People turned into game characters may not know, or may not like it | Email them explaining the use (coursework, in-class demo only) and ask permission; leave out anyone who does not agree |
| Uploading photos | Photos are uploaded to Image 2's and Tripo's servers | The syllabus prohibits submitting personal information and copyrighted materials to GenAI; official headshots may be university-owned, so ask Prof. Fedtke first |
| Dignity | Crashing or finishing last could read as mockery | No mocking lines or unflattering designs; neutral wording on the results screen |
| Spread | The link gets shared beyond the class | Share the link or build only with the class; take it offline or swap to original characters after the assignment |

**Fallback**: prepare 4–6 original chibi drivers generated from text descriptions only, not based on any real person. If consent is unclear, use the fallback; the pipeline and code stay the same, only the assets change.

Whichever option you choose, the decision process belongs in the reflection's Ethical Considerations section. AI cuts the cost of turning anyone into a character to a few minutes, so consent and dignity shift from technical problems to the author's responsibility.

**Open questions**: have you contacted the leaders or their offices? Have you asked the professor?

## 10. 7-day schedule and acceptance criteria

A P0 build where the player finishes a full race against 3 AI cars must exist before class on Monday 10-26, so classmates can take turns playing it there; the last two days go to the reflection.

**Daily tasks**

- [ ] Wed 10-21: finalize PRD and proposal; create repo; start the process log
- [ ] Thu 10-22: driving prototype on a Kenney track — arcade car, chase camera, out-of-bounds reset; test toon shading + outlines early
- [ ] Fri 10-23: AI opponents — racing-line waypoints for map 1, waypoint follower, 3 AI cars finishing 3 laps
- [ ] Sat 10-24: assets — settle the likeness approach; generate 4 drivers and 3–4 cars with Image 2 + Tripo; Blender cleanup; toon conversion; selection screens
- [ ] Sun 10-25: flow — 10-second vote with AI votes, 3-2-1 start, laps and ranking, results screen; map 2 with its racing line; cartoon effects and UI
- [ ] Mon 10-26: in-class playtest on your laptop; tune AI difficulty from feedback; fix bugs; record video and screenshots
- [ ] Tue 10-27: write the \~1,000-word reflection; organize logs and screenshots
- [ ] Wed 10-28: in-class Peer Review; revise; submit everything in Google Docs by 11:59 PM

**What to cut if behind, in order**: P2 features → down to 2 maps → one AI difficulty only → cartoon effects (keep toon shading and outlines) → down to 3 cars. The reflection is never cut.

**Acceptance criteria (check before submitting)**

- [ ] Start screen to results runs without a page refresh, and race again works back to back
- [ ] All 3 AI cars finish 3 laps on every map, and none stays stuck for more than 5 s
- [ ] A first-time player can beat Easy, and Normal feels like a close race
- [ ] The vote moves to the start automatically after 10 s with AI votes counted; ties are random
- [ ] Shortcuts do not count as laps for anyone; places display correctly for all 4 cars
- [ ] All 4 drivers × at least 3 cars combine freely, with drivers seated correctly
- [ ] Every asset renders with toon shading and outlines; nothing looks photoreal next to the style anchor
- [ ] At least 30 fps with 4 cars on a typical student laptop
- [ ] Credits screen lists every map and tool source
- [ ] Process log has ≥ 15 entries, including screenshots of at least 3 failures

## 11. Proposal draft and process log template

**Part 1 Proposal (about 150 words, edit before submitting)**

For the AI Writathon, I will build a small browser-based 3D cartoon racing game. The player chooses a driver and a car, votes on a track within ten seconds alongside three AI opponents, and races them over three laps. Almost every visual asset will be machine-made: I will use Image 2 to create chibi-style driver portraits and Tripo AI to turn those portraits and text prompts into 3D drivers and cars. Tracks will come from open-source asset kits, and I will work with an AI coding assistant on the game logic and the AI drivers. My strategy is to treat the AI tools as fast but unreliable production partners. I set the cartoon style rules, choose and reject outputs, repair models by hand, and log every prompt, failure, and manual edit. This record will let me analyze where authorship sits in a project whose assets are generated by machines but whose design decisions are mine.

(If you end up using real leaders' likenesses, add after the third sentence: Some drivers will be caricatures of NYU Shanghai leaders, used only with their permission.)

**Process log template** (one row per generation or manual edit)

| Date | Tool | Input / prompt | Output summary | Outcome | My edits | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 10-24 | Image 2 |  |  | Used / used after edits / rejected |  |  |
|  | Tripo |  |  |  |  |  |
|  | Coding assistant |  |  |  |  |  |

The Outcome and My edits columns matter most: they map directly onto the reflection's collaborator / editor / author / supervisor question.

