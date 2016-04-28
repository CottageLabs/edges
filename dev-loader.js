requirejs.config({
    baseUrl: '',
    paths: {
        // the left side is the module ID,
        // the right side is the path to
        // the jQuery file, relative to baseUrl.
        // Also, the path should NOT include
        // the '.js' file extension. This example
        // is using jQuery 1.9.0 located at
        // js/lib/jquery-1.9.0.js, relative to
        // the HTML page.
        jquery: 'vendor/jquery-1.11.1/jquery-1.11.1',
        "jquery-ui" : "vendor/jquery-ui-1.11.1/jquery-ui",
        select2 : "vendor/select2-3.5.1/select2.min",
        d3: "vendor/d3-v3/d3.min",
        nvd3: "vendor/nvd3-1.8.1/nv.d3"

        /*
        shim : {
            "es" : ["jquery"],
            "edges" : ["jquery", "es"],
            "bs3.edges" : ["edges", "jquery", "jquery-ui", "select2"],
            "d3.edges" : ["edges", "jquery", "d3"],
            "google.edges" : ["edges", "jquery"],
            "nvd3.edges" : ["edges", "jquery", "nvd3"]
        }*/
    }
});

requirejs(["jquery"], function() {
    requirejs(["jquery-ui", "select2", "d3", "nvd3"], function() {
        requirejs(["es", "edges"], function() {
            requirejs(["bs3.edges", "d3.edges", "google.edges", "nvd3.edges"], function() {

                jQuery(document).ready(function($) {
                    e2 = edges.newEdge({
                        selector: "#facetview",
                        template: edges.bs3.newFacetview(),
                        search_url: "http://localhost:9200/doaj/article/_search",
                        manageUrl : false,
                        baseQuery : es.newQuery({
                            must: [es.newTermFilter({field: "index.classification.exact", value: "Medicine"})]
                        }),
                        openingQuery : es.newQuery({
                            size : 12,
                            queryString: {queryString: "obese", defaultOperator: "OR", defaultField: "index.unpunctitle"},
                            sort : {field: "index.publisher.exact", order: "asc"}
                        }),
                        components : [
                            edges.newRefiningANDTermSelector({
                                id: "publisher",
                                field: "index.publisher.exact",
                                display: "Publisher",
                                size: 10,
                                category: "facet"
                            }),
                            edges.newRefiningANDTermSelector({
                                id: "subject",
                                field: "index.classification.exact",
                                display: "Subject",
                                size: 10,
                                category: "facet"
                            }),
                            edges.newORTermSelector({
                                id: "country",
                                field : "index.country.exact",
                                display: "Country",
                                size: 200,
                                category: "facet",
                                renderer : edges.bs3.newORTermSelectorRenderer({
                                    showCount: true
                                })
                            }),
                            edges.newFullSearchController({
                                id: "search-controller",
                                category: "controller",
                                sortOptions : [
                                    {field: "index.asciiunpunctitle.exact", display: "Title"},
                                    {field: "index.publisher.exact", display: "Publisher"}
                                ],
                                fieldOptions : [
                                    {field: "index.unpunctitle", display: "Title"},
                                    {field: "index.publisher", display: "Publisher"}
                                ]
                            }),
                            edges.newSelectedFilters({
                                id: "selected-filters",
                                category: "selected-filters",
                                fieldDisplays : {
                                    "index.publisher.exact" : "Publisher",
                                    "index.classification.exact" : "Classification",
                                    "index.country.exact" : "Country"
                                }
                            }),
                            edges.newPager({
                                id: "top-pager",
                                category: "top-pager"
                            }),
                            edges.newPager({
                                id: "bottom-pager",
                                category: "bottom-pager"
                            }),
                            edges.newSearchingNotification({
                                id: "searching-notification",
                                category: "searching-notification"
                            }),
                            edges.newResultsDisplay({
                                id: "results",
                                category: "results",
                                renderer : edges.bs3.newResultsDisplayRenderer({
                                    fieldDisplayMap: [
                                        {field: "id", display: "ID"},
                                        {field: "bibjson.title", display: "Title"}
                                    ]
                                })
                            })
                        ]
                    });
                });
            })
        })
    })
});

/*
requirejs([
    "jquery", "jquery-ui", "vendor/select2-3.5.1/select2.min",
    "d3", "nvd3",
    "es", "edges", "bs3.edges", "d3.edges", "google.edges", "nvd3.edges"], function() {


});
    */