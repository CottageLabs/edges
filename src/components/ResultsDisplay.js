import {Component} from "../core";
import {getParam, objClosure} from "../utils";

export class ResultsDisplay extends Component {
    constructor(params) {
        super(params);

        // the secondary results to get the data from, if not using the primary
        this.secondaryResults = getParam(params, "secondaryResults", false);

        // filter function that can be used to trim down the result set
        this.filter = getParam(params, "filter", false);

        // a sort function that can be used to organise the results
        this.sort = getParam(params, "sort", false);

        // the maximum number of results to be stored
        this.limit = getParam(params, "limit", false);

        this.infiniteScroll = getParam(params, "infiniteScroll", false);

        this.infiniteScrollPageSize = getParam(params, "infiniteScrollPageSize", 10);

        //////////////////////////////////////
        // variables for tracking internal state

        // the results retrieved from ES.  If this is "false" this means that no synchronise
        // has been called on this object, which in turn means that initial searching is still
        // going on.  Once initialised this will be a list (which may in turn be empty, meaning
        // that no results were found)
        this.results = false;

        this.infiniteScrollQuery = false;

        this.hitCount = 0;
    }

    synchronise() {
        // reset the state of the internal variables
        this.results = [];
        this.infiniteScrollQuery = false;
        this.hitCount = 0;

        var source = this.edge.result;
        if (this.secondaryResults !== false) {
            source = this.edge.secondaryResults[this.secondaryResults];
        }

        // if there are no sources to pull results from, leave us with an empty
        // result set
        if (!source) {
            return;
        }

        // first filter the results
        var results = source.results();
        this._appendResults({results: results});

        // record the hit count for later use
        this.hitCount = source.total();
    };

    _appendResults(params) {
        var results = params.results;

        if (this.filter) {
            results = this.filter({results: results});
        }

        if (this.sort) {
            results.sort(this.sort);
        }

        if (this.limit !== false) {
            results = results.slice(0, this.limit);
        }

        this.results = this.results.concat(results);
    };

    infiniteScrollNextPage(params) {
        var callback = params.callback;

        // if we have exhausted the result set, don't try to get the next page
        if (this.results.length >= this.hitCount) {
            return;
        }

        if (!this.infiniteScrollQuery) {
            this.infiniteScrollQuery = this.edge.cloneQuery();
            this.infiniteScrollQuery.clearAggregations();
        }

        // move the from/size parameters to get us the next page
        var currentSize = this.infiniteScrollQuery.getSize();
        var currentFrom = this.infiniteScrollQuery.getFrom();
        if (currentFrom === false) {
            currentFrom = 0;
        }
        this.infiniteScrollQuery.from = currentFrom + currentSize;
        this.infiniteScrollQuery.size = this.infiniteScrollPageSize;

        var successCallback = objClosure(this, "infiniteScrollSuccess", ["result"], {callback: callback});
        var errorCallback = objClosure(this, "infiniteScrollError", false, {callback: callback});

        this.edge.queryAdapter.doQuery({
            edge: this.edge,
            query: this.infiniteScrollQuery,
            success: successCallback,
            error: errorCallback
        });
    };

    infiniteScrollSuccess(params) {
        var results = params.result.results();
        this._appendResults({results: results});
        params.callback();
    };

    infinteScrollError(params) {
        alert("error");
        params.callback();
    }
}