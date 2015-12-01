$.extend(edges, {
    nvd3: {
        DataSeriesConversions : {
            toXY : function(data_series) {
                var new_series = [];
                for (var i = 0; i < data_series.length; i++) {
                    var os = data_series[i];
                    var ns = {};
                    ns["key"] = os["key"];
                    ns["values"] = [];
                    for (var j = 0; j < os.values.length; j++) {
                        var vector = os.values[j];
                        ns["values"].push({x: vector.label, y: vector.value})
                    }
                    new_series.push(ns)
                }
                return new_series;
            }
        },

        tools : {
            persistingPieColour : function(colours, persistence) {
                if (!colours) {
                    colours = [
                        "#ea6ccb",
                        "#8fc8b0",
                        "#a9cf85",
                        "#d90d4c",
                        "#6c537e",
                        "#64d54f",
                        "#ecc7c4",
                        "#f1712b"
                    ]
                }
                if (!persistence) {
                    persistence = {};
                }

                var i = 0;
                return function(d, x) {
                    if (d.label in persistence) {
                        return persistence[d.label]
                    } else {
                        var c = colours[i % (colours.length - 1)];
                        i++;
                        persistence[d.label] = c;
                        return c;
                    }
                }
            }
        },

        newPieChartRenderer : function(params) {
            if (!params) { params = {} }
            edges.nvd3.PieChartRenderer.prototype = edges.newRenderer(params);
            return new edges.nvd3.PieChartRenderer(params);
        },
        PieChartRenderer : function(params) {
            this.showLabels = params.showLabels || true;
            this.donut = params.donut || false;
            this.labelThreshold = params.labelThreshold || 0.05;
            this.transitionDuration = params.transitionDuration || 500;
            this.noDataMessage = params.noDataMessage || false;
            this.color = params.color || false;
            this.legendPosition = params.legendPosition || "top";
            this.labelsOutside = params.labelsOutside !== undefined ? params.labelsOutside : false;
            this.valueFormat = params.valueFormat || false;
            this.marginTop = params.marginTop || 30;
            this.marginRight = params.marginRight || 30;
            this.marginBottom = params.marginBottom || 30;
            this.marginLeft = params.marginLeft || 30;

            this.namespace = "edges-nvd3-pie";

            this.draw = function() {

                var displayClasses = edges.css_classes(this.namespace, "display", this);
                var displayFrag = "";
                if (this.component.display) {
                    displayFrag = '<span class="' + displayClasses + '">' + this.component.display + '</span><br>';
                }

                var svgId = edges.css_id(this.namespace, "svg", this);
                var svgSelector = edges.css_id_selector(this.namespace, "svg", this);
                this.component.context.html(displayFrag + '<svg id="' + svgId + '"></svg>');

                // pie chart uses the native data series, so just make a ref to it
                var data_series = this.component.dataSeries;
                if (data_series.length > 0) {
                    data_series = data_series[0].values;
                } else {
                    data_series = []
                }
                var outer = this;

                nv.addGraph(function() {
                    var chart = nv.models.pieChart()
                        .x(function(d) { return d.label })
                        .y(function(d) { return d.value })
                        .showLabels(outer.showLabels)
                        .legendPosition(outer.legendPosition)
                        .labelsOutside(outer.labelsOutside)
                        .margin({"left":outer.marginLeft,"right":outer.marginRight,"top":outer.marginTop,"bottom":outer.marginBottom});

                    if (outer.noDataMessage) {
                        chart.noData(outer.noDataMessage);
                    }

                    if (outer.color) {
                        chart.color(outer.color);
                    }

                    if (outer.valueFormat) {
                        chart.valueFormat(outer.valueFormat)
                    }

                    d3.select(svgSelector)
                        .datum(data_series)
                        .transition().duration(outer.transitionDuration)
                        .call(chart);

                    return chart;
                });
            }
        },

        newHorizontalMultibarRenderer : function(params) {
            if (!params) { params = {} }
            edges.nvd3.HorizontalMultibarRenderer.prototype = edges.newRenderer(params);
            return new edges.nvd3.HorizontalMultibarRenderer(params);
        },
        HorizontalMultibarRenderer : function(params) {

            this.showValues = params.showValues || true;
            this.toolTips = params.toolTips || true;
            this.controls = params.controls || false;
            this.yTickFormat = params.yTickFormat || ",.0f";
            this.transitionDuration = params.transitionDuration || 500;
            this.marginTop = params.marginTop || 30;
            this.marginRight = params.marginRight || 50;
            this.marginBottom = params.marginBottom || 30;
            this.marginLeft = params.marginLeft || 200;

            this.namespace = "edges-nvd3-horizontal-multibar";

            this.draw = function() {
                // no need for data conversion on this graph type

                var svgId = edges.css_id(this.namespace, "svg", this);
                var svgSelector = edges.css_id_selector(this.namespace, "svg", this);
                this.component.context.html('<svg id="' + svgId + '"></svg>');

                var show_values = this.showValues;
                var tool_tips = this.toolTips;
                var controls = this.controls;
                var y_tick_format = this.yTickFormat;
                var transition_duration = this.transitionDuration;

                var margin_top = this.marginTop;
                var margin_right = this.marginRight;
                var margin_bottom = this.marginBottom;
                var margin_left = this.marginLeft;

                var data_series = this.component.dataSeries;

                nv.addGraph(function () {
                    var chart = nv.models.multiBarHorizontalChart()
                        .x(function (d) {
                            return d.label
                        })
                        .y(function (d) {
                            return d.value
                        })
                        .margin({top: margin_top, right: margin_right, bottom: margin_bottom, left: margin_left})
                        .showValues(show_values)
                        .tooltips(tool_tips)
                        .showControls(controls);

                    chart.yAxis
                        .tickFormat(d3.format(y_tick_format));

                    d3.select(svgSelector)
                        .datum(data_series)
                        .transition().duration(transition_duration)
                        .call(chart);

                    nv.utils.windowResize(chart.update);

                    return chart;
                });
            }
        },

        newMultibarRenderer : function(params) {
            if (!params) { params = {} }
            edges.nvd3.MultibarRenderer.prototype = edges.newRenderer(params);
            return new edges.nvd3.MultibarRenderer(params);
        },
        MultibarRenderer : function(params) {
            this.xTickFormat = params.xTickFormat || ",.2f";
            this.yTickFormat = params.yTickFormat || ",.2f";
            this.transitionDuration = params.transitionDuration || 500;
            this.controls = params.controls || false;
            this.barColor = params.barColor || false;
            this.showLegend = params.showLegend !== undefined ? params.showLegend : true;
            this.xAxisLabel = params.xAxisLabel || "";
            this.yAxisLabel = params.yAxisLabel || "";

            this.namespace = "edges-nvd3-multibar";

            this.draw = function () {
                var displayClasses = edges.css_classes(this.namespace, "display", this);
                var displayFrag = "";
                if (this.component.display) {
                    displayFrag = '<span class="' + displayClasses + '">' + this.component.display + '</span><br>';
                }

                var svgId = edges.css_id(this.namespace, "svg", this);
                var svgSelector = edges.css_id_selector(this.namespace, "svg", this);
                this.component.context.html(displayFrag + '<svg id="' + svgId + '"></svg>');

                var data_series = edges.nvd3.DataSeriesConversions.toXY(this.component.dataSeries);
                var outer = this;

                nv.addGraph(function () {
                    var chart = nv.models.multiBarChart().showControls(outer.controls);

                    chart.xAxis
                        .axisLabel(outer.xAxisLabel)
                        .tickFormat(d3.format(outer.xTickFormat));

                    chart.yAxis
                        .axisLabel(outer.yAxisLabel)
                        .tickFormat(d3.format(outer.yTickFormat));

                    if (outer.barColor) {
                        chart.barColor(outer.barColor);
                    }

                    chart.showLegend(outer.showLegend);

                    d3.select(svgSelector)
                        .datum(data_series)
                        .transition().duration(outer.transitionDuration).call(chart);

                    nv.utils.windowResize(chart.update);

                    return chart;
                });
            }
        },

        newSimpleLineChartRenderer : function(params) {
            if (!params) { params = {} }
            edges.nvd3.SimpleLineChartRenderer.prototype = edges.newRenderer(params);
            return new edges.nvd3.SimpleLineChartRenderer(params);
        },
        SimpleLineChartRenderer : function(params) {

            this.interactiveGuideline = params.interactiveGuideline || true;
            this.xTickFormat = params.xTickFormat || ',.2f';
            this.yTickFormat = params.yTickFormat || ',.2f';
            this.transitionDuration = params.transitionDuration || 500;
            this.lineColor = params.lineColor || false;
            this.includeOnY = params.includeOnY || false;
            this.showLegend = params.showLegend !== undefined ? params.showLegend : true;
            this.xAxisLabel = params.xAxisLabel || "";
            this.yAxisLabel = params.yAxisLabel || "";

            this.namespace = "edges-nvd3-simple-line-chart";

            this.draw = function() {
                var displayClasses = edges.css_classes(this.namespace, "display", this);
                var displayFrag = "";
                if (this.component.display) {
                    displayFrag = '<span class="' + displayClasses + '">' + this.component.display + '</span><br>';
                }

                var svgId = edges.css_id(this.namespace, "svg", this);
                var svgSelector = edges.css_id_selector(this.namespace, "svg", this);
                this.component.context.html(displayFrag + '<svg id="' + svgId + '"></svg>');

                var ds = edges.nvd3.DataSeriesConversions.toXY(this.component.dataSeries);
                var outer = this;

                nv.addGraph(function() {
                    var chart = nv.models.lineChart()
                        .useInteractiveGuideline(outer.interactiveGuideline);

                    chart.xAxis
                        .axisLabel(outer.xAxisLabel)
                        .tickFormat(d3.format(outer.xTickFormat));

                    if (outer.lineColor) {
                        chart.color(outer.lineColor);
                    }

                    if (outer.includeOnY) {
                        chart.forceY(outer.includeOnY);
                    }

                    chart.yAxis
                        .axisLabel(outer.yAxisLabel)
                        .tickFormat(d3.format(outer.yTickFormat));

                    chart.showLegend(outer.showLegend);

                    d3.select(svgSelector)
                        .datum(ds)
                        .transition().duration(outer.transitionDuration)
                        .call(chart);

                    nv.utils.windowResize(chart.update);

                    return chart;
                });


            }
        }
    }
});
