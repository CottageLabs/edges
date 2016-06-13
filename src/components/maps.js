$.extend(edges, {
    ////////////////////////////////////////////////////
    // Map implementation

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
