# NYU Shanghai Grand Prix

A cartoon kart racer made with generative AI for the AI Writathon (Perspectives on the Humanities, NYU Shanghai, Fall 2026), plus the full development journal.

- `index.html`: home page with two links
- `docs/`: the dev journal (`docs/index.html`) and its 38 images (`docs/img/`)
- `play/`: the game. three.js r147 loads from cdn.jsdelivr.net; the 3D models are the `.glb` files next to `play/index.html` (about 34 MB in total)

## Deploy to GitHub Pages

1. Create a new repository on GitHub (it can be public or private, but Pages on a private repo needs a paid plan).
2. Upload everything in this folder to the root of the repository, including the empty `.nojekyll` file. With git:
   ```
   git init
   git add .
   git commit -m "Grand Prix site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo>.git
   git push -u origin main
   ```
   The web uploader also works (no file here is over 25 MB).
3. In the repository, open **Settings → Pages**, set **Source** to "Deploy from a branch", choose `main` and `/ (root)`, and save.
4. After a minute or two the site is live at `https://<your-username>.github.io/<repo>/`.

## Run it locally

Browsers will not load the models from a `file://` page, so serve the folder:

```
python3 -m http.server 8000
```

then open http://localhost:8000/.

## Credits

- Tracks: Map_njxz, Map_tkgcz and Map_qms by amogusstrikesback2 on Sketchfab, CC BY 4.0, rescaled and compressed.
- Drivers and karts: generated with Image 2 and Tripo AI. The drivers are four versions of NYU Shanghai's Qilin mascot.
- Engine: three.js (MIT). Code drafted with Claude.
