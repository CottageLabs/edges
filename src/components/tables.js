$.extend(edges, {
    newStaticDataGrid : function(params) {
        if (!params) { params = {} }
        edges.StaticDataGrid.prototype = edges.newComponent(params);
        return new edges.StaticDataGrid(params);
    },
    StaticDataGrid : function(params) {

        this.resourceId = edges.getParam(params.resourceId, false);

        this.results = [];

        this.synchronise = function() {
            this.results = [];
            var resource = this.edge.resources[this.resourceId];

            var iter = resource.iterator();
            var res = iter.next();
            while (res) {
                this.results.push(res);
                res = iter.next();
            }
        };
    },

    newStaticDataSelector : function(params) {
        if (!params) { params = {} }
        edges.StaticDataSelector.prototype = edges.newComponent(params);
        return new edges.StaticDataSelector(params);
    },
    StaticDataSelector : function(params) {

        this.resourceId = edges.getParam(params.resourceId, false);

        this.filterResourceIds = edges.getParam(params.filterResourceIds, [this.resourceId]);

        this.field = edges.getParam(params.field, false);

        this.display = edges.getParam(params.display, "Untitled");

        // FIXME: need to better formalise the relationships between the components and the renderers

        // using both filters and selected gives us compatibility with different renderers
        this.filters = [];
        this.selected = [];

        // using both values and terms gives us compatibility with different renderers
        this.values = [];
        this.terms = [];

        this.synchronise = function() {
            this.filters = [];
            this.selected = [];
            this.values = [];
            this.terms = [];

            var resource = this.edge.resources[this.resourceId];
            var terms = resource.aggregation({agg : {terms: this.field}, filtered: false});

            for (var i = 0; i < terms.length; i++) {
                var term = terms[i];
                if (term.term === "") { continue }
                this.values.push({term : term.term, display: term.term, count: term.count});
                this.terms.push({term : term.term, display: term.term, count: term.count});
            }

            for (var i = 0; i < resource.filters.length; i++) {
                var filt = resource.filters[i];
                var field = filt.field;
                if (field === this.field) {
                    var val = filt.value;
                    this.filters.push({term : val, display: val});
                    this.selected.push(val);
                }
            }
        };

        this.selectTerm = function(term) {
            var filter = {field: this.field, type: "exact", value: term};
            for (var i = 0; i < this.filterResourceIds.length; i++) {
                var resourceId = this.filterResourceIds[i];
                this.edge.resources[resourceId].add_filter({filter: filter});
            }
            this.edge.cycle();
        };

        this.removeFilter = function(term) {
            var filter = false;
            if (!term) {
                filter = {field: this.field};
            } else {
                filter = {field: this.field, type: "exact", value: term};
            }
            for (var i = 0; i < this.filterResourceIds.length; i++) {
                var resourceId = this.filterResourceIds[i];
                this.edge.resources[resourceId].clear_filter({filter: filter});
            }
            this.edge.cycle();
        };

        this.selectTerms = function(params) {
            var terms = params.terms;
            this.removeFilter();
            this.selectTerm(terms[0]);
            return true;
        };

        this.changeSize = function(size) {

        };

        this.changeSort = function(sortBy, sortDir) {

        };
    },

    newAggregateTable : function(params) {
        return edges.instantiate(edges.AggregateTable, params, edges.newComponent);
    },
    AggregateTable : function(params) {

        this.aggregateAround = edges.getParam(params.aggregateAround, false);

        this.sort = edges.getParam(params.sort, false);

        this.limit = edges.getParam(params.limit, false);

        this.splitFieldsOn = edges.getParam(params.splitFieldsOn, false);

        this.namespace = "edges-aggregate-table";

        this.results = [];

        this.synchronise = function(edge) {
            this.results = [];

            var source = this.edge.result;
            if (!source) {
                return;
            }

            var agg = source.aggregation(this.aggregateAround);
            for (var i = 0; i < agg.buckets.length; i++) {
                var bucket = agg.buckets[i];
                var obj = {};
                var keys = Object.keys(bucket);
                for (var j = 0; j < keys.length; j++) {
                    var key = keys[j];
                    var val = bucket[key];
                    if (key === "key") {
                        obj[this.aggregateAround] = val;
                    } else if (key === "doc_count") {
                        obj["doc_count"] = val;
                    } else {
                        obj[key] = val.value;
                    }
                }
                this.results.push(obj);
            }

            if (this.sort) {
                this.results.sort(this.sort);
            }

            if (this.limit !== false) {
                this.results = this.results.slice(0, this.limit);
            }

            this._restructure();
        };

        this._restructure = function() {
            if (this.splitFieldsOn === false) {
                return;
            }

            var newResults = [];

            for (var k = 0; k < this.results.length; k++) {
                var result = this.results[k];

                var newResult = {};
                var keys = Object.keys(result);
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    var val = result[key];
                    var bits = key.split(this.splitFieldsOn);
                    var context = newResult;
                    for (var j = 0; j < bits.length; j++) {
                        var bit = bits[j];
                        if (!context.hasOwnProperty(bit)) {
                            if (j === bits.length - 1) {
                                context[bit] = val;
                            } else {
                                context[bit] = {};
                                context = context[bit];
                            }
                        } else {
                            context = context[bit];
                        }
                    }
                }
                newResults.push(newResult);
            }

            this.results = newResults;
        };
    }
});