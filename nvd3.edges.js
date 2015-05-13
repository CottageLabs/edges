$.extend(edges, {
    nvd3: {

        multiBar : function(ch) {

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
                        ns["values"].push({x : vector.label, y : vector.value})
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

                nv.addGraph(function() {
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
                svg_selector : "#" + ch.id + " svg"
            });
        }
    }
});
