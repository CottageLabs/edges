$.extend(true, edges, {
    bs3 : {
        newTabularResultsRenderer: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.TabularResultsRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.TabularResultsRenderer(params);
        },
        TabularResultsRenderer: function (params) {

            //////////////////////////////////////////////
            // parameters that can be passed in

            // what to display when there are no results
            this.noResultsText = params.noResultsText || "No results to display";

            // if the field has no value, and no specific default is set, what should
            // the cell contain
            this.defaultCellContent = params.defaultCellContent || "-";

            // list of fields and column headers to display
            // [{field : "field", display : "Column header", default: "default cell content"}]
            this.fieldDisplay = params.fieldDisplay || [];

            //////////////////////////////////////////////
            // variables for internal state
            this.namespace = "edges-bs3-tabular-results";

            this.draw = function () {
                var frag = this.noResultsText;
                if (this.component.results === false) {
                    frag = "";
                }

                var results = this.component.results;
                if (results && results.length > 0) {
                    var frag = '<div class="table-responsive">';

                    // list the css classes we'll require
                    var tableClasses = edges.css_classes(this.namespace, "table", this);
                    var headerClasses = edges.css_classes(this.namespace, "header", this);
                    var cellClasses = edges.css_classes(this.namespace, "cell", this);

                    // render the table header
                    frag += '<table class="' + tableClasses + '"><thead><tr>_HEADERS_</tr></thead><tbody>';
                    var headers = "";
                    for (var i = 0; i < this.fieldDisplay.length; i++) {
                        var header = this.fieldDisplay[i].display;
                        headers += '<td class="' + headerClasses + '">' + header + '</td>';
                    }
                    frag = frag.replace(/_HEADERS_/g, headers);

                    // now go through each record and render the columns
                    for (var i = 0; i < results.length; i++) {
                        var res = results[i];
                        frag += "<tr>";
                        for (var j = 0; j < this.fieldDisplay.length; j++) {
                            var f = this.fieldDisplay[j];
                            var def = f.default ? f.default : this.defaultCellContent;
                            var val = edges.objVal(f.field, res, def);
                            var fieldClasses = edges.css_classes(this.namespace, "cell-" + edges.escapeHtml(f.field), this);
                            frag += '<td class="' + cellClasses + ' ' + fieldClasses + '">' + edges.escapeHtml(val) + '</td>';
                        }
                        frag += "</tr>";
                    }


                    // close off the table
                    frag += "</tbody></table></div>";
                }

                // and render into the page
                this.component.context.html(frag);
            }
        }
    }
});
