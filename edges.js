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
        // all query defaults like page size and sort options
        this.baseQuery = params.baseQuery || es.newQuery();

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
        this.renderPacks = params.renderPacks || [edges.bs3, edges.nvd3, edges.highcharts];

        /////////////////////////////////////////////
        // operational properties

        // the query most recently read from the url
        this.urlQuery = false;

        // fragment identifier to be appended to any url generated
        this.urlFragmentIdentifier = false;

        // the short url for this page
        this.shortUrl = false;

        // the last primary ES query object that was executed
        this.currentQuery = false;

        // the last result object from the ES layer
        this.results = false;

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
                var urlParams = this.getUrlVars();
                if (this.urlQuerySource in urlParams) {
                    this.urlQuery = es.newQuery({raw : urlParams[this.urlQuerySource]});
                }
                if (urlParams.url_fragment_identifier) {
                    this.urlFragmentIdentifier = urlParams.url_fragment_identifier;
                }
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

            // trigger the edges:started event
            this.context.trigger("edges:post-init");

            // start a new query from the base query
            this.currentQuery = $.extend(true, {}, this.baseQuery);

            // if a url query is specified, then extend the base query with it, and then
            // unset the url query, so it isn't used again
            if (this.urlQuery) {
                this.currentQuery.extend(this.urlQuery);
                this.urlQuery = false;      // FIXME: may no longer need to do this
            }

            // request the components to contribute to the query
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.contrib(this.currentQuery);
            }

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

        ////////////////////////////////////////////////////
        // functions to handle the query lifecycle

        this.cloneQuery = function() {
            return $.extend(true, {}, this.currentQuery);
        };

        this.pushQuery = function(query) {
            // accept the new query as-is
            this.currentQuery = query;
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

            // at this point we need to ensure that the baseQuery is always represented
            this.currentQuery.extend(this.baseQuery);

            // if we are managing the url space, use pushState to set it
            if (this.manageUrl) {
                if ('pushState' in window.history) {
                    var q = JSON.stringify(this.currentQuery.objectify());
                    var querypart = "?" + this.urlQuerySource + "=" + encodeURIComponent(q);
                    window.history.pushState("", "", querypart);
                }
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

        this.getUrlVars = function() {
            var params = {};
            var url = window.location.href;
            var anchor = false;

            // break the anchor off the url
            if (url.indexOf("#") > -1) {
                anchor = url.slice(url.indexOf('#'));
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
            if (anchor) {
                params['url_fragment_identifier'] = anchor;
            }

            return params;
        };

        this.sharableUrl = function() {
            var source = elasticSearchQuery({"options" : options, "include_facets" : options.include_facets_in_url, "include_fields" : options.include_fields_in_url})
            var querypart = "?source=" + encodeURIComponent(serialiseQueryObject(source))
            include_fragment = include_fragment === undefined ? true : include_fragment
            if (include_fragment) {
                var fragment_identifier = options.url_fragment_identifier ? options.url_fragment_identifier : "";
                querypart += fragment_identifier
            }
            if (query_part_only) {
                return querypart
            }
            return 'http://' + window.location.host + window.location.pathname + querypart
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

    newBasicTermSelector : function(params) {
        if (!params) { params = {} }
        edges.BasicTermSelector.prototype = edges.newSelector(params);
        return new edges.BasicTermSelector(params);
    },
    BasicTermSelector : function(params) {
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
        this.defaultRenderer = "newBasicTermSelectorRenderer";

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
            // if there is a result object, pull and prepare the values
            this.values = [];
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
            this.filters = [];
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

    newBasicRangeSelector : function(params) {
        if (!params) { params = {} }
        edges.BasicRangeSelector.prototype = edges.newSelector(params);
        return new edges.BasicRangeSelector(params);
    },
    BasicRangeSelector : function(params) {
        // list of ranges (in order) which define the filters
        // {"from" : <num>, "to" : <num>, "display" : "<display name>"}
        this.ranges = params.ranges || [];

        // if there are no results for a given range, should it be hidden
        this.hideEmptyRange = params.hideEmptyRange || true;

        //////////////////////////////////////////////
        // values to be rendered

        this.values = [];

        this.synchronise = function() {
            // set the values
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
            // set the values
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
            // set the values
        };
    },

    ////////////////////////////////////////////////////
    // Specialised data entry components

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
            this.__proto__.init.call(this, edge);

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

    newSearchController : function(params) {
        if (!params) { params = {} }
        edges.SearchController.prototype = edges.newComponent(params);
        return new edges.SearchController(params);
    },
    SearchController : function(params) {
        // if set, should be either * or ~
        // if *, * will be prepended and appended to each string in the freetext search term
        // if ~, ~ then ~ will be appended to each string in the freetext search term.
        // If * or ~ or : are already in the freetext search term, no action will be taken.
        this.fuzzify = params.fuzzify || false;

        // list of options by which the search results can be sorted
        // of the form of a list of: { '<field to sort by>' : '<display name>'},
        this.sortOptions = params.sortOptions || false;

        // list of options for fields to which free text search can be constrained
        // of the form of a list of: { '<field to search on>' : '<display name>' },
        this.fieldOptions = params.fieldOptions || false;

        // enable the share/save link feature
        this.shareLink = params.shareLink || false;

        // provide a function which will do url shortening for the share/save link
        this.urlShortener = params.urlShortener || false;

        // on free-text search, default operator for the elasticsearch query system to use
        this.defaultOperator = params.defaultOperator || "OR";

        this.defaultRenderer = params.defaultRenderer || "newSearchControllerRenderer";

        ///////////////////////////////////////////////
        // properties which are set by the widget but
        // can also be passed in

        // field on which to focus the freetext search (initially)
        this.searchField = params.searchField || false;

        // freetext search string
        this.searchString = params.searchString || false;

        // the short url for the current search, if it has been generated
        this.shortUrl = false;
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

        // value maps on a per-field basis, to apply to values before display.
        // if these come from a facet/selector, they should probably be the same maps
        this.valueMaps = params.valueMaps || {};

        // value functions on a per-field basis, to apply to values before display.
        // if these come from a facet/selector, they should probably be the same functions
        this.valueFunctions = params.valueFunctions || {};

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
            this.mustFilters = {};

            var musts = this.edge.currentQuery.listMust();
            for (var i = 0; i < musts.length; i++) {
                var f = musts[i];
                if (f.type_name === "term") {
                    this._synchronise_term(f);
                } else if (f.type_name === "terms") {
                    this._synchronise_terms(f);
                } else if (f.type_name === "range") {

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
    },

    newPager : function(params) {
        if (!params) { params = {} }
        edges.Pager.prototype = edges.newComponent(params);
        return new edges.Pager(params);
    },
    Pager : function(params) {

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
            this.__proto__.init.call(this, edge);
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

        this.results = [];

        this.synchronise = function() {
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
        this.category = params.category || "chart";
        this.display = params.display || "";

        // actual data series that the renderer will render
        this.dataSeries = params.dataSeries || false;

        // function which will generate the data series, which will be
        // written to this.dataSeries if that is not provided
        this.dataFunction = params.dataFunction || false;

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
            // this.__proto__.init.call(this, edge);

            // copy over the names of the aggregations that we're going to read from
            for (var i = 0; i < this.aggregations.length; i++) {
                var agg = this.aggregations[i];
                if ($.inArray(agg.name, this.dfArgs.useAggregations) === -1) {
                    this.dfArgs.useAggregations.push(agg.name);
                }
            }

            // bind the default data function generator
            if (!this.dataFunction) {
                this.dataFunction = edges.ChartDataFunctions.terms(this.dfArgs);
            }
        };

        this.contrib = function(query) {
            for (var i = 0; i < this.aggregations.length; i++) {
                query.addAggregation(this.aggregations[i]);
            }
        };

        this.synchronise = function() {
            this.dataSeries = this.dataFunction(this);
        };
    },
    ChartDataFunctions : {
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

    on : function(selector, event, renderer, targetFunction) {
        renderer.component.jq(selector).on(event + "." + renderer.component.id, edges.eventClosure(renderer, targetFunction))
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
    }
};
