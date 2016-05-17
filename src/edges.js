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
        // values for things like page size, initial search terms, etc.  Any request to
        // reset the interface will return to this query
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
        this.renderPacks = params.renderPacks || [edges.bs3, edges.nvd3, edges.highcharts, edges.google, edges.d3];

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
            // tell the world we're about to reset
            this.context.trigger("edges:pre-reset");

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
            this.context.trigger("edges:post-reset");

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

        this.cloneOpeningQuery = function() {
            if (this.openingQuery) {
                return $.extend(true, {}, this.openingQuery);
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
            var url = bits[0] + "?" + this._makeUrlQuery(args) + fragment;
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

    eventClosure : function(obj, fn, conditional) {
        return function(event) {
            if (conditional) {
                if (!conditional(event)) {
                    return;
                }
            }

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

    on : function(selector, event, renderer, targetFunction, delay, conditional) {
        event = event + "." + renderer.component.id;
        var clos = edges.eventClosure(renderer, targetFunction, conditional);
        if (delay) {
            renderer.component.jq(selector).bindWithDelay(event, clos, delay);
        } else {
            renderer.component.jq(selector).on(event, clos)
        }
    },

    //////////////////////////////////////////////////////////////////
    // Shared utilities

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

    getParam : function(value, def) {
        return value !== undefined ? value : def;
    }
};
