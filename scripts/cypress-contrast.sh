#!/bin/sh
# E3 G6: the local-contrast recipe (July 2026, re-used by E1's G6) on a desktop capture: the tree's crop at the design
# camera, scaled to 800 px tall, a 100 × 280 window on the body, the mean 3 × 3 standard deviation of the grey image
# in 0–255. The painting's body by the same recipe and window at the render's scale measures 11.1 (E3 plan); E1's
# final render 0.93–1.07. The bar for E3: 3–8.
#   sh scripts/cypress-contrast.sh <desktop-centre.png>
set -e
capture="$1"
[ -f "$capture" ] || { echo "usage: cypress-contrast.sh <desktop-centre.png>" >&2; exit 2; }
value=$(magick "$capture" -crop 175x575+370+115 +repage -resize x800 -crop 100x280+65+450 +repage -colorspace Gray -statistic StandardDeviation 3x3 -format "%[fx:mean*255]" info:)
echo "local contrast (3 × 3 std, the body window at 800 px tall): $value"
awk -v v="$value" 'BEGIN { if (v >= 3 && v <= 8) { print "PASS: within 3–8"; exit 0 } else { print "FAIL: outside 3–8"; exit 1 } }'
