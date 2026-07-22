# 🕵️ Case No. 1147: The Blackwood Ledger

A small, free, single-player detective game — pure HTML5/CSS/JS, no engine,
no build step, no external image or audio assets. Three files, runs
anywhere, works on desktop and phone with just taps/clicks.

## The Case

Lord Edgar Blackwood was found dead in his study at eleven o'clock last
night. Four people were in Blackwood Manor. One of them is lying.

Search five rooms for six pieces of hidden evidence, pin them to the case
board in the order the night actually happened, then file your final report:
name the killer, the weapon, and the motive.

## How to Play

- **Search** — tap the manor floor plan to enter a room, then tap objects
  in the scene to search them. Some hide evidence; some are dead ends.
- **Review** — open the **Notebook** any time to re-read everything you've
  found.
- **Reconstruct** — once all six pieces of evidence are found, tap
  **Solve the Case** to open the corkboard. Tap a card, then tap a numbered
  pin to place it — arrange all six in chronological order and tap
  **Reveal the Truth**.
- **Accuse** — get the order right and you'll move to the final report:
  pick the killer, the weapon, and the motive, then **Close the Case**.

Everything renders with plain CSS (no image files) and every sound effect
is synthesized live with the Web Audio API (no audio files), so the whole
game is fully contained in `index.html`, `style.css`, and `game.js`.

## Files

```
index.html   – page structure & all screens (title, map, room, corkboard, report, ending)
style.css    – noir case-file styling (no images)
game.js      – all game logic, data, and synthesized sound effects
```

No build tools, no dependencies, no bundler — just static files. Open
`index.html` directly in a browser to play locally, no server required.

## Free Hosting Options

Any static-file host works, since there's nothing to build. A few good free
options, in case you want to try something other than GitHub Pages:

### Netlify (drag-and-drop, no account needed to preview)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag the folder containing these three files onto the page.
3. Netlify gives you a live `https://<random-name>.netlify.app` URL
   immediately. Create a free account to keep it permanently and pick a
   custom subdomain.

### Cloudflare Pages
1. Create a free account at [pages.cloudflare.com](https://pages.cloudflare.com).
2. Choose "Upload assets" (no Git required) and upload the three files.
3. Deploy — you'll get a `https://<project>.pages.dev` URL.

### Vercel
1. Create a free account at [vercel.com](https://vercel.com).
2. Use "Add New Project" → "Upload" (or connect a GitHub repo if you push
   the files there first).
3. Deploy — you'll get a `https://<project>.vercel.app` URL.

### itch.io (built for browser games, adds a game page/community around it)
1. Zip the three files together.
2. Create a free account at [itch.io](https://itch.io), click "Upload new
   project," set the kind to **HTML**, and upload the zip.
3. Check "This file will be played in the browser" and publish. itch.io
   hosts it and gives you a page with a title, description, and comments.

### Surge.sh (fastest command-line option)
```
npm install --global surge
cd path/to/this/folder
surge
```
Follow the prompts (free account, first time only) and it deploys instantly
to a `https://<project>.surge.sh` URL.

### GitHub Pages (same approach as before, if you'd rather keep it there)
1. Push these three files to a new GitHub repository.
2. Settings → Pages → Source: `Deploy from a branch`, branch `main`,
   folder `/ (root)`.
3. Live in a minute or two at `https://<username>.github.io/<repo>/`.

## Notes

The mystery has one correct solution (killer, weapon, and motive), reached
by reading the evidence carefully and reconstructing the timeline
correctly — but the accusation screen doesn't lock you out for guessing
wrong, so it's low-pressure to explore and replay.
