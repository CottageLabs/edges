import {Renderer} from "../../core";
import {getParam, styleClasses} from "../../utils";

export class ChartDataTable extends Renderer {
    constructor(params) {
        super();

        this.includeHeaderRow = getParam(params, "includeHeaderRow", true);
        this.valueFormat = getParam(params, "valueFormat", false);
        this.labelFormat = getParam(params, "labelFormat", false);
        this.headerFormat = getParam(params, "headerFormat", false);

        this.namespace = "edges-bs3-chartdatatable";
    }

    draw() {
        if (!this.component.dataSeries) {
            this.component.context.html("Loading...");
            return;
        }

        let tableData = this._dataSeriesToTable();

        let headFrag = "";
        if (this.includeHeaderRow) {
            for (let i = 0; i < tableData.head.length; i++) {
                let header = tableData.head[i];
                headFrag += "<tr><td>" + header.join("</td><td>") + "</td></tr>";
            }
            headFrag = `<thead>${headFrag}</thead>`;
        }

        let bodyFrag = "";
        for (let i = 0; i < tableData.body.length; i++) {
            let row = tableData.body[i];
            bodyFrag += "<tr><td>" + row.join("</td><td>") + "</td></tr>";
        }

        let tableClass = styleClasses(this.namespace, "table", this);

        let frag = `
            <table class="${tableClass}">
                ${headFrag}
                <tbody>${bodyFrag}</tbody>
            </table>
        `;

        this.component.context.html(frag);
    }

    _dataSeriesToTable() {
        let ds = this.component.dataSeries;
        let table = {head: [], body: []};

        let headers = [""];
        for(let i = 0; i < ds.length; i++) {
            headers.push(this._headerFormat(ds[i].key));
        }
        table.head.push(headers);

        let ref = ds[0].values;
        for (let i = 0; i < ref.length; i++) {
            let refEntry = ref[i];
            let row = [this._labelFormat(refEntry.label)];
            for (let j = 0; j < ds.length; j++) {
                row.push(this._valueFormat(ds[j].values[i].value));
            }
            table.body.push(row)
        }

        return table;
    }

    _headerFormat(val) {
        if (!this.headerFormat) {
            return val;
        }
        return this.headerFormat(val);
    }

    _labelFormat(val) {
        if (!this.labelFormat) {
            return val;
        }
        return this.labelFormat(val);
    }

    _valueFormat(val) {
        if (!this.valueFormat) {
            return val;
        }
        return this.valueFormat(val);
    }
}