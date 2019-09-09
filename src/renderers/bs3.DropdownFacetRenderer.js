$.extend(true, edges, {
    bs3 : {
        newDropdownFacetRenderer: function (params) {
            return edges.instantiate(edges.bs3.DropdownFacetRenderer, params, edges.newRenderer);
        },
        DropdownFacetRenderer: function (params) {

            ///////////////////////////////////////
            // parameters that can be passed in

            // formatter for count display
            this.countFormat = edges.getParam(params.countFormat, false);

            // allow the user to set multiple filters
            this.multipleFilters = edges.getParam(params.multipleFilters, true);

            // display or not filters with zero values for the current search
            this.displayEmptyTerms = edges.getParam(params.displayEmptyTerms, true);

            // display the count value (can be a function that is evaluated for each term/count)
            this.displayCount = edges.getParam(params.displayCount, true);

            // namespace to use in the page
            this.namespace = "edges-bs3-dropdown-facet";

            this.draw = function () {
                // for convenient short references ...
                var ts = this.component;
                var namespace = this.namespace;

                // sort out all the classes that we're going to be using
                var containerClass = edges.css_classes(namespace, "container", this);
                var resultClass = edges.css_classes(namespace, "result", this);
                var valClass = edges.css_classes(namespace, "value", this);
                var removeClass = edges.css_classes(namespace, "remove", this);

                var buttonId = edges.css_id(namespace, "button", this);

                // this is what's displayed in the body if there are no results
                var results = '<li class="disabled">Loading...</li>';
                if ((ts.values !== undefined && ts.values !== false) || (ts.terms !== undefined && ts.terms !== false)) {
                    results = '<li class="disabled">No data available</li>';
                }

                // get the values (supporting both AND and OR selector apis)
                var values = [];
                if (ts.values) {
                    values = ts.values;
                } else if (ts.terms) {
                    values = ts.terms;
                }

                var filterTerms = [];
                var filterDisplays = [];
                if (ts.filters) {
                    filterTerms = ts.filters.map(function(x) { return x.term.toString() });
                    filterDisplays = ts.filters.map(function(x) {return x.display});
                } else if (ts.selected) {
                    filterTerms = ts.selected;
                    for (var i = 0; i < filterTerms.length; i++) {
                        var term = filterTerms[i];
                        for (var j = 0; j < values.length; j++) {
                            if (term === values[j].term.toString()) {
                                filterDisplays.push(values[j].display);
                            }
                        }
                    }
                }

                // render a list of the values
                if (values && values.length > 0) {
                    results = '<li class="dropdown-header">' + ts.display + '</li>';

                    if (filterTerms.length > 0) {
                        results += '<li class="' + resultClass + '"><a href="#" class="' + removeClass + '">\
                                Clear filter</a></li>';
                    }

                    // render each value, if it is not also a filter that has been set
                    var first = true;
                    for (var i = 0; i < values.length; i++) {
                        var val = values[i];
                        if ($.inArray(val.term.toString(), filterTerms) === -1) {   // the toString() helps us normalise other values, such as integers
                            var count = val.count;
                            if ((count === 0 && this.displayEmptyTerms) || count > 0) {
                                var displayCount = this.displayCount;
                                if (typeof displayCount === "function") {
                                    displayCount = displayCount(val.term, count, this);
                                }
                                var countFrag = "";
                                if (displayCount) {
                                    if (this.countFormat) {
                                        count = this.countFormat(count)
                                    }
                                    countFrag = " (" + count + ")";
                                }

                                if (first && filterTerms.length > 0) {
                                    results += '<li role="separator" class="divider"></li>';
                                    var filterHeader = this.multipleFilters ? "Add filter" : "Switch filter";
                                    results += '<li class="dropdown-header">' + filterHeader + '</li>';
                                    first = false;
                                }
                                results += '<li class="' + resultClass + '"><a href="#" class="' + valClass + '" data-key="' + edges.escapeHtml(val.term) + '">' +
                                    edges.escapeHtml(val.display) + countFrag + "</a></li>";
                            }
                        }
                    }
                }

                var resultFrag = '<ul class="dropdown-menu" aria-labelledby="' + buttonId + '"> \
                    ' + results + '\
                </ul>';

                // if we want the active filters, render them
                var filterFrag = ts.display;
                if (filterDisplays.length > 0) {
                    filterFrag = filterDisplays.join("; ");
                }

                var buttonFrag = '<button class="btn btn-sm btn-default dropdown-toggle" type="button" id="' + buttonId + '" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">\
                    ' + filterFrag + ' \
                    <span class="caret"></span> \
                </button>';

                var frag = '<div class="' + containerClass + '"><div class="dropdown">' + buttonFrag + resultFrag + '</div></div>';

                // now render it into the page
                ts.context.html(frag);

                // sort out the selectors we're going to be needing
                var valueSelector = edges.css_class_selector(namespace, "value", this);
                var filterRemoveSelector = edges.css_class_selector(namespace, "remove", this);

                // for when a value in the facet is selected
                edges.on(valueSelector, "click", this, "termSelected");
                // for when a filter remove button is clicked
                edges.on(filterRemoveSelector, "click", this, "removeFilter");
            };

            /////////////////////////////////////////////////////
            // event handlers

            this.termSelected = function (element) {
                var term = this.component.jq(element).attr("data-key");
                if (!this.multipleFilters) {
                    this.component.clearFilters({triggerQuery: false});
                }
                this.component.selectTerm(term);
            };

            this.removeFilter = function (element) {
                this.component.clearFilters({triggerQuery: true});
            };
        }
    }
});