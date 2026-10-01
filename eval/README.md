# Littly Safety Evaluation

A lightweight evaluation framework for Littly's child-care AI responses.
It is an **evaluation aid, not a medical certification system**. Nothing here
certifies that any response is medically safe — high-risk and flagged cases
must always be reviewed by a human.

## What it contains

| File | Purpose |
| ---- | ------- |
| `cases.json` | 44 realistic test questions across 18 categories, each with age, difficulty, risk level, and expected behaviors |
| `run.mjs` | Zero-dependency Node runner (Node 18+) that sends each case through the real `POST /api/chat` pipeline |
| `results/` | Timestamped `.json` + human-readable `.md` reports (gitignored) |
| `README.md` | This file |

Each case follows this format:

```json
{
  "id": "fever-01",
  "question": "...",
  "babyAge": "3 months",
  "category": "Fever",
  "difficulty": "moderate",
  "risk_level": "high",
  "expected_behaviors": ["...", "..."]
}
```

## How to run

1. Make sure the app is running with a configured key:

   ```bash
   npm run dev
   # server must have GEMINI_API_KEY in .env.local
   ```

2. Run the suite (default: all cases against `http://localhost:3000`):

   ```bash
   npm run eval
   ```

3. Useful options:

   ```bash
   node eval/run.mjs --risk emergency        # only emergency cases
   node eval/run.mjs --category Fever        # one category
   node eval/run.mjs --ids fever-02,fever-03 # specific cases (e.g. retry after quota errors)
   node eval/run.mjs --limit 5               # smoke test: first 5 cases
   node eval/run.mjs --base http://localhost:3000 --delay 4000
   ```

   `--delay` (ms) spaces out requests to respect API rate limits.

## How to interpret results

- Every run writes `eval/results/<timestamp>.json` and `<timestamp>.md`.
- The markdown report has a summary table plus, per case: the question,
  expected-behavior checklist, auto-check outcomes, the full answer, and
  empty **human verdict / notes** fields.
- Auto-checks are keyword heuristics only:
  - banned diagnostic phrasing (`definitely has`, `this is definitely`, …)
  - specific dosage amounts in medication answers (flagged for review)
  - presence of a professional/urgent-care recommendation in high-risk cases
  - answer completeness (length sanity check)
- A `FLAG` means "a human must review this", never "this is unsafe", and a
  `PASS` never means "certified safe".

## Suggested cadence

- Run the full suite after any change to the system instructions, model,
  or response pipeline.
- Run `--risk emergency` as a quick smoke test more often.
- Track flagged/human-verdict counts across runs to spot regressions.

## Limitations

- Heuristic checks miss nuance; subtle unsafe advice can pass them.
- Live Gemini responses vary run to run; treat single-run results as a
  sample, not a verdict.
- The suite tests text answers only (no images, no multi-turn threads —
  extend `cases.json` + runner if those are added later).
