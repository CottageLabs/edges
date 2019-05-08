$.extend(true, edges, {
    bs3 : {
        newResultsFieldsByRowRenderer: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.ResultsFieldsByRowRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.ResultsFieldsByRowRenderer(params);
        },
        ResultsFieldsByRowRenderer: function (params) {

            //////////////////////////////////////////////
            // parameters that can be passed in

            // what to display when there are no results
            this.noResultsText = params.noResultsText || "No results to display";

            // ordered list of rows of fields with pre and post wrappers, and a value function
            // (all fields are optional)
            //
            // [
            // [
            //    {
            //        "pre": '<a href="mailto:',
            //        "field": "email",
            //        "post": '">',
            //        "valueFunction" : fn()
            //    },
            //    {
            //        "field": "email",
            //        "post": '</a>'
            //    }
            //],
            // ...
            // ]
            this.rowDisplay = params.rowDisplay || [];

            // if a multi-value field is found that needs to be displayed, which character
            // to use to join
            this.arrayValueJoin = params.arrayValueJoin || ", ";

            // if a field does not have a value, don't display anything from its part of the render
            this.omitFieldIfEmpty = edges.getParam(params.omitFieldIfEmpty, true);

            //////////////////////////////////////////////
            // variables for internal state

            this.renderFields = [];

            this.displayMap = {};

            this.namespace = "edges-bs3-results-fields-by-row";

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

                // get a list of the fields on the object to display
                var frag = "";
                for (var i = 0; i < this.rowDisplay.length; i++) {
                    var row = this.rowDisplay[i];
                    var rowFrag = "";
                    for (var j = 0; j < row.length; j++) {
                        var entry = row[j];
                        // first sort out the value, and make sure there is one
                        var val = "";
                        if (entry.field) {
                            val = this._getValue(entry.field, res, val);
                        }
                        if (val) {
                            val = edges.escapeHtml(val);
                        }
                        if (entry.valueFunction) {
                            val = entry.valueFunction(val, res, this);
                        }
                        if (!val && this.omitFieldIfEmpty) {
                            continue;
                        }

                        if (entry.pre) {
                            rowFrag += entry.pre;
                        }
                        rowFrag += val;
                        if (entry.post) {
                            rowFrag += entry.post;
                        }
                    }
                    frag += '<div class="' + rowClasses + '">' + rowFrag + '</div>';
                }

                return frag;
            };

            this._getValue = function (path, rec, def) {
                if (def === undefined) { def = false; }
                var bits = path.split(".");
                var val = rec;
                for (var i = 0; i < bits.length; i++) {
                    var field = bits[i];
                    if (field in val) {
                        val = val[field];
                    } else {
                        return def;
                    }
                }
                if ($.isArray(val)) {
                    val = val.join(this.arrayValueJoin);
                } else if ($.isPlainObject(val)) {
                    val = def;
                }
                return val;
            };
        }
    }
});
