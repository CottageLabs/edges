$.extend(true, edges, {
    bs3 : {
        newBasicRangeSelectorRenderer: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.BasicRangeSelectorRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.BasicRangeSelectorRenderer(params);
        },
        BasicRangeSelectorRenderer: function (params) {
            // if there are no results for a given range, should it be hidden
            this.hideEmptyRange = params.hideEmptyRange === undefined ? true : params.hideEmptyRange;

            // whether the facet should be open or closed
            // can be initialised and is then used to track internal state
            this.open = params.open || false;

            // whether to display selected filters
            this.showSelected = params.showSelected || true;

            // namespace to use in the page
            this.namespace = "edges-bs3-basic-range-selector";

            this.draw = function () {
                var results = "Loading...";

                // sort out all the classes that we're going to be using
                var resultClass = edges.css_classes(this.namespace, "result", this);
                var valClass = edges.css_classes(this.namespace, "value", this);
                var filterRemoveClass = edges.css_classes(this.namespace, "filter-remove", this);
                var facetClass = edges.css_classes(this.namespace, "facet", this);
                var headerClass = edges.css_classes(this.namespace, "header", this);

                var toggleId = edges.css_id(this.namespace, "toggle", this);
                var resultsId = edges.css_id(this.namespace, "results", this);

                // render a list of the values
                if (this.component.values.length > 0) {
                    results = "";

                    // if no filters have been set, render the values
                    if (this.component.filters.length === 0) {
                        for (var i = 0; i < this.component.values.length; i++) {
                            var val = this.component.values[i];
                            if (val.count > 0 || !this.hideEmptyRange) {
                                results += '<div class="' + resultClass + '"><a href="#" class="' + valClass + '" data-from="' + val.from + '" data-to="' + val.to + '">' +
                                    edges.escapeHtml(val.display) + "</a> (" + val.count + ")</div>";
                            }
                        }
                    }
                }

                // if we want the active filters, render them
                var filterFrag = "";
                if (this.component.filters.length > 0 && this.showSelected) {
                    for (var i = 0; i < this.component.filters.length; i++) {
                        var filt = this.component.filters[i];
                        filterFrag += '<div class="' + resultClass + '"><strong>' + edges.escapeHtml(filt.display) + "&nbsp;";
                        filterFrag += '<a href="#" class="' + filterRemoveClass + '" data-from="' + filt.from + '" data-to="' + filt.to + '">';
                        filterFrag += '<i class="glyphicon glyphicon-black glyphicon-remove"></i></a>';
                        filterFrag += "</strong></a></div>";
                    }
                }

                // render the overall facet
                var frag = '<div class="' + facetClass + '">\
                        <div class="' + headerClass + '"><div class="row"> \
                            <div class="col-md-12">\
                                <a href="#" id="' + toggleId + '"><i class="glyphicon glyphicon-plus"></i>&nbsp;' + edges.escapeHtml(this.component.display) + '</a>\
                            </div>\
                        </div></div>\
                        <div class="row" style="display:none" id="' + resultsId + '">\
                            <div class="col-md-12">\
                                {{SELECTED}}\
                                {{RESULTS}}\
                            </div>\
                        </div></div>';

                // substitute in the component parts
                frag = frag.replace(/{{RESULTS}}/g, results)
                    .replace(/{{SELECTED}}/g, filterFrag);

                // now render it into the page
                this.component.context.html(frag);

                this.setUIOpen();

                // sort out the selectors we're going to be needing
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);
                var valueSelector = edges.css_class_selector(this.namespace, "value", this);
                var filterRemoveSelector = edges.css_class_selector(this.namespace, "filter-remove", this);

                // for when the open button is clicked
                edges.on(toggleSelector, "click", this, "toggleOpen");
                // for when a value in the facet is selected
                edges.on(valueSelector, "click", this, "rangeSelected");
                // for when a filter remove button is clicked
                edges.on(filterRemoveSelector, "click", this, "removeFilter");
            };

            /////////////////////////////////////////////////////
            // UI behaviour functions

            this.setUIOpen = function () {
                // the selectors that we're going to use
                var resultsSelector = edges.css_id_selector(this.namespace, "results", this);
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);

                var results = this.component.jq(resultsSelector);
                var toggle = this.component.jq(toggleSelector);

                if (this.open) {
                    toggle.find("i").removeClass("glyphicon-plus").addClass("glyphicon-minus");
                    results.show();
                } else {
                    toggle.find("i").removeClass("glyphicon-minus").addClass("glyphicon-plus");
                    results.hide();
                }
            };

            /////////////////////////////////////////////////////
            // event handlers

            this.toggleOpen = function (element) {
                this.open = !this.open;
                this.setUIOpen();
            };

            this.rangeSelected = function (element) {
                var from = this.component.jq(element).attr("data-from");
                var to = this.component.jq(element).attr("data-to");
                this.component.selectRange(parseFloat(from), parseFloat(to));
            };

            this.removeFilter = function (element) {
                var from = this.component.jq(element).attr("data-from");
                var to = this.component.jq(element).attr("data-to");
                this.component.removeFilter(parseFloat(from), parseFloat(to));
            };

        }
    }
});
