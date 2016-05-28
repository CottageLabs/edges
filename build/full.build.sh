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
# nodejs r.js -o cssIn=$IN_CSS/bs3.edges.css out=$CSS/bs3.edges.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.BasicRangeSelectorRenderer.css out=$CSS/bs3.BasicRangeSelectorRenderer.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.FacetFilterSetterRenderer.css out=$CSS/bs3.BasicRangeSelectorRenderer.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.Facetview.css out=$CSS/bs3.Facetview.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.MultiDateRangeRenderer.css out=$CSS/bs3.MultiDateRangeRenderer.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.MultiDateRangeRenderer.css out=$CSS/bs3.NSeparateORTermSelectorRenderer.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.NumericRangeEntryRenderer.css out=$CSS/bs3.NumericRangeEntryRenderer.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.ORTermSelectorRenderer.css out=$CSS/bs3.ORTermSelectorRenderer.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.PagerRenderer.css out=$CSS/bs3.PagerRenderer.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.RefiningANDTermSelectorRenderer.css out=$CSS/bs3.RefiningANDTermSelectorRenderer.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.ResultsDisplayRenderer.css out=$CSS/bs3.ResultsDisplayRenderer.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.SearchingNotificationRenderer.css out=$CSS/bs3.SearchingNotificationRenderer.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.SelectedFiltersRenderer.css out=$CSS/bs3.SelectedFiltersRenderer.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.Tabbed.css out=$CSS/bs3.Tabbed.css baseUrl=.
nodejs r.js -o cssIn=$IN_CSS/bs3.TabularResultsRenderer.css out=$CSS/bs3.TabularResultsRenderer.css baseUrl=.

nodejs r.js -o cssIn=$IN_CSS/d3.edges.css out=$CSS/d3.edges.css baseUrl=.
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
    $SRC/templates/bs3.Facetview.js <(echo) \
    $SRC/templates/bs3.Tabbed.js <(echo) \
    $SRC/renderers/bs3.BasicRangeSelectorRenderer.js <(echo) \
    $SRC/renderers/bs3.FacetFilterSetterRenderer.js <(echo) \
    $SRC/renderers/bs3.FullSearchControllerRenderer.js <(echo) \
    $SRC/renderers/bs3.MultiDateRangeRenderer.js <(echo) \
    $SRC/renderers/bs3.NSeparateORTermSelectorRenderer.js <(echo) \
    $SRC/renderers/bs3.NumericRangeEntryRenderer.js <(echo) \
    $SRC/renderers/bs3.ORTermSelectorRenderer.js <(echo) \
    $SRC/renderers/bs3.PagerRenderer.js <(echo) \
    $SRC/renderers/bs3.RefiningANDTermSelectorRenderer.js <(echo) \
    $SRC/renderers/bs3.ResultsDisplayRenderer.js <(echo) \
    $SRC/renderers/bs3.SearchingNotificationRenderer.js <(echo) \
    $SRC/renderers/bs3.SelectedFiltersRenderer.js <(echo) \
    $SRC/renderers/bs3.TabularResultsRenderer.js <(echo) \
    $SRC/renderers/d3.edges.js <(echo) \
    $SRC/renderers/google.edges.js <(echo) \
    $SRC/renderers/highcharts.edges.js <(echo) \
    $SRC/renderers/nvd3.edges.js <(echo) \
    > $OUT/full.edges.min.js

# and concatenate the css output
cat $CSS/d3.edges.css <(echo) \
    $CSS/google.edges.css <(echo) \
    $CSS/bs3.Facetview.css <(echo) \
    $CSS/bs3.Tabbed.css <(echo) \
    $CSS/bs3.BasicRangeSelectorRenderer.css <(echo) \
    $CSS/bs3.FacetFilterSetterRenderer.css <(echo) \
    $CSS/bs3.MultiDateRangeRenderer.css <(echo) \
    $CSS/bs3.NSeparateORTermSelectorRenderer.css <(echo) \
    $CSS/bs3.NumericRangeEntryRenderer.css <(echo) \
    $CSS/bs3.ORTermSelectorRenderer.css <(echo) \
    $CSS/bs3.PagerRenderer.css <(echo) \
    $CSS/bs3.RefiningANDTermSelectorRenderer.css <(echo) \
    $CSS/bs3.ResultsDisplayRenderer.css <(echo) \
    $CSS/bs3.SearchingNotificationRenderer.css <(echo) \
    $CSS/bs3.SelectedFiltersRenderer.css <(echo) \
    $CSS/bs3.TabularResultsRenderer.css <(echo) \
    > $OUT/full.edges.min.css

echo "Build $(date -u +"%Y-%m-%dT%H:%M:%SZ")" > $OUT/build.txt