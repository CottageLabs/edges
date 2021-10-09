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