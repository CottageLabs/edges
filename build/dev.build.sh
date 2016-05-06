#!/usr/bin/env bash

nodejs r.js -o dev.build.js

BUILD="../release/dev/"

cat $BUILD/es.js <(echo) \
    $BUILD/edges.jquery.js <(echo) \
    $BUILD/edges.js <(echo) \
    $BUILD/components/charts.js <(echo) \
    $BUILD/components/maps.js <(echo) \
    $BUILD/components/ranges.js <(echo) \
    $BUILD/components/search.js <(echo) \
    $BUILD/components/selectors.js <(echo) \
    $BUILD/renderers/bs3.edges.js <(echo) \
    $BUILD/renderers/d3.edges.js <(echo) \
    $BUILD/renderers/google.edges.js <(echo) \
    $BUILD/renderers/highcharts.edges.js <(echo) \
    $BUILD/renderers/nvd3.edges.js <(echo) \
    > $BUILD/dev.edges.min.js
