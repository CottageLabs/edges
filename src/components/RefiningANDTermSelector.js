// requires: es
// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("components")) { edges.components = {}}

edges.components.RefiningANDTermSelector = class extends edges.Component {
    constructor(params) {
        super(params);

        this.field = edges.util.getParam(params, "field");

        // how many terms should the facet limit to
        this.size = edges.util.getParam(params, "size", 10);

        // which ordering to use term/count and asc/desc
        this.orderBy = edges.util.getParam(params, "orderBy", "count");
        this.orderDir = edges.util.getParam(params, "orderDir", "desc");

        // number of facet terms below which the facet is disabled
        this.deactivateThreshold = edges.util.getParam(params, "deactivateThreshold", false);

        // should the terms facet ignore empty strings in display
        this.ignoreEmptyString = edges.util.getParam(params, "ignoreEmptyString", true);

        // should filters defined in the baseQuery be excluded from the selector
        this.excludePreDefinedFilters = edges.util.getParam(params, "excludePreDefinedFilters", true);

        // provide a map of values for terms to displayable terms, or a function
        // which can be used to translate terms to displyable values
        this.valueMap = edges.util.getParam(params, "valueMap", false);
        this.valueFunction = edges.util.getParam(params, "valueFunction", false);

        // due to a limitation in elasticsearch's clustered node facet counts, we need to inflate
        // the number of facet results we need to ensure that the results we actually want are
        // accurate.  This option tells us by how much.
        this.inflation = edges.util.getParam(params, "inflation", 100);

        this.active = edges.util.getParam(params, "active", true);

        // whether this component updates itself on every request, or whether it is static
        // throughout its lifecycle.  One of "update" or "static"
        this.lifecycle = edges.util.getParam(params, "lifecycle", "update");

        //////////////////////////////////////////
        // properties used to store internal state

        // filters that have been selected via this component
        // {display: <display>, term: <term>}
        this.filters = [];

        // values that the renderer should render
        // wraps an object (so the list is ordered) which in turn is the
        // { display: <display>, term: <term>, count: <count> }
        this.values = false;
    }

    //////////////////////////////////////////
    // overrides on the parent object's standard functions

    init(edge) {
        // first kick the request up to the superclass
        super.init(edge)

        if (this.lifecycle === "static") {
            this.listAll();
        }
    }

    contrib(query) {
        let params = {
            name: this.id,
            field: this.field,
            orderBy: this.orderBy,
            orderDir: this.orderDir
        };
        if (this.size) {
            params["size"] = this.size
        }
        query.addAggregation(
            new es.TermsAggregation(params)
        );
    };

    synchronise() {
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
        let filters = this.edge.currentQuery.listMust(new es.TermFilter({field: this.field}));
        for (let i = 0; i < filters.length; i++) {
            let val = filters[i].value;
            val = this._translate(val);
            this.filters.push({display: val, term: filters[i].value});
        }
    };

    _readValues(params) {
        let result = params.result;

        // assign the terms and counts from the aggregation
        let buckets = result.buckets(this.id);

        if (this.deactivateThreshold) {
            if (buckets.length < this.deactivateThreshold) {
                this.active = false
            } else {
                this.active = true;
            }
        }

        // list all of the pre-defined filters for this field from the baseQuery
        let predefined = [];
        if (this.excludePreDefinedFilters && this.edge.baseQuery) {
            predefined = this.edge.baseQuery.listMust(new es.TermFilter({field: this.field}));
        }

        let realCount = 0;
        for (let i = 0; i < buckets.length; i++) {
            let bucket = buckets[i];

            // ignore empty strings
            if (this.ignoreEmptyString && bucket.key === "") {
                continue;
            }

            // ignore pre-defined filters
            if (this.excludePreDefinedFilters) {
                let exclude = false;
                for (let j = 0; j < predefined.length; j++) {
                    let f = predefined[j];
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
            let key = this._translate(bucket.key);

            // store the original value and the translated value plus the count
            let obj = {display: key, term: bucket.key, count: bucket.doc_count};
            this.values.push(obj);
        }
    };

    /////////////////////////////////////////////////
    // query handlers for getting the full list of terms to display

    listAll() {
        // to list all possible terms, build off the base query
        let bq = this.edge.cloneBaseQuery();
        bq.clearAggregations();
        bq.size = 0;

        // now add the aggregation that we want
        let params = {
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
            success: edges.util.objClosure(this, "listAllQuerySuccess", ["result"]),
            error: edges.util.objClosure(this, "listAllQueryFail")
        });
    };

    listAllQuerySuccess(params) {
        let result = params.result;

        // set the values according to what comes back
        this.values = [];
        this._readValues({result: result});

        // since this happens asynchronously, we may want to draw
        this.draw();
    };

    listAllQueryFail() {
        this.values = [];
        console.log("RefiningANDTermSelector asynchronous query failed");
    };

    //////////////////////////////////////////
    // functions that can be called on this component to change its state

    selectTerm(term) {
        let nq = this.edge.cloneQuery();

        // first make sure we're not double-selecting a term
        let removeCount = nq.removeMust(new es.TermFilter({
            field: this.field,
            value: term
        }));

        // all we've done is remove and then re-add the same term, so take no action
        if (removeCount > 0) {
            return false;
        }

        // just add a new term filter (the query builder will ensure there are no duplicates)
        // this means that the behaviour here is that terms are ANDed together
        nq.addMust(new es.TermFilter({
            field: this.field,
            value: term
        }));

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();

        return true;
    };

    removeFilter(term) {
        let nq = this.edge.cloneQuery();

        nq.removeMust(new es.TermFilter({
            field: this.field,
            value: term
        }));

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    };

    clearFilters(params) {
        let triggerQuery = edges.util.getParam(params, "triggerQuery", true);

        if (this.filters.length > 0) {
            let nq = this.edge.cloneQuery();
            for (let i = 0; i < this.filters.length; i++) {
                let filter = this.filters[i];
                nq.removeMust(new es.TermFilter({
                    field: this.field,
                    value: filter.term
                }));
            }
            this.edge.pushQuery(nq);
        }
        if (triggerQuery) {
            this.edge.cycle();
        }
    };

    changeSize(newSize) {
        this.size = newSize;

        let nq = this.edge.cloneQuery();
        let agg = nq.getAggregation({
            name: this.id
        });
        agg.size = this.size;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    };

    changeSort(orderBy, orderDir) {
        this.orderBy = orderBy;
        this.orderDir = orderDir;

        let nq = this.edge.cloneQuery();
        let agg = nq.getAggregation({
            name: this.id
        });
        agg.setOrdering(this.orderBy, this.orderDir);
        this.edge.pushQuery(nq);
        this.edge.cycle();
    };

    _translate(term) {
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