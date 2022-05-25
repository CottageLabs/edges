import {Renderer} from "../../core";
import {getParam, styleClasses} from "../../utils";

export class RelativeSizeBars extends Renderer {
    constructor(params) {
        super(params);

        this.title = getParam(params, "title", false);
        this.countFormat = getParam(params, "countFormat", false);
        this.noResultsText = getParam(params, "noResultsText", "No data to display")
        this.valueMap = getParam(params, "valueMap", false);

        this.namespace = "edges-html-relativesizebars";
    }

    draw() {
        var title = "";
        if (this.title !== false) {
            let titleClass = styleClasses(this.namespace, "title", this);
            title = `<h4 class="${titleClass}">${this.title}</h4>`;
        }

        var data_series = this.component.dataSeries;
        if (!data_series || data_series.length === 0) {
            this.component.context.html(title + this.noResultsText);
            return;
        }

        // this renderer will only work on a single data series
        let ds = data_series[0];
        if (ds.values.length === 0) {
            this.component.context.html(title + this.noResultsText);
            return;
        }

        // first we need to find the largest value
        let max = 0;
        for (let i = 0; i < ds.values.length; i++) {
            let value = ds.values[i];
            if (value.value > max) {
                max = value.value;
            }
        }

        let rows = "";
        for (let i = 0; i < ds.values.length; i++) {
            let value = ds.values[i];
            let prog = this._calculateProgress(value.value, max);
            let count = value.value;
            if (this.countFormat) {
                count = this.countFormat(count);
            }
            let valueLabel = value.label;
            if (this.valueMap) {
                if (valueLabel in this.valueMap) {
                    valueLabel = this.valueMap[valueLabel];
                }
            }
            let label = `${valueLabel} (${count})`;
            rows += `<tr><td>
                <progress value="${prog}" max="100">${prog}</progress><br>
                ${label}
            </td></tr>`
        }

        let tableClass = styleClasses(this.namespace, "table", this);
        let frag = `${title}<br><table class="${tableClass}">${rows}</table>`;

        this.component.context.html(frag);
    }

    _calculateProgress(value, max) {
        if (max === 0) {
            return 100;
        }
        if (value < 0) {
            return 0;
        }
        return Math.floor((value / max) * 100);
    }
}