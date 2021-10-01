import {getParam, getUrlParams, objClosure, AsyncGroup} from './utils';
import {ESQueryAdapter} from "./adapters/es_adapter";

import {es} from '../dependencies/es'
import {$} from '../dependencies/jquery';

class Edge {
    constructor(params) {
        /////////////////////////////////////////////
        // parameters that can be set via params arg

        // the jquery selector for the element where the edge will be deployed
        this.selector = getParam(params, "selector", "body");

        // the base search url which will respond to elasticsearch queries.  Generally ends with _search
        this.searchUrl = getParam(params, "searchUrl", false);

        // datatype for ajax requests to use - overall recommend using jsonp
        this.datatype = getParam(params, "datatype", "jsonp");

        // dictionary of queries to be run before the primary query is executed
        // {"<preflight id>" : es.newQuery(....)}
        // results will appear with the same ids in this.preflightResults
        // preflight queries are /not/ subject to the base query
        this.preflightQueries = getParam(params, "preflightQueries", false);

        // query that forms the basis of all queries that are assembled and run
        // Note that baseQuery is inviolable - it's requirements will always be enforced
        this.baseQuery = getParam(params, "baseQuery", false);

        // query to use to initialise the search.  Use this to set your opening
        // values for things like page size, initial search terms, etc.  Any request to
        // reset the interface will return to this query
        this.openingQuery = getParam(params, "openingQuery", () => typeof es !== 'undefined' ? es.newQuery() : false);

        // dictionary of functions that will generate secondary queries which also need to be
        // run at the point that cycle() is called.  These functions and their resulting
        // queries will be run /after/ the primary query (so can take advantage of the
        // results).  Their results will be stored in this.secondaryResults.
        // secondary queries are not subject the base query, although the functions
        // may of course apply the base query too if they wish
        // {"<secondary id>" : function() }
        this.secondaryQueries = getParam(params, "secondaryQueries", false);

        // dictionary mapping keys to urls that will be used for search.  These should be
        // the same keys as used in secondaryQueries, if those secondary queries should be
        // issued against different urls than the primary search_url.
        this.secondaryUrls = getParam(params, "secondaryUrls", false);

        // should the init process do a search
        this.initialSearch = getParam(params, "initialSearch", true);

        // list of static files (e.g. data files) to be loaded at startup, and made available
        // on the object for use by components
        // {"id" : "<internal id to give the file>", "url" : "<file url>", "processor" : edges.csv.newObjectByRow, "datatype" : "text", "opening" : <function to be run after processing for initial state>}
        this.staticFiles = getParam(params, "staticFiles", []);

        // should the search url be synchronised with the browser's url bar after search
        // and should queries be retrieved from the url on init
        this.manageUrl = getParam(params, "manageUrl", false);

        // query parameter in which the query for this edge instance will be stored
        this.urlQuerySource = getParam(params, "urlQuerySource", "source");

        // options to be passed to es.Query.objectify when prepping the query to be placed in the URL
        this.urlQueryOptions = getParam(params, "urlQueryOptions", false);

        // template object that will be used to draw the frame for the edge.  May be left
        // blank, in which case the edge will assume that the elements are already rendered
        // on the page by the caller
        this.template = getParam(params, "template", false);

        // list of all the components that are involved in this edge
        this.components = getParam(params, "components", []);

        // the query adapter
        this.queryAdapter = getParam(params, "queryAdapter", () => new ESQueryAdapter());

        // list of callbacks to be run synchronously with the edge instance as the argument
        // (these bind at the same points as all the events are triggered, and are keyed the same way)
        this.callbacks = getParam(params, "callbacks", {});

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
            var urlParams = getUrlParams();
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
        // var onward = edges.objClosure(this, "startupPart2");
        let onward = () => this.startupPart2()
        this.loadStaticsAsync(onward);
    }

    startupPart2() {
        // FIXME: at this point we should check whether the statics all loaded correctly
        // var onward = edges.objClosure(this, "startupPart3");
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
            // var onward = edges.objClosure(this, "cyclePart2");
            let onward = () => this.cyclePart2();
            this.doPrimaryQuery(onward);
        } else {
            this.cyclePart2();
        }
    }

    cyclePart2() {
        // var onward = edges.objClosure(this, "cyclePart3");
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

        var that = this;
        var pg = new AsyncGroup({
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
        var pg = new AsyncGroup({
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
            success: objClosure(this, "querySuccess", ["result"], context),
            error: objClosure(this, "queryFail", ["response"], context)
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
            entry["search_url"] = this.searchUrl;
            if (this.secondaryUrls !== false && this.secondaryUrls.hasOwnProperty(key)) {
                entry["search_url"] = this.secondaryUrls[key]
            }
            entries.push(entry);
            this.realisedSecondaryQueries[key] = entry.query;
        }

        var that = this;
        var pg = new AsyncGroup({
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
            return $.extend(true, {}, this.currentQuery);
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
            return $.extend(true, {}, this.baseQuery);
        }
        return es.newQuery();
    }

    cloneOpeningQuery() {
        if (this.openingQuery) {
            return $.extend(true, {}, this.openingQuery);
        }
        return es.newQuery();
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

class Template {
    draw(edge) {}
}

class Component {
    constructor(params) {
        this.id = getParam(params, "id");
        this.renderer = getParam(params, "renderer");
        this.category = getParam(params, "category", false);
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

class Renderer {
    init(component) {
        this.component = component
    }

    draw() {};
    sleep() {};
    wake() {}
}

export {Edge, Template, Component, Renderer}