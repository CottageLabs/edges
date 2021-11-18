$.extend(edges, {
    ///////////////////////////////////////////////////
    // Selector implementations


    newRefiningANDTermSelector : function(params) {
        return edges.instantiate(edges.RefiningANDTermSelector, params, edges.newSelector);
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

        // function to parse the value selected (which will be a string) into whatever
        // datatype the filter requires
        this.parseSelectedValueString = edges.getParam(params.parseSelectedValueString, false);

        // function to convert the filter value to the same type as the aggregation value, if they
        // differ (e.g. if the filter is `true` but the agg value is `1` this function can convert
        // between them.
        this.filterToAggValue = edges.getParam(params.filterToAggValue, false);

        // due to a limitation in elasticsearch's clustered node facet counts, we need to inflate
        // the number of facet results we need to ensure that the results we actually want are
        // accurate.  This option tells us by how much.
        this.inflation = params.inflation || 100;

        // override the parent's defaultRenderer
        this.defaultRenderer = params.defaultRenderer || "newRefiningANDTermSelectorRenderer";

        this.active = edges.getParam(params.active, true);

        // whether this component updates itself on every request, or whether it is static
        // throughout its lifecycle.  One of "update" or "static"
        this.lifecycle = edges.getParam(params.lifecycle, "update");

        //////////////////////////////////////////
        // properties used to store internal state

        // filters that have been selected via this component
        // {display: <display>, term: <term>}
        this.filters = [];

        // values that the renderer should render
        // wraps an object (so the list is ordered) which in turn is the
        // { display: <display>, term: <term>, count: <count> }
        this.values = false;

        //////////////////////////////////////////
        // overrides on the parent object's standard functions

        this.init = function(edge) {
            // first kick the request up to the superclass
            edges.up(this, "init", [edge]);

            if (this.lifecycle === "static") {
                this.listAll();
            }
        };

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
            if (this.lifecycle === "update") {
                // if we are in the "update" lifecycle, then reset and read all the values
                this.values = [];
                if (this.edge.result) {
                    this._readValues({result: this.edge.result});
                }
            }
            this.filters = [];

            // extract all the filter values that pertain to this selector
            var filters = this.edge.currentQuery.listMust(es.newTermFilter({field: this.field}));
            for (var i = 0; i < filters.length; i++) {
                var val = filters[i].value;
                if (this.filterToAggValue) {
                    val = this.filterToAggValue(val);
                }
                let term = val;
                val = this._translate(val);
                this.filters.push({display: val, term: term});
            }
        };

        this._readValues = function(params) {
            var result = params.result;

            // assign the terms and counts from the aggregation
            var buckets = result.buckets(this.id);

            if (this.deactivateThreshold) {
                if (buckets.length < this.deactivateThreshold) {
                    this.active = false
                } else {
                    this.active = true;
                }
            }

            // list all of the pre-defined filters for this field from the baseQuery
            var predefined = [];
            if (this.excludePreDefinedFilters && this.edge.baseQuery) {
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
                        let filterValue = f.value;
                        if (this.filterToAggValue) {
                            filterValue = this.filterToAggValue(f.value)
                        }
                        if (bucket.key === filterValue) {
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
            this.edge.queryAdapter.doQuery({
                edge: this.edge,
                query: bq,
                success: edges.objClosure(this, "listAllQuerySuccess", ["result"]),
                error: edges.objClosure(this, "listAllQueryFail")
            });
        };

        this.listAllQuerySuccess = function(params) {
            var result = params.result;

            // set the values according to what comes back
            this.values = [];
            this._readValues({result: result});

            // since this happens asynchronously, we may want to draw
            this.draw();
        };

        this.listAllQueryFail = function() {
            this.values = [];
            console.log("RefiningANDTermSelector asynchronous query failed");
        };

        //////////////////////////////////////////
        // functions that can be called on this component to change its state

        this.selectTerm = function(term) {
            if (this.parseSelectedValueString) {
                term = this.parseSelectedValueString(term);
            }

            var nq = this.edge.cloneQuery();

            // first make sure we're not double-selecting a term
            var removeCount = nq.removeMust(es.newTermFilter({
                field: this.field,
                value: term
            }));

            // all we've done is remove and then re-add the same term, so take no action
            if (removeCount > 0) {
                return false;
            }

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

            return true;
        };

        this.removeFilter = function(term) {
            if (this.parseSelectedValueString) {
                term = this.parseSelectedValueString(term);
            }

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

        this.clearFilters = function(params) {
            var triggerQuery = edges.getParam(params.triggerQuery, true);

            if (this.filters.length > 0) {
                var nq = this.edge.cloneQuery();
                for (var i = 0; i < this.filters.length; i++) {
                    var filter = this.filters[i];
                    nq.removeMust(es.newTermFilter({
                        field: this.field,
                        value: filter.term
                    }));
                }
                this.edge.pushQuery(nq);
            }
            if (triggerQuery) {
                this.edge.doQuery();
            }
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
        this.lifecycle = edges.getParam(params.lifecycle, "static");

        // if the update type is "update", then how should this component update the facet values
        // * mergeInitial - always keep the initial list in the original order, and merge the bucket counts onto the correct terms
        // * fresh - just use the values in the most recent aggregation, ignoring the initial values
        this.updateType = edges.getParam(params.updateType, "mergeInitial");

        // which ordering to use term/count and asc/desc
        this.orderBy = edges.getParam(params.orderBy, "term");
        this.orderDir = edges.getParam(params.orderDir, "asc");

        // number of results that we should display - remember that this will only
        // be used once, so should be large enough to gather all the values that might
        // be in the index
        this.size = edges.getParam(params.size, 10);

        // provide a map of values for terms to displayable terms, or a function
        // which can be used to translate terms to displyable values
        this.valueMap = edges.getParam(params.valueMap, false);
        this.valueFunction = edges.getParam(params.valueFunction, false);

        // should we try to synchronise the term counts from an equivalent aggregation on the
        // primary query?  You can turn this off if you aren't displaying counts or otherwise
        // modifying the display based on the counts
        this.syncCounts = edges.getParam(params.syncCounts, true);

        // override the parent's defaultRenderer
        this.defaultRenderer = edges.getParam(params.defaultRenderer, "newORTermSelectorRenderer");

        //////////////////////////////////////////
        // properties used to store internal state

        // an explicit list of terms to be displayed.  If this is not passed in, then a query
        // will be issues which will populate this with the values
        // of the form
        // [{term: "<value>", display: "<display value>", count: <number of records>}]
        this.terms = edges.getParam(params.terms, false);

        // values of terms that have been selected from this.terms
        // this is just a plain list of the values
        this.selected = [];

        // is the object currently updating itself
        this.updating = false;

        this.reQueryAfterListAll = false;

        this.init = function(edge) {
            // first kick the request up to the superclass
            edges.newSelector().init.call(this, edge);

            // now trigger a request for the terms to present, if not explicitly provided
            if (!this.terms) {
                if (this.edge.openingQuery || this.edge.urlQuery) {
                    this.reQueryAfterListAll = true;
                }
                this.listAll();
            }
        };

        this.synchronise = function() {
            // reset the internal properties
            this.selected = [];

            // extract all the filter values that pertain to this selector
            if (this.edge.currentQuery) {
                var filters = this.edge.currentQuery.listMust(es.newTermsFilter({field: this.field}));
                for (var i = 0; i < filters.length; i++) {
                    for (var j = 0; j < filters[i].values.length; j++) {
                        var val = filters[i].values[j];
                        this.selected.push(val);
                    }
                }
            }

            if (this.syncCounts && this.edge.result && this.terms) {
                this._synchroniseTerms({result: this.edge.result});
            }
        };

        this._synchroniseTermsMergeInitial = function(params) {
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
        };

        this._synchroniseTerms = function(params) {
            if (this.updateType === "mergeInitial") {
                this._synchroniseTermsMergeInitial(params);
            } else {
                this._synchroniseTermsFresh(params);
            }
        };

        this._synchroniseTermsFresh = function(params) {
            var result = params.result;

            this.terms = [];
            var buckets = result.buckets(this.id);
            for (var i = 0; i < buckets.length; i++) {
                var bucket = buckets[i];
                this.terms.push({term: bucket.key, display: this._translate(bucket.key), count: bucket.doc_count});
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
            this.edge.queryAdapter.doQuery({
                edge: this.edge,
                query: bq,
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

            // in case there's a race between this and another update operation, subsequently synchronise
            this.synchronise();

            if (this.reQueryAfterListAll) {
                this.doUpdate();
            } else {
                // since this happens asynchronously, we may want to draw
                this.draw();
            }
        };

        this.listAllQueryFail = function() {
            this.terms = [];
        };

        this.setupEvent = function() {
            if (this.lifecycle === "update") {
                this.edge.context.on("edges:pre-query", edges.eventClosure(this, "doUpdate"));
                // we used to do this, but no need, as when the query cycles, the event handler set above will run it anyway
                // this.doUpdate();
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
            this.edge.queryAdapter.doQuery({
                edge: this.edge,
                query: bq,
                success: edges.objClosure(this, "doUpdateQuerySuccess", ["result"]),
                error: edges.objClosure(this, "doUpdateQueryFail")
            });
        };

        this.doUpdateQuerySuccess = function(params) {
            var result = params.result;

            this._synchroniseTerms({result: result});

            // turn off the update flag
            this.updating = false;

            // since this happens asynchronously, we may want to draw
            this.draw();
        };

        this.doUpdateQueryFail = function() {
            // just do nothing, hopefully the next request will be successful
            this.updating = false;
        };

        ///////////////////////////////////////////
        // state change functions

        this.selectTerms = function(params) {
            var terms = params.terms;
            var clearOthers = edges.getParam(params.clearOthers, false);

            var nq = this.edge.cloneQuery();

            // first find out if there was a terms filter already in place
            var filters = nq.listMust(es.newTermsFilter({field: this.field}));

            // if there is, just add the term to it
            if (filters.length > 0) {
                var filter = filters[0];
                if (clearOthers) {
                    filter.clear_terms();
                }

                var hadTermAlready = 0;
                for (var i = 0; i < terms.length; i++) {
                    var term = terms[i];
                    if (filter.has_term(term)) {
                        hadTermAlready++;
                    } else {
                        filter.add_term(term);
                    }
                }

                // if all we did was remove terms that we're then going to re-add, just do nothing
                if (filter.has_terms() && hadTermAlready === terms.length) {
                    return false;
                } else if (!filter.has_terms()) {
                    nq.removeMust(es.newTermsFilter({field: this.field}));
                }
            } else {
                // otherwise, set the Terms Filter
                nq.addMust(es.newTermsFilter({
                    field: this.field,
                    values: terms
                }));
            }

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();

            return true;
        };

        this.selectTerm = function(term) {
            return this.selectTerms({terms : [term]});
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

        this.clearFilters = function(params) {
            var triggerQuery = edges.getParam(params.triggerQuery, true);

            if (this.selected.length > 0) {
                var nq = this.edge.cloneQuery();
                nq.removeMust(es.newTermsFilter({
                    field: this.field
                }));
                this.edge.pushQuery(nq);
            }
            if (triggerQuery) {
                this.edge.doQuery();
            }
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
        edges.DateHistogramSelector.prototype = edges.newSelector(params);
        return new edges.DateHistogramSelector(params);
    },
    DateHistogramSelector : function(params) {
        // "year, quarter, month, week, day, hour, minute ,second"
        // period to use for date histogram
        this.interval = params.interval || "year";

        this.sortFunction = edges.getParam(params.sortFunction, false);

        this.displayFormatter = edges.getParam(params.displayFormatter, false);

        this.active = edges.getParam(params.active, true);

        //////////////////////////////////////////////
        // values to be rendered

        this.values = [];
        this.filters = [];

        this.contrib = function(query) {
            query.addAggregation(
                es.newDateHistogramAggregation({
                    name: this.id,
                    field: this.field,
                    interval: this.interval
                })
            );
        };

        this.synchronise = function() {
            // reset the state of the internal variables
            this.values = [];
            this.filters = [];

            if (this.edge.result) {
                var buckets = this.edge.result.buckets(this.id);
                for (var i = 0; i < buckets.length; i++) {
                    var bucket = buckets[i];
                    var key = bucket.key;
                    if (this.displayFormatter) {
                        key = this.displayFormatter(key);
                    }
                    var obj = {"display" : key, "gte": bucket.key, "count" : bucket.doc_count};
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
                var filters = this.edge.currentQuery.listMust(es.newRangeFilter({field: this.field}));
                for (var i = 0; i < filters.length; i++) {
                    var from = filters[i].gte;
                    for (var j = 0; j < this.values.length; j++) {
                        var val = this.values[j];
                        if (val.gte.toString() === from) {
                            this.filters.push(val);
                        }
                    }
                }
            }
        };

        this.selectRange = function(params) {
            var from = params.gte;
            var to = params.lt;

            var nq = this.edge.cloneQuery();

            // just add a new range filter (the query builder will ensure there are no duplicates)
            var params = {field: this.field};
            nq.removeMust(es.newRangeFilter(params));

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

        this.removeFilter = function(params) {
            var from = params.gte;
            var to = params.lt;

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

        this.clearFilters = function(params) {
            var triggerQuery = edges.getParam(params.triggerQuery, true);

            var nq = this.edge.cloneQuery();
            var qargs = {field: this.field};
            nq.removeMust(es.newRangeFilter(qargs));
            this.edge.pushQuery(nq);

            if (triggerQuery) {
                this.edge.doQuery();
            }
        };
    },

    newYearRangeSelector : function(params) {
        if (!params) { params = {} }
        edges.YearRangeSelector.prototype = edges.newSelector(params);
        return new edges.YearRangeSelector(params);
    },
    YearRangeSelector : function(params) {
        // "year, quarter, month, week, day, hour, minute ,second"
        // period to use for date histogram
        this.interval = params.interval || "year";

        this.sortFunction = edges.getParam(params.sortFunction, false);

        this.displayFormatter = edges.getParam(params.displayFormatter, false);
        this.defaultRenderer = params.renderer || "newDateHistogramSelectorRenderer";

        this.active = edges.getParam(params.active, true);
        this.initial_options = [];
        this.update_options = params.update_options || true;

        //////////////////////////////////////////////
        // values to be rendered

        this.values = [];
        this.filters = [];

        this.contrib = function(query) {
            query.addAggregation(
                es.newDateHistogramAggregation({
                    name: this.id,
                    field: this.field,
                    interval: this.interval
                })
            );
        };

        this.synchronise = function() {
            // reset the state of the internal variables
            //this.values = [];
            this.filters = [];

            if (this.edge.result) {
                if (this.values.length === 0) {
                    var buckets = this.edge.result.buckets(this.id);
                    for (var i = 0; i < buckets.length; i++) {
                        var bucket = buckets[i];
                        var key = bucket.key;
                        if (this.displayFormatter) {
                            key = this.displayFormatter(key);
                        }
                        var obj = {"display": key, "gte": bucket.key, "count": bucket.doc_count};
                        if (i < buckets.length - 1) {
                            obj["lt"] = buckets[i + 1].key;
                        }
                        this.values.push(obj);
                    }
                }
            }

            if (this.sortFunction) {
                this.values = this.sortFunction(this.values);
            }
            if (this.edge.currentQuery) {
                this.filters = this.edge.currentQuery.listMust(es.newRangeFilter({field: this.field}));
            }
        };

        this.selectRange = function(params) {
            var from = Math.min(params.gte, params.lt);
            var to = Math.max(params.gte, params.lt);

            var nq = this.edge.cloneQuery();

            // just add a new range filter (the query builder will ensure there are no duplicates)
            //remove all filters for this field
            nq.removeMust(es.newRangeFilter({field: this.field}));
            var par = {field: this.field};
            if (from) {
                par["gte"] = from;
            }
            if (to) {
                //we need to add one for users to see results INCLUDING the "to" year
                par["lt"] = to + 1;
            }
            par["format"] = "epoch_millis"   // Required for ES7.x date ranges against dateOptionalTime formats
            nq.addMust(es.newRangeFilter(par));
            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.removeFilter = function(params) {
            var from = params.gte;
            var to = params.lt;

            var nq = this.edge.cloneQuery();

            // just add a new range filter (the query builder will ensure there are no duplicates)
            var par = {field: this.field};
            if (from) {
                par["gte"] = from;
            }
            if (to) {
                par["lt"] = to+1;
            }
            nq.removeMust(es.newRangeFilter(par));
            this.filters = this.filters.filter((item) => {
                return item.field !== this.field && item.lt !== to && item.to !== to;
            })
            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.clearFilters = function(params) {
            this.filters = [];
            var triggerQuery = edges.getParam(params.triggerQuery, true);

            var nq = this.edge.cloneQuery();
            var qargs = {field: this.field};
            nq.removeMust(es.newRangeFilter(qargs));
            this.edge.pushQuery(nq);
            if (triggerQuery) {
                this.edge.doQuery();
            }
        };
    },

    newAutocompleteTermSelector : function(params) {
        if (!params) { params = {} }
        edges.AutocompleteTermSelector.prototype = edges.newComponent(params);
        return new edges.AutocompleteTermSelector(params);
    },
    AutocompleteTermSelector : function(params) {
        this.defaultRenderer = params.defaultRenderer || "newAutocompleteTermSelectorRenderer";
    },

    newNavigationTermList : function(params) {
        return edges.instantiate(edges.NavigationTermList, params, edges.newComponent);
    },
    NavigationTermList : function(params) {
        this.urlTemplate = params.urlTemplate;
        this.placeholder = edges.getParam(params.placeholder, "{term}");
        this.sourceResults = edges.getParam(params.sourceResults, false);
        this.sourceAggregation = params.sourceAggregation;

        this.terms = [];

        this.synchronise = function() {
            this.terms = [];

            var results = this.edge.result;
            if (this.sourceResults !== false) {
                if (!this.edge.secondaryResults.hasOwnProperty(this.sourceResults)) {
                    return;
                }
                results = this.edge.secondaryResults[this.sourceResults];
            }
            if (!results) {
                return;
            }

            var agg = results.aggregation(this.sourceAggregation);
            this.terms = agg.buckets.map(function(x) { return x.key});
        };

        this.navigate = function(params) {
            var term = params.term;
            var url = this.urlTemplate.replace(this.placeholder, term);
            window.location.href = url;
        }
    },

    newTreeBrowser : function(params) {
        return edges.instantiate(edges.TreeBrowser, params, edges.newComponent);
    },
    TreeBrowser : function(params) {
        this.field = edges.getParam(params.field, false);

        this.size = edges.getParam(params.size, 10);

        this.tree = edges.getParam(params.tree, {});

        this.nodeMatch = edges.getParam(params.nodeMatch, false);

        this.filterMatch = edges.getParam(params.filterMatch, false);

        this.nodeIndex = edges.getParam(params.nodeIndex, false);

        this.pruneTree = edges.getParam(params.pruneTree, false);

        this.syncTree = [];

        this.parentIndex = {};
        
        this.pruned = false;

        this.nodeCount = 0;

        this.init = function(edge) {
            // first kick the request up to the superclass
            edges.newSelector().init.call(this, edge);

            // now trigger a request for the terms to present, if not explicitly provided
            if (this.pruneTree) {
                this._pruneTree();
            }
        };

        this.contrib = function(query) {
            var params = {
                name: this.id,
                field: this.field
            };
            if (this.size) {
                params["size"] = this.size
            }
            query.addAggregation(
                es.newTermsAggregation(params)
            );
        };

        this.synchronise = function() {
            // synchronise if:
            // * we are not pruning the tree
            // * we are pruning the tree, and it has now been pruned
            this.nodeCount = 0;
            if (!(!this.pruneTree || (this.pruneTree && this.pruned))) {
                this.syncTree = [];
                this.parentIndex = {};
                return;
            }

            this.syncTree = $.extend(true, [], this.tree);

            var results = this.edge.result;
            if (!results) {
                return;
            }

            var selected = [];
            var filters = this.edge.currentQuery.listMust(es.newTermsFilter({field: this.field}));
            for (var i = 0; i < filters.length; i++) {
                var vals = filters[i].values;
                selected = selected.concat(vals);
            }

            var agg = results.aggregation(this.id);
            var buckets = $.extend(true, [], agg.buckets);
            var that = this;

            function recurse(tree, path) {
                var anySelected = false;
                var childCount = 0;

                for (var i = 0; i < tree.length; i++) {
                    var node = tree[i];
                    that.nodeCount++;

                    that.parentIndex[node.value] = $.extend(true, [], path);

                    var idx = that.nodeMatch(node, buckets);
                    if (idx === -1) {
                        node.count = 0;
                    } else {
                        node.count = buckets[idx].doc_count;
                    }
                    childCount += node.count;

                    if (that.filterMatch(node, selected)) {
                        node.selected = true;
                        anySelected = true;
                    }

                    if (that.nodeIndex) {
                        node.index = that.nodeIndex(node);
                    } else {
                        node.index = node.display;
                    }

                    if (node.children) {
                        path.push(node.value);
                        var childReport = recurse(node.children, path);
                        path.pop();
                        if (childReport.anySelected) {
                            node.selected = true;
                            anySelected = true;
                        }
                        childCount += childReport.childCount;
                        node.childCount = childReport.childCount;
                    } else {
                        node.childCount = 0;
                    }

                }
                return {anySelected: anySelected, childCount: childCount}
            }
            var path = [];
            recurse(this.syncTree, path);
        };

        this.addFilter = function(params) {
            var value = params.value;
            var parents = this.parentIndex[value];
            var terms = [params.value];
            var clearOthers = edges.getParam(params.clearOthers, false);

            var nq = this.edge.cloneQuery();

            // first find out if there was a terms filter already in place
            var filters = nq.listMust(es.newTermsFilter({field: this.field}));

            // if there is, just add the term to it (removing and parent terms along the way)
            if (filters.length > 0) {
                var filter = filters[0];
                var originalValues = $.extend(true, [], filter.values);
                originalValues.sort();

                // if this is an exclusive filter that clears all others, just do that
                if (clearOthers) {
                    filter.clear_terms();
                }

                // next, if there are any terms left, remove all the parent terms
                for (var i = 0; i < parents.length; i++) {
                    var parent = parents[i];
                    if (filter.has_term(parent)) {
                        filter.remove_term(parent);
                    }
                }

                // now add all the provided terms
                var hadTermAlready = 0;
                for (var i = 0; i < terms.length; i++) {
                    var term = terms[i];
                    if (filter.has_term(term)) {
                        hadTermAlready++;
                    } else {
                        filter.add_term(term);
                    }
                }

                // if, as a result of the all the operations, the values didn't change, then don't search
                if (originalValues === filter.values.sort()) {
                    return false;
                } else if (!filter.has_terms()) {
                    nq.removeMust(es.newTermsFilter({field: this.field}));
                }
            } else {
                // otherwise, set the Terms Filter
                nq.addMust(es.newTermsFilter({
                    field: this.field,
                    values: terms
                }));
            }

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();

            return true;
        };

        this.removeFilter = function(params) {
            var term = params.value;
            var nq = this.edge.cloneQuery();

            // first find out if there was a terms filter already in place
            var filters = nq.listMust(es.newTermsFilter({field: this.field}));

            if (filters.length > 0) {
                var filter = filters[0];

                if (filter.has_term(term)) {
                    // the filter we are being asked to remove is the actual selected one
                    filter.remove_term(term);
                } else {
                    // the filter we are being asked to remove may be a parent of the actual selected one
                    // first get all the parent sets of the values that are currently in force
                    var removes = [];
                    for (var i = 0; i < filter.values.length; i++) {
                        var val = filter.values[i];
                        var parentSet = this.parentIndex[val];
                        if ($.inArray(term, parentSet) > -1) {
                            removes.push(val);
                        }
                    }
                    for (var i = 0; i < removes.length; i++) {
                        filter.remove_term(removes[i]);
                    }
                }

                // look to see if the term has a parent chain
                var grandparents = this.parentIndex[term];
                if (grandparents.length > 0) {
                    // if it does, get a candidate value to add to the filter
                    var immediate = grandparents[grandparents.length - 1];

                    // we only want to add the candidate value to the filter if it is not a grandparent of any
                    // of the existing filters
                    var other_terms = filter.values;
                    var tripwire = false;
                    for (var i = 0; i < other_terms.length; i++) {
                        var ot = other_terms[i];
                        var other_parents = this.parentIndex[ot];
                        if ($.inArray(immediate, other_parents) > -1) {
                            tripwire = true;
                            break;
                        }
                    }

                    if (!tripwire) {
                        filter.add_term(immediate);
                    }
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

        this._pruneTree = function() {
            // to list all possible terms, build off the base query
            var bq = this.edge.cloneBaseQuery();
            bq.clearAggregations();
            bq.size = 0;

            // now add the aggregation that we want
            var params = {
                name: this.id,
                field: this.field
            };
            if (this.size) {
                params["size"] = this.size
            }
            bq.addAggregation(
                es.newTermsAggregation(params)
            );

            // issue the query to elasticsearch
            this.edge.queryAdapter.doQuery({
                edge: this.edge,
                query: bq,
                success: edges.objClosure(this, "_querySuccess", ["result"]),
                error: edges.objClosure(this, "_queryFail")
            });
        };

        this._querySuccess = function(params) {
            var result = params.result;

            var agg = result.aggregation(this.id);
            var buckets = $.extend(true, [], agg.buckets);
            var that = this;

            function recurse(tree) {
                var treeCount = 0;
                var newTree = [];
                for (var i = 0; i < tree.length; i++) {
                    var node = $.extend({}, tree[i]);
                    var nodeCount = 0;

                    var idx = that.nodeMatch(node, buckets);
                    if (idx === -1) {
                        nodeCount = 0;
                    } else {
                        nodeCount = buckets[idx].doc_count;
                    }
                    treeCount += nodeCount;

                    if (node.children) {
                        var childUpdate = recurse(node.children);
                        treeCount += childUpdate.treeCount;
                        nodeCount += childUpdate.treeCount;
                        if (childUpdate.newTree.length > 0) {
                            node.children = childUpdate.newTree;
                        } else {
                            delete node.children;
                        }
                    }

                    if (nodeCount > 0) {
                        newTree.push(node);
                    }
                }
                return {newTree: newTree, treeCount: treeCount}
            }
            var treeUpdate = recurse(this.tree);
            this.tree = treeUpdate.newTree;

            this.pruned = true;

            // in case there's a race between this and another update operation, subsequently synchronise
            this.synchronise();

            // since this happens asynchronously, we may want to draw
            this.draw();
        };

        this._queryFail = function() {
            console.log("pruneTree query failed");
            this.tree = [];
            this.pruned = true;

            // in case there's a race between this and another update operation, subsequently synchronise
            this.synchronise();

            // since this happens asynchronously, we may want to draw
            this.draw();
        };
    }
});
