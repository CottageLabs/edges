import {Renderer} from "../../core";
import {getParam, htmlID, idSelector, styleClasses} from "../../utils";
import {toXY} from "./nvd3utils";

export class StackedAreaChart extends Renderer {
    constructor(params) {
        super(params);

        this.title = getParam(params, "title", false);

        this.interactiveGuideline = getParam(params, "interactiveGuideline", true);
        this.xTickFormat = getParam(params, "xTickFormat", false);
        this.yTickFormat = getParam(params, "yTickFormat", false);
        this.transitionDuration = getParam(params, "transitionDuration", 500);
        this.showLegend = getParam(params, "showLegend", true);
        this.controls = getParam(params, "controls", true);
        this.color = getParam(params, "color", false);

        this.xAxisLabel = getParam(params, "xAxisLabel", "");
        this.yAxisLabel = getParam(params, "yAxisLabel", "");
        this.yAxisLabelDistance = getParam(params, "yAxisLabelDistance", 0);

        this.marginTop = getParam(params, "marginTop", 30);
        this.marginRight = getParam(params, "marginRight", 60);
        this.marginBottom = getParam(params, "marginBottom", 50);
        this.marginLeft = getParam(params, "marginLeft", 60);

        this.namespace = "edges-nvd3-stacked-area-chart";
    }

    draw() {
        var displayClasses = styleClasses(this.namespace, "display", this);
        var displayFrag = "";
        if (this.title) {
            displayFrag = '<span class="' + displayClasses + '">' + this.title + '</span><br>';
        }

        var svgId = htmlID(this.namespace, "svg", this);
        var svgSelector = idSelector(this.namespace, "svg", this);
        this.component.context.html(displayFrag + '<svg id="' + svgId + '"></svg>');

        var data_series = this.component.dataSeries;
        if (!data_series) {
            data_series = [];
        }
        var ds = toXY(data_series);

        var outer = this;
        nv.addGraph(function() {
            var chart = nv.models.stackedAreaChart()
                .useInteractiveGuideline(outer.useInteractiveGuideline)
                .showLegend(outer.showLegend)
                .margin({top: outer.marginTop, right: outer.marginRight, bottom: outer.marginBottom, left: outer.marginLeft})
                .rightAlignYAxis(true)
                .showControls(outer.controls)
                .clipEdge(true)
                .x(function(d) { return d.x })
                .y(function(d) { return d.y })

            if (outer.color) {
                chart.color(outer.color);
            }

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