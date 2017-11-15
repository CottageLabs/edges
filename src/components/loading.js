$.extend(edges, {
    loading : {
        newLoadingBar : function(params) {
            return edges.instantiate(edges.loading.LoadingBar, params, edges.newComponent);
        },
        LoadingBar : function(params) {
            this.percent = edges.getParam(params.percent, 0);
            this.x = edges.getParam(params.x, 0);
            this.y = edges.getParam(params.y, 0);

            this.calculate = edges.getParam(params.calculate, false);

            this.synchronise = function() {
                // note we don't reset the values, as if calculate isn't set, we just stick with the
                // values provided
                if (this.calculate !== false) {
                    var values = this.calculate(this);
                    this.percent = values.pc;
                    this.x = values.x;
                    this.y = values.y;
                }
            }
        }
    }
});
