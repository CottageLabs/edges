import {Component} from "../core";
import {getParam} from "../utils";

export class ImportantNumbers extends Component {
    constructor(params) {
        super(params);

        this.main = getParam(params, "main", false);
        this.second = getParam(params, "second", false);

        this.calculate = getParam(params, "calculate", false);
    }

    synchronise() {
        // note we don't reset the values, as if calculate isn't set, we just stick with the
        // values provided
        if (this.calculate !== false) {
            var values = this.calculate(this);
            this.main = values.main;
            this.second = values.second;
        }
    }
}