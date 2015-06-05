var edges = {

    init : function(params) {
        var e = edges.newEdge(params);
        e.startup();
        return e;
    },

    newEdge : function(params) {
        return new edges.Edge(params);
    },
    Edge : function(params) {
        this.baseQuery = es.newQuery();
        this.state = edges.newState();
        this.components = params.components || [];
        this.search_url = params.search_url;
        this.selector = params.selector;
        this.renderPacks = params.renderPacks || [edges.bs3, edges.nvd3];
        this.template = params.template;
        this.debug = params.debug || false;

        this.startup = function() {
            // obtain the jquery context for all our operations
            this.context = $(this.selector);

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
                datatype: "jsonp",
                success: edges.objClosure(this, "querySuccess", ["raw"]),
                complete: edges.objClosure(this, "queryComplete")
            })
        };

        this.querySuccess = function(params) {
            this.state.raw = params.raw;
        };

        this.queryComplete = function() {
            for (var i = 0; i < this.components.length; i++) {
                var component = this.components[i];
                component.draw(this);
            }
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
            return this.state.raw && this.state.raw.hits && this.state.raw.hits.hits.length > 0;
        };

        // get the jquery object for the desired element, in the correct context
        this.jq = function(selector) {
            return $(selector, this.context);
        };
    },

    newRenderer : function(params) {
        return new edges.Renderer(params);
    },
    Renderer : function(params) {
        this.draw = function(edge) {}
    },

    newComponent : function(params) {
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
                if (this.renderer.hasOwnProperty("draw")) {
                    this.renderer.draw(this);
                } else {
                    this.renderer(this);
                }
            }
        };
        this.contrib = function(query) {};
    },

    newTemplate : function(params) {
        return new edges.Template(params);
    },
    Template : function(params) {
        this.draw = function(edge) {}
    },

    newState : function(params) {
        return new edges.State(params);
    },
    State : function(params) {
        this.query = es.newQuery();
        this.raw = undefined;
    },

    newBasicTermSelector : function(params) {
        edges.BasicTermSelector.prototype = edges.newComponent(params);
        return new edges.BasicTermSelector(params);
    },
    BasicTermSelector : function(params) {
        this.field = params.field;
        this.display = params.display;
        this.category = params.category || "selector";
        this.filters = params.filters || [];
        this.size = params.size;

        this.init = function(edge) {
            // record a reference to the parent object
            this.edge = edge;

            // set the renderer from default if necessary
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackObject("newBasicTermSelectorRenderer");
            }
        };

        this.contrib = function(query) {
            var body = {field : this.field};
            if (this.size) {
                body["size"] = this.size;
            }
            query.addAggregation({
                aggregation: es.newAggregation({
                    name : this.id,
                    type : "terms",
                    body : body
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
        };

        this.selectTerm = function(term) {
            this.filters.push(term);
            this.edge.doQuery();
        };
    },

    newResultsDisplay : function(params) {
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

    newChart : function(params) {
        edges.Chart.prototype = edges.newComponent(params);
        return new edges.Chart(params);
    },
    Chart : function(params) {
        this.category = params.category || "chart";
        this.display = params.display || "";
        this.aggregations = params.aggregations || [];
        this.seriesKeys = params.seriesKeys || {};
        this.dataSeries = params.dataSeries || false;
        this.dataFunction = params.dataFunction || false;

        this.init = function(edge) {
            this.edge = edge;
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackFunction("renderChart");
            }
            if (!this.dataFunction) {
                this.dataFunction = this.termsAgg2SeriesDataFunction;
            }
        };

        this.draw = function() {
            this.dataSeries = this.dataFunction(this);
            this.renderer(this);
        };

        this.contrib = function(query) {
            for (var i = 0; i < this.aggregations.length; i++) {
                query.addAggregation({aggregation : this.aggregations[i]});
            }
        };

        this.termsAgg2SeriesDataFunction = function(ch) {
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

    newHorizontalMultibar : function(params) {
        edges.HorizontalMultibar.prototype = edges.newChart(params);
        return new edges.HorizontalMultibar(params);
    },
    HorizontalMultibar : function(params) {
        this.init = function(edge) {
            this.edge = edge;
            if (!this.renderer) {
                this.renderer = this.edge.getRenderPackFunction("renderHorizontalMultibar");
            }
            if (!this.dataFunction) {
                this.dataFunction = this.termsAgg2SeriesDataFunction;
            }
        };
    },

    newMultiDateRangeEntry : function(params) {
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
    },

};
