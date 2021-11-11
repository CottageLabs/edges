import {nv} from "../../../dependencies/nvd3"
import {d3} from "../../../dependencies/d3"

import {Renderer} from "../../core";
import {getParam, htmlID, idSelector, styleClasses} from "../../utils";
import {hasData, wrapLabels} from "./nvd3utils";

export class HorizontalMultibarRenderer extends Renderer {
    constructor(params) {
        super(params);

        this.title = getParam(params, "title", false);

        this.showValues = getParam(params, "showValues", true);
        this.toolTips = getParam(params, "toolTips", true);
        this.controls = getParam(params, "controls", false);
        this.stacked = getParam(params, "stacked", false);
        this.legend = getParam(params, "legend", true);

        this.color = getParam(params, "color", false);
        this.barColor = getParam(params, "barColor", false);
        this.noDataMessage = getParam(params, "noDataMessage", false);

        this.transitionDuration = getParam(params, "transitionDuration", 500);

        this.marginTop = getParam(params, "marginTop", 30);
        this.marginRight = getParam(params, "marginRight", 50);
        this.marginBottom = getParam(params, "marginBottom", 50);
        this.marginLeft = getParam(params, "marginLeft", 200);

        this.yTickFormat = getParam(params, "yTickFormat", ",.0f");
        this.xTickFormat = getParam(params, "xTickFormat", false);
        this.valueFormat = getParam(params, "valueFormat", false);
        
        this.showXAxis = getParam(params, "showXAxis", true);
        this.showYAxis - getParam(params, "showYAxes", true);
        this.xAxisLabel = getParam(params, "xAxisLabel", false);
        this.yAxisLabel = getParam(params, "yAxisLabel", false);
        this.xAxisLabelWrap = getParam(params, "xAxisLabelWrap", false);

        this.tooltipGenerator = getParam(params, "tooltipGenerator", false);

        this.dynamicHeight = getParam(params, "dynamicHeight", false);
        this.barHeight = getParam(params, "barHeight", 0);
        this.reserveAbove = getParam(params, "reserveAbove", 0);
        this.reserveBelow = getParam(params, "reserveBelow", 0);
        this.groupSpacing = getParam(params, "groupSpacing", false);

        this.hideIfNoData = getParam(params, "hideIfNoData", false);
        this.onHide = getParam(params, "onHide", false);
        this.onShow = getParam(params, "onShow", false);
        this.onUpdate = getParam(params, "onUpdate", false);

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
                if (!hasData(data_series)) {
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
                let titleClass = styleClasses(this.namespace, "title", this);
                title = `<h4 class="${titleClass}">${this.title}</h4>`;
            }

            var svgId = htmlID(this.namespace, "svg", this);
            var svgSelector = idSelector(this.namespace, "svg", this);
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
                    .showLegend(that.legend)
                    .showXAxis(that.showXAxis)
                    .showYAxis(that.showYAxis);

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
                    wrapLabels({
                        axisSelector: svgSelector + " .nv-x.nv-axis",
                        maxWidth: that.marginLeft - 5,
                        maxHeight: that.barHeight
                    });
                }

                if (that.onUpdate) {
                    that.onUpdate();
                }

                function updateChart() {
                    chart.update();
                    if (that.xAxisLabelWrap) {
                        wrapLabels({
                            axisSelector: svgSelector + " .nv-x.nv-axis",
                            maxWidth: that.marginLeft - 5,
                            maxHeight: that.barHeight
                        });
                    }
                    if (that.onUpdate) {
                        that.onUpdate();
                    }
                }

                nv.utils.windowResize(updateChart);

                return chart;
            });
        }
    }
}