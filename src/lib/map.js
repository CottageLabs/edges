if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("lib")) { edges.lib = {}}
if (!edges.lib.hasOwnProperty("map")) { edges.lib.map = {}}

edges.lib.map.pickFirst = function(locations) {
    return {lat: locations[0].lat, lon: locations[0].lon}
}