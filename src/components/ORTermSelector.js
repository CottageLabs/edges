import {Component} from "../core";
import {getParam, objClosure, eventClosure} from "../utils";

import {es} from '../../dependencies/es'

export class ORTermSelector extends Component {
    constructor(params) {
        super(params);

        // field upon which to build the selector
        this.field = getParam(params, "field");

        // whether the facet should be displayed at all (e.g. you may just want the data for a callback)
        this.active = getParam(params, "active", true);

        // whether this component updates itself on every request, or whether it is static
        // throughout its lifecycle.  One of "update" or "static"
        this.lifecycle = getParam(params, "lifecycle", "static");

        // if the update type is "update", then how should this component update the facet values
        // * mergeInitial - always keep the initial list in the original order, and merge the bucket counts onto the correct terms
        // * fresh - just use the values in the most recent aggregation, ignoring the initial values
        this.updateType = getParam(params, "updateType", "mergeInitial");

        // which ordering to use term/count and asc/desc
        this.orderBy = getParam(params, "orderBy", "term");
        this.orderDir = getParam(params, "orderDir", "asc");

        // number of results that we should display - remember that this will only
        // be used once, so should be large enough to gather all the values that might
        // be in the index
        this.size = getParam(params, "size", 10);

        // provide a map of values for terms to displayable terms, or a function
        // which can be used to translate terms to displyable values
        this.valueMap = getParam(params, "valueMap", false);
        this.valueFunction = getParam(params, "valueFunction", false);

        // should we try to synchronise the term counts from an equivalent aggregation on the
        // primary query?  You can turn this off if you aren't displaying counts or otherwise
        // modifying the display based on the counts
        this.syncCounts = getParam(params, "syncCounts", true);

        //////////////////////////////////////////
        // properties used to store internal state

        // an explicit list of terms to be displayed.  If this is not passed in, then a query
        // will be issues which will populate this with the values
        // of the form
        // [{term: "<value>", display: "<display value>", count: <number of records>}]
        this.terms = getParam(params, "terms", false);

        // values of terms that have been selected from this.terms
        // this is just a plain list of the values
        this.selected = [];

        // is the object currently updating itself
        this.updating = false;

        this.reQueryAfterListAll = false;
    }

    init(edge) {
        // first kick the request up to the superclass
        super.init(edge);

        // now trigger a request for the terms to present, if not explicitly provided
        if (!this.terms) {
            if (this.edge.openingQuery || this.edge.urlQuery) {
                this.reQueryAfterListAll = true;
            }
            this.listAll();
        }
    };

    synchronise() {
        // reset the internal properties
        this.selected = [];

        // extract all the filter values that pertain to this selector
        if (this.edge.currentQuery) {
            var filters = this.edge.currentQuery.listMust(new es.TermsFilter({field: this.field}));
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

    _synchroniseTermsMergeInitial(params) {
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

    _synchroniseTerms(params) {
        if (this.updateType === "mergeInitial") {
            this._synchroniseTermsMergeInitial(params);
        } else {
            this._synchroniseTermsFresh(params);
        }
    };

    _synchroniseTermsFresh(params) {
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

    listAll = function() {
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
            new es.TermsAggregation(params)
        );

        // issue the query to elasticsearch
        this.edge.queryAdapter.doQuery({
            edge: this.edge,
            query: bq,
            success: objClosure(this, "listAllQuerySuccess", ["result"]),
            error: objClosure(this, "listAllQueryFail")
        });
    };

    listAllQuerySuccess(params) {
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

    listAllQueryFail() {
        this.terms = [];
    };

    setupEvent() {
        if (this.lifecycle === "update") {
            this.edge.context.on("edges:pre-query", eventClosure(this, "doUpdate"));
            // we used to do this, but no need, as when the query cycles, the event handler set above will run it anyway
            // this.doUpdate();
        }
    };

    doUpdate = function() {
        // is an update already happening?
        if (this.updating) {
            return
        }
        this.udpating = true;

        // to list all current terms, build off the current query
        var bq = this.edge.cloneQuery();

        // remove any constraint on this field, and clear the aggregations and set size to 0 for performance
        bq.removeMust(new es.TermsFilter({field: this.field}));
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
            new es.TermsAggregation(params)
        );

        // issue the query to elasticsearch
        this.edge.queryAdapter.doQuery({
            edge: this.edge,
            query: bq,
            success: objClosure(this, "doUpdateQuerySuccess", ["result"]),
            error: objClosure(this, "doUpdateQueryFail")
        });
    };

    doUpdateQuerySuccess(params) {
        var result = params.result;

        this._synchroniseTerms({result: result});

        // turn off the update flag
        this.updating = false;

        // since this happens asynchronously, we may want to draw
        this.draw();
    };

    doUpdateQueryFail() {
        // just do nothing, hopefully the next request will be successful
        this.updating = false;
    };

    ///////////////////////////////////////////
    // state change functions

    selectTerms(params) {
        var terms = params.terms;
        var clearOthers = getParam(params, "clearOthers", false);

        var nq = this.edge.cloneQuery();

        // first find out if there was a terms filter already in place
        var filters = nq.listMust(new es.TermsFilter({field: this.field}));

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
                nq.removeMust(new es.TermsFilter({field: this.field}));
            }
        } else {
            // otherwise, set the Terms Filter
            nq.addMust(new es.TermsFilter({
                field: this.field,
                values: terms
            }));
        }

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();

        return true;
    };

    selectTerm(term) {
        return this.selectTerms({terms : [term]});
    };

    removeFilter(term) {
        var nq = this.edge.cloneQuery();

        // first find out if there was a terms filter already in place
        var filters = nq.listMust(new es.TermsFilter({field: this.field}));

        if (filters.length > 0) {
            var filter = filters[0];
            if (filter.has_term(term)) {
                filter.remove_term(term);
            }
            if (!filter.has_terms()) {
                nq.removeMust(new es.TermsFilter({field: this.field}));
            }
        }

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    };

    clearFilters(params) {
        var triggerQuery = getParam(params, "triggerQuery", true);

        if (this.selected.length > 0) {
            var nq = this.edge.cloneQuery();
            nq.removeMust(new es.TermsFilter({
                field: this.field
            }));
            this.edge.pushQuery(nq);
        }
        if (triggerQuery) {
            this.edge.cycle();
        }
    };

    //////////////////////////////////////////
    // "private" functions for internal use

    _translate = function(term) {
        if (this.valueMap) {
            if (term in this.valueMap) {
                return this.valueMap[term];
            }
        } else if (this.valueFunction) {
            return this.valueFunction(term);
        }
        return term;
    };
}