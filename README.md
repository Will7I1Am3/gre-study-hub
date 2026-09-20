# GRE Study Hub

A static, single-page-per-tool study site for the GRE General Test: vocabulary flashcards, two vocab game modes, quant concept flashcards, six full timed practice sets for Verbal and Quantitative Reasoning (including three Hard sets), and a full-length timed mock exam with an estimated score, all with a full answer key and explanations. Includes light gamification (daily streak, XP, levels) using `localStorage` — no backend, no build step, no dependencies beyond two Google Fonts.

## Content

- 400 GRE-level vocabulary words (definition + example sentence), browsable as flashcards or as a searchable, checkable full-list view
- 45 quant concept cards (arithmetic, algebra, geometry, data analysis) with worked examples
- 6 Verbal practice sets of 45 questions each (270 total) — Text Completion, Sentence Equivalence, Reading Comprehension. Sets 1-3 are standard GRE difficulty; **Sets 4-6 are Hard sets**, pitched a notch tougher throughout (rarer vocabulary, denser inference-based reading passages, trickier near-synonym traps in Sentence Equivalence)
- 6 Quant practice sets of 45 questions each (270 total) — Problem Solving, Quantitative Comparison, Data Interpretation. Sets 1-3 are standard GRE difficulty; **Sets 4-6 are Hard sets** with multi-step problems, edge-case-heavy comparisons, and geometry/combinatorics requiring a non-obvious insight
- Every question carries an `easy`/`medium`/`hard` difficulty tag (shown next to the question type during a quiz and in the answer-key review) — the Hard sets' own "easy" tier is still calibrated a notch above Sets 1-3
- Your last 5 results per practice quiz (Verbal and Quant, tracked separately) are saved automatically and shown on the setup screen, so you can jump back into reviewing a past attempt's answer key from the home dashboard or the quiz page itself
- **Full-Length Mock Exam** — a timed simulation of the current GRE General Test's structure (minus the Analytical Writing essay, which nothing here can grade): Verbal Section 1 (12 questions/18 min), Verbal Section 2 (15/23 min), Quant Section 1 (12/21 min), Quant Section 2 (15/26 min), 54 questions in 1 hr 28 min total, sections in random order, no breaks, matching ETS's published test structure. Within a section you can move freely between questions and change answers, but there's no correctness feedback until the entire exam is finished, and once you leave a section (or its timer runs out) you can't return to it — same as the real test. At the end you get an **estimated** Verbal and Quant score on the official 130–170 scale plus an estimated percentile (both approximations anchored to ETS's published score-distribution and percentile data, since ETS doesn't publish its actual scoring formula — clearly labeled as estimates, not official scores), a full section-by-section answer key, and your last 5 mock exams are saved and reviewable from the exam's start screen
- 2 vocab game modes: **Vocab Matching** (pair words to definitions against the clock) and **Vocab Speed Round** (60-second rapid-fire multiple choice with combo bonuses)

All of it is original material written to match commonly-tested GRE topics, vocabulary, and question formats — it is **not** copied from ETS's Official Guide or any commercial test-prep book. The GRE section/timing facts referenced on the home page and in the mock exam (five sections, ~1h58m, question counts, no breaks) were checked against ETS's own published test structure. The mock exam is **not section-level adaptive** (every section draws from a fixed mix of question types/difficulties rather than adjusting based on the previous section's performance), and its question-type composition per section is a reasonable approximation, not an ETS-published breakdown.

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
  verbal-quiz.html        Verbal practice quiz (6 sets of 45)
  quant-quiz.html         Quant practice quiz (6 sets of 45)
  mock-exam.html          Full-length timed mock exam (Verbal + Quant, 4 sections)
  vocab-match.html        Vocab Matching game
  vocab-speed.html        Vocab Speed Round game
  css/style.css           Shared design system
  js/data.js              All vocab / concept / question content
  js/gamify.js            Streak + XP helpers (shared)
  js/flashcards.js        Generic flashcard deck engine (both flashcard pages)
  js/quiz.js              Generic quiz engine (both quiz pages; reads each question's `set` field to power the practice-set picker)
  js/mock-exam.js         Full-length mock exam engine (section timing/order, scoring estimate, history)
  js/match-game.js        Vocab Matching game engine
  js/speed-game.js        Vocab Speed Round game engine
  js/home.js              Home page stats
```

## Notes

- Progress (known words/concepts, best quiz scores, best game scores, XP, streak) is stored in the browser via `localStorage`, per-device/per-browser. There's no account system or sync.
- To add or edit content, edit the arrays in `js/data.js` (`VOCAB`, `QUANT_CONCEPTS`, `VERBAL_QUESTIONS`, `QUANT_QUESTIONS`) — each page picks up changes automatically, no other files need to change. Each verbal/quant question object has a `set` field (`1`-`6`, where `4`-`6` are Hard sets) that controls which practice set it appears in, and a `difficulty` field (`"easy"`/`"medium"`/`"hard"`) shown next to the question type during quizzes and in the review list.
- Each quiz page keeps its own history of the last 5 attempts per practice set in `localStorage` (separate keys for Verbal and Quant), including score, set number, and full per-question answers so a past attempt's review screen can be reconstructed later. The mock exam keeps its own separate history of the last 5 full exams the same way.
- To adjust the color palette or type scale, edit the CSS custom properties at the top of `css/style.css`.
