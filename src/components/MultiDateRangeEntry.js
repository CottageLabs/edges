// requires: edges
// requires: edges.util
// requires: es

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("components")) { edges.components = {}}

edges.components.MultiDateRangeEntry = class extends edges.Component {
    constructor(params) {
        super(params);

        ///////////////////////////////////////////////
        // fields that can be passed in, and their defaults

        // free text to prefix entry boxes with
        // this.display = getParam(params, "display", false);

        // list of field objects, which provide the field itself, and the display name.  e.g.
        // [{field : "monitor.rioxxterms:publication_date", display: "Publication Date"}]
        this.fields = edges.util.getParam(params, "fields", []);

        // map from field name (as in this.field[n].field) to a function which will provide
        // the earliest allowed date for that field.  e.g.
        // {"monitor.rioxxterms:publication_date" : earliestDate}
        this.earliest = edges.util.getParam(params, "earliest", {});

        // map from field name (as in this.field[n].field) to a function which will provide
        // the latest allowed date for that field.  e.g.
        // {"monitor.rioxxterms:publication_date" : latestDate}
        this.latest = edges.util.getParam(params, "latest", {});

        this.autoLookupRange = edges.util.getParam(params, "autoLookupRange", false);

        // category for this component, defaults to "selector"
        this.category = edges.util.getParam(params, "category", "selector");

        // default earliest date to use in all cases (defaults to start of the unix epoch)
        this.defaultEarliest = edges.util.getParam(params, "defaultEarliest", new Date(0));

        // default latest date to use in all cases (defaults to now)
        this.defaultLatest = edges.util.getParam(params, "defaultLatest", new Date());

        // use this to force a latest date, even if the auto lookup on the range is set
        this.forceLatest = edges.util.getParam(params, "forceLatest", false);

        ///////////////////////////////////////////////
        // fields used to track internal state

        this.currentField = false;
        this.fromDate = false;
        this.toDate = false;

        this.touched = false;
        this.dateOptions = {};
    }

    init(edge) {
        super.init(edge);

        // set the initial field
        this.currentField = this.fields[0].field;

        // track the last field, for query building purposes
        this.lastField = false;

        // if required, load the dates once at init
        if (!this.autoLookupRange) {
            this.loadDates();
        } else {
            if (edge.secondaryQueries === false) {
                edge.secondaryQueries = {};
            }
            edge.secondaryQueries["multidaterange_" + this.id] = this.getSecondaryQueryFunction();
        }
    }

    synchronise() {
        this.currentField = false;
        this.fromDate = false;
        this.toDate = false;

        if (this.autoLookupRange) {
            for (var i = 0; i < this.fields.length; i++) {
                var field = this.fields[i].field;
                var agg = this.edge.secondaryResults["multidaterange_" + this.id].aggregation(field);

                var min = this.defaultEarliest;
                var max = this.defaultLatest;
                if (agg.min !== null) {
                    min = new Date(agg.min);
                }
                if (agg.max !== null && !this.forceLatest) {
                    max = new Date(agg.max);
                }

                this.dateOptions[field] = {
                    earliest: min,
                    latest: max
                }
            }
        }

        for (var i = 0; i < this.fields.length; i++) {
            var field = this.fields[i].field;
            var filters = this.edge.currentQuery.listMust(new es.RangeFilter({field: field}));
            if (filters.length > 0) {
                this.currentField = field;
                var filter = filters[0];
                this.fromDate = filter.gte;
                this.toDate = filter.lte;
            }
        }

        if (!this.currentField && this.fields.length > 0) {
            this.currentField = this.fields[0].field;
        }
    }

    //////////////////////////////////////////////
    // functions that can be used to trigger state change

    currentEarliest() {
        if (!this.currentField) {
            return false;
        }
        if (this.dateOptions[this.currentField]) {
            return this.dateOptions[this.currentField].earliest;
        }
    }

    currentLatest() {
        if (!this.currentField) {
            return false;
        }
        if (this.dateOptions[this.currentField]) {
            return this.dateOptions[this.currentField].latest;
        }
    }

    changeField(newField) {
        this.lastField = this.currentField;
        if (newField !== this.currentField) {
            this.touched = true;
            this.currentField = newField;
        }
    }

    setFrom(from) {
        if (from !== this.fromDate) {
            this.touched = true;
            this.fromDate = from;
        }
    }

    setTo(to) {
        if (to !== this.toDate) {
            this.touched = true;
            this.toDate = to;
        }
    }

    triggerSearch() {
        if (this.touched) {
            this.touched = false;
            var nq = this.edge.cloneQuery();

            // remove any old filters managed by this component
            var removeCount = 0;
            for (var i = 0; i < this.fields.length; i++) {
                var fieldName = this.fields[i].field;
                removeCount += nq.removeMust(new es.RangeFilter({field: fieldName}));
            }

            // in order to avoid unnecessary searching, check the state of the data and determine
            // if we need to.
            // - we need to add a new filter to the query if there is a current field and one/both of from and to dates
            // - we need to do a search if we removed filters before, or are about to add one
            var addFilter = this.currentField && (this.toDate || this.fromDate);
            var doSearch = removeCount > 0 || addFilter;

            // if we're not going to do a search, return
            if (!doSearch) {
                return false;
            }

            // if there's a filter to be added, do that here
            if (addFilter) {
                var range = {field: this.currentField};
                if (this.toDate) {
                    range["lte"] = this.formatDateForQuery(this.toDate);
                }
                if (this.fromDate) {
                    range["gte"] = this.formatDateForQuery(this.fromDate);
                }
                nq.addMust(new es.RangeFilter(range));
            }

            // push the new query and trigger the search
            this.edge.pushQuery(nq);
            this.edge.cycle();

            return true;
        }
        return false;
    }

    formatDateForQuery(date) {
        let zeroPadder = edges.util.numFormat({zeroPadding: 2})
        return date.getUTCFullYear() + "-" + zeroPadder(date.getUTCMonth() + 1) + "-" + zeroPadder(date.getUTCDate())
    }

    loadDates() {
        for (var i = 0; i < this.fields.length; i++) {
            var field = this.fields[i].field;

            // start with the default earliest and latest
            var early = this.defaultEarliest;
            var late = this.defaultLatest;

            // if specific functions are provided for getting the dates, run them
            var earlyFn = this.earliest[field];
            var lateFn = this.latest[field];
            if (earlyFn) {
                early = earlyFn();
            }
            if (lateFn) {
                late = lateFn();
            }

            this.dateOptions[field] = {
                earliest: early,
                latest: late
            }
        }
    };

    getSecondaryQueryFunction() {
        var that = this;
        return function(edge) {
            // clone the current query, which will be the basis for the averages query
            var query = edge.cloneQuery();

            // remove any range constraints
            for (var i = 0; i < that.fields.length; i++) {
                var field = that.fields[i];
                query.removeMust(new es.RangeFilter({field: field.field}));
            }

            // remove any existing aggregations, we don't need them
            query.clearAggregations();

            // add the new aggregation(s) which will actually get the data
            for (var i = 0; i < that.fields.length; i++) {
                var field = that.fields[i].field;
                query.addAggregation(
                    new es.StatsAggregation({
                        name: field,
                        field : field
                    })
                );
            }

            // finally set the size and from parameters
            query.size = 0;
            query.from = 0;

            // return the secondary query
            return query;
        }
    }
}