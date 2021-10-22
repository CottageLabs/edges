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
    }

    synchronise () {
        if (this.dataFunction) {
            this.dataSeries = this.dataFunction(this);
        }
    };
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
            dataSeries.push({key: seriesName, values: series[seriesName]})
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
        series["key"] = "Series Test";
        series["values"] = [];

        for (let j = 0; j < bs.length; j++) {
            let doccount = bs[j].doc_count;
            let key = bs[j].key;
            series.values.push({label: key, value: doccount});
        }

        return [series];
    }
}