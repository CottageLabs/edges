$.extend(edges, {
    nvd3: {

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

            this.draw = function(ch) {

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

            this.draw = function(ch) {
                function render(params) {
                    var data_series = params.data_series;
                    var selector = params.svg_selector;

                    var show_values = params.show_values || true;
                    var tool_tips = params.tool_tips || true;
                    var controls = params.controls || true;
                    var y_tick_format = params.y_tick_format || ',.0f';
                    var transition_duration = params.transition_duration || 500;

                    var margin_top = params.margin_top || 30;
                    var margin_right = params.margin_right || 50;
                    var margin_bottom = params.margin_bottom || 30;
                    var margin_left = params.margin_left || 200;

                    // set the space up for the new chart
                    $(selector).empty();

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

                        d3.select(selector)
                            .datum(data_series)
                            .transition().duration(transition_duration)
                            .call(chart);

                        nv.utils.windowResize(chart.update);

                        return chart;
                    });
                }

                $("#" + ch.id).html("<svg></svg>");

                render({
                    data_series: ch.dataSeries,
                    svg_selector: "#" + ch.id + " svg"
                });
            }
        },

        newMultibarRenderer : function(params) {
            if (!params) { params = {} }
            edges.nvd3.MultibarRenderer.prototype = edges.newRenderer(params);
            return new edges.nvd3.MultibarRenderer(params);
        },
        MultibarRenderer : function(params) {
            this.yTickFormat = params.yTickFormat || ",.0f";
            this.transitionDuration = params.transitionDuration || 500;
            this.controls = params.controls || false;

            this.draw = function (ch) {

                function convert(params) {
                    var series = params.data_series;
                    var new_series = [];
                    for (var i = 0; i < series.length; i++) {
                        var os = series[i];
                        var ns = {};
                        ns["key"] = os["key"];
                        ns["values"] = [];
                        for (var j = 0; j < os.values.length; j++) {
                            var vector = os.values[j];
                            ns["values"].push({x: vector.label, y: vector.value})
                        }
                        new_series.push(ns)
                    }
                    return new_series
                }

                function render(params) {
                    var data_series = params.data_series;
                    var selector = params.svg_selector;

                    //var y_tick_format = params.multibar_y_tick_format;
                    //var transition_duration = params.multibar_transition_duration;
                    //var controls = options.multibar_controls;
                    var y_tick_format = ',.0f';
                    var transition_duration = 500;
                    var controls = true;

                    // set the space up for the new chart
                    $(selector).empty();

                    nv.addGraph(function () {
                        var chart = nv.models.multiBarChart()
                            .showControls(controls);

                        chart.yAxis
                            .tickFormat(d3.format(y_tick_format));

                        d3.select(selector)
                            .datum(data_series)
                            .transition().duration(transition_duration).call(chart);

                        nv.utils.windowResize(chart.update);

                        return chart;
                    });
                }

                $("#" + ch.id).html("<svg></svg>");

                var ds = convert({
                    data_series: ch.dataSeries
                });

                render({
                    data_series: ds,
                    svg_selector: "#" + ch.id + " svg"
                });
            }
        }
    }
});
