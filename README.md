# GRE Study Hub

A static, single-page-per-tool study site for the GRE General Test: vocabulary flashcards, two vocab game modes, quant concept flashcards, and four full timed practice sets for Verbal and Quantitative Reasoning (including a Hard set), with a full answer key and explanations. Includes light gamification (daily streak, XP, levels) using `localStorage` — no backend, no build step, no dependencies beyond two Google Fonts.

## Content

- 400 GRE-level vocabulary words (definition + example sentence)
- 45 quant concept cards (arithmetic, algebra, geometry, data analysis) with worked examples
- 4 Verbal practice sets of 45 questions each (180 total) — Text Completion, Sentence Equivalence, Reading Comprehension. Sets 1-3 are standard GRE difficulty; **Set 4 is a Hard set**, pitched a notch tougher throughout (rarer vocabulary, denser inference-based reading passages, trickier near-synonym traps in Sentence Equivalence)
- 4 Quant practice sets of 45 questions each (180 total) — Problem Solving, Quantitative Comparison, Data Interpretation. Sets 1-3 are standard GRE difficulty; **Set 4 is a Hard set** with multi-step problems, edge-case-heavy comparisons, and geometry/combinatorics requiring a non-obvious insight
- Every question carries an `easy`/`medium`/`hard` difficulty tag (shown next to the question type during a quiz and in the answer-key review) — Set 4's own "easy" tier is still calibrated a notch above Sets 1-3
- 2 vocab game modes: **Vocab Matching** (pair words to definitions against the clock) and **Vocab Speed Round** (60-second rapid-fire multiple choice with combo bonuses)

All of it is original material written to match commonly-tested GRE topics, vocabulary, and question formats — it is **not** copied from ETS's Official Guide or any commercial test-prep book. The GRE section/timing facts referenced on the home page (five sections, ~1h58m, question counts) were checked against ETS's own published test structure.

## Running it locally

No build step — just open `index.html` in a browser, or serve the folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Deploying to GitHub Pages

1. Create a new repository on GitHub (public, or private if you're on a paid plan that supports Pages for private repos).
2. Push the contents of this folder to the repository root (or to a `docs/` folder — see step 4).
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**, pick the branch (usually `main`) and the folder (`/ (root)` or `/docs`, matching where you put the files), then **Save**.
5. GitHub will publish the site at `https://<your-username>.github.io/<repo-name>/` within a minute or two.

Quick command-line version, from inside this folder:

```
git init
git add .
git commit -m "Initial commit: GRE Study Hub"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then enable Pages as in steps 3–4 above.

## File structure

```
gre-study-hub/
  index.html              Home / dashboard
  verbal-flashcards.html  Vocabulary flashcards
  quant-flashcards.html   Quant concept flashcards
  verbal-quiz.html        Verbal practice quiz (3 sets of 45)
  quant-quiz.html         Quant practice quiz (3 sets of 45)
  vocab-match.html        Vocab Matching game
  vocab-speed.html        Vocab Speed Round game
  css/style.css           Shared design system
  js/data.js              All vocab / concept / question content
  js/gamify.js            Streak + XP helpers (shared)
  js/flashcards.js        Generic flashcard deck engine (both flashcard pages)
  js/quiz.js              Generic quiz engine (both quiz pages; reads each question's `set` field to power the practice-set picker)
  js/match-game.js        Vocab Matching game engine
  js/speed-game.js        Vocab Speed Round game engine
  js/home.js              Home page stats
```

## Notes

- Progress (known words/concepts, best quiz scores, best game scores, XP, streak) is stored in the browser via `localStorage`, per-device/per-browser. There's no account system or sync.
- To add or edit content, edit the arrays in `js/data.js` (`VOCAB`, `QUANT_CONCEPTS`, `VERBAL_QUESTIONS`, `QUANT_QUESTIONS`) — each page picks up changes automatically, no other files need to change. Each verbal/quant question object has a `set` field (`1`-`4`, where `4` is the Hard set) that controls which practice set it appears in, and a `difficulty` field (`"easy"`/`"medium"`/`"hard"`) shown next to the question type during quizzes and in the review list.
- To adjust the color palette or type scale, edit the CSS custom properties at the top of `css/style.css`.
