#!/bin/bash
# usage: lh.sh <outdir> [baseUrl=http://localhost:5180]
# Lighthouse accessibility for every page, desktop and mobile; prints the score and the failing audits per page.
# Runs Lighthouse through npx from a temp folder (nothing is installed in the repo). Chrome: $CHROME_PATH, else the
# Playwright Chromium this environment ships.
OUT=$1; BASE=${2:-http://localhost:5180}; mkdir -p "$OUT"
export CHROME_PATH=${CHROME_PATH:-$(ls -d /opt/pw-browsers/chromium-*/chrome-linux64/chrome 2>/dev/null | head -1)}
LH="npx --yes lighthouse@12.6.1"
for pg in "today|/" "plan|/plan" "plan-month|/plan?view=month" "plan-race|/plan?view=race" "plan-history|/plan?view=history" "runs|/runs" "fitness|/fitness" "fitness-body|/fitness?tab=body" "coach|/coach" "music|/music" "settings|/settings"; do
  n=${pg%%|*}; u=${pg#*|}
  for form in desktop mobile; do
    pre=""; [ $form = desktop ] && pre="--preset=desktop"
    (cd "${TMPDIR:-/tmp}" && $LH "$BASE$u" $pre --only-categories=accessibility --output=json --output-path="$OUT/$n-$form.json" \
        --chrome-flags="--headless=new --no-sandbox" --quiet >/dev/null 2>&1)
    python3 - "$OUT/$n-$form.json" "$n $form" <<'PY' 2>/dev/null || echo "$n $form: audit failed"
import json, sys
r = json.load(open(sys.argv[1])); c = r['categories']['accessibility']
fails = [(a['id'], len((a.get('details') or {}).get('items') or [])) for a in r['audits'].values()
         if a.get('score') is not None and a['score'] < 1 and a.get('scoreDisplayMode') in ('binary', 'numeric')]
print(f"{sys.argv[2]}: {round(c['score'] * 100)}  fails: " + (', '.join(f'{i}({n})' for i, n in fails) or 'none'))
PY
  done
done
