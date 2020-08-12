/** @namespace */
var edges = {

    //////////////////////////////////////////////////////
    /** @namespace */
    /** function to run to start a new Edge */
    /** * @param selector="body" {String} The jquery selector for the element where the edge will be deployed.
     * @param search_url {String} The base search url which will respond to elasticsearch queries.  Generally ends with _search
     * @param datatype="jsonp" {String} Datatype for ajax requests to use - overall recommend using jsonp
     * @param preflightQueries {Dictionary} Dictionary of queries to be run before the primary query is executed: preflight id : es.newQuery(....). Results will appear with the same ids in this.preflightResults.
     Preflight queries are /not/ subject to the base query
     * @param baseQuery {String} Query that forms the basis of all queries that are assembled and run. Note that baseQuery is inviolable - it's requirements will always be enforced
     * @param openingQuery {String} Query to use to initialise the search.  Use this to set your opening values for things like page size, initial search terms, etc.  Any request to
     reset the interface will return to this query.
     * @param secondaryQueries {?} Dictionary of functions that will generate secondary queries which also need to be run at the point that cycle() is called.
     These functions and their resulting queries will be run /after/ the primary query (so can take advantage of the results).
     Their results will be stored in this.secondaryResults. Secondary queries are not subject the base query, although the functions may of course apply the base query too if they wish.
     secondary id : function()
     * @param initialSearch {Boolean} Should the init process do a search
     * @param  staticFiles {Object} List of static files (e.g. data files) to be loaded at startup, and made available
     on the object for use by components.
     {"id" : internal id to give the file, "url" : file url, "processor" : edges.csv.newObjectByRow, "datatype" : "text", "opening" : function to be run after processing for initial state}
     * @param manageUrl {Boolean} Should the search url be synchronised with the browser's url bar after search
     and should queries be retrieved from the url on init
     * @param urlQuerySource="source" {String} Query parameter in which the query for this edge instance will be stored.
     * @param template {Object} Template object that will be used to draw the frame for the edge.  May be left
     blank, in which case the edge will assume that the elements are already rendered on the page by the caller
     * @param components {Array} List of all the components that are involved in this edge
     * @param renderPacks=[edges.bs3, edges.nvd3, edges.highcharts, edges.google, edges.d3] {Array} Render packs to use to source automatically assigned rendering objects.
     Defaults to [edges.bs3, edges.nvd3, edges.highcharts, edges.google, edges.d3] */
    newEdge : function(params) {
        if (!params) { params = {} }
        return new edges.Edge(params);
    },
    /** @class */
    Edge : function(params) {

        /////////////////////////////////////////////
        // parameters that can be set via params arg

        // the jquery selector for the element where the edge will be deployed
        this.selector = edges.getParam(params.selector, "body");

        // the base search url which will respond to elasticsearch queries.  Generally ends with _search
        this.search_url = edges.getParam(params.search_url, false);

        // datatype for ajax requests to use - overall recommend using jsonp
        this.datatype = edges.getParam(params.datatype, "jsonp");

        // dictionary of queries to be run before the primary query is executed
        // {"<preflight id>" : es.newQuery(....)}
        // results will appear with the same ids in this.preflightResults
        // preflight queries are /not/ subject to the base query
        this.preflightQueries = edges.getParam(params.preflightQueries, false);

        // query that forms the basis of all queries that are assembled and run
        // Note that baseQuery is inviolable - it's requirements will always be enforced
        this.baseQuery = edges.getParam(params.baseQuery, false);

        // query to use to initialise the search.  Use this to set your opening
        // values for things like page size, initial search terms, etc.  Any request to
        // reset the interface will return to this query
        this.openingQuery = edges.getParam(params.openingQuery, typeof es !== 'undefined' ? es.newQuery() : false);

        // dictionary of functions that will generate secondary queries which also need to be
        // run at the point that cycle() is called.  These functions and their resulting
        // queries will be run /after/ the primary query (so can take advantage of the
        // results).  Their results will be stored in this.secondaryResults.
        // secondary queries are not subject the base query, although the functions
        // may of course apply the base query too if they wish
        // {"<secondary id>" : function() }
        this.secondaryQueries = edges.getParam(params.secondaryQueries, false);

        // dictionary mapping keys to urls that will be used for search.  These should be
        // the same keys as used in secondaryQueries, if those secondary queries should be
        // issued against different urls than the primary search_url.
        this.secondaryUrls = edges.getParam(params.secondaryUrls, false);

        // should the init process do a search
        this.initialSearch = edges.getParam(params.initialSearch, true);

        // list of static files (e.g. data files) to be loaded at startup, and made available
        // on the object for use by components
        // {"id" : "<internal id to give the file>", "url" : "<file url>", "processor" : edges.csv.newObjectByRow, "datatype" : "text", "opening" : <function to be run after processing for initial state>}
        this.staticFiles = edges.getParam(params.staticFiles, []);

        // should the search url be synchronised with the browser's url bar after search
        // and should queries be retrieved from the url on init
        this.manageUrl = edges.getParam(params.manageUrl, false);

        // query parameter in which the query for this edge instance will be stored
        this.urlQuerySource = edges.getParam(params.urlQuerySource, "source");

        // options to be passed to es.Query.objectify when prepping the query to be placed in the URL
        this.urlQueryOptions = edges.getParam(params.urlQueryOptions, false);

        // template object that will be used to draw the frame for the edge.  May be left
        // blank, in which case the edge will assume that the elements are already rendered
        // on the page by the caller
        this.template = edges.getParam(params.template, false);

        // list of all the components that are involved in this edge
        this.components = edges.getParam(params.components, []);

        // the query adapter
        this.queryAdapter = edges.getParam(params.queryAdapter, edges.newESQueryAdapter());

        // render packs to use to source automatically assigned rendering objects
        this.renderPacks = edges.getParam(params.renderPacks, [edges.bs3, edges.nvd3, edges.highcharts, edges.google, edges.d3]);

        // list of callbacks to be run synchronously with the edge instance as the argument
        // (these bind at the same points as all the events are triggered, and are keyed the same way)
        this.callbacks = edges.getParam(params.callbacks, {});

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

        ////////////////////////////////////////////////////////
        // startup functions

        // at the bottom of this constructor, we'll call this function
        this.startup = function() {
            // obtain the jquery context for all our operations
            this.context = $(this.selector);

            // trigger the edges:init event
            this.trigger("edges:pre-init");

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
            this.draw();

            // load any static files - this will happen asynchronously, so afterwards
            // we call finaliseStartup to finish the process
            var onward = edges.objClosure(this, "startupPart2");
            this.loadStaticsAsync(onward);
        };

        this.startupPart2 = function() {
            // FIXME: at this point we should check whether the statics all loaded correctly
            var onward = edges.objClosure(this, "startupPart3");
            this.runPreflightQueries(onward);
        };

        this.startupPart3 = function() {

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

        /////////////////////////////////////////////////////////
        // Edges lifecycle functions

        this.doQuery = function() {
            // the original doQuery has become doPrimaryQuery, so this has been aliased for this.cycle
            this.cycle();
        };

        this.cycle = function() {
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
            if (this.search_url) {
                var onward = edges.objClosure(this, "cyclePart2");
                this.doPrimaryQuery(onward);
            } else {
                this.cyclePart2();
            }
        };

        this.cyclePart2 = function() {
            var onward = edges.objClosure(this, "cyclePart3");
            this.runSecondaryQueries(onward);
        };

        this.cyclePart3 = function() {
            this.synchronise();

            // pre-render trigger
            this.trigger("edges:pre-render");
            // render
            this.draw();
            // post render trigger
            this.trigger("edges:post-render");

            // searching has completed, so flip the switch back
            this.searching = false;
        };

        this.synchronise = function() {
            // ask the components to synchronise themselves with the latest state
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.synchronise()
            }
        };

        this.draw = function() {
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.draw(this);
            }
        };

        // reset the query to the start and re-issue the query
        this.reset = function() {
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

        this.sleep = function() {
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.sleep();
            }
        };

        this.wake = function() {
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.wake();
            }
        };

        ////////////////////////////////////////////////////
        //  functions for working with the queries

        this.cloneQuery = function() {
            if (this.currentQuery) {
                return $.extend(true, {}, this.currentQuery);
            }
            return false;
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

        this.cloneOpeningQuery = function() {
            if (this.openingQuery) {
                return $.extend(true, {}, this.openingQuery);
            }
            return es.newQuery();
        };

        ////////////////////////////////////////////////////
        // functions to handle the query lifecycle

        // execute the query and all the associated workflow
        // FIXME: could replace this with an async group for neatness
        this.doPrimaryQuery = function(callback) {
            var context = {"callback" : callback};

            this.queryAdapter.doQuery({
                edge: this,
                success: edges.objClosure(this, "querySuccess", ["result"], context),
                error: edges.objClosure(this, "queryFail", ["response"], context)
            });
        };

        this.queryFail = function(params) {
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

        this.querySuccess = function(params) {
            this.result = params.result;
            var callback = params.callback;

            // success trigger
            this.trigger("edges:query-success");
            callback();
        };

        this.runPreflightQueries = function(callback) {
            if (!this.preflightQueries || Object.keys(this.preflightQueries).length == 0) {
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
            var pg = edges.newAsyncGroup({
                list: entries,
                action: function(params) {
                    var entry = params.entry;
                    var success = params.success_callback;
                    var error = params.error_callback;

                    es.doQuery({
                        search_url: that.search_url,
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
        };

        this.runSecondaryQueries = function(callback) {
            this.realisedSecondaryQueries = {};
            if (!this.secondaryQueries || Object.keys(this.secondaryQueries).length == 0) {
                callback();
                return;
            }

            // generate the query objects to be executed
            var entries = [];
            for (var key in this.secondaryQueries) {
                var entry = {};
                entry["query"] = this.secondaryQueries[key](this);
                entry["id"] = key;
                entry["search_url"] = this.search_url;
                if (this.secondaryUrls !== false && this.secondaryUrls.hasOwnProperty(key)) {
                    entry["search_url"] = this.secondaryUrls[key]
                }
                entries.push(entry);
                this.realisedSecondaryQueries[key] = entry.query;
            }

            var that = this;
            var pg = edges.newAsyncGroup({
                list: entries,
                action: function(params) {
                    var entry = params.entry;
                    var success = params.success_callback;
                    var error = params.error_callback;

                    es.doQuery({
                        search_url: entry.search_url,
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
        };

        ////////////////////////////////////////////////
        // various utility functions

        this.getComponent = function(params) {
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

        this.trigger = function(event_name) {
            if (event_name in this.callbacks) {
                this.callbacks[event_name](this);
            }
            this.context.trigger(event_name);
        };

        /////////////////////////////////////////////////////
        // URL management functions

        this.getUrlParams = function() {
            return edges.getUrlParams();
        };

        this.urlQueryArg = function(objectify_options) {
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
            var url = bits[0] + "?" + this._makeUrlQuery(args) + fragment;
            return url;
        };

        this.updateUrl = function() {
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
        };

        /////////////////////////////////////////////
        // static file management

        this.loadStaticsAsync = function(callback) {
            if (!this.staticFiles || this.staticFiles.length == 0) {
                this.trigger("edges:post-load-static");
                callback();
                return;
            }

            var that = this;
            var pg = edges.newAsyncGroup({
                list: this.staticFiles,
                action: function(params) {
                    var entry = params.entry;
                    var success = params.success_callback;
                    var error = params.error_callback;

                    var id = entry.id;
                    var url = entry.url;
                    var datatype = edges.getParam(entry.datatype, "text");

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
        };

        /////////////////////////////////////////////
        // final bits of construction
        this.startup();
    },

    //////////////////////////////////////////////////
    // Asynchronous resource loading feature

    newAsyncGroup : function(params) {
        if (!params) { params = {} }
        return new edges.AsyncGroup(params);
    },
    AsyncGroup : function(params) {
        this.list = params.list;
        this.successCallbackArgs = params.successCallbackArgs;
        this.errorCallbackArgs = params.errorCallbackArgs;

        var action = params.action;
        var success = params.success;
        var carryOn = params.carryOn;
        var error = params.error;

        this.functions = {
            action: action,
            success: success,
            carryOn: carryOn,
            error: error
        };

        this.checkList = [];

        this.finished = false;

        this.construct = function(params) {
            for (var i = 0; i < this.list.length; i++) {
                this.checkList.push(0);
            }
        };

        this.process = function(params) {
            if (this.list.length == 0) {
                this.functions.carryOn();
            }

            for (var i = 0; i < this.list.length; i++) {
                var context = {index: i};

                var success_callback = edges.objClosure(this, "_actionSuccess", this.successCallbackArgs, context);
                var error_callback = edges.objClosure(this, "_actionError", this.successCallbackArgs, context);
                var complete_callback = false;

                this.functions.action({entry: this.list[i],
                    success_callback: success_callback,
                    error_callback: error_callback,
                    complete_callback: complete_callback
                });
            }
        };

        this._actionSuccess = function(params) {
            var index = params.index;
            delete params.index;

            params["entry"] = this.list[index];
            this.functions.success(params);
            this.checkList[index] = 1;

            if (this._isComplete()) {
                this._finalise();
            }
        };

        this._actionError = function(params) {
            var index = params.index;
            delete params.index;

            params["entry"] = this.list[index];
            this.functions.error(params);
            this.checkList[index] = -1;

            if (this._isComplete()) {
                this._finalise();
            }
        };

        this._actionComplete = function(params) {

        };

        this._isComplete = function() {
            return $.inArray(0, this.checkList) === -1;
        };

        this._finalise = function() {
            if (this.finished) {
                return;
            }
            this.finished = true;
            this.functions.carryOn();
        };

        ////////////////////////////////////////
        this.construct();
    },

    /////////////////////////////////////////////
    // Query adapter base class and core ES implementation

    newQueryAdapter : function(params) {
        if (!params) { params = {} }
        return edges.instantiate(edges.QueryAdapter, params);
    },
    QueryAdapter : function(params) {
        this.doQuery = function(params) {};
    },

    newESQueryAdapter : function(params) {
        if (!params) { params = {} }
        return edges.instantiate(edges.ESQueryAdapter, params);
    },
    ESQueryAdapter : function(params) {
        this.doQuery = function(params) {
            var edge = params.edge;
            var query = params.query;
            var success = params.success;
            var error = params.error;

            if (!query) {
                query = edge.currentQuery;
            }

            es.doQuery({
                search_url: edge.search_url,
                queryobj: query.objectify(),
                datatype: edge.datatype,
                success: success,
                error: error
            });
        };
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
        this.draw = function(component) {};
        this.sleep = function() {};
        this.wake = function() {}
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

        this.sleep = function() {
            if (this.renderer) {
                this.renderer.sleep();
            }
        };

        this.wake = function() {
            if (this.renderer) {
                this.renderer.wake();
            }
        };

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

    newNestedEdge : function(params) {
        if (!params) { params = {}}
        params.category = params.category || "edge";
        params.renderer = false;
        params.defaultRenderer = false;
        return edges.instantiate(edges.NestedEdge, params, edges.newComponent)
    },
    NestedEdge : function(params) {
        this.constructOnInit = edges.getParam(params.constructOnInit, false);

        this.constructArgs = edges.getParam(params.constructArgs, {});

        this.inner = false;

        this.init = function(edge) {
            this.edge = edge;
            if (this.constructOnInit) {
                this.construct_and_bind();
            }
        };

        this.setConstructArg = function(key, value) {
            this.constructArgs[key] = value;
        };

        this.getConstructArg = function(key, def) {
            if (this.constructArgs.hasOwnProperty(key)) {
                return this.constructArgs[key];
            }
            return def;
        };

        this.construct_and_bind = function() {
            this.construct();
            if (this.inner) {
                this.inner.outer = this;
            }
        };

        this.construct = function() {};

        this.destroy = function() {
            if (this.inner) {
                this.inner.context.empty();
                this.inner.context.hide();
            }
            this.inner = false;
        };

        this.sleep = function() {
            this.inner.sleep();
            this.inner.context.hide();
        };

        this.wake = function() {
            if (this.inner) {
                this.inner.context.show();
                this.inner.wake();
            } else {
                this.construct_and_bind();
            }
        }
    },

    ///////////////////////////////////////////////////////////
    // Object construction tools

    // instantiate an object with the parameters and the (optional)
    // prototype
    instantiate : function(clazz, params, protoConstructor) {
        if (!params) { params = {} }
        if (protoConstructor) {
            clazz.prototype = protoConstructor(params);
        }
        var inst = new clazz(params);
        if (protoConstructor) {
            inst.__proto_constructor__ = protoConstructor;
        }
        return inst;
    },

    // call a method on the parent class
    up : function(inst, fn, args) {
        var parent = new inst.__proto_constructor__();
        parent[fn].apply(inst, args);
    },

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
    // objClosure(this, "function")(arg1, arg2, arg3)
    // results in a call to
    // this.function(arg1, arg2, arg3, ...)
    //
    // and
    // objClosure(this, "function", ["one", "two"])(arg1, arg2, arg3)
    // results in a call to
    // this.function({one: arg1, two: arg2})
    //
    objClosure : function(obj, fn, args, context_params) {
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
    },

    // returns a function that is suitable for triggering by an event, and which will
    // call the specified function (fn) on the specified object (obj) with the element
    // which fired the event as the argument
    //
    // if "conditional" is specified, this is a function (which can take the event as an argument)
    // which is called to determine whether the event will propagate to the object function.
    //
    // so, for example
    //
    // eventClosure(this, "handler")(event)
    // results in a call to
    // this.handler(element)
    //
    // and
    //
    // eventClosure(this, "handler", function(event) { return event.type === "click" })(event)
    // results in a call (only in the case that the event is a click), to
    // this.handler(element)
    //
    eventClosure : function(obj, fn, conditional, preventDefault) {
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
            obj[fn](this, event);
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

    on : function(selector, event, caller, targetFunction, delay, conditional, preventDefault) {
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
        var clos = edges.eventClosure(caller, targetFunction, conditional, preventDefault);

        // now bind the closure directly or with delay
        // if the caller has an inner component (i.e. it is a Renderer) use the components jQuery selector
        // otherwise, if it has an inner, use the selector on that.
        if (delay) {
            if (caller.component) {
                caller.component.jq(selector).bindWithDelay(event, clos, delay);
            } else if (caller.edge) {
                caller.edge.jq(selector).bindWithDelay(event, clos, delay);
            } else {
                $(selector).bindWithDelay(event, clos, delay);
            }
        } else {
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
        }
    },

    off : function(selector, event, caller) {
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
    },

    //////////////////////////////////////////////////////////////////
    // Shared utilities

    getUrlParams : function() {
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
                if (val[0] == "[" || val[0] == "{") {
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
    },

    escapeHtml : function(unsafe, def) {
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
    },

    /**
     * Determine if the object has a property at the given path in the object
     *
     * @param obj
     * @param path
     * @returns {boolean}
     */
    hasProp : function(obj, path) {
        var bits = path.split(".");
        var ctx = obj;
        for (var i = 0; i < bits.length; i++) {
            if (!ctx.hasOwnProperty(bits[i])) {
                return false;
            }
            ctx = ctx[bits[i]];
        }
        return true;
    },

    /**
     * Get the value of an element at the given path in an object
     *
     * @param path
     * @param rec
     * @param def
     * @returns {*}
     */
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
    },

    /**
     * The same as objVal but will handle arrays at every level and condense the
     * results into a single array result.  Always returns an array, even if it is
     * a single result, OR returns a default, which is returned exactly as specified
     *
     * @param path
     * @param rec
     * @param def
     * @returns {*}
     */
    objVals : function(path, rec, def) {
        if (def === undefined) { def = false; }

        var bits = path.split(".");
        var contexts = [rec];

        for (var i = 0; i < bits.length; i++) {
            var pathElement = bits[i];
            var nextContexts = [];
            for (var j = 0; j < contexts.length; j++) {
                var context = contexts[j];
                if (pathElement in context) {
                    var nextLevel = context[pathElement];
                    if (i === bits.length - 1) {
                        // if this is the last path element, then
                        // we make the assumption that this is a well defined leaf node, for performance purposes
                        nextContexts.push(nextLevel);
                    } else {
                        // there are more path elements to retrieve, so we have to handle the various types
                        if ($.isArray(nextLevel)) {
                            nextContexts = nextContexts.concat(nextLevel);
                        } else if ($.isPlainObject(nextLevel)) {
                            nextContexts.push(nextLevel);
                        }
                        // if the value is a leaf node already then we throw it away
                    }
                }
            }
            contexts = nextContexts;
        }

        if (contexts.length === 0) {
            return def;
        }
        return contexts;
    },

    getParam : function(value, def) {
        return value !== undefined ? value : def;
    },

    safeId : function(unsafe) {
        return unsafe.replace(/&/g, "_")
                .replace(/</g, "_")
                .replace(/>/g, "_")
                .replace(/"/g, "_")
                .replace(/'/g, "_")
                .replace(/\./gi,'_')
                .replace(/\:/gi,'_')
                .replace(/\s/gi,"_");
    },

    numFormat : function(params) {
        var reflectNonNumbers = edges.getParam(params.reflectNonNumbers, false);
        var prefix = edges.getParam(params.prefix, "");
        var zeroPadding = edges.getParam(params.zeroPadding, false);
        var decimalPlaces = edges.getParam(params.decimalPlaces, false);
        var thousandsSeparator = edges.getParam(params.thousandsSeparator, false);
        var decimalSeparator = edges.getParam(params.decimalSeparator, ".");
        var suffix = edges.getParam(params.suffix, "");

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

            if (bits.length == 1) {
                return prefix + bits[0] + suffix;
            } else {
                return prefix + bits[0] + decimalSeparator + bits[1] + suffix;
            }
        }
    },

    numParse : function(params) {
        var commaRx = new RegExp(",", "g");

        return function(num) {
            num = num.trim();
            num = num.replace(commaRx, "");
            if (num === "") {
                return 0.0;
            }
            return parseFloat(num);
        }
    },

    isEmptyObject: function(obj) {
        for(var key in obj) {
            if(obj.hasOwnProperty(key))
                return false;
        }
        return true;
    }
};
