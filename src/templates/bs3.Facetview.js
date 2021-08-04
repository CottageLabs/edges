$.extend(true, edges, {

    bs3 : {
        // main template function, producing something that looks like the
        // old facetview interface
        newFacetview: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.Facetview.prototype = edges.newTemplate(params);
            return new edges.bs3.Facetview(params);
        },
        Facetview: function (params) {
            this.namespace = "edges-bs3-facetview";

            this.draw = function (edge) {
                this.edge = edge;

                // the classes we're going to need
                var containerClass = edges.css_classes(this.namespace, "container");
                var facetsClass = edges.css_classes(this.namespace, "facets");
                var facetClass = edges.css_classes(this.namespace, "facet");
                var panelClass = edges.css_classes(this.namespace, "panel");
                var controllerClass = edges.css_classes(this.namespace, "search-controller");
                var selectedFiltersClass = edges.css_classes(this.namespace, "selected-filters");
                var pagerClass = edges.css_classes(this.namespace, "pager");
                var searchingClass = edges.css_classes(this.namespace, "searching");
                var resultsClass = edges.css_classes(this.namespace, "results");

                // the facet view object to be appended to the page
                var thefacetview = '<div class="' + containerClass + '"><div class="row">';

                // if there are facets, give them span3 to exist, otherwise, take up all the space
                var facets = edge.category("facet");
                var facetContainers = "";

                if (facets.length > 0) {
                    thefacetview += '<div class="col-md-3">\
                        <div class="' + facetsClass + '">{{FACETS}}</div>\
                    </div>';
                    thefacetview += '<div class="col-md-9" class="' + panelClass + '">';

                    for (var i = 0; i < facets.length; i++) {
                        facetContainers += '<div class="' + facetClass + '"><div id="' + facets[i].id + '"></div></div>';
                    }
                } else {
                    thefacetview += '<div class="col-md-12" class="' + panelClass + '">';
                }

                // make space for the search options container at the top
                var controller = edge.category("controller");
                if (controller.length > 0) {
                    thefacetview += '<div class="row"><div class="col-md-12"><div class="' + controllerClass + '"><div id="' + controller[0].id + '"></div></div></div></div>';
                }

                // make space for the selected filters
                var selectedFilters = edge.category("selected-filters");
                if (selectedFilters.length > 0) {
                    thefacetview += '<div class="row">\
                                            <div class="col-md-12">\
                                                <div class="' + selectedFiltersClass + '"><div id="' + selectedFilters[0].id + '"></div></div>\
                                            </div>\
                                        </div>';
                }

                // make space at the top for the page
                var topPagers = edge.category("top-pager");
                if (topPagers.length > 0) {
                    thefacetview += '<div class="row"><div class="col-md-12"><div class="' + pagerClass + '"><div id="' + topPagers[0].id + '"></div></div></div></div>';
                }

                // loading notification (note that the notification implementation is responsible for its own visibility)
                var loading = edge.category("searching-notification");
                if (loading.length > 0) {
                    thefacetview += '<div class="row"><div class="col-md-12"><div class="' + searchingClass + '"><div id="' + loading[0].id + '"></div></div></div></div>'
                }

                // insert the frame within which the results actually will go
                var results = edge.category("results");
                if (results.length > 0) {
                    for (var i = 0; i < results.length; i++) {
                        thefacetview += '<div class="row"><div class="col-md-12"><div class="' + resultsClass + '" dir="auto"><div id="' + results[i].id + '"></div></div></div></div>';
                    }
                }

                // make space at the bottom for the pager
                var bottomPagers = edge.category("bottom-pager");
                if (bottomPagers.length > 0) {
                    thefacetview += '<div class="row"><div class="col-md-12"><div class="' + pagerClass + '"><div id="' + bottomPagers[0].id + '"></div></div></div></div>';
                }

                // close off all the big containers and return
                thefacetview += '</div></div></div>';

                thefacetview = thefacetview.replace(/{{FACETS}}/g, facetContainers);

                edge.context.html(thefacetview);
            };
        }
    }

});
