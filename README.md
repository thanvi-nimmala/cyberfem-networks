# Cyberfem Networks

**Identity, Resistance, and Networked Bodies.** A net-art exhibition curated by Thanvi Nimmala.

Nine works, 1993 to now, in which feminist artists use the internet itself to question power, identity, and authorship. The site is arranged as a network instead of a list: every work is wired to the threads it shares with others (Identity, Resistance, Networked Bodies). An **Index** view presents the same works as an early-web directory listing.

| Year | Artist | Work |
| --- | --- | --- |
| 1993–94 | VNS Matrix | All New Gen |
| 1996– | Martine Neddam | Mouchette |
| 1996 | Olia Lialina | My Boyfriend Came Back From the War |
| 1997 | Cornelia Sollfrank | Female Extension |
| 1997 | Old Boys Network | First Cyberfeminist International |
| 1998–99 | Shu Lea Cheang | Brandon |
| 1998– | subRosa | subRosa |
| 2012–20 | Legacy Russell | Glitch Feminism |
| 2016–21 | Morehshin Allahyari | She Who Sees the Unknown |

Made for Net Art Online.

## Run locally

Plain HTML, CSS, and JavaScript with no build step.

```bash
python3 -m http.server 5191
```

Then open http://localhost:5191.

## Structure

- `index.html`: page, curatorial statement, and both views
- `js/works.js`: exhibition data (works, threads, wall text)
- `js/main.js`: network wiring, index listing, timeline, and draggable windows
- `js/sound.js`: sound design, synthesized live with the Web Audio API (no audio files); off until the visitor presses SOUND
- `css/styles.css`: styles
- `images/`: screenshots of each work, linked to the work itself

To add a work, add an entry to `WORKS` in `js/works.js` and a position for it in `NODE_POS` in `js/main.js`.

## Publishing to GitHub Pages

Push to a GitHub repo, then go to Settings → Pages → Deploy from branch → `main` / root.

Images are screenshots of the artists' own sites, used for educational, curatorial purposes. Every work links back to its original.
