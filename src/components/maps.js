$.extend(edges, {
    ////////////////////////////////////////////////////
    // Map implementation

    newGeohashedZoomableMap : function(params) {
        return edges.instantiate(edges.GeohashedZoomableMap, params, edges.newComponent);
    },
    GeohashedZoomableMap : function(params) {
        //////////////////////////////////
        // parameters that can be passed in

        // field in the data which is the geo_point type
        this.geoHashAggregation = params.geoHashAggregation || "geohash";

        this.calculateCentre = params.calculateCentre || edges.MapCentreFunctions.pickFirst;

        this.defaultRenderer = params.defaultRenderer || "newMapViewRenderer";

        this.geoBoundingBoxFilterField = edges.getParam(params.geoBoundingBoxFilterField, "location")

        this.zoomToPrecisionMap = edges.getParam(params.zoomToPrecisionMap, {
            0: 1,
            3: 2,
            5: 3,
            7: 4,
            10: 5,
            13: 6,
            15: 7
        })

        //////////////////////////////////
        // internal state

        // list of locations and the related object at those locations
        // of the form
        // {lat: <lat>, lon: <lon>, obj: {object}}
        this.locations = [];

        // lat/lon object which defines the centre point of the map
        // this default is somewhere in Mali, and is a decent default for the globe
        this.centre = {lat: 17, lon: 0};

        this.currentPrecision = 0;
        this.currentTopLeft = false;
        this.currentBottomRight = false;

        this.synchronise = function() {
            this.locations = [];
            this.centre = {lat: 17, lon: 0};

            // read the locations out of the geohash aggregation
            if (this.edge.result) {
                let agg = this.edge.result.aggregation(this.geoHashAggregation);
                for (let i = 0; i < agg.buckets.length; i++) {
                    let bucket = agg.buckets[i];
                    let latlon = Geohash.decode(bucket.key);
                    latlon["count"] = bucket.doc_count;
                    this.locations.push(latlon);
                }
            }

            // set the centre point
            if (this.locations.length > 0) {
                this.centre = this.calculateCentre(this.locations);
            }
        };
        
        this.boundsChanged = function(params) {
            let top_left = params.top_left;
            let bottom_right = params.bottom_right;
            let zoom = params.zoom;

            let precision = this._getPrecisionForZoom(zoom);

            // if the precision isn't going to change, and the view is just a closer view than
            // the existing one, don't run the cycle
            if (precision === this.currentPrecision && this._currentBoxContains({top_left: top_left, bottom_right: bottom_right})) {
                return;
            }

            let nq = this.edge.cloneQuery();

            nq.removeMust(es.newGeoBoundingBoxFilter({field: this.geoBoundingBoxFilterField}))
            nq.addMust(es.newGeoBoundingBoxFilter({
                field: this.geoBoundingBoxFilterField,
                top_left: top_left,
                bottom_right: bottom_right
            }))

            let agg = nq.getAggregation({name: this.geoHashAggregation});
            agg.precision = precision;

            this.currentPrecision = precision;
            this.currentBottomRight = bottom_right;
            this.currentTopLeft = top_left;

            this.edge.pushQuery(nq);
            this.edge.cycle()
        };
        
        this._getPrecisionForZoom = function(zoom) {
            for (let i = zoom; i >= 0; i--) {
                if (i in this.zoomToPrecisionMap) {
                    return this.zoomToPrecisionMap[i];
                }
            }
            return 1
        }

        this._currentBoxContains = function(params) {
            let top_left = params.top_left;
            let bottom_right = params.bottom_right;

            // if we don't know the current box, then assume false, as we can't tell
            if (!this.currentTopLeft || !this.currentBottomRight) {
                return false;
            }

            function getCorners(top_left, bottom_right) {
                let a = {lon: top_left.lon, lat: top_left.lat}
                let b = {lon: top_left.lon, lat: bottom_right.lat}
                let c = {lon: bottom_right.lon, lat: bottom_right.lat}
                let d = {lon: bottom_right.lon, lat: top_left.lat}
                return [a, b, c, d];
            }

            let current = getCorners(this.currentTopLeft, this.currentBottomRight);
            let updated = getCorners(top_left, bottom_right);

            let tl = current[0].lon > updated[0].lon && current[0].lat < updated[0].lat;
            let tr = current[1].lon > updated[1].lon && current[1].lat > updated[1].lat;
            let br = current[2].lon < updated[2].lon && current[2].lat > updated[2].lat;
            let bl = current[3].lon < updated[3].lon && current[3].lat > updated[3].lat;

            return tl && tr && br && bl;
        }

    },

    newMapView : function(params) {
        if (!params) { params = {} }
        edges.MapView.prototype = edges.newComponent(params);
        return new edges.MapView(params);
    },
    MapView : function(params) {
        //////////////////////////////////
        // parameters that can be passed in

        // field in the data which is the geo_point type
        this.geoPoint = params.geoPoint || "location";

        // type of data at the geo_point.  Can be one of:
        // * properties = lat/lon fields
        // * string - comma separated lat,lon
        // * geohash - not currently supported
        // * array - array of [lon, lat] (note the order)
        this.structure = params.structure || "properties";

        this.calculateCentre = params.calculateCentre || edges.MapCentreFunctions.pickFirst;

        this.defaultRenderer = params.defaultRenderer || "newMapViewRenderer";

        //////////////////////////////////
        // internal state

        // list of locations and the related object at those locations
        // of the form
        // {lat: <lat>, lon: <lon>, obj: {object}}
        this.locations = [];

        // lat/lon object which defines the centre point of the map
        // this default is somewhere in Mali, and is a decent default for the globe
        this.centre = {lat: 17, lon: 0};

        this.synchronise = function() {
            this.locations = [];
            this.centre = {lat: 17, lon: 0};

            // read the locations out of the results
            if (this.edge.result) {
                var results = this.edge.result.results();
                for (var i = 0; i < results.length; i++) {
                    var res = results[i];
                    var gp = this._getGeoPoint(res);
                    if (gp) {
                        var ll = this._getLatLon(gp);
                        ll["obj"] = res;
                        this.locations.push(ll);
                    }
                }
            }

            // set the centre point
            if (this.locations.length > 0) {
                this.centre = this.calculateCentre(this.locations);
            }
        };

        this._getLatLon = function(gp) {
            var ll = {};
            if (this.structure === "properties") {
                ll["lat"] = parseFloat(gp.lat);
                ll["lon"] = parseFloat(gp.lon);
            }
            return ll;
        };

        this._getGeoPoint = function(obj) {
            var parts = this.geoPoint.split(".");
            var context = obj;

            for (var i = 0; i < parts.length; i++) {
                var p = parts[i];
                var d = i < parts.length - 1 ? {} : false;
                context = context[p] !== undefined ? context[p] : d;
            }

            return context;
        }
    },
    MapCentreFunctions : {
        pickFirst : function(locations) {
            return {lat: locations[0].lat, lon: locations[0].lon}
        }
    },

    newRegionDataMap : function(params) {
        if (!params) { params = {} }
        edges.RegionDataMap.prototype = edges.newComponent(params);
        return new edges.RegionDataMap(params);
    },
    RegionDataMap : function(params) {
        //////////////////////////////////
        // parameters that can be passed in

        this.functions = {
            sync : edges.getParam(params.synchronise, false)
        };

        // Data to display assocated with each region.
        //
        // {
        //      "<region_id>" : { <arbitrary data> }
        // }
        //
        // By default, renderers for this type should support the following arbitrary data format
        //
        // {
        //      "<Display name for field>" : "<display value>",
        //      ....
        // }
        //
        // if this is not provided, it should be populated by the "sync" function
        this.regionData = edges.getParam(params.regionData, {});

        // if a region is not defined in the regionData, when it is asked to display its
        // data, the renderer will present the following.  This is also in the form of the <arbitrary data>
        this.defaultRegionData = edges.getParam(params.defaultRegionData, false);

        this.defaultRenderer = edges.getParam(params.defaultRenderer, "newRegionDataMapRenderer");

        // specify the centre point of the map when it renders.  If you do not provide one, one will be
        // chosen by the renderer
        // if provided should be of the form {"lat" : <lat>, "lon" : <lon>}
        this.center = edges.getParam(params.center, false);

        // if the regions in the underlying map can be grouped into larger regions, specify that here
        // you should specify the name of the super region as the key, and a list of identifiers for the
        // regular regions as the value.
        //
        // {"Europe" : ["GBR", "FRA", ...]}
        this.superRegions = edges.getParam(params.superRegions, {});

        //////////////////////////////////
        // internal state

        this.synchronise = function() {
            if (this.functions.sync) {
                this.functions.sync(this);
            }
        };

        ///////////////////////////////////
        // methods for working with this component

        this.getSuperRegion = function(params) {
            var region = params.region;
            for (var srn in this.superRegions) {
                if ($.inArray(region, this.superRegions[srn]) !== -1) {
                    return srn;
                }
            }
            return false;
        }
    }
});
