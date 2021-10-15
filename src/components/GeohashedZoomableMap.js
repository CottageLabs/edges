import {es} from '../../dependencies/es'

import {Component} from "../core";
import {getParam} from "../utils";
import {pickFirst} from "./maputils";
import Geohash from "latlon-geohash";

export class GeohashedZoomableMap extends Component {
    constructor(params) {
        super(params);
        //////////////////////////////////
        // parameters that can be passed in

        // field in the data which is the geo_point type
        this.geoHashAggregation = getParam(params, "geoHashAggregation", "geohash");

        this.calculateCentre = getParam(params, "calculateCentre", () => { return pickFirst });

        this.geoBoundingBoxFilterField = getParam(params, "geoBoundingBoxFilterField", "location")

        this.zoomToPrecisionMap = getParam(params, "zoomToPrecisionMap", {
            0: 1,
            3: 2,
            5: 3,
            7: 4,
            10: 5,
            13: 6,
            15: 7
        });

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
    }

    synchronise() {
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
    }

    boundsChanged(params) {
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

        nq.removeMust(new es.GeoBoundingBoxFilter({field: this.geoBoundingBoxFilterField}))
        nq.addMust(new es.GeoBoundingBoxFilter({
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
    }

    _getPrecisionForZoom(zoom) {
        for (let i = zoom; i >= 0; i--) {
            if (i in this.zoomToPrecisionMap) {
                return this.zoomToPrecisionMap[i];
            }
        }
        return 1
    }

    _currentBoxContains(params) {
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
}
