requirejs.config({
    baseUrl: '../',
    paths: {
        jquery: 'vendor/jquery-1.11.1/jquery-1.11.1',
        "jquery-ui" : "vendor/jquery-ui-1.11.1/jquery-ui",
        select2 : "vendor/select2-3.5.1/select2.min",
        d3: "vendor/d3-v3/d3.min",
        nvd3: "vendor/nvd3-1.8.1/nv.d3",
        es : "src/es",
        edges : "src/edges",
        "edges-jquery" : "src/edges.jquery",
        "edges.charts" : "src/components/charts",
        "edges.maps" : "src/components/maps",
        "edges.ranges" : "src/components/ranges",
        "edges.search" : "src/components/search",
        "edges.selectors" : "src/components/selectors",
        "edges.bs3" : "src/renderers/bs3.edges",
        "edges.d3" : "src/renderers/d3.edges",
        "edges.google" : "src/renderers/google.edges",
        "edges.highcharts" : "src/renderers/highcharts.edges",
        "edges.nvd3" : "src/renderers/nvd3.edges"
    }
});

requirejs(["jquery"], function() {
    requirejs(["jquery-ui", "select2", "d3", "nvd3", "es", "edges-jquery"], function() {
        requirejs(["edges"], function() {
            requirejs(["edges.charts", "edges.maps", "edges.ranges", "edges.search", "edges.selectors", "edges.bs3", "edges.d3", "edges.google", "edges.highcharts", "edges.nvd3"], function() {

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
