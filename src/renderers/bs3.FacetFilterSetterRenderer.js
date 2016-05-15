$.extend(true, edges, {
    bs3 : {
        newFacetFilterSetterRenderer: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.FacetFilterSetterRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.FacetFilterSetterRenderer(params);
        },
        FacetFilterSetterRenderer: function (params) {
            // whether the facet should be open or closed
            // can be initialised and is then used to track internal state
            this.open = edges.getParam(params.open, false);

            // whether the facet can be opened and closed
            this.togglable = edges.getParam(params.togglable, true);

            // whether the count should be displayed along with the term
            // defaults to false because count may be confusing to the user in an OR selector
            this.showCount = edges.getParam(params.showCount, true);

            // The display title for the facet
            this.facetTitle = edges.getParam(params.facetTitle, "Untitled");

            // namespace to use in the page
            this.namespace = "edges-bs3-facet-filter-setter";

            this.draw = function () {
                // for convenient short references ...
                var comp = this.component;
                var namespace = this.namespace;

                // sort out all the classes that we're going to be using
                var filterClass = edges.css_classes(namespace, "filter", this);
                var valClass = edges.css_classes(namespace, "value", this);
                var filterRemoveClass = edges.css_classes(namespace, "filter-remove", this);
                var facetClass = edges.css_classes(namespace, "facet", this);
                var headerClass = edges.css_classes(namespace, "header", this);

                var toggleId = edges.css_id(namespace, "toggle", this);
                var resultsId = edges.css_id(namespace, "results", this);

                var filters = "";
                for (var i = 0; i < comp.filters.length; i++) {
                    var filter = comp.filters[i];
                    var id = filter.id;
                    var display = filter.display;
                    var count = comp.filter_counts[id];
                    var active = comp.active_filters[id];

                    if (count === undefined) {
                        count = 0;
                    }

                    filters += '<div class="' + filterClass + '">';

                    if (active) {
                        filters += '<strong>' + edges.escapeHtml(display);
                        if (this.showCount) {
                            filters += " (" + count + ")";
                        }
                        filters += '&nbsp;<a href="#" class="' + filterRemoveClass + '" data-filter="' + edges.escapeHtml(id) + '">';
                        filters += '<i class="glyphicon glyphicon-black glyphicon-remove"></i></a>';
                        filters += "</strong>";
                    } else {
                        filters += '<a href="#" class="' + valClass + '" data-filter="' + edges.escapeHtml(id) + '">' + edges.escapeHtml(display) + "</a>";
                        if (this.showCount) {
                            filters += " (" + count + ")";
                        }
                    }

                    filters += "</div>";
                }

                // render the toggle capability
                var tog = "";
                if (this.togglable) {
                    tog = '<a href="#" id="' + toggleId + '"><i class="glyphicon glyphicon-plus"></i>&nbsp;';
                }

                // render the overall facet
                var frag = '<div class="' + facetClass + '">\
                        <div class="' + headerClass + '"><div class="row"> \
                            <div class="col-md-12">\
                                ' + tog + this.facetTitle + '</a>\
                            </div>\
                        </div></div>\
                        <div class="row" style="display:none" id="' + resultsId + '">\
                            <div class="col-md-12">\
                                {{FILTERS}}\
                            </div>\
                        </div></div>';

                // substitute in the component parts
                frag = frag.replace(/{{FILTERS}}/g, filters);

                // now render it into the page
                comp.context.html(frag);

                // trigger all the post-render set-up functions
                this.setUIOpen();

                // sort out the selectors we're going to be needing
                var valueSelector = edges.css_class_selector(namespace, "value", this);
                var filterRemoveSelector = edges.css_class_selector(namespace, "filter-remove", this);
                var toggleSelector = edges.css_id_selector(namespace, "toggle", this);

                // for when a value in the facet is selected
                edges.on(valueSelector, "click", this, "filterSelected");
                // for when the open button is clicked
                edges.on(toggleSelector, "click", this, "toggleOpen");
                // for when a filter remove button is clicked
                edges.on(filterRemoveSelector, "click", this, "removeFilter");
            };

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

            this.filterSelected = function (element) {
                var filter_id = this.component.jq(element).attr("data-filter");
                this.component.addFilter(filter_id);
            };

            this.removeFilter = function (element) {
                var filter_id = this.component.jq(element).attr("data-filter");
                this.component.removeFilter(filter_id);
            };

            this.toggleOpen = function (element) {
                this.open = !this.open;
                this.setUIOpen();
            };
        }
    }
});
