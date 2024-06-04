// requires: $
// requires: es

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("util")) { edges.util = {}}
if (!edges.hasOwnProperty("es")) { edges.es = {}}

//////////////////////////////////////////////////////////////////
// Main edge class

edges.Edge = class {
    constructor(params) {
        /////////////////////////////////////////////
        // parameters that can be set via params arg

        // the jquery selector for the element where the edge will be deployed
        this.selector = edges.util.getParam(params, "selector", "body");

        // the base search url which will respond to elasticsearch queries.  Generally ends with _search
        this.searchUrl = edges.util.getParam(params, "searchUrl", false);

        // datatype for ajax requests to use - overall recommend using jsonp and proxying ES requests
        // through a back end that can provide that
        this.datatype = edges.util.getParam(params, "datatype", "jsonp");

        // dictionary of queries to be run before the primary query is executed
        // {"<preflight id>" : new es.Query(....)}
        // results will appear with the same ids in this.preflightResults
        // preflight queries are /not/ subject to the base query
        this.preflightQueries = edges.util.getParam(params, "preflightQueries", false);

        // query that forms the basis of all queries that are assembled and run
        // Note that baseQuery is inviolable - it's requirements will always be enforced
        this.baseQuery = edges.util.getParam(params, "baseQuery", false);

        // query to use to initialise the search.  Use this to set your opening
        // values for things like page size, initial search terms, etc.  Any request to
        // reset the interface will return to this query
        this.openingQuery = edges.util.getParam(params, "openingQuery", () => typeof es !== 'undefined' ? new es.Query() : false);

        // dictionary of functions that will generate secondary queries which also need to be
        // run at the point that cycle() is called.  These functions and their resulting
        // queries will be run /after/ the primary query (so can take advantage of the
        // results).  Their results will be stored in this.secondaryResults.
        // secondary queries are not subject the base query, although the functions
        // may of course apply the base query too if they wish
        // {"<secondary id>" : function() }
        this.secondaryQueries = edges.util.getParam(params, "secondaryQueries", false);

        // dictionary mapping keys to urls that will be used for search.  These should be
        // the same keys as used in secondaryQueries, if those secondary queries should be
        // issued against different urls than the primary search_url.
        this.secondaryUrls = edges.util.getParam(params, "secondaryUrls", false);

        // should the init process do a search
        this.initialSearch = edges.util.getParam(params, "initialSearch", true);

        // list of static files (e.g. data files) to be loaded at startup, and made available
        // on the object for use by components
        // {"id" : "<internal id to give the file>", "url" : "<file url>", "processor" : edges.csv.newObjectByRow, "datatype" : "text", "opening" : <function to be run after processing for initial state>}
        this.staticFiles = edges.util.getParam(params, "staticFiles", []);

        // should the search url be synchronised with the browser's url bar after search
        // and should queries be retrieved from the url on init
        this.manageUrl = edges.util.getParam(params, "manageUrl", false);

        // query parameter in which the query for this edge instance will be stored
        this.urlQuerySource = edges.util.getParam(params, "urlQuerySource", "source");

        // options to be passed to es.Query.objectify when prepping the query to be placed in the URL
        this.urlQueryOptions = edges.util.getParam(params, "urlQueryOptions", false);

        // template object that will be used to draw the frame for the edge.  May be left
        // blank, in which case the edge will assume that the elements are already rendered
        // on the page by the caller
        this.template = edges.util.getParam(params, "template", false);

        // list of all the components that are involved in this edge
        this.components = edges.util.getParam(params, "components", []);

        // the query adapter
        this.queryAdapter = edges.util.getParam(params, "queryAdapter", () => new edges.es.ESQueryAdapter());

        // list of callbacks to be run synchronously with the edge instance as the argument
        // (these bind at the same points as all the events are triggered, and are keyed the same way)
        this.callbacks = edges.util.getParam(params, "callbacks", {});

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

        // the results of the preflight queries, keyed by their id
        this.preflightResults = {};

        // the actual secondary queries derived from the functions in this.secondaryQueries;
        this.realisedSecondaryQueries = {};

        // results of the secondary queries, keyed by their id
        this.secondaryResults = {};

        // if the search is currently executing
        this.searching = false;

        // jquery object that represents the selected element
        this.context = false;

        // raw access to this.staticFiles loaded resources, keyed by id
        this.static = {};

        // access to processed static files, keyed by id
        this.resources = {};

        // list of static resources where errors were encountered
        this.errorLoadingStatic = [];


        //////////////////////////////////////////
        // now kick off the edge
        this.startup();
    }

    //////////////////////////////////////////////////
    // Startup

    startup() {
        // obtain the jquery context for all our operations
        this.context = $(this.selector);

        // trigger the edges:init event
        this.trigger("edges:pre-init");

        // if we are to manage the URL, attempt to pull a query from it
        if (this.manageUrl) {
            var urlParams = edges.util.getUrlParams();
            if (this.urlQuerySource in urlParams) {
                this.urlQuery = new es.Query({raw : urlParams[this.urlQuerySource]});
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
        this.draw();

        // load any static files - this will happen asynchronously, so afterwards
        // we call finaliseStartup to finish the process
        // var onward = edges.edges.util.objClosure(this, "startupPart2");
        let onward = () => this.startupPart2()
        this.loadStaticsAsync(onward);
    }

    startupPart2() {
        // FIXME: at this point we should check whether the statics all loaded correctly
        // var onward = edges.edges.util.objClosure(this, "startupPart3");
        let onward = () => this.startupPart3()
        this.runPreflightQueries(onward);
    };

    startupPart3() {

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

        // trigger the edges:post-init event
        this.trigger("edges:post-init");

        // now issue a query
        this.cycle();
    };

    ////////////////////////////////////////////////////
    // Cycle

    cycle() {
        // if a search is currently executing, don't do anything, else turn it on
        // FIXME: should we queue them up? - see the d3 map for an example of how to do this
        if (this.searching) {
            return;
        }
        this.searching = true;

        // invalidate the short url
        this.shortUrl = false;

        // pre query event
        this.trigger("edges:pre-query");

        // if we are managing the url space, use pushState to set it
        if (this.manageUrl) {
            this.updateUrl();
        }

        // if there's a search url, do a query, otherwise call synchronise and draw directly
        if (this.searchUrl) {
            // var onward = edges.edges.util.objClosure(this, "cyclePart2");
            let onward = () => this.cyclePart2();
            this.doPrimaryQuery(onward);
        } else {
            this.cyclePart2();
        }
    }

    cyclePart2() {
        // var onward = edges.edges.util.objClosure(this, "cyclePart3");
        let onward = () => this.cyclePart3();
        this.runSecondaryQueries(onward);
    }

    cyclePart3() {
        this.synchronise();

        // pre-render trigger
        this.trigger("edges:pre-render");
        // render
        this.draw();
        // post render trigger
        this.trigger("edges:post-render");

        // searching has completed, so flip the switch back
        this.searching = false;
    }

    ////////////////////////////////////////////////////
    // utilities required during startup

    loadStaticsAsync(callback) {
        if (!this.staticFiles || this.staticFiles.length === 0) {
            this.trigger("edges:post-load-static");
            callback();
            return;
        }

        // FIXME: this could be done with a Promise.all
        var that = this;
        var pg = new edges.util.AsyncGroup({
            list: this.staticFiles,
            action: function(params) {
                var entry = params.entry;
                var success = params.success_callback;
                var error = params.error_callback;

                var id = entry.id;
                var url = entry.url;
                var datatype = edges.util.getParam(entry.datatype, "text");

                $.ajax({
                    type: "get",
                    url: url,
                    dataType: datatype,
                    success: success,
                    error: error
                })
            },
            successCallbackArgs: ["data"],
            success: function(params) {
                var data = params.data;
                var entry = params.entry;
                if (entry.processor) {
                    var processed = entry.processor({data : data});
                    that.resources[entry.id] = processed;
                    if (entry.opening) {
                        entry.opening({resource : processed, edge: that});
                    }
                }
                that.static[entry.id] = data;
            },
            errorCallbackArgs : ["data"],
            error:  function(params) {
                that.errorLoadingStatic.push(params.entry.id);
                that.trigger("edges:error-load-static");
            },
            carryOn: function() {
                that.trigger("edges:post-load-static");
                callback();
            }
        });

        pg.process();
    }

    runPreflightQueries(callback) {
        if (!this.preflightQueries || Object.keys(this.preflightQueries).length === 0) {
            callback();
            return;
        }

        this.trigger("edges:pre-preflight");

        var entries = [];
        var ids = Object.keys(this.preflightQueries);
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            entries.push({id: id, query: this.preflightQueries[id]});
        }

        var that = this;
        var pg = new edges.util.AsyncGroup({
            list: entries,
            action: function(params) {
                var entry = params.entry;
                var success = params.success_callback;
                var error = params.error_callback;

                es.doQuery({
                    search_url: that.searchUrl,
                    queryobj: entry.query.objectify(),
                    datatype: that.datatype,
                    success: success,
                    error: error
                });
            },
            successCallbackArgs: ["result"],
            success: function(params) {
                var result = params.result;
                var entry = params.entry;
                that.preflightResults[entry.id] = result;
            },
            errorCallbackArgs : ["result"],
            error:  function(params) {
                that.trigger("edges:error-preflight");
            },
            carryOn: function() {
                that.trigger("edges:post-preflight");
                callback();
            }
        });

        pg.process();
    }

    ///////////////////////////////////////////////////
    // Utilities required during cycle

    doPrimaryQuery(callback) {
        var context = {"callback" : callback};

        this.queryAdapter.doQuery({
            edge: this,
            success: edges.util.objClosure(this, "querySuccess", ["result"], context),
            error: edges.util.objClosure(this, "queryFail", ["response"], context)
        });
    }

    runSecondaryQueries(callback) {
        this.realisedSecondaryQueries = {};
        if (!this.secondaryQueries || Object.keys(this.secondaryQueries).length === 0) {
            callback();
            return;
        }

        // generate the query objects to be executed
        var entries = [];
        for (var key in this.secondaryQueries) {
            var entry = {};
            entry["query"] = this.secondaryQueries[key](this);
            entry["id"] = key;
            entry["searchUrl"] = this.searchUrl;
            if (this.secondaryUrls !== false && this.secondaryUrls.hasOwnProperty(key)) {
                entry["searchUrl"] = this.secondaryUrls[key]
            }
            entries.push(entry);
            this.realisedSecondaryQueries[key] = entry.query;
        }

        var that = this;
        var pg = new edges.util.AsyncGroup({
            list: entries,
            action: function(params) {
                var entry = params.entry;
                var success = params.success_callback;
                var error = params.error_callback;

                es.doQuery({
                    search_url: entry.searchUrl,
                    queryobj: entry.query.objectify(),
                    datatype: that.datatype,
                    success: success,
                    complete: false
                });
            },
            successCallbackArgs: ["result"],
            success: function(params) {
                var result = params.result;
                var entry = params.entry;
                that.secondaryResults[entry.id] = result;
            },
            errorCallbackArgs : ["result"],
            error:  function(params) {
                // FIXME: not really sure what to do about this
            },
            carryOn: function() {
                callback();
            }
        });

        pg.process();
    }

    ////////////////////////////////////////////////////
    //  functions for working with the queries

    cloneQuery() {
        if (this.currentQuery) {
            return this.currentQuery.clone();
        }
        return false;
    }

    pushQuery(query) {
        if (this.baseQuery) {
            query.merge(this.baseQuery);
        }
        this.currentQuery = query;
    }

    cloneBaseQuery() {
        if (this.baseQuery) {
            return this.baseQuery.clone();
        }
        return new es.Query();
    }

    cloneOpeningQuery() {
        if (this.openingQuery) {
            return this.openingQuery.clone();
        }
        return new es.Query();
    }

    queryFail(params) {
        var callback = params.callback;
        var response = params.response;
        this.trigger("edges:query-fail");
        if (response.hasOwnProperty("responseText")) {
            console.log("ERROR: query fail: " + response.responseText);
        }
        if (response.hasOwnProperty("error")) {
            console.log("ERROR: search execution fail: " + response.error);
        }
        callback();
    };

    querySuccess(params) {
        this.result = params.result;
        var callback = params.callback;

        // success trigger
        this.trigger("edges:query-success");
        callback();
    };

    //////////////////////////////////////////////////
    // URL Management

    updateUrl() {
        var currentQs = window.location.search;
        var qs = "?" + this.fullUrlQueryString();

        if (currentQs === qs) {
            return; // no need to push the state
        }

        var url = new URL(window.location.href);
        url.search = qs;

        if (currentQs === "") {
            window.history.replaceState("", "", url.toString());
        } else {
            window.history.pushState("", "", url.toString());
        }
    }

    fullUrl() {
        var args = this.fullQueryArgs();
        var fragment = "";
        if (args["#"]) {
            fragment = "#" + args["#"];
            delete args["#"];
        }
        var wloc = window.location.toString();
        var bits = wloc.split("?");
        var url = bits[0] + "?" + this._makeUrlQuery(args) + fragment;
        return url;
    };

    fullUrlQueryString() {
        return this._makeUrlQuery(this.fullQueryArgs())
    }

    fullQueryArgs() {
        var args = $.extend(true, {}, this.urlParams);
        $.extend(args, this.urlQueryArg());
        return args;
    };

    urlQueryArg(objectify_options) {
        if (!objectify_options) {
            if (this.urlQueryOptions) {
                objectify_options = this.urlQueryOptions
            } else {
                objectify_options = {
                    include_query_string : true,
                    include_filters : true,
                    include_paging : true,
                    include_sort : true,
                    include_fields : false,
                    include_aggregations : false
                }
            }
        }
        var q = JSON.stringify(this.currentQuery.objectify(objectify_options));
        var obj = {};
        obj[this.urlQuerySource] = encodeURIComponent(q);
        return obj;
    }

    _makeUrlQuery(args) {
        var keys = Object.keys(args);
        var entries = [];
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var val = args[key];
            entries.push(key + "=" + val);  // NOTE we do not escape - this should already be done
        }
        return entries.join("&");
    }

    /////////////////////////////////////////////////
    // lifecycle functions

    synchronise() {
        // ask the components to synchronise themselves with the latest state
        for (var i = 0; i < this.components.length; i++) {
            var component = this.components[i];
            component.synchronise()
        }
    }

    draw() {
        for (var i = 0; i < this.components.length; i++) {
            var component = this.components[i];
            component.draw(this);
        }
    };

    reset() {
        // tell the world we're about to reset
        this.trigger("edges:pre-reset");

        // clone from the opening query
        var requestedQuery = this.cloneOpeningQuery();

        // request the components to contribute to the query
        for (var i = 0; i < this.components.length; i++) {
            var component = this.components[i];
            component.contrib(requestedQuery);
        }

        // push the query, which will reconcile it with the baseQuery
        this.pushQuery(requestedQuery);

        // tell the world that we've done the reset
        this.trigger("edges:post-reset");

        // now execute the query
        // this.doQuery();
        this.cycle();
    };

    sleep() {
        for (var i = 0; i < this.components.length; i++) {
            var component = this.components[i];
            component.sleep();
        }
    };

    wake() {
        for (var i = 0; i < this.components.length; i++) {
            var component = this.components[i];
            component.wake();
        }
    };

    trigger(event_name) {
        if (event_name in this.callbacks) {
            this.callbacks[event_name](this);
        }
        this.context.trigger(event_name);
    };

    ////////////////////////////////////////////
    // accessors

    getComponent(params) {
        var id = params.id;
        for (var i = 0; i < this.components.length; i++) {
            var component = this.components[i];
            if (component.id === id) {
                return component;
            }
        }
        return false;
    };

    // return components in the requested category
    category(cat) {
        var comps = [];
        for (var i = 0; i < this.components.length; i++) {
            var component = this.components[i];
            if (component.category === cat) {
                comps.push(component);
            }
        }
        return comps;
    };

    jq(selector) {
        return $(selector, this.context);
    };
}

//////////////////////////////////////////////////////////////////
// Framework superclasses

edges.QueryAdapter = class {
    doQuery(params) {};
}

edges.Template = class {
    draw(edge) {}
}

edges.Component = class {
    constructor(params) {
        this.id = edges.util.getParam(params, "id");
        this.renderer = edges.util.getParam(params, "renderer");
        this.category = edges.util.getParam(params, "category", false);
    }

    init(edge) {
        this.edge = edge;
        this.context = this.edge.jq("#" + this.id);
        if (this.renderer) {
            this.renderer.init(this);
        }
    }

    draw() {
        if (this.renderer) {
            this.renderer.draw();
        }
    }

    sleep() {
        if (this.renderer) {
            this.renderer.sleep();
        }
    }

    wake() {
        if (this.renderer) {
            this.renderer.wake();
        }
    };

    // convenience method for any renderer rendering a component
    jq(selector) {
        return this.edge.jq(selector);
    }

    // methods to be implemented by subclasses
    contrib(query) {}
    synchronise() {}
}

edges.Renderer = class {
    init(component) {
        this.component = component
    }

    draw() {};
    sleep() {};
    wake() {}
}

//////////////////////////////////////////////////////////////////
// Event binding utilities

edges.on = function(selector, event, caller, targetFunction, delay, conditional, preventDefault) {
    if (preventDefault === undefined) {
        preventDefault = true;
    }
    // if the caller has an inner component (i.e. it is a Renderer), use the component's id
    // otherwise, if it has a namespace (which is true of Renderers or Templates) use that
    if (caller.component && caller.component.id) {
        event = event + "." + caller.component.id;
    } else if (caller.namespace) {
        event = event + "." + caller.namespace;
    }

    // create the closure to be called on the event
    var clos = edges.util.eventClosure(caller, targetFunction, conditional, preventDefault);

    if (delay) {
        clos = edges.util.delayer(clos, delay);
    }

    // now bind the closure directly or with delay
    // if the caller has an inner component (i.e. it is a Renderer) use the components jQuery selector
    // otherwise, if it has an inner, use the selector on that.
    // if (delay) {
    //     if (caller.component) {
    //         caller.component.jq(selector).bindWithDelay(event, clos, delay);
    //     } else if (caller.edge) {
    //         caller.edge.jq(selector).bindWithDelay(event, clos, delay);
    //     } else {
    //         $(selector).bindWithDelay(event, clos, delay);
    //     }
    // } else {
        if (caller.component) {
            var element = caller.component.jq(selector);
            element.off(event);
            element.on(event, clos);
        } else if (caller.edge) {
            var element = caller.edge.jq(selector);
            element.off(event);
            element.on(event, clos);
        } else {
            var element = $(selector);
            element.off(event);
            element.on(event, clos);
        }
    // }
}

edges.off = function(selector, event, caller) {
    // if the caller has an inner component (i.e. it is a Renderer), use the component's id
    // otherwise, if it has a namespace (which is true of Renderers or Templates) use that
    if (caller.component && caller.component.id) {
        event = event + "." + caller.component.id;
    } else if (caller.namespace) {
        event = event + "." + caller.namespace;
    }

    if (caller.component) {
        var element = caller.component.jq(selector);
        element.off(event);
    } else if (caller.edge) {
        var element = caller.edge.jq(selector);
        element.off(event);
    } else {
        var element = $(selector);
        element.off(event);
    }
}

//////////////////////////////////////////////////////////////////
// Common/default implementations of framework classes

edges.es.ESQueryAdapter = class extends edges.QueryAdapter {
    doQuery(params) {
        var edge = params.edge;
        var query = params.query;
        var success = params.success;
        var error = params.error;

        if (!query) {
            query = edge.currentQuery;
        }

        es.doQuery({
            search_url: edge.searchUrl,
            queryobj: query.objectify(),
            datatype: edge.datatype,
            success: success,
            error: error
        });
    };
}

// Solr query adapter
edges.es.SolrQueryAdapter = class extends edges.QueryAdapter {
    doQuery(params) {
        var edge = params.edge;
        var query = params.query;
        var success = params.success;
        var error = params.error;

        if (!query) {
            query = edge.currentQuery;
        }

        const args = this._es2solr({ query : query });

        // Execute the Solr query
        this._solrQuery({ edge, success, error, solrArgs: args });
    };

    // Method to execute the Solr query
    _solrQuery({ solrArgs, edge, success, error }) {
        const searchUrl = edge.searchUrl;

        // Generate the Solr query URL
        const fullUrl = this._args2URL({ baseUrl: searchUrl, args: solrArgs });
  
        var error_callback = this._queryError(error);
        var success_callback = this._querySuccess(success, error_callback);

        // Perform the HTTP GET request to Solr
        $.get({
            url: fullUrl,
            datatype: edge ? edge.datatype : "jsonp",
            success: success_callback,
            error: error_callback,
            jsonp: 'json.wrf'
        });
    }

    // Method to convert es query to Solr query
    _es2solr({ query }) {
        const solrQuery = {};
        let solrFacets = []

        // Handle the query part
        if (query.query) {
            const queryPart = query.query;
            if (queryPart.match) {
                const field = Object.keys(queryPart.match)[0];
                const value = queryPart.match[field];
                solrQuery.q = `${field}:${value}`;
            } else if (queryPart.range) {
                const field = Object.keys(queryPart.range)[0];
                const range = queryPart.range[field];
                const rangeQuery = `${field}:[${range.gte || '*'} TO ${range.lte || '*'}]`;
                solrQuery.fq = rangeQuery;
            } else if (queryPart.match_all) {
                solrQuery.q = `*:*`;
            }
        } else {
            solrQuery.q = `*:*`;
        }

        // Handle pagination
        if (query.from !== undefined) {
            if (typeof query.from == "boolean" && !query.from) {
                solrQuery.start = 0
            } else {
                solrQuery.start = query.from;
            }
        }
        if (query.size !== undefined) {
            if (typeof query.size == "boolean" && !query.size) {
                solrQuery.rows = 10
            } else {
                solrQuery.rows = query.size;
            }

        }

        // Handle sorting
        if (query && query.sort.length > 0) {
            solrQuery.sort = query.sort.map(sortOption => {
                const sortField = sortOption.field;
                const sortOrder = sortOption.order === "desc" ? "desc" : "asc";
                return `${sortField} ${sortOrder}`;
            }).join(', ');
        }

        if (query && query.aggs.length > 0) {
            let facets = query.aggs.map(agg => this._convertAggToFacet(agg));
            solrQuery.factes = facets.join(',');
        }

        solrQuery.wt = "json"

        return solrQuery;
    }

    _args2URL({ baseUrl, args }) {
        const qParts = Object.keys(args).flatMap(k => {
            const v = args[k];
            if (Array.isArray(v)) {
                return v.map(item => `${encodeURIComponent(k)}=${encodeURIComponent(item)}`);
            }
            return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
        });

        const qs = qParts.join("&");
        return `${baseUrl}?${qs}`;
    }

    _convertAggToFacet(agg) {
        const field = agg.field;
        const name = agg.name;
        const size = agg.size || 10; // default size if not specified
        const order = agg.orderBy === "_count" ? "count" : "index"; // mapping orderBy to Solr
        const direction = agg.orderDir === "desc" ? "desc" : "asc"; // default direction if not specified

        return `facet.field={!key=${name}}${field}&f.${field}.facet.limit=${size}&f.${field}.facet.sort=${order} ${direction}`;
    }

    _querySuccess(callback, error_callback) {
        return function(data) {
            if (data.hasOwnProperty("error")) {
                error_callback(data);
                return;
            }

            var result = new SolrResult({raw: data});
            callback(result);
        }
    }

    _queryError(callback) {
        return function(data) {
            if (callback) {
                callback(data);
            } else {
                throw new Error(data);
            }
        }
    }
}

// Result class for solr
class SolrResult {
    constructor(params) {
        this.data = params.raw;
    }

    buckets(facet_name) {
        if (this.data.facet_counts) {
            if (this.data.facet_counts.facet_fields && this.data.facet_counts.facet_fields[facet_name]) {
                return this._convertFacetToBuckets(this.data.facet_counts.facet_fields[facet_name]);
            } else if (this.data.facet_counts.facet_queries && this.data.facet_counts.facet_queries[facet_name]) {
                return this._convertFacetToBuckets(this.data.facet_counts.facet_queries[facet_name]);
            }
        }
        return [];
    }

    _convertFacetToBuckets(facet) {
        let buckets = [];
        for (let i = 0; i < facet.length; i += 2) {
            buckets.push({
                key: facet[i],
                doc_count: facet[i + 1]
            });
        }
        return buckets;
    }

    aggregation(facet_name) {
        return {
            buckets: this.buckets(facet_name)
        };
    }

    results() {
        var res = [];
        if (this.data.response && this.data.response.docs) {
            for (var i = 0; i < this.data.response.docs.length; i++) {
                res.push(this.data.response.docs[i]);
            }
        }
        return res;
    }

    total() {
        if (this.data.response && this.data.response.numFound !== undefined) {
            return parseInt(this.data.response.numFound);
        }
        return false;
    }
}

//////////////////////////////////////////////////////////////////
// utilities

edges.util.getParam = function(params, key, def) {
    function _getDefault() {
        if (typeof def === 'function') {
            return def();
        }
        return def;
    }

    if (!params) {
        return _getDefault();
    }

    if (!params.hasOwnProperty(key)) {
        return _getDefault();
    }

    return params[key];
}

edges.util.getUrlParams = function() {
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
            var key = kv[0].replace(/\+/g, "%20");
            key = decodeURIComponent(key);
            var val = kv[1].replace(/\+/g, "%20");
            val = decodeURIComponent(val);
            if (val[0] === "[" || val[0] === "{") {
                // if it looks like a JSON object in string form...
                // remove " (double quotes) at beginning and end of string to make it a valid
                // representation of a JSON object, or the parser will complain
                val = val.replace(/^"/,"").replace(/"$/,"");
                val = JSON.parse(val);
            }
            params[key] = val;
        }
    }

    // record the fragment identifier if required
    if (fragment) {
        params['#'] = fragment;
    }

    return params;
}

edges.util.isEmptyObject = function(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

//////////////////////////////////////////////////////////////////
// Closures for integrating the object with other modules

// returns a function that will call the named function (fn) on
// a specified object instance (obj), with all "arguments"
// supplied to the closure by the caller
//
// if the args property is specified here, instead a parameters object
// will be constructed with a one to one mapping between the names in args
// and the values in the "arguments" supplied to the closure, until all
// values in "args" are exhausted.
//
// so, for example,
//
// edges.util.objClosure(this, "function")(arg1, arg2, arg3)
// results in a call to
// this.function(arg1, arg2, arg3, ...)
//
// and
// edges.util.objClosure(this, "function", ["one", "two"])(arg1, arg2, arg3)
// results in a call to
// this.function({one: arg1, two: arg2})
//
edges.util.objClosure = function(obj, fn, args, context_params) {
    return function() {
        if (args) {
            var params = {};
            for (var i = 0; i < args.length; i++) {
                if (arguments.length > i) {
                    params[args[i]] = arguments[i];
                }
            }
            if (context_params) {
                params = $.extend(params, context_params);
            }
            obj[fn](params);
        } else {
            var slice = Array.prototype.slice;
            var theArgs = slice.apply(arguments);
            if (context_params) {
                theArgs.push(context_params);
            }
            obj[fn].apply(obj, theArgs);
        }
    }
}

edges.util.eventClosure = function(obj, fn, conditional, preventDefault) {
    if (preventDefault === undefined) {
        preventDefault = true;
    }
    return function(event) {
        if (conditional) {
            if (!conditional(event)) {
                return;
            }
        }
        if (preventDefault) {
            event.preventDefault();
        }
        obj[fn](event.currentTarget, event);
    }
}

edges.util.delayer = function(fn, delay, timeout) {
    let wait = null;

    return function(event) {
        // var e = $.extend(true, { }, arguments[0]);
        var throttler = function() {
            wait = null;
            fn(event);
        };

        if (!timeout) { clearTimeout(wait); }
        if (!timeout || !wait) { wait = setTimeout(throttler, delay); }
    }
}

///////////////////////////////////////////////////
// Group of asynchronous operations

edges.util.AsyncGroup = class {
    constructor(params) {
        this.list = edges.util.getParam(params, "list");
        this.successCallbackArgs = edges.util.getParam(params, "successCallbackArgs");
        this.errorCallbackArgs = edges.util.getParam(params, "errorCallbackArgs");

        this.functions = {
            action: edges.util.getParam(params, "action"),
            success: edges.util.getParam(params, "success"),
            carryOn: edges.util.getParam(params, "carryOn"),
            error: edges.util.getParam(params, "error")
        };

        this.checkList = [];

        this.finished = false;

        for (let i = 0; i < this.list.length; i++) {
            this.checkList.push(0);
        }
    }

    process(params) {
        if (this.list.length === 0) {
            this.functions.carryOn();
        }

        for (let i = 0; i < this.list.length; i++) {
            let context = {index: i};

            let success_callback = edges.util.objClosure(this, "_actionSuccess", this.successCallbackArgs, context);
            let error_callback = edges.util.objClosure(this, "_actionError", this.successCallbackArgs, context);
            let complete_callback = false;

            this.functions.action({entry: this.list[i],
                success_callback: success_callback,
                error_callback: error_callback,
                complete_callback: complete_callback
            });
        }
    };

    _actionSuccess(params) {
        let index = params.index;
        delete params.index;

        params["entry"] = this.list[index];
        this.functions.success(params);
        this.checkList[index] = 1;

        if (this._isComplete()) {
            this._finalise();
        }
    };

    _actionError(params) {
        let index = params.index;
        delete params.index;

        params["entry"] = this.list[index];
        this.functions.error(params);
        this.checkList[index] = -1;

        if (this._isComplete()) {
            this._finalise();
        }
    };

    _actionComplete(params) {};

    _isComplete() {
        return $.inArray(0, this.checkList) === -1;
    };

    _finalise = function() {
        if (this.finished) {
            return;
        }
        this.finished = true;
        this.functions.carryOn();
    };
}

///////////////////////////////////////////////////
// Style/CSS/HTML ID related functions

edges.util.bem = function(block, element, modifier) {
    let bemClass = block;
    if (element) {
        bemClass += "__" + element;
    }
    if (modifier) {
        bemClass += "--" + modifier;
    }
    return bemClass;
}

edges.util.styleClasses = function(namespace, field, instance_name) {
    instance_name = edges.util._normaliseInstanceName(instance_name);
    let cl = namespace;
    if (field) {
        cl += "_" + field
    }
    if (instance_name) {
        let second = namespace + "_" + instance_name;
        if (field) {
            second += "_" + field;
        }
        cl += " " + second;
    }
    return cl;
}

edges.util.jsClasses = function(namespace, field, instance_name) {
    instance_name = edges.util._normaliseInstanceName(instance_name);
    let styles = edges.util.styleClasses(namespace, field, instance_name)
    let jsClasses = "";
    let bits = styles.split(" ")
    for (let i = 0; i < bits.length; i++) {
        let bit = bits[i];
        jsClasses += " js-" + bit;
    }
    return jsClasses;
}

edges.util.allClasses = function(namespace, field, instance_name) {
    instance_name = edges.util._normaliseInstanceName(instance_name);
    let styles = edges.util.styleClasses(namespace, field, instance_name);
    let js = edges.util.jsClasses(namespace, field, instance_name);
    return styles + " " + js;
}

edges.util.jsClassSelector = function(namespace, field, instance_name) {
    instance_name = edges.util._normaliseInstanceName(instance_name);
    let sel = ".js-" + namespace;
    if (instance_name) {
        sel += "_" + instance_name;
    }
    if (field) {
        sel += "_" + field;
    }
    return sel;
}

edges.util.htmlID = function(namespace, field, instance_name) {
    instance_name = edges.util._normaliseInstanceName(instance_name);
    let id = namespace;
    if (instance_name) {
        id += "_" + instance_name;
    }
    if (field) {
        id += "_" + field;
    }
    return id;
}

edges.util.idSelector = function(namespace, field, instance_name) {
    instance_name = edges.util._normaliseInstanceName(instance_name);
    return "#" + edges.util.htmlID(namespace, field, instance_name);
}

edges.util._normaliseInstanceName = function(instance_name) {
    if (typeof instance_name === "string") {
        return instance_name;
    }

    if (instance_name instanceof edges.Component) {
        return instance_name.id;
    }

    if (instance_name instanceof edges.Renderer) {
        return instance_name.component.id;
    }
}

////////////////////////////////////////////////////
// content wrangling

edges.util.escapeHtml = function(unsafe, def) {
    if (def === undefined) {
        def = "";
    }
    if (unsafe === undefined || unsafe == null) {
        return def;
    }
    try {
        if (typeof unsafe.replace !== "function") {
            return unsafe
        }
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    } catch(err) {
        return def;
    }
}

edges.util.toHtmlEntities = function(str) {
    return str.replace(/./gm, function(s) {
        // return "&#" + s.charCodeAt(0) + ";";
        return (s.match(/[a-z0-9\s]+/i)) ? s : "&#" + s.charCodeAt(0) + ";";
    });
}

edges.util.fromHtmlEntities = function(string) {
    return (string+"").replace(/&#\d+;/gm,function(s) {
        return String.fromCharCode(s.match(/\d+/gm)[0]);
    })
}

edges.util.safeId = function(unsafe) {
    return unsafe.replace(/&/g, "_")
        .replace(/</g, "_")
        .replace(/>/g, "_")
        .replace(/"/g, "_")
        .replace(/'/g, "_")
        .replace(/\./gi,'_')
        .replace(/\:/gi,'_')
        .replace(/\s/gi,"_");
}

edges.util.numFormat = function(params) {
    var reflectNonNumbers = edges.util.getParam(params, "reflectNonNumbers", false);
    var prefix = edges.util.getParam(params, "prefix", "");
    var zeroPadding = edges.util.getParam(params, "zeroPadding", false);
    var decimalPlaces = edges.util.getParam(params, "decimalPlaces", false);
    var thousandsSeparator = edges.util.getParam(params, "thousandsSeparator", false);
    var decimalSeparator = edges.util.getParam(params, "decimalSeparator", ".");
    var suffix = edges.util.getParam(params, "suffix", "");

    return function(number) {
        // ensure this is really a number
        var num = parseFloat(number);
        if (isNaN(num)) {
            if (reflectNonNumbers) {
                return number;
            } else {
                return num;
            }
        }

        // first off we need to convert the number to a string, which we can do directly, or using toFixed if that
        // is suitable here
        if (decimalPlaces !== false) {
            num = num.toFixed(decimalPlaces);
        } else {
            num  = num.toString();
        }

        // now "num" is a string containing the formatted number that we can work on

        var bits = num.split(".");

        if (zeroPadding !== false) {
            var zeros = zeroPadding - bits[0].length;
            var pad = "";
            for (var i = 0; i < zeros; i++) {
                pad += "0";
            }
            bits[0] = pad + bits[0];
        }

        if (thousandsSeparator !== false) {
            bits[0] = bits[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
        }

        if (bits.length === 1) {
            return prefix + bits[0] + suffix;
        } else {
            return prefix + bits[0] + decimalSeparator + bits[1] + suffix;
        }
    }
}

edges.util.numParse = function(params) {
    var commaRx = new RegExp(",", "g");

    return function(num) {
        num = num.trim();
        num = num.replace(commaRx, "");
        if (num === "") {
            return 0.0;
        }
        return parseFloat(num);
    }
}