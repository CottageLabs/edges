import {nv} from "../../../dependencies/nvd3"
import {d3} from "../../../dependencies/d3"

import {Renderer} from "../../core";
import {getParam, htmlID, idSelector, styleClasses} from "../../utils";
import {toXY, hasData} from "./nvd3utils";

export class MultibarRenderer extends Renderer {
    constructor(params) {
        super(params);

        this.xTickFormat = getParam(params, "xTickFormat", ",.2f");
        this.yTickFormat = getParam(params, "yTickFormat", ",.2f");

        this.stacked = getParam(params, "stacked", false);
        this.groupSpacing = getParam(params, "groupSpacing", 0.1);
        this.transitionDuration = getParam(params, "transitionDuration", 500);
        this.controls = getParam(params, "controls", false);
        this.barColor = getParam(params, "barColor", false);
        this.showLegend = getParam(params, "showLegend", true);
        this.xAxisLabel = getParam(params, "xAxisLabel", "");
        this.yAxisLabel = getParam(params, "yAxisLabel", "");
        this.yAxisLabelDistance = getParam(params, "yAxisLabelDistance", 0);

        this.marginTop = getParam(params, "marginTop", 30);
        this.marginRight = getParam(params, "marginRight", 20);
        this.marginBottom = getParam(params, "marginBottom", 50);
        this.marginLeft = getParam(params, "marginLeft", 60);

        this.hideIfNoData = getParam(params, "hideIfNoData", false);
        this.onHide = getParam(params, "onHide", false);
        this.onShow = getParam(params, "onShow", false);

        this.namespace = "edges-nvd3-multibar";
    }

    draw() {
        // first sort out the data series
        let data_series = this.component.dataSeries;
        if (!data_series) {
            data_series = [];
        }
        data_series = toXY(this.component.dataSeries);

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

        let svgId = htmlID(this.namespace, "svg", this);
        let svgSelector = idSelector(this.namespace, "svg", this);
        this.component.context.html('<svg id="' + svgId + '"></svg>');

        var that = this;
        nv.addGraph(function () {
            var chart = nv.models.multiBarChart()
                .showControls(that.controls)
                .margin({top: that.marginTop, right: that.marginRight, bottom: that.marginBottom, left: that.marginLeft})
                .stacked(that.stacked)
                .groupSpacing(that.groupSpacing);

            chart.xAxis
                .axisLabel(that.xAxisLabel)

            if (that.xTickFormat) {
                var fn = that.xTickFormat;
                if (typeof that.xTickFormat === "string") {
                    fn = d3.format(that.xTickFormat);
                }
                chart.xAxis.tickFormat(fn);
            }

            chart.yAxis
                .axisLabel(that.yAxisLabel)
                .axisLabelDistance(that.yAxisLabelDistance);

            if (that.yTickFormat) {
                var fn = that.yTickFormat;
                if (typeof that.yTickFormat === "string") {
                    fn = d3.format(that.yTickFormat);
                }
                chart.yAxis.tickFormat(fn);
            }

            if (that.barColor) {
                chart.barColor(that.barColor);
            }

            chart.showLegend(that.showLegend);

            d3.select(svgSelector)
                .datum(data_series)
                .transition().duration(that.transitionDuration).call(chart);

            nv.utils.windowResize(chart.update);

            return chart;
        });
    }
}