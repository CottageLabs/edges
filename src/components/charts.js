$.extend(edges, {
    ////////////////////////////////////////////////
    // Common Chart implementation and associated data functions

    newChart : function(params) {
        if (!params) { params = {} }
        edges.Chart.prototype = edges.newComponent(params);
        return new edges.Chart(params);
    },
    Chart : function(params) {
        ////////////////////////////////////////////
        // arguments that can be passed in

        this.category = params.category || "chart";
        this.display = params.display || "";

        // actual data series that the renderer will render
        // data series is of the form
        // [
        //      {
        //          key: "<name of series>",
        //          values: [
        //              {label: "<name of this value>", value: "<the value itself>"}
        //          ]
        //      }
        // ]
        //
        // For example
        // [{ key: "power output", values: [{label: 1980, value: 100}, {label: 1981, value: 200}]
        this.dataSeries = params.dataSeries || false;

        // function which will generate the data series, which will be
        // written to this.dataSeries if that is not provided
        this.dataFunction = params.dataFunction || false;

        // closure function which can be invoked with the dfArgs to give a
        // function which will return the data series
        this.dataFunctionClosure = params.dataFunctionClosure || false;

        // the list of aggregations upon which we'll base the data
        this.aggregations = params.aggregations || [];

        // the default data function will be to use the basic aggregation
        // to series conversion, which is configured with these options...

        this.dfArgs = params.dfArgs || {
            // the name of the aggregation(s) to be used.  If specified they will
            // be drawn from the final query, so you may specify shared aggregations
            // via the baseQuery on the Edge.
            useAggregations : [],

            // the keys to relate each aggregation name to it's display key
            seriesKeys : {}
        };
        
        // a function, which, when called specifies a name map to be stored in this.dataSeriesNameMap
        this.dataSeriesNameMapFunction = edges.getParam(params.dataSeriesNameMapFunction, false);
        
        // a map of supplied data series names to those that will actually be displayed
        this.dataSeriesNameMap = edges.getParam(params.dataSeriesNameMap, {});

        // pick a default renderer that actually exists, so this is the default chart, essentially
        this.defaultRenderer = params.defaultRenderer || "newMultibarRenderer";

        this.init = function(edge) {
            // since this class is designed to be sub-classed, we can't rely on "this" to be a chart
            // instance, so if we're kicking the call upstairs, we need to pass it explicitly to the
            // right object
            edges.newComponent().init.call(this, edge);

            // copy over the names of the aggregations that we're going to read from
            for (var i = 0; i < this.aggregations.length; i++) {
                var agg = this.aggregations[i];
                if ($.inArray(agg.name, this.dfArgs.useAggregations) === -1) {
                    this.dfArgs.useAggregations.push(agg.name);
                }
            }

            if (this.aggregations.length > 0 && this.dataFunctionClosure) {
                this.dataFunction = this.dataFunctionClosure(this.dfArgs);
            }
        };

        this.contrib = function(query) {
            for (var i = 0; i < this.aggregations.length; i++) {
                query.addAggregation(this.aggregations[i]);
            }
        };

        this.synchronise = function() {
            if (this.dataFunction) {
                this.dataSeries = this.dataFunction(this);
            }
            if (this.dataSeriesNameMapFunction) {
                this.dataSeriesNameMap = this.dataSeriesNameMapFunction(this);
            }
        };
    },
    ChartDataFunctions : {
        /**
         * Takes a date histogram aggregation and turns it into a single data series
         *
         * @param params
         * @returns {(function(*): ([]|[{values: *[], key: string}]))|*}
         */
        dateHistogram : function(params) {
            
            let agg = params.agg;
            let seriesName = params.seriesName;

            return function(component) {
                let values = [];

                if (!component.edge.result) {
                    return []
                }
                let aggregation = component.edge.result.aggregation(agg);
                for (let i = 0; i < aggregation.buckets.length; i++) {
                    let bucket = aggregation.buckets[i];
                    values.push({label: bucket.key, value: bucket.doc_count});
                }
                return [{key: seriesName, values: values}]
            }
        },

        // dataFunctionClosure
        terms : function(params) {

            var useAggregations = params.useAggregations || [];
            var seriesKeys = params.seriesKeys || {};

            return function (ch) {
                // for each aggregation, get the results and add them to the data series
                var data_series = [];
                if (!ch.edge.result) {
                    return data_series;
                }
                for (var i = 0; i < useAggregations.length; i++) {
                    var agg = useAggregations[i];
                    var buckets = ch.edge.result.data.aggregations[agg].buckets;

                    var series = {};
                    series["key"] = seriesKeys[agg];
                    series["values"] = [];

                    for (var j = 0; j < buckets.length; j++) {
                        var doccount = buckets[j].doc_count;
                        var key = buckets[j].key;
                        series.values.push({label: key, value: doccount});
                    }

                    data_series.push(series);
                }
                return data_series;
            }
        },

        // dataFunctionClosure
        // extract the stats from a nested stats aggregation inside a terms aggregation
        // produces a set of series, one for each "seriesFor" (which should be one of the
        // stats in the stats aggregation, such as "sum") in each of the aggregations
        // listed in useAggregations (which should be a list of the terms aggregations to
        // be interrogated for nested stats aggs).  If the terms stats themselves are nested
        // aggregations, provide the full path to the term, separating each level with a space.
        //
        // seriesKeys map from the full name of the path to the statistic to a human readable
        // representation of it
        termsStats : function(params) {

            var useAggregations = params.useAggregations || [];
            var seriesKeys = params.seriesKeys || {};
            var seriesFor = params.seriesFor || [];

            return function(ch) {
                // for each aggregation, get the results and add them to the data series
                var data_series = [];
                if (!ch.edge.result) {
                    return data_series;
                }

                for (var i = 0; i < useAggregations.length; i++) {
                    var agg = useAggregations[i];
                    var parts = agg.split(" ");

                    for (var j = 0; j < seriesFor.length; j++) {
                        var seriesStat = seriesFor[j];

                        var series = {};
                        series["key"] = seriesKeys[agg + " " + seriesStat];
                        series["values"] = [];

                        var buckets = ch.edge.result.data.aggregations[parts[0]].buckets;
                        for (var k = 0; k < buckets.length; k++) {
                            var stats = buckets[k][parts[1]];
                            var key = buckets[k].key;
                            var val = stats[seriesStat];
                            series.values.push({label : key, value: val});
                        }

                        data_series.push(series);
                    }
                }

                return data_series;
            }
        },

        // dataFunctionClosure
        // from each record extract the values specified by the field pointers x and y
        // and store them as the label and value respectively in the data series.  Only
        // one data series is produced by this function
        recordsXY : function(params) {
            var x = params.x;
            var x_default = params.x_default === undefined ? 0 : params.x_default;
            var y = params.y;
            var y_default = params.y_default === undefined ? 0 : params.y_default;
            var key = params.key;

            return function(ch) {
                var data_series = [];
                if (!ch.edge.result) {
                    return data_series;
                }

                var series = {};
                series["key"] = key;
                series["values"] = [];

                var results = ch.edge.result.results();
                for (var i = 0; i < results.length; i++) {
                    var res = results[i];
                    var xval = edges.objVal(x, res, x_default);
                    var yval = edges.objVal(y, res, y_default);
                    series.values.push({label: xval, value: yval});
                }

                data_series.push(series);
                return data_series;
            }
        },

        // dataFunctionClosure
        // from each record extract the values specified by the field pointers x and y
        // and add them to a cumulative total, and save them as the label and value respectively
        //
        // you can choose to accumulate only one of the fields, x or y, the other will be stored
        // as it is represented in the record.
        //
        // This is good, for example, for producing a cumulative series of an annual statistic,
        // on a by-year basis.
        cumulativeXY : function(params) {
            var x = params.x;
            var x_default = params.x_default === undefined ? 0 : params.x_default;
            var y = params.y;
            var y_default = params.y_default === undefined ? 0 : params.y_default;
            var key = params.key;
            var accumulate = params.accumulate || "y";

            return function(ch) {
                var data_series = [];
                if (!ch.edge.result) {
                    return data_series;
                }

                var series = {};
                series["key"] = key;
                series["values"] = [];

                var total = 0;
                var results = ch.edge.result.results();
                for (var i = 0; i < results.length; i++) {
                    var res = results[i];
                    var xval = edges.objVal(x, res, x_default);
                    var yval = edges.objVal(y, res, y_default);
                    if (accumulate === "x") {
                        total += xval;
                        series.values.push({label: total, value: yval});
                    } else if (accumulate === "y") {
                        total += yval;
                        series.values.push({label: xval, value: total});
                    }
                }

                data_series.push(series);
                return data_series;
            }
        },

        totalledList : function(params) {
            var listPath = params.listPath || "";
            var seriesKey = params.seriesKey || "";
            var keyField = params.keyField || false;
            var valueField = params.valueField || false;

            return function(ch) {
                var data_series = [];
                if (!ch.edge.result) {
                    return data_series;
                }

                var series = {};
                series["key"] = seriesKey;
                series["values"] = [];

                // go through all the records and count the values
                var counter = {};
                var results = ch.edge.result.results();
                for (var i = 0; i < results.length; i++) {
                    var res = results[i];
                    var l = edges.objVal(listPath, res, []);
                    for (var j = 0; j < l.length; j++) {
                        var lo = l[j];
                        var key = edges.objVal(keyField, lo, false);
                        var value = edges.objVal(valueField, lo, 0);
                        if (key in counter) {
                            counter[key] += value;
                        } else {
                            counter[key] = value;
                        }
                    }
                }

                // now conver the values into the correct form for the series
                for (key in counter) {
                    var val = counter[key];
                    series.values.push({label: key, value: val});
                }

                data_series.push(series);
                return data_series;
            }
        }
    },

    ///////////////////////////////////////////////////////
    // Specific chart implementations

    newPieChart : function(params) {
        if (!params) { params = {} }
        edges.PieChart.prototype = edges.newChart(params);
        return new edges.PieChart(params);
    },
    PieChart : function(params) {
        this.defaultRenderer = params.defaultRenderer || "newPieChartRenderer";
    },

    newHorizontalMultibar : function(params) {
        if (!params) { params = {} }
        edges.HorizontalMultibar.prototype = edges.newChart(params);
        return new edges.HorizontalMultibar(params);
    },
    HorizontalMultibar : function(params) {
        this.defaultRenderer = params.defaultRenderer || "newHorizontalMultibarRenderer";
    },

    newMultibar : function(params) {
        if (!params) { params = {} }
        edges.Multibar.prototype = edges.newChart(params);
        return new edges.Multibar(params);
    },
    Multibar : function(params) {
        this.defaultRenderer = params.defaultRenderer || "newMultibarRenderer";
    },

    newSimpleLineChart : function(params) {
        if (!params) { params = {} }
        edges.SimpleLineChart.prototype = edges.newChart(params);
        return new edges.SimpleLineChart(params);
    },
    SimpleLineChart : function(params) {

        this.xAxisLabel = params.xAxisLabel || "";
        this.yAxisLabel = params.yAxisLabel || "";

        this.defaultRenderer = params.defaultRenderer || "newSimpleLineChartRenderer";
    },

    ///////////////////////////////////////////////////////
    // Chart-related components

    newChartsTable : function(params) {
        if (!params) { params = {} }
        // edges.ChartsTable.prototype = edges.newChart(params);
        edges.ChartsTable.prototype = edges.newComponent(params);
        return new edges.ChartsTable(params);
    },
    ChartsTable : function(params) {
        this.chartComponents = edges.getParam(params.chartComponents, false);

        this.tabularise = edges.getParam(params.tabularise, false);

        this.defaultRenderer = params.defaultRenderer || "newChartsTableRenderer";

        this.results = [];

        this.synchronise = function() {
            this.results = [];
            if (!this.chartComponents) {
                return;
            }

            var comps = [];
            for (var i = 0; i < this.edge.components.length; i++) {
                var comp = this.edge.components[i];
                if ($.inArray(comp.id, this.chartComponents) > -1) {
                    comps.push(comp);
                }
            }

            if (this.tabularise) {
                this.results = this.tabularise(comps);
            }
        };
    }
});
