$.extend(edges, {
    google: {
        newMapViewRenderer : function(params) {
            if (!params) { params = {} }
            edges.google.MapViewRenderer.prototype = edges.newRenderer(params);
            return new edges.google.MapViewRenderer(params);
        },
        MapViewRenderer : function(params) {
            /////////////////////////////////////////////
            // parameters that can be passed in

            // what should the renderer do if there are no geopoints
            // can be one of:
            // render - render the map anyway, with no geopoints on it
            // hide - hide the map and display the mapHiddenText
            this.onNoGeoPoints = params.onNoGeoPoints || "render";

            // text to render if the map has no geo points and the behaviour is "hide"
            this.mapHiddenText = params.mapHiddenText !== undefined ? params.mapHiddenText : "No map data available";

            // initial zoom level
            this.initialZoom = params.initialZoom || 2;

            // initial map type
            this.mapType = params.mapType || "hybrid";

            this.clusterByCount = edges.getParam(params.clusterByCount, false);
            
            this.reQueryOnBoundsChange = edges.getParam(params.reQueryOnBoundsChange, false);

            this.clusterIcons = edges.getParam(params.clusterIcons, {
                0:"https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m1.png"
            })

            /////////////////////////////////////////////
            // internal state

            this.namespace = "edges-google-map-view";
            this.map = false;
            this.markers = [];
            this.currentZoom = false;
            this.currentBounds = false;

            this.draw = function() {
                // just check that the maps library is loaded
                try {google} catch(Exception) {return}

                // now check if there are any geo points, and if there's anything we should do about it
                if (this.component.locations.length === 0) {
                    if (this.onNoGeoPoints === "hide") {
                        this.component.context.html(this.mapHiddenText);
                        return;
                    }
                }

                var centre = new google.maps.LatLng(this.component.centre.lat, this.component.centre.lon);

                if (!this.map) {
                    var canvasClass = edges.css_classes(this.namespace, "canvas", this);
                    var canvasSelector = edges.css_class_selector(this.namespace, "canvas", this);
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

            this.boundsChanged = function() {
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
            
            this._getClusterIcon = function(count) {
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
    }
});