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
            },

            hasData : function(dataSeries) {
                if (!dataSeries) {
                    return false;
                }

                if (dataSeries.length == 0) {
                    return false;
                }

                var emptyCount = 0;
                for (var i = 0; i < dataSeries.length; i++) {
                    var series = dataSeries[i];
                    if (series.values.length == 0) {
                        emptyCount++;
                    }
                }
                if (emptyCount == dataSeries.length) {
                    return false;
                }

                return true;
            },

            wrapLabels : function(params) {
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
        },

        newPieChartRenderer : function(params) {
            if (!params) { params = {} }
            edges.nvd3.PieChartRenderer.prototype = edges.newRenderer(params);
            return new edges.nvd3.PieChartRenderer(params);
        },
        PieChartRenderer : function(params) {
            this.showLegend = edges.getParam(params.showLegend, true);
            this.showLabels = edges.getParam(params.showLabels, true);
            this.donut = edges.getParam(params.donut, false);
            this.labelThreshold = params.labelThreshold || 0.05;
            this.transitionDuration = params.transitionDuration || 500;
            this.noDataMessage = params.noDataMessage || false;
            this.color = params.color || false;
            this.legendPosition = params.legendPosition || "top";
            this.labelsOutside = edges.getParam(params.labelsOutside, false);
            this.showLabels = edges.getParam(params.showLabels, true);
            this.valueFormat = params.valueFormat || false;
            this.marginTop = edges.getParam(params.marginTop, 30);
            this.marginRight = edges.getParam(params.marginRight, 30);
            this.marginBottom = edges.getParam(params.marginBottom, 30);
            this.marginLeft = edges.getParam(params.marginLeft, 30);
            this.onResize = edges.getParam(params.onResize, false);
            this.resizeOnInit = edges.getParam(params.resizeOnInit, false);
            this.footer = edges.getParam(params.footer, false);
            this.growOnHover = edges.getParam(params.growOnHover, true);

            this.namespace = "edges-nvd3-pie";

            this.draw = function() {
                var containerClass = edges.css_classes(this.namespace, "container", this);
                var displayClasses = edges.css_classes(this.namespace, "display", this);
                var svgContainerClasses = edges.css_classes(this.namespace, "svg-container", this);

                var displayFrag = "";
                if (this.component.display) {
                    displayFrag = '<div class="' + displayClasses + '">' + this.component.display + '</div>';
                }

                var footerFrag = "";
                if (this.footer) {
                    var val = this.footer;
                    if (typeof(this.footer) === "function") {
                        val = this.footer(this);
                    }
                    var footerClasses = edges.css_classes(this.namespace, "footer", this);
                    footerFrag = '<div class="' + footerClasses + '">' + val + '</div>';
                }

                var svgId = edges.css_id(this.namespace, "svg", this);
                var svgSelector = edges.css_id_selector(this.namespace, "svg", this);
                var frag = '<div class="' + containerClass + '">\
                        ' + displayFrag + '\
                        <div class="' + svgContainerClasses + '"><svg id="' + svgId + '"></svg></div>\
                        ' + footerFrag + '\
                    </div>';
                this.component.context.html(frag);

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
                        .margin({"left":outer.marginLeft,"right":outer.marginRight,"top":outer.marginTop,"bottom":outer.marginBottom})
                        .showLegend(outer.showLegend)
                        .showLabels(outer.showLabels)
                        .growOnHover(outer.growOnHover);

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

                    if (outer.onResize) {
                        var resizeFn = function() {
                            outer.onResize(chart);
                            chart.update();
                        };
                        if (outer.resizeOnInit) {
                            resizeFn();
                        }
                        nv.utils.windowResize(resizeFn)
                    } else {
                        nv.utils.windowResize(chart.update);
                    }

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

            this.title = edges.getParam(params.title, false);

            this.showValues = edges.getParam(params.showValues, true);
            this.toolTips = edges.getParam(params.toolTips, true);
            this.controls = edges.getParam(params.controls, false);
            this.stacked = edges.getParam(params.stacked, false);
            this.legend = edges.getParam(params.legend, true);

            this.color = params.color || false;
            this.noDataMessage = edges.getParam(params.noDataMessage, false);

            this.transitionDuration = params.transitionDuration || 500;

            this.marginTop = edges.getParam(params.marginTop, 30);
            this.marginRight = edges.getParam(params.marginRight, 50);
            this.marginBottom = edges.getParam(params.marginBottom, 50);
            this.marginLeft = edges.getParam(params.marginLeft, 200);

            this.yTickFormat = edges.getParam(params.yTickFormat, ",.0f");
            this.xTickFormat = edges.getParam(params.xTickFormat, false);
            this.valueFormat = edges.getParam(params.valueFormat, false);

            this.xAxisLabel = edges.getParam(params.xAxisLabel, false);
            this.yAxisLabel = edges.getParam(params.yAxisLabel, false);
            this.xAxisLabelWrap = edges.getParam(params.xAxisLabelWrap, false);

            this.tooltipGenerator = edges.getParam(params.tooltipGenerator, false);

            this.dynamicHeight = edges.getParam(params.dynamicHeight, false);
            this.barHeight = edges.getParam(params.barHeight, 0);
            this.reserveAbove = edges.getParam(params.reserveAbove, 0);
            this.reserveBelow = edges.getParam(params.reserveBelow, 0);
            this.groupSpacing = edges.getParam(params.groupSpacing, false);

            this.hideIfNoData = edges.getParam(params.hideIfNoData, false);
            this.onHide = edges.getParam(params.onHide, false);
            this.onShow = edges.getParam(params.onShow, false);

            this.namespace = "edges-nvd3-horizontal-multibar";

            this.draw = function() {
                // no need for data conversion on this graph type

                // nvd3 tooltips appear outside the div where the actual edge is focussed, and it's possible for those
                // tooltips to be left behind when the page is redrawn, so we have to hack around that
                $(".nvtooltip").remove();

                var data_series = this.component.dataSeries;
                if (!data_series) {
                    data_series = [];
                }

                // now decide if we are going to continue
                if (this.hideIfNoData) {
                    if (!edges.nvd3.tools.hasData(data_series)) {
                        this.component.context.html("");
                        this.component.context.hide();

                        if (this.onHide) {
                            this.onHide();
                        }

                        return;
                    }
                }
                this.component.context.show();
                if (this.onShow) {
                    this.onShow();
                }

                var customAttributes = "";
                if (this.dynamicHeight) {
                    var seriesCount = 0;
                    for (var i = 0; i < data_series.length; i++) {
                        var series = data_series[i];
                        if (series.values.length > seriesCount) {
                            seriesCount = series.values.length;
                        }
                    }

                    var height = this.reserveAbove + this.reserveBelow + (seriesCount * this.barHeight);
                    customAttributes = 'style="height:' + height + 'px"';
                }

                var title = "";
                if (this.title !== false) {
                    title = this.title;
                }
                
                var svgId = edges.css_id(this.namespace, "svg", this);
                var svgSelector = edges.css_id_selector(this.namespace, "svg", this);
                this.component.context.html(title + '<div ' + customAttributes + '><svg id="' + svgId + '"></svg></div>');

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
                        var fn = that.yTickFormat;
                        if (typeof that.yTickFormat === "string") {
                            fn = d3.format(that.yTickFormat);
                        }
                        chart.yAxis.tickFormat(fn);
                    }

                    if (that.yAxisLabel) {
                        chart.yAxis.axisLabel(that.yAxisLabel)
                    }

                    if (that.xTickFormat) {
                        var fn = that.xTickFormat;
                        if (typeof that.xTickFormat === "string") {
                            fn = d3.format(that.xTickFormat);
                        }
                        chart.xAxis.tickFormat(fn);
                    }

                    if (that.xAxisLabel) {
                        chart.xAxis.axisLabel(that.xAxisLabel)
                    }

                    if (that.valueFormat) {
                        // set it on the chart
                        var fn = that.valueFormat;
                        if (typeof that.valueFormat === "string") {
                            fn = d3.format(that.valueFormat);
                        }
                        chart.valueFormat(fn);

                        // set it on the tooltip
                        chart.tooltip.valueFormatter(fn);
                    }

                    if (that.noDataMessage) {
                        chart.noData(that.noDataMessage);
                    }

                    if (that.color) {
                        chart.color(that.color);
                    }

                    if (that.tooltipGenerator) {
                        chart.tooltip.contentGenerator(that.tooltipGenerator);
                    }

                    if (that.groupSpacing) {
                        chart.groupSpacing(that.groupSpacing);
                    }

                    d3.select(svgSelector)
                        .datum(data_series)
                        .transition().duration(that.transitionDuration)
                        .call(chart);

                    if (that.xAxisLabelWrap) {
                        edges.nvd3.tools.wrapLabels({
                            axisSelector: svgSelector + " .nv-x.nv-axis",
                            maxWidth: that.marginLeft - 5,
                            maxHeight: that.barHeight
                        });
                    }

                    function updateChart() {
                        chart.update();
                        if (that.xAxisLabelWrap) {
                            edges.nvd3.tools.wrapLabels({
                                axisSelector: svgSelector + " .nv-x.nv-axis",
                                maxWidth: that.marginLeft - 5,
                                maxHeight: that.barHeight
                            });
                        }
                    }

                    nv.utils.windowResize(updateChart);

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
            this.xTickFormat = edges.getParam(params.xTickFormat, ",.2f");
            this.yTickFormat = edges.getParam(params.yTickFormat, ",.2f");

            this.transitionDuration = params.transitionDuration || 500;
            this.controls = edges.getParam(params.controls, false);
            this.barColor = params.barColor || false;
            this.showLegend = edges.getParam(params.showLegend, true);
            this.xAxisLabel = params.xAxisLabel || "";
            this.yAxisLabel = params.yAxisLabel || "";
            this.yAxisLabelDistance = edges.getParam(params.yAxisLabelDistance, 0);

            this.marginTop = edges.getParam(params.marginTop, 30);
            this.marginRight = edges.getParam(params.marginRight, 20);
            this.marginBottom = edges.getParam(params.marginBottom, 50);
            this.marginLeft = edges.getParam(params.marginLeft, 60);

            this.hideIfNoData = edges.getParam(params.hideIfNoData, false);
            this.onHide = edges.getParam(params.onHide, false);
            this.onShow = edges.getParam(params.onShow, false);

            this.namespace = "edges-nvd3-multibar";

            this.draw = function () {
                // first sort out the data series
                var data_series = this.component.dataSeries;
                if (!data_series) {
                    data_series = [];
                }
                data_series = edges.nvd3.DataSeriesConversions.toXY(this.component.dataSeries);

                // now decide if we are going to continue
                if (this.hideIfNoData) {
                    if (!edges.nvd3.tools.hasData(data_series)) {
                        this.component.context.html("");
                        this.component.context.hide();

                        if (this.onHide) {
                            this.onHide();
                        }

                        return;
                    }
                }
                this.component.context.show();
                if (this.onShow) {
                    this.onShow();
                }

                var displayClasses = edges.css_classes(this.namespace, "display", this);
                var displayFrag = "";
                if (this.component.display) {
                    displayFrag = '<span class="' + displayClasses + '">' + this.component.display + '</span><br>';
                }

                var svgId = edges.css_id(this.namespace, "svg", this);
                var svgSelector = edges.css_id_selector(this.namespace, "svg", this);
                this.component.context.html(displayFrag + '<svg id="' + svgId + '"></svg>');

                var outer = this;
                nv.addGraph(function () {
                    var chart = nv.models.multiBarChart()
                        .showControls(outer.controls)
                        .margin({top: outer.marginTop, right: outer.marginRight, bottom: outer.marginBottom, left: outer.marginLeft});

                    chart.xAxis
                        .axisLabel(outer.xAxisLabel)

                    if (outer.xTickFormat) {
                        var fn = outer.xTickFormat;
                        if (typeof outer.xTickFormat === "string") {
                            fn = d3.format(outer.xTickFormat);
                        }
                        chart.xAxis.tickFormat(fn);
                    }

                    chart.yAxis
                        .axisLabel(outer.yAxisLabel)
                        .axisLabelDistance(outer.yAxisLabelDistance);

                    if (outer.yTickFormat) {
                        var fn = outer.yTickFormat;
                        if (typeof outer.yTickFormat === "string") {
                            fn = d3.format(outer.yTickFormat);
                        }
                        chart.yAxis.tickFormat(fn);
                    }

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
            this.includeOnY = edges.getParam(params.includeOnY, false);
            this.showLegend = edges.getParam(params.showLegend, true);
            this.xAxisLabel = params.xAxisLabel || "";
            this.yAxisLabel = params.yAxisLabel || "";
            this.yAxisLabelDistance = edges.getParam(params.yAxisLabelDistance, 0);

            this.marginTop = edges.getParam(params.marginTop, 30);
            this.marginRight = edges.getParam(params.marginRight, 20);
            this.marginBottom = edges.getParam(params.marginBottom, 50);
            this.marginLeft = edges.getParam(params.marginLeft, 60);

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
                        .useInteractiveGuideline(outer.interactiveGuideline)
                        .margin({top: outer.marginTop, right: outer.marginRight, bottom: outer.marginBottom, left: outer.marginLeft});

                    chart.xAxis
                        .axisLabel(outer.xAxisLabel)
                        .tickFormat(d3.format(outer.xTickFormat));

                    if (outer.lineColor) {
                        chart.color(outer.lineColor);
                    }

                    if (outer.includeOnY !== false) {
                        chart.forceY(outer.includeOnY);
                    }

                    chart.yAxis
                        .axisLabel(outer.yAxisLabel)
                        .tickFormat(d3.format(outer.yTickFormat))
                        .axisLabelDistance(outer.yAxisLabelDistance);

                    chart.showLegend(outer.showLegend);

                    d3.select(svgSelector)
                        .datum(ds)
                        .transition().duration(outer.transitionDuration)
                        .call(chart);

                    nv.utils.windowResize(chart.update);

                    return chart;
                });
            }
        },

        newStackedAreaChartRenderer : function(params) {
            return edges.instantiate(edges.nvd3.StackedAreaChartRenderer, params, edges.newRenderer);
        },
        StackedAreaChartRenderer : function(params) {

            this.interactiveGuideline = params.interactiveGuideline || true;
            this.xTickFormat = params.xTickFormat || false;
            this.yTickFormat = params.yTickFormat || false;
            this.transitionDuration = params.transitionDuration || 500;
            this.showLegend = edges.getParam(params.showLegend, true);

            this.xAxisLabel = params.xAxisLabel || "";
            this.yAxisLabel = params.yAxisLabel || "";
            this.yAxisLabelDistance = edges.getParam(params.yAxisLabelDistance, 0);

            this.marginTop = edges.getParam(params.marginTop, 30);
            this.marginRight = edges.getParam(params.marginRight, 60);
            this.marginBottom = edges.getParam(params.marginBottom, 50);
            this.marginLeft = edges.getParam(params.marginLeft, 60);

            this.namespace = "edges-nvd3-stacked-area-chart";

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
                    var chart = nv.models.stackedAreaChart()
                        .useInteractiveGuideline(outer.useInteractiveGuideline)
                        .showLegend(outer.showLegend)
                        .margin({top: outer.marginTop, right: outer.marginRight, bottom: outer.marginBottom, left: outer.marginLeft})
                        .rightAlignYAxis(true)
                        .showControls(true)
                        .clipEdge(true)
                        .x(function(d) { return d.x })
                        .y(function(d) { return d.y })

                    if (outer.xTickFormat) {
                        var fn = outer.xTickFormat;
                        if (typeof outer.xTickFormat === "string") {
                            fn = d3.format(outer.xTickFormat);
                        }
                        chart.xAxis.tickFormat(fn);
                    }

                    if (outer.yTickFormat) {
                        var fn = outer.yTickFormat;
                        if (typeof outer.yTickFormat === "string") {
                            fn = d3.format(outer.yTickFormat);
                        }
                        chart.yAxis.tickFormat(fn);
                    }

                    chart.xAxis
                        .axisLabel(outer.xAxisLabel)

                    chart.yAxis
                        .axisLabel(outer.yAxisLabel)
                        .axisLabelDistance(outer.yAxisLabelDistance);

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
