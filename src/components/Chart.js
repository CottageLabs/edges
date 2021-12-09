import {Component} from "../core";
import {getParam} from "../utils";

export class Chart extends Component {
    constructor(params) {
        super(params);

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
        this.dataSeries = getParam(params, "dataSeries", false);

        // function which will generate the data series, which will be
        // written to this.dataSeries if that is not provided
        this.dataFunction = getParam(params, "dataFunction", false);

        // should we enforce a rectangular shape on the data series for when there is
        // more than one series to be displayed?
        this.rectangulate = getParam(params, "rectangulate", false);

        // function which will sort the values of a series, used when rectangulate is
        // set to true
        this.seriesSort = getParam(params, "seriesSort", false);
    }

    synchronise () {
        if (this.dataFunction) {
            this.dataSeries = this.dataFunction(this);
        }
        if (this.rectangulate) {
            this._rectangulate();
        }
    }

    _rectangulate() {
        if (this.dataSeries.length === 1) {
            // if there's only one series, it is rectangular by definition
            return;
        }

        // first index all the keys in the data series values for all
        // data series
        let allLabels = [];
        for (let i = 0; i < this.dataSeries.length; i++) {
            let series = this.dataSeries[i];
            for (let j = 0; j < series.values.length; j++) {
                let point = series.values[j];
                if (!allLabels.includes(point.label)) {
                    allLabels.push(point.label);
                }
            }
        }

        // now we have a full list of labels, check they are all present
        // in each series, and if not set a default value of 0
        for (let i = 0; i < this.dataSeries.length; i++) {
            let series = this.dataSeries[i];
            let currentLabels = series.values.map((x) => x.label)
            for (let j = 0; j < allLabels.length; j++) {
                let considerLabel = allLabels[j];
                if (!currentLabels.includes(considerLabel)) {
                    series.values.push({label: considerLabel, value: 0});   // NOTE: there is no sorting here, have to see what impact that has
                }
            }
            if (this.seriesSort) {
                series.values = this.seriesSort(series.values);
            }
        }
    }
}

////////////////////////////////////////////////////////////
// Some utility data functions that could be used by the chart

/**
 * Takes a date histogram aggregation and turns it into a single data series
 *
 * @param params
 * @returns {(function(*): ([]|[{values: *[], key: string}]))|*}
 */
export function dateHistogram(params) {

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
}

/**
 * Takes a date histogram with a nested terms aggregation and turns it
 * into a set of date based series, one per nested term
 *
 * @param params
 */
export function termSplitDateHistogram(params) {
    let histogramAgg = params.histogramAgg;
    let termsAgg = params.termsAgg;
    let seriesNameMap = params.seriesNameMap;

    return function(component) {
        let series = {};

        if (!component.edge.result) {
            return []
        }
        let aggregation = component.edge.result.aggregation(histogramAgg);
        for (let i = 0; i < aggregation.buckets.length; i++) {
            let bucket = aggregation.buckets[i];
            let terms = bucket[termsAgg];
            for (let j = 0; j < terms.buckets.length; j++) {
                let term = terms.buckets[j];
                if (!(term.key in series)) {
                    series[term.key] = [];
                }
                series[term.key].push({label: bucket.key, value: term.doc_count});
            }
        }

        let dataSeries = [];
        let seriesNames = Object.keys(series);
        for (let i = 0; i < seriesNames.length; i++) {
            let seriesName = seriesNames[i];
            let displaySeriesName = seriesNameMap ? seriesNameMap[seriesName] || seriesName : seriesName
            dataSeries.push({key: displaySeriesName, values: series[seriesName]})
        }
        return dataSeries;
    }
}

/**
 * Converts one or more terms aggregations (which may be nested in other aggregations)
 * into data series.
 *
 * In the case of nested aggregations, use dot notation to indicate the path to the
 * relevant terms aggregation (e.g. event.format)
 *
 * @param params
 * @returns {(function(*): (*[]))|*}
 */
export function nestedTerms(params) {
    let aggs = getParam(params, "aggs", []);
    let seriesName = getParam(params, "seriesName", "series");

    return function (component) {
        // for each aggregation, get the results and add them to the data series
        var data_series = [];
        if (!component.edge.result) {
            return data_series;
        }

        let context = component.edge.result.data.aggregations;

        function recurse(aggs, context) {
            let finalBuckets = []
            for (let i = 0; i < aggs.length; i++) {
                let agg = aggs[i];
                if (typeof agg === "string") {
                    return context[agg].buckets;
                } else {
                    let key = Object.keys(agg)[0];
                    let nested = context[key].buckets;
                    if (agg[key].keys) {
                        nested = nested.filter(b => agg[key].keys.includes(b.key));
                    }
                    for (let j = 0; j < nested.length; j++) {
                        let nest = nested[j];
                        let bs = recurse(agg[key].aggs, nest);
                        finalBuckets.push(...bs);
                    }
                }
            }
            return finalBuckets;
        }
        let bs = recurse(aggs, context);

        var series = {};
        series["key"] = seriesName;
        series["values"] = [];

        for (let j = 0; j < bs.length; j++) {
            let doccount = bs[j].doc_count;
            let key = bs[j].key;
            series.values.push({label: key, value: doccount});
        }

        return [series];
    }
}