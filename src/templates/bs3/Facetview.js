// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("templates")) { edges.templates = {}}
if (!edges.templates.hasOwnProperty("bs3")) { edges.templates.bs3 = {}}

edges.templates.bs3.Facetview = class extends edges.Template{
    constructor(params) {
        super(params);

        this.facetHeader = edges.util.getParam(params, "facetHeader", false);

        this.namespace = "edges-bs3-facetview";
        this.edge = false;
    }

    draw(edge) {
        this.edge = edge;

        let containerClass = edges.util.styleClasses(this.namespace, "container");
        let facetsClass = edges.util.styleClasses(this.namespace, "facets");
        let facetClass = edges.util.styleClasses(this.namespace, "facet");
        let panelClass = edges.util.styleClasses(this.namespace, "panel");
        let controllerClass = edges.util.styleClasses(this.namespace, "search-controller");
        let selectedFiltersClass = edges.util.styleClasses(this.namespace, "selected-filters");
        let pagerClass = edges.util.styleClasses(this.namespace, "pager");
        let searchingClass = edges.util.styleClasses(this.namespace, "searching");
        let resultsClass = edges.util.styleClasses(this.namespace, "results");
        let facetHeaderClass = edges.util.styleClasses(this.namespace, "facet-header");

        // the facet view object to be appended to the page
        let thefacetview = `<div class="${containerClass}"><div class="row">`;

        // if there are facets, give them span3 to exist, otherwise, take up all the space
        let facets = edge.category("facet");
        let facetContainers = "";

        if (facets.length > 0) {
            let facetHeader = "";
            if (this.facetHeader !== false) {
                facetHeader = `<div class="${facetHeaderClass}">${this.facetHeader}</div>`
            }
            thefacetview += `<div class="col-md-3">
                ${facetHeader}
                <div class="${facetsClass}">{{FACETS}}</div>
            </div>
            <div class="col-md-9" class="${panelClass}">`;

            for (let i = 0; i < facets.length; i++) {
                facetContainers += `<div class="${facetClass}"><div id="${facets[i].id}"></div></div>`;
            }
        } else {
            thefacetview += `<div class="col-md-12" class="${panelClass}">`;
        }

        // make space for the search options container at the top
        let controller = edge.category("controller");
        if (controller.length > 0) {
            for (let cont of controller) {
                thefacetview += `<div class="row">
                    <div class="col-md-12">
                        <div class="${controllerClass}">
                            <div id="${cont.id}"></div>
                        </div>
                    </div>
                </div>`;
            }
        }

        // make space for the selected filters
        let selectedFilters = edge.category("selected-filters");
        if (selectedFilters.length > 0) {
            thefacetview += `<div class="row">
                <div class="col-md-12">
                    <div class="${selectedFiltersClass}">
                        <div id="${selectedFilters[0].id}"></div>
                    </div>
                </div>
            </div>`;
        }

        // make space at the top for the page
        let topPagers = edge.category("top-pager");
        if (topPagers.length > 0) {
            thefacetview += `<div class="row">
                <div class="col-md-12">
                    <div class="${pagerClass}">
                        <div id="${topPagers[0].id}"></div>
                    </div>
                </div>
            </div>`;
        }

        // loading notification (note that the notification implementation is responsible for its own visibility)
        let loading = edge.category("searching-notification");
        if (loading.length > 0) {
            thefacetview += `<div class="row">
                <div class="col-md-12">
                    <div class="${searchingClass}">
                        <div id="${loading[0].id}"></div>
                    </div>
                </div>
            </div>`;
        }

        // insert the frame within which the results actually will go
        let results = edge.category("results");
        if (results.length > 0) {
            for (let i = 0; i < results.length; i++) {
                thefacetview += `<div class="row">
                    <div class="col-md-12">
                        <div class="${resultsClass}" dir="auto">
                            <div id="${results[i].id}"></div>
                        </div>
                    </div>
                </div>`;
            }
        }

        // make space at the bottom for the pager
        let bottomPagers = edge.category("bottom-pager");
        if (bottomPagers.length > 0) {
            thefacetview += `<div class="row">
                <div class="col-md-12">
                    <div class="${pagerClass}">
                        <div id="${bottomPagers[0].id}"></div>
                    </div>
                </div>
            </div>`;
        }

        // close off all the big containers and return
        thefacetview += `</div></div></div>`;
        thefacetview = thefacetview.replace(/{{FACETS}}/g, facetContainers);

        edge.context.html(thefacetview);
    }
}