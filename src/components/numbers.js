$.extend(edges, {
    numbers : {
        newImportantNumbers : function(params) {
            return edges.instantiate(edges.numbers.ImportantNumbers, params, edges.newComponent);
        },
        ImportantNumbers : function(params) {
            this.main = edges.getParam(params.main, false);
            this.second = edges.getParam(params.second, false);

            this.calculate = edges.getParam(params.calculate, false);

            this.synchronise = function() {
                // note we don't reset the values, as if calculate isn't set, we just stick with the
                // values provided
                if (this.calculate !== false) {
                    var values = this.calculate(this);
                    this.main = values.main;
                    this.second = values.second;
                }
            }
        },

        newStory : function(params) {
            return edges.instantiate(edges.numbers.Story, params, edges.newComponent);
        },
        Story : function(params) {
            this.template = edges.getParam(params.template, false);
            this.values = edges.getParam(params.values, {});

            this.calculate = edges.getParam(params.calculate, false);

            this.synchronise = function() {
                // note we don't reset the values, as if calculate isn't set, we just stick with the
                // values provided
                if (this.calculate !== false) {
                    this.values = this.calculate(this);
                }
            }
        }
    }
});
