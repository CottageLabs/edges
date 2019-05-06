$.extend(true, edges, {
    bs3 : {
        newResultsDisplayRenderer: function (params) {
            if (!params) { params = {} }
            return edges.instantiate(edges.bs3.ResultsDisplayRenderer, params, edges.newRenderer);
        },
        ResultsDisplayRenderer: function (params) {

            //////////////////////////////////////////////
            // parameters that can be passed in

            // what to display when there are no results
            this.noResultsText = params.noResultsText || "No results to display";

            // ordered list of fields and display values
            // [{field: "field.name", display: "Display Name"]
            this.fieldDisplayMap = params.fieldDisplayMap || [];

            // if a multi-value field is found that needs to be displayed, which character
            // to use to join
            this.arrayValueJoin = params.arrayValueJoin || ", ";

            //////////////////////////////////////////////
            // variables for internal state

            this.renderFields = [];

            this.displayMap = {};

            this.namespace = "edges-bs3-results-display";

            this.init = function (component) {
                edges.up(this, "init", [component]);

                // read the fieldDisplayMap out into more readily usable internal variables
                if (this.fieldDisplayMap.length > 0) {
                    for (var i = 0; i < this.fieldDisplayMap.length; i++) {
                        this.renderFields.push(this.fieldDisplayMap[i].field);
                        this.displayMap[this.fieldDisplayMap[i].field] = this.fieldDisplayMap[i].display;
                    }
                }
            };

            this.draw = function () {
                var frag = this.noResultsText;
                if (this.component.results === false) {
                    frag = "";
                }

                var results = this.component.results;
                if (results && results.length > 0) {
                    // list the css classes we'll require
                    var recordClasses = edges.css_classes(this.namespace, "record", this);

                    // now call the result renderer on each result to build the records
                    frag = "";
                    for (var i = 0; i < results.length; i++) {
                        var rec = this._renderResult(results[i]);
                        frag += '<div class="row"><div class="col-md-12"><div class="' + recordClasses + '">' + rec + '</div></div></div>';
                    }
                }

                // finally stick it all together into the container
                var containerClasses = edges.css_classes(this.namespace, "container", this);
                var container = '<div class="' + containerClasses + '">' + frag + '</div>';
                this.component.context.html(container);
            };

            this._renderResult = function (res) {
                // list the css classes we'll require
                var rowClasses = edges.css_classes(this.namespace, "row", this);
                var fieldClasses = edges.css_classes(this.namespace, "field", this);
                var valueClasses = edges.css_classes(this.namespace, "value", this);

                // get a list of the fields on the object to display
                var fields = this.renderFields;
                if (fields.length === 0) {
                    fields = Object.keys(res);
                }

                // for each field, render the line with the field and the value side by side
                var frag = "";
                for (var i = 0; i < fields.length; i++) {
                    var field = fields[i];
                    var val = this._getValue(field, res);
                    if (field in this.displayMap) {
                        field = this.displayMap[field];
                    }
                    if (val) {
                        frag += '<div class="' + rowClasses + '"> \
                                <span class="' + fieldClasses + '">' + edges.escapeHtml(field) + '</span> \
                                <span class="' + valueClasses + '">' + edges.escapeHtml(val) + '</span> \
                            </div>';
                    }
                }

                return frag;
            };

            this._getValue = function (path, rec) {
                var bits = path.split(".");
                var val = rec;
                for (var i = 0; i < bits.length; i++) {
                    var field = bits[i];
                    if (field in val) {
                        val = val[field];
                    } else {
                        return false;
                    }
                }
                if ($.isArray(val)) {
                    val = val.join(this.arrayValueJoin);
                } else if ($.isPlainObject(val)) {
                    val = false;
                }
                return val;
            };
        }
    }
});
