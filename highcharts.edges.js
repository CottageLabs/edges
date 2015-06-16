$.extend(edges, {
    highcharts: {

        newPieChartRenderer : function(params) {
            if (!params) { params = {} }
            edges.highcharts.PieChartRenderer.prototype = edges.newRenderer(params);
            return new edges.highcharts.PieChartRenderer(params);
        },
        PieChartRenderer : function(params) {
            this.title = params.title || false;
            this.subtitle = params.subtitle || false;
            this.showLabels = params.showLabels || true;
            this.donut = params.donut || false;
            this.toolTipNumberFormat = params.toolTipNumberFormat || ",.0f";

            this.draw = function(ch) {

            }
        },

        newHorizontalMultibarRenderer : function(params) {
            if (!params) { params = {} }
            edges.highcharts.HorizontalMultibarRenderer.prototype = edges.newRenderer(params);
            return new edges.highcharts.HorizontalMultibarRenderer(params);
        },
        HorizontalMultibarRenderer : function(params) {
            this.title = params.title || false;
            this.subtitle = params.subtitle || false;

            this.draw = function(ch) {

            }
        },

        newMultibarRenderer : function(params) {
            if (!params) { params = {} }
            edges.highcharts.MultibarRenderer.prototype = edges.newRenderer(params);
            return new edges.highcharts.MultibarRenderer(params);
        },
        MultibarRenderer : function(params) {
            this.title = params.title || false;
            this.subtitle = params.subtitle || false;
            this.yAxisLabel = params.yAxisLabel || false;
            this.xAxisLabel = params.xAxisLabel || false;
            this.toolTipNumberFormat = params.toolTipNumberFormat || ",.0f";

            this.draw = function (ch) {

            }
        },

        newStackedMultibarRenderer : function(params) {
            if (!params) { params = {} }
            edges.highcharts.StackedMultibarRenderer.prototype = edges.newRenderer(params);
            return new edges.highcharts.StackedMultibarRenderer(params);
        },
        StackedMultibarRenderer : function(params) {
            this.title = params.title || false;
            this.subtitle = params.subtitle || false;

            this.draw = function (ch) {

            }
        }
    }
});

