requirejs.config({
    baseUrl: '../',
    paths: {
        jquery: 'vendor/jquery-1.11.1/jquery-1.11.1',
        "jquery-ui" : "vendor/jquery-ui-1.11.1/jquery-ui",
        select2 : "vendor/select2-3.5.1/select2.min",
        d3: "vendor/d3-v3/d3.min",
        nvd3: "vendor/nvd3-1.8.1/nv.d3",
        papa : "vendor/PapaParse-4.1.2/papaparse.min",
        moment : edges_base + "vendor/bootstrap-daterangepicker-2.1.22/moment.min",
        daterangepicker: "vendor/bootstrap-daterangepicker-2.1.22/daterangepicker",

        es : "src/es",
        edges : "src/edges",
        "edges-jquery" : "src/edges.jquery",
        "edges.csv" : "src/edges.csv",

        "edges.charts" : "src/components/charts",
        "edges.maps" : "src/components/maps",
        "edges.ranges" : "src/components/ranges",
        "edges.search" : "src/components/search",
        "edges.selectors" : "src/components/selectors",
        "edges.tables" : "src/components/tables",

        "edges.bs3.facetview" : "src/templates/bs3.Facetview",
        "edges.bs3.tabbed" : "src/templates/bs3.Tabbed",

        "edges.bs3.basicrangeselector" : "src/renderers/bs3.BasicRangeSelectorRenderer",
        "edges.bs3.bsmultidaterange" : "src/renderers/bs3.BSMultiDateRange",
        "edges.bs3.bsmultidaterangefacet" : "src/renderers/bs3.BSMultiDateRangeFacet",
        "edges.bs3.compactselectedfilters" : "src/renderers/bs3.CompactSelectedFiltersRenderer",
        "edges.bs3.facetfiltersetter" : "src/renderers/bs3.FacetFilterSetterRenderer",
        "edges.bs3.fullsearchcontroller" : "src/renderers/bs3.FullSearchControllerRenderer",
        "edges.bs3.multidaterange" : "src/renderers/bs3.MultiDateRangeRenderer",
        "edges.bs3.nseparateorterm" : "src/renderers/bs3.NSeparateORTermSelectorRenderer",
        "edges.bs3.numericrangeentry" : "src/renderers/bs3.NumericRangeEntryRenderer",
        "edges.bs3.ortermselector" : "src/renderers/bs3.ORTermSelectorRenderer",
        "edges.bs3.pager" : "src/renderers/bs3.PagerRenderer",
        "edges.bs3.refiningandtermselector" : "src/renderers/bs3.RefiningANDTermSelectorRenderer",
        "edges.bs3.resultcountrenderer" : "src/renderers/bs3.ResultCountRenderer",
        "edges.bs3.resultsdisplay" : "src/renderers/bs3.ResultsDisplayRenderer",
        "edges.bs3.searchbox" : "src/renderers/bs3.SearchBoxRenderer",
        "edges.bs3.searchingnotification" : "src/renderers/bs3.SearchingNotificationRenderer",
        "edges.bs3.selectedfilters" : "src/renderers/bs3.SelectedFiltersRenderer",
        "edges.bs3.sort" : "src/renderers/bs3.SortRenderer",
        "edges.bs3.tabularresults" : "src/renderers/bs3.TabularResultsRenderer",

        // "edges.bs3" : "src/renderers/bs3.edges",
        "edges.d3" : "src/renderers/d3.edges",
        "edges.google" : "src/renderers/google.edges",
        "edges.highcharts" : "src/renderers/highcharts.edges",
        "edges.nvd3" : "src/renderers/nvd3.edges"
    }
});

requirejs(["jquery", "moment"], function() {
    requirejs(["jquery-ui", "select2", "d3", "nvd3", "es", "edges-jquery", "papa", "daterangepicker"], function() {
        requirejs(["edges"], function() {
            requirejs([
                "edges.csv",
                "edges.charts",
                "edges.maps",
                "edges.ranges",
                "edges.search",
                "edges.selectors",
                "edges.tables",

                "edges.bs3.facetview",
                "edges.bs3.tabbed",

                "edges.bs3.basicrangeselector",
                "edges.bs3.bsmultidaterange",
                "edges.bs3.bsmultidaterangefacet",
                "edges.bs3.compactselectedfilters",
                "edges.bs3.facetfiltersetter",
                "edges.bs3.fullsearchcontroller",
                "edges.bs3.multidaterange",
                "edges.bs3.nseparateorterm",
                "edges.bs3.numericrangeentry",
                "edges.bs3.ortermselector",
                "edges.bs3.pager",
                "edges.bs3.refiningandtermselector",
                "edges.bs3.resultcountrenderer",
                "edges.bs3.resultsdisplay",
                "edges.bs3.searchbox",
                "edges.bs3.searchingnotification",
                "edges.bs3.selectedfilters",
                "edges.bs3.sort",
                "edges.bs3.tabularresults",

                "edges.d3",
                "edges.google",
                "edges.highcharts",
                "edges.nvd3"
            ], function() {

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
