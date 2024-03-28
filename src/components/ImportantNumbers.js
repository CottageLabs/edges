// requires: edges
// requires: edges.util

edges.components.ImportantNumbers = class extends edges.Component {
    constructor(params) {
        super(params);

        this.main = edges.util.getParam(params, "main", false);
        this.second = edges.util.getParam(params, "second", false);

        this.calculate = edges.util.getParam(params, "calculate", false);
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