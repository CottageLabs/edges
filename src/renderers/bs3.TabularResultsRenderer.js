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

            // should the table display only render the fields listed in fieldDisplay, or should
            // it render them all, using the instructions in fieldDisplay only when they are present
            this.displayListedOnly = edges.getParam(params.displayListedOnly, true);

            // a function to explicitly order the header row
            this.headerOrderingFunction = edges.getParam(params.headerOrderingFunction, false);

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
                    var headerKeys = this._getHeaderRow();
                    var frag = '<div class="table-responsive">';

                    // list the css classes we'll require
                    var tableClasses = edges.css_classes(this.namespace, "table", this);
                    var headerClasses = edges.css_classes(this.namespace, "header", this);
                    var cellClasses = edges.css_classes(this.namespace, "cell", this);

                    // render the table header
                    frag += '<table class="' + tableClasses + '"><thead><tr>_HEADERS_</tr></thead><tbody>';

                    // translate the header keys to header display values
                    var headerDisplay = [];
                    for (var i = 0; i < headerKeys.length; i++) {
                        var trip = false;
                        for (var j = 0; j < this.fieldDisplay.length; j++) {
                            var fd = this._getFieldDisplay(headerKeys[i]);
                            if (fd) {
                                headerDisplay.push(fd.display);
                                trip = true;
                                break;
                            }
                        }
                        if (!trip) {
                            headerDisplay.push(headerKeys[i]);
                        }
                    }

                    // now render the row
                    var headers = "";
                    for (var i = 0; i < headerDisplay.length; i++) {
                        var header = headerDisplay[i];
                        headers += '<td class="' + headerClasses + '">' + header + '</td>';
                    }
                    frag = frag.replace(/_HEADERS_/g, headers);

                    // now go through each record and render the columns
                    for (var i = 0; i < results.length; i++) {
                        var res = results[i];
                        frag += "<tr>";
                        for (var j = 0; j < headerKeys.length; j++) {
                            var key = headerKeys[j];
                            var def = this.defaultCellContent;
                            var fd = this._getFieldDisplay(key);
                            if (fd) {
                                def = fd.default;
                            }
                            var val = edges.objVal(key, res, def);
                            var fieldClasses = edges.css_classes(this.namespace, "cell-" + edges.escapeHtml(key), this);
                            frag += '<td class="' + cellClasses + ' ' + fieldClasses + '">' + edges.escapeHtml(val) + '</td>';
                        }
                        frag += "</tr>";
                    }

                    // close off the table
                    frag += "</tbody></table></div>";
                }

                // and render into the page
                this.component.context.html(frag);
            };

            this._getFieldDisplay = function(field) {
                for (var j = 0; j < this.fieldDisplay.length; j++) {
                    if (this.fieldDisplay[j].field == field) {
                        return this.fieldDisplay[j];
                    }
                }
                return false;
            };

            this._getHeaderRow = function() {
                // if there's a header ordering function, let that do all the work
                if (this.headerOrderingFunction) {
                    return this.headerOrderingFunction(this);
                }

                // find out if we've got any results
                var results = this.component.results;
                var hasResults = results !== false && results.length > 0;

                // if there are no results and/or no fielddefinitions or instructions to use all fields, then no headers
                if (!hasResults || (this.fieldDisplay.length == 0 && this.displayListedOnly)) {
                    return [];
                }

                // first, any fields defined in the fieldDisplay list should be added in order
                var headers = [];
                if (this.fieldDisplay.length > 0) {
                    for (var i = 0; i < this.fieldDisplay.length; i++) {
                        headers.push(this.fieldDisplay[i].field);
                    }
                }

                // then, if we are displaying values not in the fieldDisplay list, sort them alphabetically
                // and append to the headers array
                if (!this.displayListedOnly) {
                    // mine all the result objects for keys, to be sure we have them all.
                    // use an object, to mock a Set.
                    var keySet = {};
                    for (var i = 0; i < results.length; i++) {
                        var ks = Object.keys(results[i]);
                        for (var j = 0; j < ks.length; j++) {
                            if (!(ks[j] in keySet)) {
                                keySet[ks[j]] = true;
                            }
                        }
                    }

                    var keys = Object.keys(keySet);
                    keys.sort();
                    for (var i = 0; i < keys.length; i++) {
                        if ($.inArray(keys[i], headers) == -1) {
                            headers.push(keys[i]);
                        }
                    }
                }

                return headers;
            };
        }
    }
});
