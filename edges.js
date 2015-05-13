var edges = {

    // Initialise function which acts as a constructor for the main Edges class, and also
    // triggers the startup routine.  It then returns the object to the caller, to use as
    // they will
    init : function(params) {
        var Edges = function(params) {
            this.query = es.newQuery();
            this.state = edges.newState();
            this.components = params.components || [];
            this.search_url = params.search_url;
            this.selector = params.selector;
            this.renderPacks = params.renderPacks || [edges.bs3, edges.nvd3];
            this.template = params.template;
            this.debug = params.debug || false;
        };
        Edges.prototype = edges.EdgesPrototype;
        var e = new Edges(params);
        e.startup();
        return e;
    },

    EdgesPrototype : {
        startup : function() {
            // obtain the jquery context for all our operations
            this.context = $(this.selector);

            // render the template if necessary
            if (this.template) {
                this.template(this);
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

            // now issue a query
            this.doQuery();
        },

        category : function(cat) {
            var comps = [];
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                if (component.category === cat) {
                    comps.push(component);
                }
            }
            return comps;
        },

        doQuery: function () {
            // request the components to contribute to the query
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.contrib(this.state.query);
            }

            // issue the query to elasticsearch
            es.doQuery({
                search_url: this.search_url,
                queryobj: this.state.query.objectify(),
                datatype: "jsonp",
                success: edges.objClosure(this, "querySuccess", ["raw"]),
                complete: edges.objClosure(this, "queryComplete")
            })
        },

        querySuccess : function(params) {
            this.state.raw = params.raw;
        },

        queryComplete : function() {
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.draw(this);
            }
        },

        getRenderPackFunction : function(fname) {
            for (var i = 0; i < this.renderPacks.length; i++) {
                var rp = this.renderPacks[i];
                if (rp.hasOwnProperty(fname)) {
                    return rp[fname];
                }
            }
            return function() {}
        },

        hasHits : function() {
            return this.state.raw && this.state.raw.hits && this.state.raw.hits.hits.length > 0;
        }
    },

    ComponentPrototype : {
        init : function() {},
        draw : function() {},
        contrib: function() {}
    },

    ///////////////////////////////////////////////////////////////////
    // Functions around page state

    newState :  function() {
        // this is where we construct the page state object
        var State = function() {
            this.query = es.newQuery();
            this.raw = undefined;
        };
        State.prototype = edges.StatePrototype;
        return new State();
    },
    StatePrototype : {
        // this is where state-specific functions can go
    },

    //////////////////////////////////////////////////////////////////

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

    //////////////////////////////////////////////////////////////////
    // Some standard components (might live somewhere else later)

    newTermSelector : function(params) {
        var TermSelector = function(args) {
            this.id = args.id;
            this.field = args.field;
            this.display = args.display;
            this.renderer = args.renderer;
            this.category = args.category || "selector";
            this.filters = args.filters || [];
        };
        TermSelector.prototype = edges.TermSelectorPrototype;
        return new TermSelector(params)
    },
    TermSelectorPrototype : {
        init : function(edge) {
            // record a reference to the parent object
            this.edge = edge;

            // set the renderer from default if necessary
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackFunction("renderTermSelector");
            }
        },

        draw : function(edge) {
            this.renderer(this);
        },

        contrib : function(query) {
            query.addAggregation({
                aggregation: es.newAggregation({
                    name : this.id,
                    type : "terms",
                    body : {field : this.field}
                })
            });

            if (this.filters.length > 0) {
                for (var i = 0; i < this.filters.length; i++) {
                    query.addMust(es.newTermFilter({
                        field: this.field,
                        value: this.filters[i]
                    }))
                }
            }
        },

        selectTerm : function(element) {
            var term = $(element).attr("data-key");
            this.filters.push(term);
            this.edge.doQuery();
        }
    },

    newResultsDisplay : function(params) {
        var ResultsDisplay = function(args) {
            this.id = args.id;
            this.category = args.category || "results";
            this.renderer = args.renderer;
        };
        ResultsDisplay.prototype = edges.ResultsDisplayPrototype;
        return new ResultsDisplay(params);
    },
    ResultsDisplayPrototype : {
        init : function(edge) {
            // record a reference to the parent object
            this.edge = edge;

            // set the renderer from default if necessary
            // set the renderer from default if necessary
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackFunction("renderResultsDisplay");
            }
        },

        draw : function(edge) {
            this.renderer(this);
        },

        contrib : function(query) {}
    },

    newChart : function(params) {
        var Chart = function(args) {
            this.id = args.id;
            this.aggregations = args.aggregations || [];
            this.seriesKeys = args.seriesKeys || {};
            this.dataSeries = args.dataSeries || false;
            this.dataFunction = args.dataFunction || false;
            this.renderer = args.renderer;
        };
        Chart.prototype = edges.ChartPrototype;
        return new Chart(params);
    },
    ChartPrototype : {
        init : function(edge) {
            this.edge = edge;
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackFunction("multiBar");
            }
            if (!this.dataFunction) {
                this.dataFunction = this._dataFunction
            }
        },
        draw : function(edge) {
            this.dataSeries = this.dataFunction(this);
            this.renderer(this);
        },
        contrib: function(query) {
            for (var i = 0; i < this.aggregations.length; i++) {
                query.addAggregation({aggregation : this.aggregations[i]});
            }
        },
        _dataFunction : function(ch) {
            // for each aggregation, get the results and add them to the data series
            var data_series = [];
            if (!ch.edge.state.raw) {
                return data_series;
            }
            for (var i = 0; i < ch.aggregations.length; i++) {
                // get the facet, the field name and the size
                var agg = ch.aggregations[i];
                var buckets = ch.edge.state.raw.aggregations[agg.name].buckets;

                var series = {};
                series["key"] = this.seriesKeys[agg.name];
                series["values"] = [];

                for (var j = 0; j < buckets.length; j++) {
                    var doccount = buckets[j].doc_count;
                    var key = buckets[j].key;
                    series.values.push({label : key, value: doccount});
                }

                data_series.push(series);
            }
            return data_series;
        }
    },

    //////////////////////////////////////////////////////////////////

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
