import {Renderer} from "../../core";
import {getParam, allClasses, jsClassSelector} from "../../utils";
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

        this.clusterByCount = getParam(params, "clusterByCount", false);

        this.reQueryOnBoundsChange = getParam(params, "reQueryOnBoundsChange", false);

        this.clusterIcons = getParam(params, "clusterIcons", {
            0: "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m1.png"
        });

        /////////////////////////////////////////////
        // internal state

        this.namespace = "edges-google-map-view";
        this.map = false;
        this.markers = [];
        this.currentZoom = false;
        this.currentBounds = false;
    }

    draw() {
        // now check if there are any geo points, and if there's anything we should do about it
        if (this.component.locations.length === 0) {
            if (this.onNoGeoPoints === "hide") {
                this.component.context.html(this.mapHiddenText);
                return;
            }
        }

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

        if (this.reQueryOnBoundsChange) {
            let onBoundsChanged = edges.objClosure(this, "boundsChanged")
            this.map.addListener("bounds_changed", onBoundsChanged)
        }

        // clear any existing markers
        for (i = 0; i < this.markers.length; i++) {
            this.markers[i].setMap(null);
        }
        this.markers = [];

        for (var i = 0; i < this.component.locations.length; i++) {
            var loc = this.component.locations[i];
            var myLatlng = new google.maps.LatLng(loc.lat, loc.lon);
            let properties = {
                position: myLatlng,
                map: this.map
            }
            let icon = this._getClusterIcon(loc.count)
            if (icon) {
                properties["icon"] = icon;
            }
            if (this.clusterByCount) {
                properties["label"] = {text: loc.count.toString()}
            }

            var marker = new google.maps.Marker(properties);
            this.markers.push(marker);
        }

    }

    boundsChanged() {
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

