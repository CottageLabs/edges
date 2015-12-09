// first define the bind with delay function from (saves loading it separately)
// https://github.com/bgrins/bindWithDelay/blob/master/bindWithDelay.js
(function($) {
    $.fn.bindWithDelay = function( type, data, fn, timeout, throttle ) {
        var wait = null;
        var that = this;

        if ( $.isFunction( data ) ) {
            throttle = timeout;
            timeout = fn;
            fn = data;
            data = undefined;
        }

        function cb() {
            var e = $.extend(true, { }, arguments[0]);
            var throttler = function() {
                wait = null;
                fn.apply(that, [e]);
            };

            if (!throttle) { clearTimeout(wait); }
            if (!throttle || !wait) { wait = setTimeout(throttler, timeout); }
        }

        return this.bind(type, data, cb);
    };
})(jQuery);

var edges = {

    //////////////////////////////////////////////////////
    // main function to run to start a new Edge

    newEdge : function(params) {
        if (!params) { params = {} }
        return new edges.Edge(params);
    },
    Edge : function(params) {

        /////////////////////////////////////////////
        // parameters that can be set via params arg

        // the jquery selector for the element where the edge will be deployed
        this.selector = params.selector || "body";

        // the base search url which will respond to elasticsearch queries.  Generally ends with _search
        this.search_url = params.search_url;

        // datatype for ajax requests to use - overall recommend using jsonp
        this.datatype = params.datatype || "jsonp";

        // query that forms the basis of all queries that are assembled and run
        // Note that baseQuery is inviolable - it's requirements will always be enforced
        this.baseQuery = params.baseQuery || false;

        // query to use to initialise the search.  Use this to set your opening
        // values for things like page size, initial search terms, etc.
        this.openingQuery = params.openingQuery || es.newQuery();

        // should the init process do a search
        this.initialSearch = params.initialSearch || true;

        // should the search url be synchronised with the browser's url bar after search
        // and should queries be retrieved from the url on init
        this.manageUrl = params.manageUrl || false;

        // query parameter in which the query for this edge instance will be stored
        this.urlQuerySource = params.urlQuerySource || "source";

        // template object that will be used to draw the frame for the edge.  May be left
        // blank, in which case the edge will assume that the elements are already rendered
        // on the page by the caller
        this.template = params.template || false;

        // list of all the components that are involved in this edge
        this.components = params.components || [];

        // render packs to use to source automatically assigned rendering objects
        this.renderPacks = params.renderPacks || [edges.bs3, edges.nvd3, edges.highcharts, edges.google];

        /////////////////////////////////////////////
        // operational properties

        // the query most recently read from the url
        this.urlQuery = false;

        // original url parameters
        this.urlParams = {};

        // the short url for this page
        this.shortUrl = false;

        // the last primary ES query object that was executed
        this.currentQuery = false;

        // the last result object from the ES layer
        this.result = false;

        // if the search is currently executing
        this.searching = false;

        // jquery object that represents the selected element
        this.context = false;

        // at the bottom of this constructor, we'll call this function
        this.startup = function() {
            // obtain the jquery context for all our operations
            this.context = $(this.selector);

            // trigger the edges:init event
            this.context.trigger("edges:pre-init");

            // if we are to manage the URL, attempt to pull a query from it
            if (this.manageUrl) {
                var urlParams = this.getUrlParams();
                if (this.urlQuerySource in urlParams) {
                    this.urlQuery = es.newQuery({raw : urlParams[this.urlQuerySource]});
                    delete urlParams[this.urlQuerySource];
                }
                this.urlParams = urlParams;
            }

            // render the template if necessary
            if (this.template) {
                this.template.draw(this);
            }

            // call each of the components to initialise themselves
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.init(this);
            }

            // now call each component to render itself (pre-search)
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.draw(this);
            }

            // determine whether to initialise with either the openingQuery or the urlQuery
            var requestedQuery = this.openingQuery;
            if (this.urlQuery) {
                // if there is a URL query, then we open with that, and then forget it
                requestedQuery = this.urlQuery;
                this.urlQuery = false
            }

            // request the components to contribute to the query
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.contrib(requestedQuery);
            }

            // finally push the query, which will reconcile it with the baseQuery
            this.pushQuery(requestedQuery);

            // trigger the edges:started event
            this.context.trigger("edges:post-init");

            // now issue a query
            this.doQuery();
        };

        this.synchronise = function() {
            // ask the components to synchronise themselves with the latest state
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.synchronise()
            }
        };

        // reset the query to the start and re-issue the query
        this.reset = function() {
            // start a totally blank query
            var requestedQuery = es.newQuery();

            // request the components to contribute to the query
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.contrib(requestedQuery);
            }

            // push the query, which will reconcile it with the baseQuery
            this.pushQuery(requestedQuery);

            // now execute the query
            this.doQuery();
        };

        ////////////////////////////////////////////////////
        // functions to handle the query lifecycle

        this.cloneQuery = function() {
            return $.extend(true, {}, this.currentQuery);
        };

        this.pushQuery = function(query) {
            if (this.baseQuery) {
                query.merge(this.baseQuery);
            }
            this.currentQuery = query;
        };

        this.cloneBaseQuery = function() {
            if (this.baseQuery) {
                return $.extend(true, {}, this.baseQuery);
            }
            return es.newQuery();
        };

        // execute the query and all the associated workflow
        this.doQuery = function() {
            // if a search is currently executing, don't do anything, else turn it on
            // FIXME: should we queue them up?
            if (this.searching) {
                return
            }
            this.searching = true;

            // invalidate the short url
            this.shortUrl = false;

            // pre query event
            this.context.trigger("edges:pre-query");

            // if we are managing the url space, use pushState to set it
            if (this.manageUrl) {
                this.updateUrl();
            }

            // issue the query to elasticsearch
            es.doQuery({
                search_url: this.search_url,
                queryobj: this.currentQuery.objectify(),
                datatype: this.datatype,
                success: edges.objClosure(this, "querySuccess", ["result"]),
                error: edges.objClosure(this, "queryFail"),
                complete: edges.objClosure(this, "queryComplete")
            })
        };

        this.queryFail = function(params) {
            this.context.trigger("edges:query-fail");
        };

        this.querySuccess = function(params) {
            this.result = params.result;

            // success trigger
            this.context.trigger("edges:query-success");

            // ask the components to prepare themselves based on the latest
            // results
            this.synchronise();
        };

        this.queryComplete = function() {
            // pre-render trigger
            this.context.trigger("edges:pre-render");

            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.draw();
            }

            // post render trigger
            this.context.trigger("edges:post-render");

            // searching has completed, so flip the switch back
            this.searching = false;
        };

        ////////////////////////////////////////////////
        // various utility functions

        // return components in the requested category
        this.category = function(cat) {
            var comps = [];
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                if (component.category === cat) {
                    comps.push(component);
                }
            }
            return comps;
        };

        this.getRenderPackObject = function(oname, params) {
            for (var i = 0; i < this.renderPacks.length; i++) {
                var rp = this.renderPacks[i];
                if (rp && rp.hasOwnProperty(oname)) {
                    return rp[oname](params);
                }
            }

        };

        // get the jquery object for the desired element, in the correct context
        // you should ALWAYS use this, rather than the standard jquery $ object
        this.jq = function(selector) {
            return $(selector, this.context);
        };

        /////////////////////////////////////////////////////
        // URL management functions

        this.getUrlParams = function() {
            var params = {};
            var url = window.location.href;
            var fragment = false;

            // break the anchor off the url
            if (url.indexOf("#") > -1) {
                fragment = url.slice(url.indexOf('#'));
                url = url.substring(0, url.indexOf('#'));
            }

            // extract and split the query args
            var args = url.slice(url.indexOf('?') + 1).split('&');

            for (var i = 0; i < args.length; i++) {
                var kv = args[i].split('=');
                if (kv.length === 2) {
                    var val = decodeURIComponent(kv[1]);
                    if (val[0] == "[" || val[0] == "{") {
                        // if it looks like a JSON object in string form...
                        // remove " (double quotes) at beginning and end of string to make it a valid
                        // representation of a JSON object, or the parser will complain
                        val = val.replace(/^"/,"").replace(/"$/,"");
                        val = JSON.parse(val);
                    }
                    params[kv[0]] = val;
                }
            }

            // record the fragment identifier if required
            if (fragment) {
                params['#'] = fragment;
            }

            return params;
        };

        this.urlQueryArg = function(objectify_options) {
            if (!objectify_options) {
                objectify_options = {
                    include_query_string : true,
                    include_filters : true,
                    include_paging : true,
                    include_sort : true,
                    include_fields : false,
                    include_aggregations : false,
                    include_facets : false
                }
            }
            var q = JSON.stringify(this.currentQuery.objectify(objectify_options));
            var obj = {};
            obj[this.urlQuerySource] = encodeURIComponent(q);
            return obj;
        };

        this.fullQueryArgs = function() {
            var args = $.extend(true, {}, this.urlParams);
            $.extend(args, this.urlQueryArg());
            return args;
        };

        this.fullUrlQueryString = function() {
            return this._makeUrlQuery(this.fullQueryArgs())
        };

        this._makeUrlQuery = function(args) {
            var keys = Object.keys(args);
            var entries = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var val = args[key];
                entries.push(key + "=" + val);  // NOTE we do not escape - this should already be done
            }
            return entries.join("&");
        };

        this.fullUrl = function() {
            var args = this.fullQueryArgs();
            var fragment = "";
            if (args["#"]) {
                fragment = "#" + args["#"];
                delete args["#"];
            }
            var wloc = window.location.toString();
            var bits = wloc.split("?");
            var url = bits[0] + "?" + this._makeUrlQuery(args) + fragment
            return url;
        };

        this.updateUrl = function() {
            if ('pushState' in window.history) {
                var qs = "?" + this.fullUrlQueryString();
                window.history.pushState("", "", qs);
            }
        };

        /////////////////////////////////////////////
        // final bits of construction
        this.startup();
    },

    /////////////////////////////////////////////
    // Base classes for the various kinds of components

    newRenderer : function(params) {
        if (!params) { params = {} }
        return new edges.Renderer(params);
    },
    Renderer : function(params) {
        this.component = params.component || false;
        this.init = function(component) {
            this.component = component
        };
        this.draw = function(component) {}
    },

    newComponent : function(params) {
        if (!params) { params = {} }
        return new edges.Component(params);
    },
    Component : function(params) {
        this.id = params.id;
        this.renderer = params.renderer;
        this.category = params.category || "none";
        this.defaultRenderer = params.defaultRenderer || "newRenderer";

        this.init = function(edge) {
            // record a reference to the parent object
            this.edge = edge;
            this.context = this.edge.jq("#" + this.id);

            // set the renderer from default if necessary
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackObject(this.defaultRenderer);
            }
            if (this.renderer) {
                this.renderer.init(this);
            }
        };

        this.draw = function() {
            if (this.renderer) {
                this.renderer.draw();
            }
        };

        this.contrib = function(query) {};
        this.synchronise = function() {};

        // convenience method for any renderer rendering a component
        this.jq = function(selector) {
            return this.edge.jq(selector);
        }
    },

    newSelector : function(params) {
        if (!params) { params = {} }
        edges.Selector.prototype = edges.newComponent(params);
        return new edges.Selector(params);
    },
    Selector : function(params) {
        // field upon which to build the selector
        this.field = params.field;

        // display name for the UI
        this.display = params.display || this.field;

        // whether the facet should be displayed at all (e.g. you may just want the data for a callback)
        this.active = params.active || true;

        // whether the facet should be acted upon in any way.  This might be useful if you want to enable/disable facets under different circumstances via a callback
        this.disabled = params.disabled || false;

        this.category = params.category || "selector";
    },

    newTemplate : function(params) {
        if (!params) { params = {} }
        return new edges.Template(params);
    },
    Template : function(params) {
        this.draw = function(edge) {}
    },

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

    ////////////////////////////////////////////////////
    // Specialised data entry components

    newNumericRangeEntry : function(params) {
        if (!params) { params = {} }
        edges.NumericRangeEntry.prototype = edges.newSelector(params);
        return new edges.NumericRangeEntry(params);
    },
    NumericRangeEntry : function(params) {
        ///////////////////////////////////////
        // parameters that can be passed in
        this.lower = params.lower === undefined ? false : params.lower;
        this.upper = params.upper === undefined ? false : params.upper;
        this.increment = params.increment || 1;

        this.defaultRenderer = params.defaultRenderer || "newNumericRangeEntryRenderer";

        ///////////////////////////////////////
        // state parameters
        this.from = false;
        this.to = false;

        this.init = function(edge) {
            // first kick the request up to the superclass
            edges.newSelector().init.call(this, edge);

            if (!this.lower || !this.upper) {
                // get the base query and remove any aggregations (for performance purposes)
                var bq = this.edge.cloneBaseQuery();
                bq.clearAggregations();
                bq.size = 0;

                // now add the stats aggregation that we want
                bq.addAggregation(
                    es.newStatsAggregation({
                        name: this.id,
                        field: this.field
                    })
                );

                // issue the query to elasticsearch
                es.doQuery({
                    search_url: this.edge.search_url,
                    queryobj: bq.objectify(),
                    datatype: this.edge.datatype,
                    success: edges.objClosure(this, "querySuccess", ["result"]),
                    error: edges.objClosure(this, "queryFail")
                });
            }
        };

        this.synchronise = function() {
            this.from = this.lower;
            this.to = this.upper;

            // now check to see if there are any range filters set on this field
            if (this.edge.currentQuery) {
                var filters = this.edge.currentQuery.listMust(es.newRangeFilter({field: this.field}));
                for (var i = 0; i < filters.length; i++) {
                    this.to = filters[i].lt;
                    this.from = filters[i].gte;
                }
            }
        };

        /////////////////////////////////////////////
        // functions for handling initilisation from query parameters

        this.querySuccess = function(params) {
            var result = params.result;

            // get the terms from and to out of the stats aggregation
            var agg = result.aggregation(this.id);
            if (this.lower === false) {
                this.lower = agg.min;
            }
            if (this.upper === false) {
                this.upper = agg.max;
            }

            // since this happens asynchronously, we may want to draw
            this.draw();
        };

        this.queryFail = function(params) {
            if (this.lower === false) {
                this.lower = 0;
            }
            if (this.upper === false) {
                this.upper = 0;
            }
        };

        //////////////////////////////////////////////////
        // state change functions

        this.selectRange = function(from, to) {
            var nq = this.edge.cloneQuery();

            // remove any existing filter
            nq.removeMust(es.newRangeFilter({field: this.field}));

            // if the new from and the existing to are the upper and lower then don't add a filter,
            // otherwise create the range
            if (!(from === this.lower && to === this.upper)) {
                // set the range filter
                nq.addMust(es.newRangeFilter({
                    field: this.field,
                    gte : from,
                    lt : to
                }))
            }

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };
    },

    newMultiDateRangeEntry : function(params) {
        if (!params) { params = {} }
        edges.MultiDateRangeEntry.prototype = edges.newComponent(params);
        return new edges.MultiDateRangeEntry(params);
    },
    MultiDateRangeEntry : function(params) {
        ///////////////////////////////////////////////
        // fields that can be passed in, and their defaults

        // list of field objects, which provide the field itself, and the display name.  e.g.
        // [{field : "monitor.rioxxterms:publication_date", display: "Publication Date"}]
        this.fields = params.fields || [];

        // map from field name (as in this.field[n].field) to a function which will provide
        // the earliest allowed date for that field.  e.g.
        // {"monitor.rioxxterms:publication_date" : earliestDate}
        this.earliest = params.earliest || {};

        // map from field name (as in this.field[n].field) to a function which will provide
        // the latest allowed date for that field.  e.g.
        // {"monitor.rioxxterms:publication_date" : latestDate}
        this.latest = params.latest || {};

        // category for this component, defaults to "selector"
        this.category = params.category || "selector";

        // default earliest date to use in all cases (defaults to start of the unix epoch)
        this.defaultEarliest = params.defaultEarliest || new Date(0);

        // default latest date to use in all cases (defaults to now)
        this.defaultLatest = params.defaultLatest || new Date();

        // default renderer from render pack to use
        this.defaultRenderer = params.defaultRenderer || "newMultiDateRangeRenderer";

        ///////////////////////////////////////////////
        // fields used to track internal state

        this.currentField = false;
        this.fromDate = false;
        this.toDate = false;

        this.touched = false;
        this.dateOptions = {};

        this.init = function(edge) {
            Object.getPrototypeOf(this).init.call(this, edge);
            // this.__proto__.init.call(this, edge);

            // set the initial field
            this.currentField = this.fields[0].field;

            // track the last field, for query building purposes
            this.lastField = false;

            // load the dates once at the init - this means they can't
            // be responsive to the filtering unless they are loaded
            // again at a later date
            this.loadDates();
        };

        //////////////////////////////////////////////
        // functions that can be used to trigger state change

        this.changeField = function(newField) {
            this.lastField = this.currentField;
            if (newField !== this.currentField) {
                this.touched = true;
                this.currentField = newField;
            }
        };

        this.setFrom = function(from) {
            if (from !== this.fromDate) {
                this.touched = true;
                this.fromDate = from;
            }
        };

        this.setTo = function(to) {
            if (to !== this.toDate) {
                this.touched = true;
                this.toDate = to;
            }
        };

        this.triggerSearch = function() {
            if (this.touched) {
                this.touched = false;
                var nq = this.edge.cloneQuery();

                // remove the old filter
                nq.removeMust(es.newRangeFilter({field: this.lastField}));

                // only contrib if there's anything to actually do
                if (!this.currentField || (!this.toDate && !this.fromDate)) {
                    return;
                }

                var range = {field : this.currentField};
                if (this.toDate) {
                    range["lt"] = this.toDate;
                }
                if (this.fromDate) {
                    range["gte"] = this.fromDate;
                }
                nq.addMust(es.newRangeFilter(range));

                // push the new query and trigger the search
                this.edge.pushQuery(nq);
                this.edge.doQuery();
            }
        };

        this.loadDates = function() {
            for (var i = 0; i < this.fields.length; i++) {
                var field = this.fields[i].field;
                var earlyFn = this.earliest[field];
                var lateFn = this.latest[field];

                var early = this.defaultEarliest;
                if (earlyFn) {
                    early = earlyFn();
                }

                var late = this.defaultLatest;
                if (lateFn) {
                    late = lateFn();
                }

                this.dateOptions[field] = {
                    earliest : early,
                    latest : late
                }
            }
        };

        this.currentEarliest = function() {
            if (!this.currentField) {
                return
            }
            if (this.dateOptions[this.currentField]) {
                return this.dateOptions[this.currentField].earliest;
            }
        };

        this.currentLatest = function() {
            if (!this.currentField) {
                return
            }
            if (this.dateOptions[this.currentField]) {
                return this.dateOptions[this.currentField].latest;
            }
        }
    },

    newAutocompleteTermSelector : function(params) {
        if (!params) { params = {} }
        edges.AutocompleteTermSelector.prototype = edges.newComponent(params);
        return new edges.AutocompleteTermSelector(params);
    },
    AutocompleteTermSelector : function(params) {
        this.defaultRenderer = params.defaultRenderer || "newAutocompleteTermSelectorRenderer";
    },

    //////////////////////////////////////////////////
    // Search controller implementation and supporting search navigation/management

    newFullSearchController : function(params) {
        if (!params) { params = {} }
        edges.FullSearchController.prototype = edges.newComponent(params);
        return new edges.FullSearchController(params);
    },
    FullSearchController : function(params) {
        // if set, should be either * or ~
        // if *, * will be prepended and appended to each string in the freetext search term
        // if ~, ~ then ~ will be appended to each string in the freetext search term.
        // If * or ~ or : are already in the freetext search term, no action will be taken.
        this.fuzzify = params.fuzzify || false;

        // list of options by which the search results can be sorted
        // of the form of a list, thus: [{ field: '<field to sort by>', display: '<display name>'}],
        this.sortOptions = params.sortOptions || false;

        // list of options for fields to which free text search can be constrained
        // of the form of a list thus: [{ field: '<field to search on>', display: '<display name>'}],
        this.fieldOptions = params.fieldOptions || false;

        // provide a function which will do url shortening for the share/save link
        this.urlShortener = params.urlShortener || false;

        // on free-text search, default operator for the elasticsearch query system to use
        this.defaultOperator = params.defaultOperator || "OR";

        this.defaultRenderer = params.defaultRenderer || "newFullSearchControllerRenderer";

        ///////////////////////////////////////////////
        // properties for tracking internal state

        // field on which to focus the freetext search (initially)
        this.searchField = false;

        // freetext search string
        this.searchString = false;

        this.sortBy = false;

        this.sortDir = "desc";

        // the short url for the current search, if it has been generated
        this.shortUrl = false;

        this.synchronise = function() {
            // reset the state of the internal variables
            this.searchString = false;
            this.searchField = false;
            this.sortBy = false;
            this.sortDir = "desc";
            // this.shortUrl - not sure what to do with this one yet

            if (this.edge.currentQuery) {
                var qs = this.edge.currentQuery.getQueryString();
                if (qs) {
                    this.searchString = qs.queryString;
                    this.searchField = qs.defaultField;
                }
                var sorts = this.edge.currentQuery.getSortBy();
                if (sorts.length > 0) {
                    this.sortBy = sorts[0].field;
                    this.sortDir = sorts[0].order;
                }
            }
        };

        this.changeSortDir = function() {
            var dir = this.sortDir === "asc" ? "desc" : "asc";
            var sort = this.sortBy ? this.sortBy : "_score";
            var nq = this.edge.cloneQuery();

            // replace the existing sort criteria
            nq.setSortBy(es.newSort({
                field: sort,
                order: dir
            }));

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.setSortBy = function(field) {
            var nq = this.edge.cloneQuery();

            // replace the existing sort criteria
            if (!field || field === "") {
                field = "_score";
            }
            nq.setSortBy(es.newSort({
                field: field,
                order: this.sortDir
            }));

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.setSearchField = function(field) {
            // track the search field, as this may not trigger a search
            this.searchField = field;
            if (!this.searchString || this.searchString === "") {
                return;
            }

            var nq = this.edge.cloneQuery();

            // set the query with the new search field
            nq.setQueryString(es.newQueryString({
                queryString: this.searchString,
                defaultField: field,
                defaultOperator: this.defaultOperator,
                fuzzify : this.fuzzify
            }));

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.setSearchText = function(text) {
            var nq = this.edge.cloneQuery();

            if (text !== "") {
                var params = {
                    queryString: text,
                    defaultOperator: this.defaultOperator,
                    fuzzify : this.fuzzify
                };
                if (this.searchField && this.searchField !== "") {
                    params["defaultField"] = this.searchField;
                }
                // set the query with the new search field
                nq.setQueryString(es.newQueryString(params));
            } else {
                nq.removeQueryString();
            }

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.clearSearch = function() {
            this.edge.reset();
        };
    },

    newSelectedFilters : function(params) {
        if (!params) { params = {} }
        edges.SelectedFilters.prototype = edges.newComponent(params);
        return new edges.SelectedFilters(params);
    },
    SelectedFilters : function(params) {
        //////////////////////////////////////////
        // configuration options to be passed in

        // mapping from fields to names to display them as
        // if these come from a facet/selector, they should probably line up
        this.fieldDisplays = params.fieldDisplays || {};

        // value maps on a per-field basis for Term(s) filters, to apply to values before display.
        // if these come from a facet/selector, they should probably be the same maps
        // {"<field>" : {"<value>" : "<display>"}}
        this.valueMaps = params.valueMaps || {};

        // value functions on a per-field basis for Term(s) filters, to apply to values before display.
        // if these come from a facet/selector, they should probably be the same functions
        // {"<field>" : <function>}
        this.valueFunctions = params.valueFunctions || {};

        // range display maps on a per-field basis for Range filters
        // if these come from a facet/selector, they should probably be the same maps
        // {"<field>" : {"from" : "<from>", "to" : "<to>", "display" : "<display>"}}
        this.rangeMaps = params.rangeMaps || {};

        // function to use to format any range that does not appear in the range maps
        this.formatUnknownRange = params.formatUnknownRange || false;

        // override the parent's default renderer
        this.defaultRenderer = params.defaultRenderer || "newSelectedFiltersRenderer";

        //////////////////////////////////////////
        // properties used to store internal state

        // active filters to be rendered out
        // each of the form:
        /*
        {
            filter : "<type name of filter used>"
            display: "<field display name>",
            rel: "<relationship between values (e.g. AND, OR)>",
            values: [
                {display: "<display value>", val: "<actual value>"}
            ]
        }
         */
        this.mustFilters = {};

        this.synchronise = function() {
            // reset the state of the internal variables
            this.mustFilters = {};

            var musts = this.edge.currentQuery.listMust();
            for (var i = 0; i < musts.length; i++) {
                var f = musts[i];
                if (f.type_name === "term") {
                    this._synchronise_term(f);
                } else if (f.type_name === "terms") {
                    this._synchronise_terms(f);
                } else if (f.type_name === "range") {
                    this._synchronise_range(f);
                } else if (f.type_name === "geo_distance_range") {

                }
            }
        };

        this.removeFilter = function(boolType, filterType, field, value) {
            var nq = this.edge.cloneQuery();

            if (filterType === "term") {
                var template = es.newTermFilter({field: field, value: value});

                if (boolType === "must") {
                    nq.removeMust(template);
                }

            } else if (filterType === "terms") {
                var template = es.newTermsFilter({field: field});

                if (boolType === "must") {
                    var filters = nq.listMust(template);
                    for (var i = 0; i < filters.length; i++) {
                        if (filters[i].has_term(value)) {
                            filters[i].remove_term(value);
                        }

                        // if this means the filter no longer has values, remove the filter
                        if (!filters[i].has_terms()) {
                            nq.removeMust(filters[i]);
                        }
                    }
                }

            } else if (filterType == "range") {
                var params = {field: field};
                if (value.to) {
                    params["lt"] = value.to;
                }
                if (value.from) {
                    params["gte"] = value.from;
                }
                var template = es.newRangeFilter(params)

                if (boolType === "must") {
                    nq.removeMust(template);
                }

            } else if (filterType == "geo_distance_range") {

            }

            // reset the page to zero and reissue the query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this._synchronise_term = function(filter) {
            var display = this.fieldDisplays[filter.field] || filter.field;

            // multiple term filters mean AND, so group them together here
            if (filter.field in this.mustFilters) {
                this.mustFilters[filter.field].values.push({
                    val: filter.value,
                    display: this._translate(filter.field, filter.value)
                })
            } else {
                this.mustFilters[filter.field] = {
                    filter: filter.type_name,
                    display: display,
                    values: [{val: filter.value, display: this._translate(filter.field, filter.value)}],
                    rel: "AND"
                }
            }
        };

        this._synchronise_terms = function(filter) {
            var display = this.fieldDisplays[filter.field] || filter.field;
            var values = [];
            for (var i = 0; i < filter.values.length; i++) {
                var v = filter.values[i];
                var d = this._translate(filter.field, v);
                values.push({val: v, display: d});
            }
            this.mustFilters[filter.field] = {
                filter: filter.type_name,
                display: display,
                values: values,
                rel: "OR"
            }
        };

        this._synchronise_range = function(filter) {
            var display = this.fieldDisplays[filter.field] || filter.field;
            var to = filter.lt;
            var from = filter.gte;
            var r = this._getRangeDef(filter.field, from, to);
            var values = [];
            if (!r) {
                values.push({to: to, from: from, display: this._formatUnknown(from, to)});
            } else {
                values.push(r);
            }

            this.mustFilters[filter.field] = {
                filter: filter.type_name,
                display: display,
                values: values
            }
        };

        this._translate = function(field, value) {
            if (field in this.valueMaps) {
                if (value in this.valueMaps[field]) {
                    return this.valueMaps[field][value];
                }
            } else if (field in this.valueFunctions) {
                return this.valueFunctions[field](value);
            }
            return value;
        };

        this._getRangeDef = function(field, from, to) {
            if (!this.rangeMaps[field]) {
                return false;
            }
            for (var i = 0; i < this.rangeMaps[field].length; i++) {
                var r = this.rangeMaps[field][i];
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

        this._formatUnknown = function(from, to) {
            if (this.formatUnknownRange) {
                return this.formatUnknownRange(from, to)
            } else {
                // if they're the same just return one of them
                if (from || to) {
                    if (from === to) {
                        return from;
                    }
                }

                // otherwise calculate the display for the range
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

    newPager : function(params) {
        if (!params) { params = {} }
        edges.Pager.prototype = edges.newComponent(params);
        return new edges.Pager(params);
    },
    Pager : function(params) {

        this.defaultRenderer = params.defaultRenderer || "newPagerRenderer";

        ///////////////////////////////////////
        // internal state

        this.from = false;
        this.to = false;
        this.total = false;
        this.page = false;
        this.pageSize = false;
        this.totalPages = false;

        this.synchronise = function() {
            // reset the state of the internal variables
            this.from = false;
            this.to = false;
            this.total = false;
            this.page = false;
            this.pageSize = false;
            this.totalPages = false;

            // calculate the properties based on the latest query/results
            if (this.edge.currentQuery) {
                this.from = parseInt(this.edge.currentQuery.getFrom()) + 1;
                this.pageSize = parseInt(this.edge.currentQuery.getSize());
            }
            if (this.edge.result) {
                this.total = this.edge.result.total()
            }
            if (this.from !== false && this.total !== false) {
                this.to = this.from + this.pageSize - 1;
                this.page = Math.ceil((this.from - 1) / this.pageSize) + 1;
                this.totalPages = Math.ceil(this.total / this.pageSize)
            }
        };

        this.setFrom = function(from) {
            var nq = this.edge.cloneQuery();

            from = from - 1; // account for the human readability of the value, ES is 0 indexed here
            if (from < 0) {
                from = 0;
            }
            nq.from = from;

            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.setSize = function(size) {
            var nq = this.edge.cloneQuery();
            nq.size = size;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.decrementPage = function() {
            var from = this.from - this.pageSize;
            this.setFrom(from);
        };

        this.incrementPage = function() {
            var from = this.from + this.pageSize;
            this.setFrom(from);
        };
    },

    newSearchingNotification : function(params) {
        if (!params) { params = {} }
        edges.SearchingNotification.prototype = edges.newComponent(params);
        return new edges.SearchingNotification(params);
    },
    SearchingNotification : function(params) {
        this.defaultRenderer = params.defaultRenderer || "newSearchingNotificationRenderer";

        this.searching = false;

        this.init = function(edge) {
            Object.getPrototypeOf(this).init.call(this, edge);
            // this.__proto__.init.call(this, edge);
            edge.context.on("edges:pre-query", edges.eventClosure(this, "searchingBegan"));
            edge.context.on("edges:query-fail", edges.eventClosure(this, "searchingFinished"));
            edge.context.on("edges:query-success", edges.eventClosure(this, "searchingFinished"));
        };

        // specifically disable this function
        this.draw = function() {};

        this.searchingBegan = function() {
            this.searching = true;
            this.renderer.draw();
        };

        this.searchingFinished = function() {
            this.searching = false;
            this.renderer.draw();
        };
    },

    ////////////////////////////////////////////////
    // Results list implementation

    newResultsDisplay : function(params) {
        if (!params) { params = {} }
        edges.ResultsDisplay.prototype = edges.newComponent(params);
        return new edges.ResultsDisplay(params);
    },
    ResultsDisplay : function(params) {
        ////////////////////////////////////////////
        // arguments that can be passed in

        // the category of the component
        this.category = params.category || "results";

        // the default renderer for the component to use
        this.defaultRenderer = params.defaultRenderer || "newResultsDisplayRenderer";

        //////////////////////////////////////
        // variables for tracking internal state

        // the results retrieved from ES.  If this is "false" this means that no synchronise
        // has been called on this object, which in turn means that initial searching is still
        // going on.  Once initialised this will be a list (which may in turn be empty, meaning
        // that no results were found)
        this.results = false;

        this.synchronise = function() {
            // reset the state of the internal variables
            this.results = [];

            if (this.edge.result) {
                this.results = this.edge.result.results();
            }
        }
    },

    ////////////////////////////////////////////////
    // Common Chart implementation and associated data functions

    newChart : function(params) {
        if (!params) { params = {} }
        edges.Chart.prototype = edges.newComponent(params);
        return new edges.Chart(params);
    },
    Chart : function(params) {
        ////////////////////////////////////////////
        // arguments that can be passed in

        this.category = params.category || "chart";
        this.display = params.display || "";

        // actual data series that the renderer will render
        // data series is of the form
        // [
        //      {
        //          key: "<name of series>",
        //          values: [
        //              {label: "<name of this value>", value: "<the value itself>"}
        //          ]
        //      }
        // ]
        //
        // For example
        // [{ key: "power output", values: [{label: 1980, value: 100}, {label: 1981, value: 200}]
        this.dataSeries = params.dataSeries || false;

        // function which will generate the data series, which will be
        // written to this.dataSeries if that is not provided
        this.dataFunction = params.dataFunction || false;

        // closure function which can be invoked with the dfArgs to give a
        // function which will return the data series
        this.dataFunctionClosure = params.dataFunctionClosure || false;

        // the list of aggregations upon which we'll base the data
        this.aggregations = params.aggregations || [];

        // the default data function will be to use the basic aggregation
        // to series conversion, which is configured with these options...

        this.dfArgs = params.dfArgs || {
            // the name of the aggregation(s) to be used.  If specified they will
            // be drawn from the final query, so you may specify shared aggregations
            // via the baseQuery on the Edge.
            useAggregations : [],

            // the keys to relate each aggregation name to it's display key
            seriesKeys : {}
        };

        // pick a default renderer that actually exists, so this is the default chart, essentially
        this.defaultRenderer = params.defaultRenderer || "newMultibarRenderer";

        this.init = function(edge) {
            // since this class is designed to be sub-classed, we can't rely on "this" to be a chart
            // instance, so if we're kicking the call upstairs, we need to pass it explicitly to the
            // right object
            edges.newComponent().init.call(this, edge);

            // copy over the names of the aggregations that we're going to read from
            for (var i = 0; i < this.aggregations.length; i++) {
                var agg = this.aggregations[i];
                if ($.inArray(agg.name, this.dfArgs.useAggregations) === -1) {
                    this.dfArgs.useAggregations.push(agg.name);
                }
            }

            if (this.aggregations.length > 0 && this.dataFunctionClosure) {
                this.dataFunction = this.dataFunctionClosure(this.dfArgs);
            }
        };

        this.contrib = function(query) {
            for (var i = 0; i < this.aggregations.length; i++) {
                query.addAggregation(this.aggregations[i]);
            }
        };

        this.synchronise = function() {
            if (this.dataFunction) {
                this.dataSeries = this.dataFunction(this);
            }
        };
    },
    ChartDataFunctions : {
        // dataFunctionClosure
        terms : function(params) {

            var useAggregations = params.useAggregations || [];
            var seriesKeys = params.seriesKeys || {};

            return function (ch) {
                // for each aggregation, get the results and add them to the data series
                var data_series = [];
                if (!ch.edge.result) {
                    return data_series;
                }
                for (var i = 0; i < useAggregations.length; i++) {
                    var agg = useAggregations[i];
                    var buckets = ch.edge.result.data.aggregations[agg].buckets;

                    var series = {};
                    series["key"] = seriesKeys[agg];
                    series["values"] = [];

                    for (var j = 0; j < buckets.length; j++) {
                        var doccount = buckets[j].doc_count;
                        var key = buckets[j].key;
                        series.values.push({label: key, value: doccount});
                    }

                    data_series.push(series);
                }
                return data_series;
            }
        },

        // dataFunctionClosure
        // extract the stats from a nested stats aggregation inside a terms aggregation
        // produces a set of series, one for each "seriesFor" (which should be one of the
        // stats in the stats aggregation, such as "sum") in each of the aggregations
        // listed in useAggregations (which should be a list of the terms aggregations to
        // be interrogated for nested stats aggs).  If the terms stats themselves are nested
        // aggregations, provide the full path to the term, separating each level with a space.
        //
        // seriesKeys map from the full name of the path to the statistic to a human readable
        // representation of it
        termsStats : function(params) {

            var useAggregations = params.useAggregations || [];
            var seriesKeys = params.seriesKeys || {};
            var seriesFor = params.seriesFor || [];

            return function(ch) {
                // for each aggregation, get the results and add them to the data series
                var data_series = [];
                if (!ch.edge.result) {
                    return data_series;
                }

                for (var i = 0; i < useAggregations.length; i++) {
                    var agg = useAggregations[i];
                    var parts = agg.split(" ");

                    for (var j = 0; j < seriesFor.length; j++) {
                        var seriesStat = seriesFor[j];

                        var series = {};
                        series["key"] = seriesKeys[agg + " " + seriesStat];
                        series["values"] = [];

                        var buckets = ch.edge.result.data.aggregations[parts[0]].buckets;
                        for (var k = 0; k < buckets.length; k++) {
                            var stats = buckets[k][parts[1]];
                            var key = buckets[k].key;
                            var val = stats[seriesStat];
                            series.values.push({label : key, value: val});
                        }

                        data_series.push(series);
                    }
                }

                return data_series;
            }
        },

        // dataFunctionClosure
        // from each record extract the values specified by the field pointers x and y
        // and store them as the label and value respectively in the data series.  Only
        // one data series is produced by this function
        recordsXY : function(params) {
            var x = params.x;
            var x_default = params.x_default === undefined ? 0 : params.x_default;
            var y = params.y;
            var y_default = params.y_default === undefined ? 0 : params.y_default;
            var key = params.key;

            return function(ch) {
                var data_series = [];
                if (!ch.edge.result) {
                    return data_series;
                }

                var series = {};
                series["key"] = key;
                series["values"] = [];

                var results = ch.edge.result.results();
                for (var i = 0; i < results.length; i++) {
                    var res = results[i];
                    var xval = edges.objVal(x, res, x_default);
                    var yval = edges.objVal(y, res, y_default);
                    series.values.push({label: xval, value: yval});
                }

                data_series.push(series);
                return data_series;
            }
        },
        listXY : function(params) {
            var x = params.x;
            var x_default = params.x_default === undefined ? 0 : params.x_default;
            var y = params.y;
            var y_default = params.y_default === undefined ? 0 : params.y_default;
            var key = params.key;
            var listPath = params.listPath || "";

            return function(ch) {
                var data_series = [];
                if (!ch.edge.result) {
                    return data_series;
                }

                var series = {};
                series["key"] = key;
                series["values"] = [];

                var results = ch.edge.result.results();
                for (var i = 0; i < results.length; i++) {
                    var res = results[i];
                    var l = edges.objVal(listPath, res, []);
                    for (var j = 0; j < l.length; j++) {
                        var lo = l[j];
                        var xval = edges.objVal(x, lo, x_default);
                        var yval = edges.objVal(y, lo, y_default);
                        series.values.push({label: xval, value: yval});
                    }
                }

                data_series.push(series);
                return data_series;
            }
        },
        // dataFunctionClosure
        // from each record extract the values specified by the field pointers x and y
        // and add them to a cumulative total, and save them as the label and value respectively
        //
        // you can choose to accumulate only one of the fields, x or y, the other will be stored
        // as it is represented in the record.
        //
        // This is good, for example, for producing a cumulative series of an annual statistic,
        // on a by-year basis.
        cumulativeXY : function(params) {
            var x = params.x;
            var x_default = params.x_default === undefined ? 0 : params.x_default;
            var y = params.y;
            var y_default = params.y_default === undefined ? 0 : params.y_default;
            var key = params.key;
            var accumulate = params.accumulate || "y";

            return function(ch) {
                var data_series = [];
                if (!ch.edge.result) {
                    return data_series;
                }

                var series = {};
                series["key"] = key;
                series["values"] = [];

                var total = 0;
                var results = ch.edge.result.results();
                for (var i = 0; i < results.length; i++) {
                    var res = results[i];
                    var xval = edges.objVal(x, res, x_default);
                    var yval = edges.objVal(y, res, y_default);
                    if (accumulate === "x") {
                        total += xval;
                        series.values.push({label: total, value: yval});
                    } else if (accumulate === "y") {
                        total += yval;
                        series.values.push({label: xval, value: total});
                    }
                }

                data_series.push(series);
                return data_series;
            }
        },

        totalledList : function(params) {
            var listPath = params.listPath || "";
            var seriesKey = params.seriesKey || "";
            var keyField = params.keyField || false;
            var valueField = params.valueField || false;

            return function(ch) {
                var data_series = [];
                if (!ch.edge.result) {
                    return data_series;
                }

                var series = {};
                series["key"] = seriesKey;
                series["values"] = [];

                // go through all the records and count the values
                var counter = {};
                var results = ch.edge.result.results();
                for (var i = 0; i < results.length; i++) {
                    var res = results[i];
                    var l = edges.objVal(listPath, res, []);
                    for (var j = 0; j < l.length; j++) {
                        var lo = l[j];
                        var key = edges.objVal(keyField, lo, false);
                        var value = edges.objVal(valueField, lo, 0);
                        if (key in counter) {
                            counter[key] += value;
                        } else {
                            counter[key] = value;
                        }
                    }
                }

                // now conver the values into the correct form for the series
                for (key in counter) {
                    var val = counter[key];
                    series.values.push({label: key, value: val});
                }

                data_series.push(series);
                return data_series;
            }
        }
    },

    ///////////////////////////////////////////////////////
    // Specific chart implementations

    newPieChart : function(params) {
        if (!params) { params = {} }
        edges.PieChart.prototype = edges.newChart(params);
        return new edges.PieChart(params);
    },
    PieChart : function(params) {
        this.defaultRenderer = params.defaultRenderer || "newPieChartRenderer";
    },

    newHorizontalMultibar : function(params) {
        if (!params) { params = {} }
        edges.HorizontalMultibar.prototype = edges.newChart(params);
        return new edges.HorizontalMultibar(params);
    },
    HorizontalMultibar : function(params) {
        this.defaultRenderer = params.defaultRenderer || "newHorizontalMultibarRenderer";
    },

    newMultibar : function(params) {
        if (!params) { params = {} }
        edges.Multibar.prototype = edges.newChart(params);
        return new edges.Multibar(params);
    },
    Multibar : function(params) {
        this.defaultRenderer = params.defaultRenderer || "newMultibarRenderer";
    },

    newSimpleLineChart : function(params) {
        if (!params) { params = {} }
        edges.SimpleLineChart.prototype = edges.newChart(params);
        return new edges.SimpleLineChart(params);
    },
    SimpleLineChart : function(params) {

        this.xAxisLabel = params.xAxisLabel || "";
        this.yAxisLabel = params.yAxisLabel || "";

        this.defaultRenderer = params.defaultRenderer || "newSimpleLineChartRenderer";
    },


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

    //////////////////////////////////////////////////////////////////
    // Closures for integrating the object with other modules

    objClosure : function(obj, fn, args) {
        return function() {
            if (args) {
                var params = {};
                for (var i = 0; i < args.length; i++) {
                    if (arguments.length > i) {
                        params[args[i]] = arguments[i];
                    }
                }
                obj[fn](params);
            } else {
                var slice = Array.prototype.slice;
                obj[fn].apply(obj, slice.apply(arguments));
            }

        }
    },

    eventClosure : function(obj, fn) {
        return function(event) {
            event.preventDefault();
            obj[fn](this);
        }
    },

    //////////////////////////////////////////////////////////////////
    // CSS normalising/canonicalisation tools

    css_classes : function(namespace, field, renderer) {
        var cl = namespace + "-" + field;
        if (renderer) {
            cl += " " + cl + "-" + renderer.component.id;
        }
        return cl;
    },

    css_class_selector : function(namespace, field, renderer) {
        var sel = "." + namespace + "-" + field;
        if (renderer) {
            sel += sel + "-" + renderer.component.id;
        }
        return sel;
    },

    css_id : function(namespace, field, renderer) {
        var id = namespace + "-" + field;
        if (renderer) {
            id += "-" + renderer.component.id;
        }
        return id;
    },

    css_id_selector : function(namespace, field, renderer) {
        return "#" + edges.css_id(namespace, field, renderer);
    },

    //////////////////////////////////////////////////////////////////
    // Event binding utilities

    on : function(selector, event, renderer, targetFunction, delay) {
        event = event + "." + renderer.component.id;
        var clos = edges.eventClosure(renderer, targetFunction);
        if (delay) {
            renderer.component.jq(selector).bindWithDelay(event, clos, delay);
        } else {
            renderer.component.jq(selector).on(event, clos)
        }
    },

    //////////////////////////////////////////////////////////////////
    // Shared utilities

    escapeHtml : function(unsafe) {
        if (typeof unsafe.replace !== "function") {
            return unsafe
        }
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    objVal : function(path, rec, def) {
        if (def === undefined) {
            def = false;
        }
        var bits = path.split(".");
        var val = rec;
        for (var i = 0; i < bits.length; i++) {
            var field = bits[i];
            if (field in val) {
                val = val[field];
            } else {
                return def;
            }
        }
        return val;
    }
};
