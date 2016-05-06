$.extend(edges, {
    ///////////////////////////////////////////////////
    // Selector implementations

    newRefiningANDTermSelector : function(params) {
        if (!params) { params = {} }
        edges.RefiningANDTermSelector.prototype = edges.newSelector(params);
        return new edges.RefiningANDTermSelector(params);
    },
    RefiningANDTermSelector : function(params) {
        ////////////////////////////////////////////
        // configurations to be passed in

        // how many terms should the facet limit to
        this.size = params.size || 10;

        // which ordering to use term/count and asc/desc
        this.orderBy = params.orderBy || "count";
        this.orderDir = params.orderDir || "desc";

        // number of facet terms below which the facet is disabled
        this.deactivateThreshold = params.deactivateThreshold || false;

        // should the terms facet ignore empty strings in display
        this.ignoreEmptyString = params.ignoreEmptyString || true;

        // should filters defined in the baseQuery be excluded from the selector
        this.excludePreDefinedFilters = params.excludePreDefinedFilters || true;

        // provide a map of values for terms to displayable terms, or a function
        // which can be used to translate terms to displyable values
        this.valueMap = params.valueMap || false;
        this.valueFunction = params.valueFunction || false;

        // due to a limitation in elasticsearch's clustered node facet counts, we need to inflate
        // the number of facet results we need to ensure that the results we actually want are
        // accurate.  This option tells us by how much.
        this.inflation = params.inflation || 100;

        // override the parent's defaultRenderer
        this.defaultRenderer = params.defaultRenderer || "newRefiningANDTermSelectorRenderer";

        //////////////////////////////////////////
        // properties used to store internal state

        // filters that have been selected via this component
        this.filters = [];

        // values that the renderer should render
        // wraps an object (so the list is ordered) which in turn is the
        // { display: <display>, term: <term>, count: <count> }
        this.values = [];

        //////////////////////////////////////////
        // overrides on the parent object's standard functions

        this.contrib = function(query) {
            var params = {
                name: this.id,
                field: this.field,
                orderBy: this.orderBy,
                orderDir: this.orderDir
            };
            if (this.size) {
                params["size"] = this.size
            }
            query.addAggregation(
                es.newTermsAggregation(params)
            );
        };

        this.synchronise = function() {
            // reset the state of the internal variables
            this.values = [];
            this.filters = [];

            // if there is a result object, pull and prepare the values
            if (this.edge.result) {
                // assign the terms and counts from the aggregation
                var buckets = this.edge.result.buckets(this.id);

                if (buckets.length < this.deactivateThreshold) {
                    this.active = false
                } else {
                    this.active = true;
                }

                // list all of the pre-defined filters for this field from the baseQuery
                var predefined = [];
                if (this.excludePreDefinedFilters) {
                    predefined = this.edge.baseQuery.listMust(es.TermFilter({field: this.field}));
                }

                var realCount = 0;
                for (var i = 0; i < buckets.length; i++) {
                    var bucket = buckets[i];

                    // ignore empty strings
                    if (this.ignoreEmptyString && bucket.key === "") {
                        continue;
                    }

                    // ignore pre-defined filters
                    if (this.excludePreDefinedFilters) {
                        var exclude = false;
                        for (var j = 0; j < predefined.length; j++) {
                            var f = predefined[j];
                            if (bucket.key === f.value) {
                                exclude = true;
                                break;
                            }
                        }
                        if (exclude) {
                            continue;
                        }
                    }

                    // if we get to here we're going to add this to the values, so
                    // increment the real count
                    realCount++;

                    // we must cut off at the set size, as there may be more
                    // terms that we care about
                    if (realCount > this.size) {
                        break;
                    }

                    // translate the term if necessary
                    var key = this._translate(bucket.key);

                    // store the original value and the translated value plus the count
                    var obj = {display: key, term: bucket.key, count: bucket.doc_count};
                    this.values.push(obj);
                }
            }

            // extract all the filter values that pertain to this selector

            var filters = this.edge.currentQuery.listMust(es.newTermFilter({field: this.field}));
            for (var i = 0; i < filters.length; i++) {
                var val = filters[i].value;
                val = this._translate(val);
                this.filters.push({display: val, term: filters[i].value});
            }
        };

        //////////////////////////////////////////
        // functions that can be called on this component to change its state

        this.selectTerm = function(term) {
            var nq = this.edge.cloneQuery();

            // just add a new term filter (the query builder will ensure there are no duplicates)
            // this means that the behaviour here is that terms are ANDed together
            nq.addMust(es.newTermFilter({
                field: this.field,
                value: term
            }));

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.removeFilter = function(term) {
            var nq = this.edge.cloneQuery();

            nq.removeMust(es.newTermFilter({
                field: this.field,
                value: term
            }));

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.changeSize = function(newSize) {
            this.size = newSize;

            var nq = this.edge.cloneQuery();
            var agg = nq.getAggregation({
                name: this.id
            });
            agg.size = this.size;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.changeSort = function(orderBy, orderDir) {
            this.orderBy = orderBy;
            this.orderDir = orderDir;

            var nq = this.edge.cloneQuery();
            var agg = nq.getAggregation({
                name: this.id
            });
            agg.setOrdering(this.orderBy, this.orderDir);
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        //////////////////////////////////////////
        // "private" functions for internal use

        this._translate = function(term) {
            if (this.valueMap) {
                if (term in this.valueMap) {
                    return this.valueMap[term];
                }
            } else if (this.valueFunction) {
                return this.valueFunction(term);
            }
            return term;
        };
    },

    newORTermSelector : function(params) {
        if (!params) { params = {} }
        edges.ORTermSelector.prototype = edges.newSelector(params);
        return new edges.ORTermSelector(params);
    },
    ORTermSelector : function(params) {
        // whether this component updates itself on every request, or whether it is static
        // throughout its lifecycle.  One of "update" or "static"
        this.lifecycle = params.lifecycle || "static";

        // which ordering to use term/count and asc/desc
        this.orderBy = params.orderBy || "term";
        this.orderDir = params.orderDir || "asc";

        // number of results that we should display - remember that this will only
        // be used once, so should be large enough to gather all the values that might
        // be in the index
        this.size = params.size || 10;

        // provide a map of values for terms to displayable terms, or a function
        // which can be used to translate terms to displyable values
        this.valueMap = params.valueMap || false;
        this.valueFunction = params.valueFunction || false;

        // override the parent's defaultRenderer
        this.defaultRenderer = params.defaultRenderer || "newORTermSelectorRenderer";

        //////////////////////////////////////////
        // properties used to store internal state

        // an explicit list of terms to be displayed.  If this is not passed in, then a query
        // will be issues which will populate this with the values
        // of the form
        // [{term: "<value>", display: "<display value>", count: <number of records>}]
        this.terms = params.terms || false;

        // values of terms that have been selected from this.terms
        this.selected = [];

        // is the object currently updating itself
        this.updating = false;

        this.init = function(edge) {
            // first kick the request up to the superclass
            edges.newSelector().init.call(this, edge);

            // now trigger a request for the terms to present, if not explicitly provided
            if (!this.terms) {
                this.listAll();
            }
        };

        this.synchronise = function() {
            // reset the internal properties
            this.selected = [];

            // extract all the filter values that pertain to this selector
            var filters = this.edge.currentQuery.listMust(es.newTermsFilter({field: this.field}));
            for (var i = 0; i < filters.length; i++) {
                for (var j = 0; j < filters[i].values.length; j++) {
                    var val = filters[i].values[j];
                    this.selected.push(val);
                }
            }
        };

        /////////////////////////////////////////////////
        // query handlers for getting the full list of terms to display

        this.listAll = function() {
            // to list all possible terms, build off the base query
            var bq = this.edge.cloneBaseQuery();
            bq.clearAggregations();
            bq.size = 0;

            // now add the aggregation that we want
            var params = {
                name: this.id,
                field: this.field,
                orderBy: this.orderBy,
                orderDir: this.orderDir,
                size: this.size
            };
            bq.addAggregation(
                es.newTermsAggregation(params)
            );

            // issue the query to elasticsearch
            es.doQuery({
                search_url: this.edge.search_url,
                queryobj: bq.objectify(),
                datatype: this.edge.datatype,
                success: edges.objClosure(this, "listAllQuerySuccess", ["result"]),
                error: edges.objClosure(this, "listAllQueryFail")
            });
        };

        this.listAllQuerySuccess = function(params) {
            var result = params.result;

            // get the terms out of the aggregation
            this.terms = [];
            var buckets = result.buckets(this.id);
            for (var i = 0; i < buckets.length; i++) {
                var bucket = buckets[i];
                this.terms.push({term: bucket.key, display: this._translate(bucket.key), count: bucket.doc_count});
            }

            // allow the event handler to be set up
            this.setupEvent();

            // since this happens asynchronously, we may want to draw
            this.draw();
        };

        this.listAllQueryFail = function() {
            this.terms = [];
        };

        this.setupEvent = function() {
            if (this.lifecycle === "update") {
                this.edge.context.on("edges:pre-query", edges.eventClosure(this, "doUpdate"));
                this.doUpdate();
            }
        };

        this.doUpdate = function() {
            // is an update already happening?
            if (this.updating) {
                return
            }
            this.udpating = true;

            // to list all current terms, build off the current query
            var bq = this.edge.cloneQuery();

            // remove any constraint on this field, and clear the aggregations and set size to 0 for performance
            bq.removeMust(es.newTermsFilter({field: this.field}));
            bq.clearAggregations();
            bq.size = 0;

            // now add the aggregation that we want
            var params = {
                name: this.id,
                field: this.field,
                orderBy: this.orderBy,
                orderDir: this.orderDir,
                size: this.size
            };
            bq.addAggregation(
                es.newTermsAggregation(params)
            );

            // issue the query to elasticsearch
            es.doQuery({
                search_url: this.edge.search_url,
                queryobj: bq.objectify(),
                datatype: this.edge.datatype,
                success: edges.objClosure(this, "doUpdateQuerySuccess", ["result"]),
                error: edges.objClosure(this, "doUpdateQueryFail")
            });
        };

        this.doUpdateQuerySuccess = function(params) {
            var result = params.result;

            // mesh the terms in the aggregation with the terms in the terms list
            var buckets = result.buckets(this.id);

            for (var i = 0; i < this.terms.length; i++) {
                var t = this.terms[i];
                var found = false;
                for (var j = 0; j < buckets.length; j++) {
                    var b = buckets[j];
                    if (t.term === b.key) {
                        t.count = b.doc_count;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    t.count = 0;
                }
            }

            // turn off the update flag
            this.updating = false;

            // since this happens asynchronously, we may want to draw
            this.draw();
        };

        this.doUpdateQueryFail = function() {
            // just do nothing, hopefully the next request will be successful
        };

        ///////////////////////////////////////////
        // state change functions

        this.selectTerm = function(term) {
            var nq = this.edge.cloneQuery();

            // first find out if there was a terms filter already in place
            var filters = nq.listMust(es.newTermsFilter({field: this.field}));

            // if there is, just add the term to it
            if (filters.length > 0) {
                var filter = filters[0];
                filter.add_term(term);
            } else {
                // otherwise, set the Terms Filter
                nq.addMust(es.newTermsFilter({
                    field: this.field,
                    values: [term]
                }));
            }

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.removeFilter = function(term) {
            var nq = this.edge.cloneQuery();

            // first find out if there was a terms filter already in place
            var filters = nq.listMust(es.newTermsFilter({field: this.field}));

            if (filters.length > 0) {
                var filter = filters[0];
                if (filter.has_term(term)) {
                    filter.remove_term(term);
                }
                if (!filter.has_terms()) {
                    nq.removeMust(es.newTermsFilter({field: this.field}));
                }
            }

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };


        //////////////////////////////////////////
        // "private" functions for internal use

        this._translate = function(term) {
            if (this.valueMap) {
                if (term in this.valueMap) {
                    return this.valueMap[term];
                }
            } else if (this.valueFunction) {
                return this.valueFunction(term);
            }
            return term;
        };
    },

    newBasicRangeSelector : function(params) {
        if (!params) { params = {} }
        edges.BasicRangeSelector.prototype = edges.newSelector(params);
        return new edges.BasicRangeSelector(params);
    },
    BasicRangeSelector : function(params) {
        //////////////////////////////////////////////
        // values that can be passed in

        // list of ranges (in order) which define the filters
        // {"from" : <num>, "to" : <num>, "display" : "<display name>"}
        this.ranges = params.ranges || [];

        // function to use to format any unknown ranges (there is a sensible default
        // so you can mostly leave this alone)
        this.formatUnknown = params.formatUnknown || false;

        // override the parent's defaultRenderer
        this.defaultRenderer = params.defaultRenderer || "newBasicRangeSelectorRenderer";

        //////////////////////////////////////////////
        // values to track internal state

        // values that the renderer should render
        // wraps an object (so the list is ordered) which in turn is the
        // { display: <display>, from: <from>, to: <to>, count: <count> }
        this.values = [];

        // a list of already-selected ranges for this field
        // wraps an object which in turn is
        // {display: <display>, from: <from>, to: <to> }
        this.filters = [];

        this.contrib = function(query) {
            var ranges = [];
            for (var i = 0; i < this.ranges.length; i++) {
                var r = this.ranges[i];
                var obj = {};
                if (r.from) {
                    obj.from = r.from;
                }
                if (r.to) {
                    obj.to = r.to;
                }
                ranges.push(obj);
            }
            query.addAggregation(
                es.newRangeAggregation({
                    name: this.id,
                    field: this.field,
                    ranges: ranges
                })
            );
        };

        this.synchronise = function() {
            // reset the state of the internal variables
            this.values = [];
            this.filters = [];

            // first copy over the results from the aggregation buckets
            if (this.edge.result) {

                var buckets = this.edge.result.buckets(this.id);
                for (var i = 0; i < this.ranges.length; i++) {
                    var r = this.ranges[i];
                    var bucket = this._getRangeBucket(buckets, r.from, r.to);
                    var obj = $.extend(true, {}, r);
                    obj["count"] = bucket.doc_count;
                    this.values.push(obj);
                }
            }

            // now check to see if there are any range filters set on this field
            if (this.edge.currentQuery) {
                var filters = this.edge.currentQuery.listMust(es.newRangeFilter({field: this.field}));
                for (var i = 0; i < filters.length; i++) {
                    var to = filters[i].lt;
                    var from = filters[i].gte;
                    var r = this._getRangeDef(from, to);
                    if (r) {
                        // one of our ranges has been set
                        this.filters.push(r);
                    } else {
                        // this is a previously unknown range definition, so we need to be able to understand it
                        this.filters.push({display: this._formatUnknown(from, to), from: from, to: to})
                    }
                }
            }
        };

        this.selectRange = function(from, to) {
            var nq = this.edge.cloneQuery();

            // just add a new range filter (the query builder will ensure there are no duplicates)
            var params = {field: this.field};
            if (from) {
                params["gte"] = from;
            }
            if (to) {
                params["lt"] = to;
            }
            nq.addMust(es.newRangeFilter(params));

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.removeFilter = function(from, to) {
            var nq = this.edge.cloneQuery();

            // just add a new range filter (the query builder will ensure there are no duplicates)
            var params = {field: this.field};
            if (from) {
                params["gte"] = from;
            }
            if (to) {
                params["lt"] = to;
            }
            nq.removeMust(es.newRangeFilter(params));

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this._getRangeDef = function(from, to) {
            for (var i = 0; i < this.ranges.length; i++) {
                var r = this.ranges[i];
                var frMatch = true;
                var toMatch = true;
                // if one is set and the other not, no match
                if ((from && !r.from) || (!from && r.from)) {
                    frMatch = false;
                }
                if ((to && !r.to) || (!to && r.to)) {
                    toMatch = false;
                }

                // if both set, and they don't match, no match
                if (from && r.from && from !== r.from) {
                    frMatch = false;
                }
                if (to && r.to && to !== r.to) {
                    toMatch = false;
                }

                // both have to match for a match
                if (frMatch && toMatch) {
                    return r
                }
            }
            return false;
        };

        this._getRangeBucket = function(buckets, from, to) {
            for (var i = 0; i < buckets.length; i++) {
                var r = buckets[i];
                var frMatch = true;
                var toMatch = true;
                // if one is set and the other not, no match
                if ((from && !r.from) || (!from && r.from)) {
                    frMatch = false;
                }
                if ((to && !r.to) || (!to && r.to)) {
                    toMatch = false;
                }

                // if both set, and they don't match, no match
                if (from && r.from && from !== r.from) {
                    frMatch = false;
                }
                if (to && r.to && to !== r.to) {
                    toMatch = false;
                }
                if (frMatch && toMatch) {
                    return r
                }
            }
            return false;
        };

        this._formatUnknown = function(from, to) {
            if (this.formatUnknown) {
                return this.formatUnknown(from, to)
            } else {
                var frag = "";
                if (from) {
                    frag += from;
                } else {
                    frag += "< ";
                }
                if (to) {
                    if (from) {
                        frag += " - " + to;
                    } else {
                        frag += to;
                    }
                } else {
                    if (from) {
                        frag += "+";
                    } else {
                        frag = "unknown";
                    }
                }
                return frag;
            }
        };
    },

    newBasicGeoDistanceRangeSelector : function(params) {
        if (!params) { params = {} }
        edges.BasicGeoDistanceRangeSelector.prototype = edges.newSelector(params);
        return new edges.BasicGeoDistanceRangeSelector(params);
    },
    BasicGeoDistanceRangeSelector : function(params) {
        // list of distances (in order) which define the filters
        // {"from" : <num>, "to" : <num>, "display" : "<display name>"}
        this.distances = params.distances || [];

        // if there are no results for a given distance range, should it be hidden
        this.hideEmptyDistance = params.hideEmptyDistance || true;

        // unit to measure distances in
        this.unit = params.unit || "m";

        // lat/lon of centre point from which to measure distance
        this.lat = params.lat || false;
        this.lon = params.lon || false;

        //////////////////////////////////////////////
        // values to be rendered

        this.values = [];

        this.synchronise = function() {
            // reset the state of the internal variables
            this.values = [];
        };
    },

    newDateHistogramSelector : function(params) {
        if (!params) { params = {} }
        edges.BasicRangeSelector.prototype = edges.newSelector(params);
        return new edges.BasicRangeSelector(params);
    },
    DateHistogramSelector : function(params) {
        // "year, quarter, month, week, day, hour, minute ,second"
        // period to use for date histogram
        this.interval = params.interval || "year";

        // "asc|desc"
        // which ordering to use for date histogram
        this.sort = params.sort || "asc";

        // whether to suppress display of date range with no values
        this.hideEmptyDateBin = params.hideEmptyDateBin || true;

        // the number of values to show initially (note you should set size=false)
        this.shortDisplay = params.shortDisplay || false;

        //////////////////////////////////////////////
        // values to be rendered

        this.values = [];

        this.synchronise = function() {
            // reset the state of the internal variables
            this.values = [];
        };
    },

    newAutocompleteTermSelector : function(params) {
        if (!params) { params = {} }
        edges.AutocompleteTermSelector.prototype = edges.newComponent(params);
        return new edges.AutocompleteTermSelector(params);
    },
    AutocompleteTermSelector : function(params) {
        this.defaultRenderer = params.defaultRenderer || "newAutocompleteTermSelectorRenderer";
    }
});
