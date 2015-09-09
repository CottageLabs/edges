$.extend(edges, {
    google: {
        newMapViewRenderer : function(params) {
            if (!params) { params = {} }
            edges.google.MapViewRenderer.prototype = edges.newRenderer(params);
            return new edges.google.MapViewRenderer(params);
        },
        MapViewRenderer : function(params) {

            this.initialZoom = params.initialZoom || 2;
            this.mapType = params.mapType || "hybrid";

            this.namespace = "edges-google-map-view";
            this.map = false;
            this.markers = [];

            this.draw = function() {
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
                }

                // make sure we set the centre right
                this.map.setCenter(centre);

                // clear any existing markers
                for (i = 0; i < this.markers.length; i++) {
                    this.markers[i].setMap(null);
                }
                this.markers = [];

                for (var i = 0; i < this.component.locations.length; i++) {
                    var loc = this.component.locations[i];
                    var myLatlng = new google.maps.LatLng(loc.lat, loc.lon);
                    var marker = new google.maps.Marker({
                        position: myLatlng,
                        map: this.map
                    });
                    this.markers.push(marker);
                }

            }
        }
    }
});