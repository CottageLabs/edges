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

            this.title = edges.getParam(params.title, false);

            // what to display when there are no results
            this.noResultsText = params.noResultsText || "No results to display";

            // should the whole thing not display if there are no results
            this.hideOnNoResults = edges.getParam(params.hideOnNoResults, false);

            // if the field has no value, and no specific default is set, what should
            // the cell contain
            this.defaultCellContent = params.defaultCellContent || "-";

            // list of fields and column headers to display
            // [{field : "field|function", display : "Column header", default: "default cell content", valueFunction: <fn>}]
            this.fieldDisplay = params.fieldDisplay || [];

            // should the table display only render the fields listed in fieldDisplay, or should
            // it render them all, using the instructions in fieldDisplay only when they are present
            this.displayListedOnly = edges.getParam(params.displayListedOnly, true);

            // a function to explicitly order the header row
            this.headerOrderingFunction = edges.getParam(params.headerOrderingFunction, false);

            // should the table be sortable - if true, tablesorter will be used, and you need to include the dependency
            this.sortable = edges.getParam(params.sortable, false);

            this.download = edges.getParam(params.download, false);
            this.downloadText = edges.getParam(params.downloadText, "download");
            this.downloadPrefix = edges.getParam(params.downloadPrefix, "download");

            //////////////////////////////////////////////
            // variables for internal state
            this.namespace = "edges-bs3-tabular-results";

            this.draw = function () {
                // have the title in hand for later use
                var title = "";
                if (this.title !== false) {
                    title = this.title;
                }

                var frag = "";
                if (this.component.results === false || this.component.results.length === 0) {
                    if (this.hideOnNoResults) {
                        return;
                    } else {
                        // set up our no-results situation, which will be the default if no results
                        // are actually available
                        var noResultsClass = edges.css_classes(this.namespace, "no-results", this);
                        frag = '<div class="row"><div class="col-md-12">' + title + '<div class="' + noResultsClass + '">' + this.noResultsText + '</div></div></div>';

                        // and render into the page
                        this.component.context.html(frag);
                    }
                } else {
                    var results = this.component.results;
                    var headerKeys = this._getHeaderRow();

                    // list the css classes we'll require
                    var tableClasses = edges.css_classes(this.namespace, "table", this);
                    var headerClasses = edges.css_classes(this.namespace, "header", this);
                    var cellClasses = edges.css_classes(this.namespace, "cell", this);
                    var downloadClasses = edges.css_classes(this.namespace, "download", this);
                    var tableDivClasses = edges.css_classes(this.namespace, "tablediv", this);

                    var downloadId = edges.css_id(this.namespace, "download", this);

                    var down = "";
                    if (this.download) {
                        down = '<div class="row"><div class="col-md-12"><div class="' + downloadClasses + '"><a href="#" id="' + downloadId +
                            '">' + edges.escapeHtml(this.downloadText) + '</a></div></div></div>';
                    }

                    frag = title + '<div class="table-responsive ' + tableDivClasses + '">';

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
                        var headerFieldClasses = edges.css_classes(this.namespace, "header-" + edges.safeId(header), this);
                        headers += '<th class="' + headerClasses + ' ' + headerFieldClasses + '">' + header + '</th>';
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
                            if (fd && fd.default) {
                                def = fd.default;
                            }

                            var val = "";
                            if (fd.fieldFunction) {
                                val = fd.fieldFunction({result: res, default: def});
                            } else {
                                val = edges.objVal(key, res, def);
                            }

                            if (fd.valueFunction) {
                                val = fd.valueFunction(val, res);
                            } else {
                                val = edges.escapeHtml(val);
                            }
                            var fieldClasses = edges.css_classes(this.namespace, "cell-" + edges.safeId(key), this);
                            frag += '<td class="' + cellClasses + ' ' + fieldClasses + '">' + val + '</td>';
                        }
                        frag += "</tr>";
                    }

                    // close off the table
                    frag += "</tbody></table></div>" + down;

                    // and render into the page
                    this.component.context.html(frag);

                    if (this.sortable) {
                        var tableSelector = edges.css_class_selector(this.namespace, "table", this);
                        var jqTable = this.component.context.find(tableSelector);
                        jqTable.tablesorter();
                    }

                    // bind the download link if necessary
                    if (this.download) {
                        var downloadIdSelector = edges.css_id_selector(this.namespace, "download", this);
                        edges.on(downloadIdSelector, "click", this, "doDownload");
                    }
                }
            };

            this.doDownload = function(element) {
                if (!this.download) {
                    return;
                }

                var downloadInfo = this._downloadData();
                var blob = new Blob([downloadInfo.data], {type: downloadInfo.fileType});
                var url = window.URL.createObjectURL(blob);

                // Create link.
                var a = document.createElement( "a" );
                document.body.appendChild( a );
                a.style = "display: none";
                a.href = url;
                a.download = downloadInfo.fileName;

                // Trigger click of link.
                a.click();

                // Clear.
                window.URL.revokeObjectURL( url );
            };

            this._downloadData = function() {
                if (!this.download) {
                    return false;
                }

                var table = [];
                var results = this.component.results;

                if (results && results.length > 0) {
                    var headerKeys = this._getHeaderRow();

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

                    table.push(headerDisplay);

                    // now go through each record and append the rows
                    for (var i = 0; i < results.length; i++) {
                        var res = results[i];
                        var row = [];
                        for (var j = 0; j < headerKeys.length; j++) {
                            var key = headerKeys[j];
                            var val = edges.objVal(key, res, "");
                            row.push(val);
                        }
                        table.push(row);
                    }
                }

                var data = edges.csv.serialise({data: table});

                // Set MIME type and encoding.
                var fileType = "text/csv;charset=UTF-8";
                var extension = "csv";

                // Set file name.
                var stamp = new Date().getTime();
                var fileName = this.downloadPrefix + "_" + stamp + "." + extension;


                return {data : data, fileType: fileType, fileName: fileName};
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
