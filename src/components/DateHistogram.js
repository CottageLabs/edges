/* global $, jQuery, es */

window.es = window.es || {};
var es = window.es;

window.edges = window.edges || {};
var edges = window.edges;
if (!edges.hasOwnProperty("components")) { edges.components = {}}

edges.components.DateHistogram = class extends edges.Component {
    constructor(params) {
        super(params);

        this.field = edges.util.getParam(params, "field");

        // "year, quarter, month, week, day, hour, minute ,second"
        // period to use for date histogram
        this.interval = edges.util.getParam(params, "interval", "year");

        this.sortFunction = edges.util.getParam(params, "sortFunction", false);

        this.displayFormatter = edges.util.getParam(params, "displayFormatter", false);

        this.active = edges.util.getParam(params, "active", true);

        //////////////////////////////////////////////
        // values to be rendered

        this.values = [];
        this.filters = [];
    }

    contrib(query) {
        query.addAggregation(
            new es.DateHistogramAggregation({
                name: this.id,
                field: this.field,
                interval: this.interval
            })
        );
    }

    synchronise() {
        // reset the state of the internal variables
        this.values = [];
        this.filters = [];

        if (this.edge.result) {
            let buckets = this.edge.result.buckets(this.id);
            for (let i = 0; i < buckets.length; i++) {
                let bucket = buckets[i];
                let key = bucket.key;
                if (this.displayFormatter) {
                    key = this.displayFormatter(key);
                }
                let obj = {"display" : key, "gte": bucket.key, "count" : bucket.doc_count};
                if (i < buckets.length - 1) {
                    obj["lt"] = buckets[i+1].key;
                }
                this.values.push(obj);
            }
        }

        if (this.sortFunction) {
            this.values = this.sortFunction(this.values);
        }

        // now check to see if there are any range filters set on this field
        // this works in a very specific way: if there is a filter on this field, and it
        // starts from the date of a filter in the result list, then we make they assumption
        // that they are a match.  This is because a date histogram either has all the results
        // or only one date bin, if that date range has been selected.  And once a range is selected
        // there will be no "lt" date field to compare the top of the range to.  So, this is the best
        // we can do, and it means that if you have both a date histogram and another range selector
        // for the same field, they may confuse eachother.
        if (this.edge.currentQuery) {
            let filters = this.edge.currentQuery.listMust(new es.RangeFilter({field: this.field}));
            for (let i = 0; i < filters.length; i++) {
                var from = filters[i].gte;
                for (let j = 0; j < this.values.length; j++) {
                    let val = this.values[j];
                    if (val.gte.toString() === from) {
                        this.filters.push(val);
                    }
                }
            }
        }
    }

    selectRange(params) {
        let from = params.gte;
        let to = params.lt;

        var nq = this.edge.cloneQuery();

        // just add a new range filter (the query builder will ensure there are no duplicates)
        let rparams = {field: this.field};
        nq.removeMust(new es.RangeFilter(rparams));

        if (from) {
            rparams["gte"] = from;
        }
        if (to) {
            rparams["lt"] = to;
        }
        nq.addMust(new es.RangeFilter(rparams));

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    }

    removeFilter(params) {
        let from = params.gte;
        let to = params.lt;

        let nq = this.edge.cloneQuery();

        // just add a new range filter (the query builder will ensure there are no duplicates)
        let rparams = {field: this.field};
        if (from) {
            rparams["gte"] = from;
        }
        if (to) {
            rparams["lt"] = to;
        }
        nq.removeMust(new es.RangeFilter(rparams));

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    }

    clearFilters(params) {
        let triggerQuery = edges.getParam(params.triggerQuery, true);

        let nq = this.edge.cloneQuery();
        let qargs = {field: this.field};
        nq.removeMust(new es.RangeFilter(qargs));
        this.edge.pushQuery(nq);

        if (triggerQuery) {
            this.edge.cycle();
        }
    };
}