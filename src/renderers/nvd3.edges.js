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
            this.showLabels = edges.getParam(params.showLabels, true);
            this.donut = edges.getParam(params.donut, false);
            this.labelThreshold = params.labelThreshold || 0.05;
            this.transitionDuration = params.transitionDuration || 500;
            this.noDataMessage = params.noDataMessage || false;
            this.color = params.color || false;
            this.legendPosition = params.legendPosition || "top";
            this.labelsOutside = edges.getParam(params.labelsOutside, false);
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
                if (!data_series) {
                    data_series = [];
                }
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

            this.showValues = edges.getParam(params.showValues, true);
            this.toolTips = edges.getParam(params.toolTips, true);
            this.controls = edges.getParam(params.controls, false);
            this.stacked = edges.getParam(params.stacked, false);
            this.legend = edges.getParam(params.legend, true);
            this.color = params.color || false;
            this.noDataMessage = edges.getParam(params.noDataMessage, false);
            this.yTickFormat = edges.getParam(params.yTickFormat, ",.0f");
            this.xTickFormat = edges.getParam(params.xTickFormat, false);
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

                var data_series = this.component.dataSeries;
                if (!data_series) {
                    data_series = [];
                }

                var that = this;
                nv.addGraph(function () {
                    var chart = nv.models.multiBarHorizontalChart()
                        .x(function (d) {
                            return d.label
                        })
                        .y(function (d) {
                            return d.value
                        })
                        .margin({top: that.marginTop, right: that.marginRight, bottom: that.marginBottom, left: that.marginLeft})
                        .showValues(that.showValues)
                        .tooltips(that.toolTips)
                        .showControls(that.controls)
                        .showLegend(that.legend);

                    if (that.stacked) {
                        chart.multibar.stacked(that.stacked)
                    }

                    if (that.yTickFormat) {
                        chart.yAxis
                            .tickFormat(d3.format(that.yTickFormat));
                    }

                    if (that.xTickFormat) {
                        chart.xAxis
                            .tickFormat(d3.format(that.xTickFormat));
                    }

                    if (that.noDataMessage) {
                        chart.noData(that.noDataMessage);
                    }

                    if (that.color) {
                        chart.color(that.color);
                    }

                    d3.select(svgSelector)
                        .datum(data_series)
                        .transition().duration(that.transitionDuration)
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
            this.controls = edges.getParam(params.controls, false);
            this.barColor = params.barColor || false;
            this.showLegend = edges.getParam(params.showLegend, true);
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

                var data_series = this.component.dataSeries;
                if (!data_series) {
                    data_series = [];
                }
                data_series = edges.nvd3.DataSeriesConversions.toXY(this.component.dataSeries);
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
            this.showLegend = edges.getParam(params.showLegend, true);
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

                var data_series = this.component.dataSeries;
                if (!data_series) {
                    data_series = [];
                }
                var ds = edges.nvd3.DataSeriesConversions.toXY(data_series);
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
