jQuery(document).ready(function($) {

    function earliestDate() {
        return new Date(0);
    }

    function latestDate() {
        return new Date();
    }

    var base_query = es.newQuery();
    base_query.addAggregation(
        es.newAggregation({
            name : "apc_count",
            type: "terms",
            body: {field: "monitor.dcterms:publisher.name.exact"},
            size : 10,
            aggregations : [
                es.newAggregation({
                    name : "publisher_stats",
                    type : "stats",
                    body: {field: "monitor.jm:apc.amount_gbp"}
                })
            ]
        })
    );

    e = edges.init({
        selector: "#edges",
        template: edges.bs3.newTabbed(),
        search_url: "http://localhost:9200/allapc/institutional/_search",
        baseQuery : base_query,
        components: [
            edges.newMultiDateRangeEntry({
                id : "date_range",
                fields : [
                    {field : "monitor.rioxxterms:publication_date", display: "Publication Date"},
                    {field : "monitor.jm:dateApplied", display: "APC Application"},
                    {field : "monitor.jm:apc.date_paid", display: "APC Paid"}
                ],
                earliest : {
                    "monitor.rioxxterms:publication_date" : earliestDate,
                    "monitor.jm:dateApplied" : earliestDate,
                    "monitor.jm:apc.date_paid" : earliestDate
                },
                latest : {
                    "monitor.rioxxterms:publication_date" : latestDate,
                    "monitor.jm:dateApplied" : latestDate,
                    "monitor.jm:apc.date_paid" : latestDate
                },
                category : "lhs"
            }),
            edges.newAutocompleteTermSelector({
                id : "publisher",
                field : "monitor.dcterms:publisher.name.exact",
                display : "Choose publishers to display",
                category: "lhs"
            }),
            edges.newBasicTermSelector({
                id: "institution",
                field: "monitor.jm:apc.name.exact",
                display: "Limit by Institution",
                size: 15,
                category: "lhs"
            }),
            edges.newHorizontalMultibar({
                id: "apc_count",
                display: "APC Count",
                dfArgs : {
                    useAggregations : ["apc_count"],
                    seriesKeys : {
                        "apc_count" : "Number of APCs paid"
                    }
                },
                category : "tab"
            }),
            edges.newHorizontalMultibar({
                id: "total_expenditure",
                display: "Total Expenditure",
                dataFunction : edges.ChartDataFunctions.termsStats({
                    useAggregations : ["apc_count publisher_stats"],  // the path to the stats in the terms, separated by space
                    seriesFor : ["sum"],
                    seriesKeys : {
                        "apc_count publisher_stats sum" : "Total Expenditure"
                    }
                }),
                category : "tab"
            }),
            edges.newHorizontalMultibar({
                id: "min_max_mean",
                display: "Min, Max, Mean",
                dataFunction : edges.ChartDataFunctions.termsStats({
                    useAggregations : ["apc_count publisher_stats"],
                    seriesFor : ["min", "max", "avg"],
                    seriesKeys : {
                        "apc_count publisher_stats min" : "Minimum",
                        "apc_count publisher_stats max" : "Maximum",
                        "apc_count publisher_stats avg" : "Mean"
                    }
                }),
                category : "tab"
            })
        ]
    });
});