import {Renderer} from "../../core";
import {getParam, allClasses, jsClassSelector, objClosure} from "../../utils";

import { MarkerClusterer } from "@googlemaps/markerclusterer";
import {google} from '../../../dependencies/google';

export class GoogleMapView extends Renderer {
    constructor(params) {
        super(params);

        /////////////////////////////////////////////
        // parameters that can be passed in

        // what should the renderer do if there are no geopoints
        // can be one of:
        // render - render the map anyway, with no geopoints on it
        // hide - hide the map and display the mapHiddenText
        this.onNoGeoPoints = getParam(params, "onNoGeoPoints", "render");

        // text to render if the map has no geo points and the behaviour is "hide"
        this.mapHiddenText = getParam(params, "mapHiddenText", "No map data available");

        // initial zoom level
        this.initialZoom = getParam(params, "initialZoom", 2);

        // initial map type
        this.mapType = getParam(params, "mapType", "hybrid");

        this.labelFunction = getParam(params, "labelFunction", false);

        // should we be using the google maps clustering features
        this.cluster = getParam(params, "cluster", false);

        this.reQueryOnBoundsChange = getParam(params, "reQueryOnBoundsChange", false);

        this.clusterIcons = getParam(params, "clusterIcons", {
            0: "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m1.png"
        });

        this.renderCluster = getParam(params, "renderCluster", false);

        /////////////////////////////////////////////
        // internal state

        this.namespace = "edges-google-map-view";
        this.map = false;
        this.markers = [];
        this.markerCluster = false;
        this.currentZoom = false;
        this.currentBounds = false;

        // for reasons unknown, on draw the map generates 2 idle events in rapid succession.  This allows us
        // to squash responding to them
        this.skipIdleEvent = 2;
    }

    draw() {
        // now check if there are any geo points, and if there's anything we should do about it
        if (this.component.locations.length === 0) {
            if (this.onNoGeoPoints === "hide") {
                this.component.context.html(this.mapHiddenText);
                return;
            }
        }
        this.skipIdleEvent = 2;

        var centre = new google.maps.LatLng(this.component.centre.lat, this.component.centre.lon);

        if (!this.map) {
            var canvasClass = allClasses(this.namespace, "canvas", this);
            var canvasSelector = jsClassSelector(this.namespace, "canvas", this);
            this.component.context.html('<div class="' + canvasClass + '"></div>');
            var element = this.component.jq(canvasSelector)[0];

            var mapTypeId = this.mapType;
            if (this.mapType === "hybrid") {
                mapTypeId = google.maps.MapTypeId.HYBRID;
            }

            var mapOptions = {
                zoom: this.initialZoom,
                center: centre,
                mapTypeId: mapTypeId
            };
            this.map = new google.maps.Map(element, mapOptions);

            // make sure we set the centre right
            this.map.setCenter(centre);
        }
        
        // clear any existing markers/clusters
        if (this.cluster && this.markerCluster) {
            this.markerCluster.clearMarkers();
            this.markerCluster = false;
        }
        for (i = 0; i < this.markers.length; i++) {
            this.markers[i].setMap(null);
        }
        this.markers = [];

        for (var i = 0; i < this.component.locations.length; i++) {
            var loc = this.component.locations[i];
            var myLatlng = new google.maps.LatLng(loc.lat, loc.lon);
            let properties = {
                position: myLatlng,
            }
            if (!this.cluster) {
                // otherwise the mapping clusterer will deal with it
                properties["map"] = this.map;
            }

            if (this.cluster) {
                let icon = this._getClusterIcon(loc.count)
                if (icon) {
                    properties["icon"] = icon;
                }
            }
            
            if (this.labelFunction) {
                properties["label"] = {text: this.labelFunction(loc)} // e.g. loc.count.toString()
            }

            var marker = new google.maps.Marker(properties);
            this.markers.push(marker);
        }

        if (this.cluster) {
            let props = {
                map: this.map,
                markers: this.markers
            }
            if (this.renderCluster) {
                props["renderer"]  = this.renderCluster;
            }
            this.markerCluster = new MarkerClusterer(props);
        }

        if (this.reQueryOnBoundsChange) {
            let onBoundsChanged = objClosure(this, "boundsChanged")
            this.map.addListener("idle", onBoundsChanged)
        }
    }

    boundsChanged() {
        // prevent the idle event from triggering a re-query the first time, as it does
        // this on load
        if (this.skipIdleEvent > 0) {
            this.skipIdleEvent--;
            return;
        }

        let bounds = this.map.getBounds();
        let zoom = this.map.getZoom();

        let ne = bounds.getNorthEast();
        let sw = bounds.getSouthWest();

        let top_left = {
            lat: ne.lat(),
            lon: sw.lng()
        }

        let bottom_right = {
            lat: sw.lat(),
            lon: ne.lng()
        }

        this.component.boundsChanged({
            top_left: top_left,
            bottom_right: bottom_right,
            zoom: zoom
        })
    }

    _getClusterIcon(count) {
        let icon = false;
        let highest = -1;
        for (let limit in this.clusterIcons) {
            if (limit <= count && limit > highest) {
                icon = this.clusterIcons[limit];
                highest = limit
            }
        }
        return icon;
    }
}

