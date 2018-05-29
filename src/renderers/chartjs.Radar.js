$.extend(true, edges, {
    chartjs: {
        /**
         * /**
         * This function constructs {@link edges.chartjs.Radar} for you, with appropriate
         * prototypes
         *
         * @param {Object} params
         * @param {Object} params.options - ChartJS Options for the radar diagram
         * @param {Object} params.dataSeriesProperties - ChartJS properties to be mixed with the data series.
         * @returns {edges.chartjs.Radar}
         */
        newRadar : function(params) {
            return edges.instantiate(edges.chartjs.Radar, params, edges.newRenderer);
        },
        /**
         * You should not call this directly, see {@link edges.chartjs.Radar} for the true
         * constructor.
         *
         * This class providers a renderer for the ChartJS radar graph type
         *
         * @param {Object} params
         * @param {Object} params.options - ChartJS Options for the radar diagram.  See the chartjs docs for details.
         * @param {Object} params.dataSeriesProperties - ChartJS properties to be mixed with the data series.  See the chartjs docs for details of the options available.
         *                                              This is an object where each key is the key of a data series, and the values are the additional display properties to
         *                                              be attached to the resulting data that gets passed into chartjs.
         * @constructor
         */
        Radar : function(params) {
            // The options object to be passed into the chart.
            this.options = edges.getParam(params.options, {});

            // the data series properties to be attached to each data series before being passed to chartjs
            this.dataSeriesProperties = edges.getParam(params.dataSeriesProperties, {});

            //////////////////////////////////////////////
            // variables for internal state
            this.namespace = "edges-chartjs-radar";

            this.chart = false;

            /**
             * Draw the chart.  If the chart already exists (this.chart is not false) then the chart will be updated
             * with the latest data instead.
             */
            this.draw = function() {
                var data = this._dataSeriesToDatasets();
                if (data === false) {
                    return;
                }

                if (this.chart === false) {
                    // if the chart does not already exist, create it
                    var canvasId = edges.css_id(this.namespace, "canvas", this);
                    var canvasIdSelector = edges.css_id_selector(this.namespace, "canvas", this);

                    this.component.context.html('<canvas id="' + canvasId + '" width="400" height="400"></canvas>');
                    var ctx = this.component.context.find(canvasIdSelector);

                    this.chart = new Chart(ctx, {
                        type: "radar",
                        data: data,
                        options: this.options
                    })
                } else {
                    // if the chart exists, just replace the existing data with the new data
                    for (var i = 0; i < data.datasets.length; i++) {
                        this.chart.data.datasets[i].data = data.datasets[i].data;
                        this.chart.data.datasets[i].label = data.datasets[i].label;
                    }
                    // ask the chart to update itself
                    this.chart.update();
                }
            };

            /**
             * Convert the standard edges data series into a ChartJS formatted data set.
             *
             * This will also combine any properties in `this.dataSeriesProperties` with the appropriate dataset
             *
             * @returns {Object} ChartJS dataset object representing equivalent data to the standard edges dataseries
             * @private
             */
            this._dataSeriesToDatasets = function() {
                // if there's no data series, just return false.  The caller can figure out what to do with that
                if (this.component.dataSeries === false || this.component.dataSeries.length == 0) {
                    return false;
                }

                var data = {};

                // get the labels from the first data series
                data.labels =  this.component.dataSeries[0].values.map(function(x) { return x.label });

                // construct a dataset per dataseries, taking the lable from the dataseries key.
                data.datasets = [];
                for (var i = 0; i < this.component.dataSeries.length; i++) {
                    var series = this.component.dataSeries[i];
                    var obj = {
                        label: edges.getParam(this.component.dataSeriesNameMap[series.key], series.key),
                        data: series.values.map(function(x) { return x.value })
                    };
                    // if there are data series properties, mix them in at this point
                    if (this.dataSeriesProperties.hasOwnProperty(series.key)) {
                        $.extend(obj, this.dataSeriesProperties[series.key]);
                    }
                    data.datasets.push(obj);
                }

                return data;
            }
        }
    }
});