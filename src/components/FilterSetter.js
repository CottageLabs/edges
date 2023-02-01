// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("components")) { edges.components = {}}

edges.components.FilterSetter = class extends edges.Component {
    constructor(params) {
        /*
        [
            {
                id : "<identifier for this filter within the scope of this component>",
                display: "<How this filter should be described in the UI>",
                must : [<list of query object filters to be applied/removed if this filter is selected/removed>],
                agg_name : "<name of aggregation which informs this filter (defined in this.aggregations)>",
                bucket_field : "<field in the bucket to look in>",
                bucket_value: "<value in the bucket_field to match>"
            }
        ]
        */
        super(params);
        
        this.filters = edges.util.getParam(params, "filters", []);

        this.aggregations = edges.util.getParam(params, "aggregations", []);

        //////////////////////////////////////////
        // properties used to store internal state

        // map of filter id to document count from aggregation
        this.filter_counts = {};

        // map of filter id to whether it is active or not
        this.active_filters = {};
    }
    
    //////////////////////////////////////////
    // overrides on the parent object's standard functions

    contrib(query) {
        for (var i = 0; i < this.aggregations.length; i++) {
            query.addAggregation(this.aggregations[i]);
        }
    }

    synchronise() {
        // first pull the count information from the aggregations
        for (var i = 0; i < this.filters.length; i++) {
            var filter_def = this.filters[i];

            if (!filter_def.agg_name || !filter_def.bucket_field || !filter_def.bucket_value) {
                continue;
            }

            var agg = this.edge.result.aggregation(filter_def.agg_name);
            if (!agg) {
                continue;
            }

            var bfield = filter_def.bucket_field;
            var bvalue = filter_def.bucket_value;
            var count = 0;

            var buckets = agg.buckets;
            for (var k = 0; k < buckets.length; k++) {
                var bucket = buckets[k];
                if (bucket[bfield] && bucket[bfield] === bvalue) {
                    count = bucket["doc_count"];
                    break;
                }
            }

            this.filter_counts[filter_def.id] = count;
        }

        // now extract all the existing filters to find out if any of ours are active
        for (var i = 0; i < this.filters.length; i++) {
            var filter_def = this.filters[i];
            if (!filter_def.must) {
                continue;
            }

            var toactivate = filter_def.must.length;
            var active = 0;
            for (var j = 0; j < filter_def.must.length; j++) {
                var must = filter_def.must[j];
                var current = this.edge.currentQuery.listMust(must);
                if (current.length > 0) {
                    active += 1;
                }
            }
            if (active === toactivate) {
                this.active_filters[filter_def.id] = true;
            } else {
                this.active_filters[filter_def.id] = false;
            }
        }
    };

    //////////////////////////////////////////
    // functions that can be called on this component to change its state

    addFilter(filter_id) {
        var filter = false;
        for (var i = 0; i < this.filters.length; i++) {
            if (this.filters[i].id === filter_id) {
                filter = this.filters[i];
                break;
            }
        }

        if (!filter || !filter.must) {
            return;
        }

        var nq = this.edge.cloneQuery();

        // add all of the must filters to the query
        for (var i = 0; i < filter.must.length; i++) {
            var must = filter.must[i];
            nq.addMust(must);
        }

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    }

    removeFilter = function(filter_id) {
        var filter = false;
        for (var i = 0; i < this.filters.length; i++) {
            if (this.filters[i].id === filter_id) {
                filter = this.filters[i];
                break;
            }
        }

        if (!filter || !filter.must) {
            return;
        }

        var nq = this.edge.cloneQuery();

        // add all of the must filters to the query
        for (var i = 0; i < filter.must.length; i++) {
            var must = filter.must[i];
            nq.removeMust(must);
        }

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    }
}