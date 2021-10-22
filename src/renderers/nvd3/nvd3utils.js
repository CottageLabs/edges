import {$} from "../../../dependencies/jquery"

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

/**
 * Wrap chart labels according to supplied display constraints
 *
 */
export function wrapLabels(params) {
    var axisSelector = params.axisSelector;
    var maxWidth = params.maxWidth;
    var maxHeight = params.maxHeight;
    var lineHeight = params.lineHeight || 1.2;
    var wordBreaks = params.wordBreaks || [" ", "\t"];
    var minChunkSize = params.minHyphenSize || 3;

    function _isMidWord(currentLine, remainder) {
        var leftChar = $.inArray(currentLine[currentLine.length - 1], wordBreaks) === -1;
        var rightChar = $.inArray(remainder[0], wordBreaks) === -1;
        return leftChar && rightChar;
    }

    function _toPrevSpace(currentLine) {
        for (var i = currentLine.length - 1; i >= 0; i--) {
            var char = currentLine[i];
            if ($.inArray(char, wordBreaks) !== -1) {
                return currentLine.length - i;
            }
        }
        return -1;
    }

    function _toNextSpace(remainder) {
        for (var i = 0; i < remainder.length; i++) {
            var char = remainder[i];
            if ($.inArray(char, wordBreaks) !== -1) {
                return i + 1;
            }
        }
        return -1;
    }

    function _backtrack(count, currentLine, remainder) {
        for (var i = 0; i < count; i++) {
            remainder.unshift(currentLine.pop());
        }
    }

    function _isTooLong(tspan) {
        return tspan.node().getComputedTextLength() >= maxWidth
    }

    function separate(text) {
        // get the current content then clear the text element
        var chars = text.text().trim().split("");
        text.text(null);

        // set up registries for the text lines that they will create
        var lines = [];

        // create a tspan for working in - we need it to calculate line widths dynamically
        var x = text.attr("x");
        var tspan = text.append("tspan").attr("x", x).attr("y", 0);

        // record the current line
        var currentLine = [];

        // for each character in the text, push to the current line, assign to the tspan, and then
        // check if we have exceeded the allowed max width
        while (chars.length > 0) {
            var char = chars.shift();
            currentLine.push(char);
            tspan.text(currentLine.join(""));

            var maxed = false;
            var hyphenated = false;
            while(_isTooLong(tspan)) {
                // record that we pushed the tspan to the limit
                maxed = true;

                // if we already added a hyphen, remove it
                if (hyphenated) {
                    currentLine.splice(currentLine.length - 1);
                    hyphenated = false;
                }

                // if we have exceeded the max width back-track 1
                _backtrack(1, currentLine, chars);

                if (_isMidWord(currentLine, chars)) {
                    var toPrevSpace = _toPrevSpace(currentLine);

                    if (toPrevSpace === -1 || toPrevSpace - 1 > minChunkSize) {
                        _backtrack(1, currentLine, chars);
                        currentLine.push("-");
                        hyphenated = true;
                    } else {
                        _backtrack(toPrevSpace, currentLine, chars);
                    }
                }

                currentLine = currentLine.join("").trim().split("");
                tspan.text(currentLine.join(""));
            }

            // if we didn't yet fill the tspan, continue adding characters
            if (!maxed && chars.length > 0) {
                continue;
            }

            // otherwise, move on to the next line
            if (maxed || chars.length === 0) {
                lines.push(currentLine);
                currentLine = [];
            }
        }

        // create all the tspans
        tspan.remove();
        var tspans = [];
        for (var i = 0; i < lines.length; i++) {
            tspan = text.append("tspan").attr("x", x).attr("y", 0);
            tspan.text(lines[i].join(""));
            tspans.push(tspan);
        }

        return tspans;
    }

    function distribute(text, tspans) {
        var imax = tspans.length;
        var pmax = lineHeight * (imax - 1);
        var dy = parseFloat(text.attr("dy"));

        for (var j = 0; j < tspans.length; j++) {
            var pos = (lineHeight * j) - (pmax / 2.0) + dy;
            var tspan = tspans[j];
            tspan.attr("dy", pos + "em");
        }
    }

    function reduce(text, tspans) {
        var reduced = false;
        var box = text.node().getBBox();
        if (box.height > maxHeight && tspans.length > 1) {
            tspans[tspans.length - 1].remove();
            tspans.pop();
            var line = tspans[tspans.length - 1].text();
            if (line.length > 3) {
                line = line.substring(0, line.length - 3) + "...";
            }
            tspans[tspans.length - 1].text(line);
            reduced = true;
        }
        return reduced;
    }

    d3.selectAll(axisSelector + " .tick text").each(function(i, e) {
        var text = d3.select(this);
        var tspans = separate(text);
        do {
            distribute(text, tspans);
        }
        while (reduce(text, tspans))
    });
}