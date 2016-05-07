#!/usr/bin/env bash

IN_JS="../src/"
IN_CSS="../css/"

OUT="../release/"
SRC=$OUT/js
CSS=$OUT/css

rm -r $OUT
mkdir $OUT
mkdir $SRC
mkdir $CSS

# this command minifies the entire js source into the OUT directory
nodejs r.js -o appDir=$IN_JS baseDir=. dir=$SRC

# these commands individually minify the CSS
nodejs r.js -o cssIn=$IN_CSS/bs3.edges.css out=$CSS/bs3.edges.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/d3.edges.css out=$CSS/d3.edges.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/edges.css out=$CSS/edges.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/google.edges.css out=$CSS/google.edges.css baseUrl=.

# now concatenate all the js output
cat $SRC/es.js <(echo) \
    $SRC/edges.jquery.js <(echo) \
    $SRC/edges.js <(echo) \
    $SRC/components/charts.js <(echo) \
    $SRC/components/maps.js <(echo) \
    $SRC/components/ranges.js <(echo) \
    $SRC/components/search.js <(echo) \
    $SRC/components/selectors.js <(echo) \
    $SRC/renderers/bs3.edges.js <(echo) \
    $SRC/renderers/d3.edges.js <(echo) \
    $SRC/renderers/google.edges.js <(echo) \
    $SRC/renderers/highcharts.edges.js <(echo) \
    $SRC/renderers/nvd3.edges.js <(echo) \
    > $OUT/full.edges.min.js

# and concatenate the css output
cat $CSS/bs3.edges.css <(echo) \
    $CSS/d3.edges.css <(echo) \
    $CSS/edges.css <(echo) \
    $CSS/google.edges.css <(echo) \
    > $OUT/full.edges.min.css

echo "Build $(date -u +"%Y-%m-%dT%H:%M:%SZ")" > $OUT/build.txt