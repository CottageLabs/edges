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

        this.field = edges.getParam(params.field, false);

        this.display = edges.getParam(params.display, "Untitled");

        this.filters = [];
        this.values = [];

        this.synchronise = function() {
            this.filters = [];
            this.values = [];

            var resource = this.edge.resources[this.resourceId];
            var terms = resource.aggregation({terms: this.field});

            for (var i = 0; i < terms.length; i++) {
                var term = terms[i];
                this.values.push({term : term.term, display: term.term, count: term.count})
            }

            for (var i = 0; i < resource.filters.length; i++) {
                var filt = resource.filters[i];
                var field = Object.keys(filt)[0];
                var val = filt[field];
                this.filters.push({term : val, display: val});
            }
        };

        this.selectTerm = function(term) {
            var filter = {};
            filter[this.field] = term;
            this.edge.resources[this.resourceId].add_filter({filter: filter});
            this.edge.cycle();
        };

        this.removeFilter = function(term) {
            var filter = {};
            filter[this.field] = term;
            this.edge.resources[this.resourceId].clear_filter({filter: filter});
            this.edge.cycle();
        };

        this.changeSize = function(size) {

        };

        this.changeSort = function(sortBy, sortDir) {

        };
    }
});