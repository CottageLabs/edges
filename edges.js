var edges = {

    //////////////////////////////////////////////////////
    // main function to run to start a new Edge

    newEdge : function(params) {
        if (!params) { params = {} }
        return new edges.Edge(params);
    },
    Edge : function(params) {
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


        this.components = params.components || [];

        this.selector = params.selector;
        this.renderPacks = params.renderPacks || [edges.bs3, edges.nvd3];
        this.template = params.template;
        this.debug = params.debug || false;

        /////////////////////////////////////////////
        // operation status

        this.state = edges.newState();

        this.searching = false;

        // at the bottom of this constructor, we'll call this function
        this.startup = function() {
            // obtain the jquery context for all our operations
            this.context = $(this.selector);

            // trigger the edges:init event
            this.context.trigger("edges:pre-init");

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

            // now issue a query
            this.doQuery();
        };

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

        this.doQuery = function() {
            // pre query event
            this.context.trigger("edges:pre-query");

            // start a new query in the state
            this.state.query = $.extend(true, {}, this.baseQuery);

            // request the components to contribute to the query
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.contrib(this.state.query);
            }

            // issue the query to elasticsearch
            es.doQuery({
                search_url: this.search_url,
                queryobj: this.state.query.objectify(),
                datatype: this.datatype,
                success: edges.objClosure(this, "querySuccess", ["result"]),
                complete: edges.objClosure(this, "queryComplete")
            })
        };

        this.querySuccess = function(params) {
            this.state.result = params.result;
        };

        this.queryComplete = function() {
            // post-query trigger
            this.context.trigger("edges:post-query");

            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.populate()
            }

            // pre-render trigger
            this.context.trigger("edges:pre-render");

            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.draw();
            }

            // post render trigger
            this.context.trigger("edges.post-render");
        };

        this.getRenderPackFunction = function(fname) {
            for (var i = 0; i < this.renderPacks.length; i++) {
                var rp = this.renderPacks[i];
                if (rp.hasOwnProperty(fname)) {
                    return rp[fname];
                }
            }
            return function() {}
        };

        this.getRenderPackObject = function(oname, params) {
            for (var i = 0; i < this.renderPacks.length; i++) {
                var rp = this.renderPacks[i];
                if (rp.hasOwnProperty(oname)) {
                    return rp[oname](params);
                }
            }

        };

        this.hasHits = function() {
            return this.state.result && this.state.result.data.hits && this.state.result.data.hits.hits.length > 0;
        };

        // get the jquery object for the desired element, in the correct context
        this.jq = function(selector) {
            return $(selector, this.context);
        };

        /////////////////////////////////////////////
        // final bits of construction
        this.startup();
    },

    // running state

    newState : function(params) {
        if (!params) { params = {} }
        return new edges.State(params);
    },
    State : function(params) {
        this.query = es.newQuery();
        this.result = undefined;
    },

    /////////////////////////////////////////////
    // Base classes for the various kinds of components

    newRenderer : function(params) {
        if (!params) { params = {} }
        return new edges.Renderer(params);
    },
    Renderer : function(params) {
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

        this.init = function(edge) {
            // record a reference to the parent object
            this.edge = edge;

            // set the renderer from default if necessary
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackFunction("renderComponent");
            }
        };

        this.draw = function() {
            if (this.renderer) {
                if ("draw" in this.renderer) {
                    this.renderer.draw(this);
                } else {
                    this.renderer(this);
                }
            }
        };

        this.contrib = function(query) {};
        this.populate = function() {};
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

        // whether the facet should be open or closed (initially)
        this.open = params.open || false;

        // whether the facet should be displayed at all (e.g. you may just want the data for a callback)
        this.hidden = params.hidden || false;

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

        // whether to hide or just disable the facet if below deactivate threshold
        this.hideInactive = params.hideInactive || false;

        // should the facet sort/size controls be shown?
        this.controls = params.controls || true;

        // should the terms facet ignore empty strings in display
        this.ignoreEmptyString = params.ignoreEmptyString || true;

        // provide a map of values for terms to displayable terms, or a function
        // which can be used to translate terms to displyable values
        this.valueMap = params.valueMap || false;
        this.valueFunction = params.valueFunction || false;

        // due to a limitation in elasticsearch's clustered node facet counts, we need to inflate
        // the number of facet results we need to ensure that the results we actually want are
        // accurate.  This option tells us by how much.
        this.inflation = params.inflation || 100;

        //////////////////////////////////////////
        // properties used to store internal state

        // filters that have been selected via this component
        this.filters = params.filters || [];

        // values that the renderer should render
        this.values = [];

        this.init = function(edge) {
            // record a reference to the parent object
            this.edge = edge;

            // set the renderer from default if necessary
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackObject("newBasicTermSelectorRenderer");
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

            if (this.filters.length > 0) {
                for (var i = 0; i < this.filters.length; i++) {
                    query.addMust(es.newTermFilter({
                        field: this.field,
                        value: this.filters[i]
                    }))
                }
            }
        };

        this.populate = function() {
            // set the values
        };

        this.selectTerm = function(term) {
            this.filters.push(term);
            this.edge.doQuery();
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

        this.populate = function() {
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

        this.populate = function() {
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

        this.populate = function() {
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
        this.fields = params.fields || [];
        this.earliest = params.earliest || {};
        this.latest = params.latest || {};
        this.category = params.category || "selector";
        this.defaultEarliest = params.defaultEarliest || new Date(0);
        this.defaultLatest = params.defaultLatest || new Date();

        this.currentField = false;
        this.fromDate = false;
        this.toDate = false;

        this.touched = false;
        this.dateOptions = {};

        this.init = function(edge) {
            // record a reference to the parent object
            this.edge = edge;

            // set the renderer from default if necessary
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackObject("newMultiDateRangeRenderer");
            }

            // set the initial field
            this.currentField = this.fields[0].field;

            // load the dates once at the init - this means they can't
            // be responsive to the filtering unless they are loaded
            // again at a later date
            this.loadDates();
        };

        this.contrib = function(query) {
            // only contrib if there's anything to actuall do
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
            query.addMust(es.newRangeFilter(range));
        };

        this.changeField = function(newField) {
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
        this.init = function(edge) {
            // record a reference to the parent object
            this.edge = edge;

            // set the renderer from default if necessary
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackFunction("renderAutocompleteTermSelector");
            }
        };
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

        ///////////////////////////////////////////////
        // properties which are set by the widget but
        // can also be passed in

        // field on which to focus the freetext search (initially)
        this.searchField = params.searchField || false;

        // freetext search string
        this.searchString = params.searchString || false;

        // the short url for the current search, if it has been generated
        this.shortUrl = false;

        this.init = function(edge) {
            // record a reference to the parent object
            this.edge = edge;

            // set the renderer from default if necessary
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackObject("newSearchControllerRenderer");
            }
        };
    },

    newSelectedFilters : function(params) {
        if (!params) { params = {} }
        edges.SelectedFilters.prototype = edges.newComponent(params);
        return new edges.SelectedFilters(params);
    },
    SelectedFilters : function(params) {

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

    },

    ////////////////////////////////////////////////
    // Results list implementation

    newResultsDisplay : function(params) {
        if (!params) { params = {} }
        edges.ResultsDisplay.prototype = edges.newComponent(params);
        return new edges.ResultsDisplay(params);
    },
    ResultsDisplay : function(params) {
        this.category = params.category || "results";

        this.init = function(edge) {
            // record a reference to the parent object
            this.edge = edge;

            // set the renderer from default if necessary
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackFunction("renderResultsDisplay");
            }
        };
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

        this.init = function(edge) {
            this.edge = edge;

            // get the default chart renderer
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackObject("newMultibarRenderer");
            }

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

        this.draw = function() {
            this.dataSeries = this.dataFunction(this);
            if ("draw" in this.renderer) {
                this.renderer.draw(this);
            } else {
                this.renderer(this);
            }
        };

        this.contrib = function(query) {
            for (var i = 0; i < this.aggregations.length; i++) {
                query.addAggregation(this.aggregations[i]);
            }
        };
    },
    ChartDataFunctions : {
        terms : function(params) {

            var useAggregations = params.useAggregations || [];
            var seriesKeys = params.seriesKeys || {};

            return function (ch) {
                // for each aggregation, get the results and add them to the data series
                var data_series = [];
                if (!ch.edge.state.result) {
                    return data_series;
                }
                for (var i = 0; i < useAggregations.length; i++) {
                    var agg = useAggregations[i];
                    var buckets = ch.edge.state.result.data.aggregations[agg].buckets;

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
                if (!ch.edge.state.result) {
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

                        var buckets = ch.edge.state.result.data.aggregations[parts[0]].buckets;
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
        this.init = function(edge) {
            if (!this.renderer) {
                this.renderer = edge.getRenderPackObject("newPieChartRenderer");
            }
            this.__proto__.init(edge);
        };
    },

    newHorizontalMultibar : function(params) {
        if (!params) { params = {} }
        edges.HorizontalMultibar.prototype = edges.newChart(params);
        return new edges.HorizontalMultibar(params);
    },
    HorizontalMultibar : function(params) {
        this.init = function(edge) {
            if (!this.renderer) {
                this.renderer = edge.getRenderPackObject("newHorizontalMultibarRenderer");
            }
            this.__proto__.init(edge);
        };
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
