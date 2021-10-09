/**
 * Convert a Chart data series to the X/Y format for nvd3 charts
 *
 * @param data_series
 * @returns {*[]}
 */
export function toXY(data_series) {
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

/**
 * Check if there's any data in the data series
 *
 * @param dataSeries
 * @returns {boolean}
 */
export function hasData(dataSeries) {
    if (!dataSeries) {
        return false;
    }

    if (dataSeries.length === 0) {
        return false;
    }

    var emptyCount = 0;
    for (var i = 0; i < dataSeries.length; i++) {
        var series = dataSeries[i];
        if (series.values.length === 0) {
            emptyCount++;
        }
    }
    if (emptyCount === dataSeries.length) {
        return false;
    }

    return true;
}