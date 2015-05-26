jQuery(document).ready(function($) {

    function earliestDate() {

    }

    function latestDate() {

    }

    e = edges.init({
        selector: "#edges",
        template: edges.bs3.newTabbed(),
        search_url: "http://localhost:9200/allapc/institutional/_search",
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
                aggregations : [
                    es.newAggregation({
                        name : "apc_count",
                        type: "terms",
                        body: {field: "monitor.dcterms:publisher.name.exact"},
                        size : 10
                    })
                ],
                seriesKeys : {
                    "apc_count" : "Number of APCs paid"
                },
                category : "tab"
            }),
            edges.newHorizontalMultibar({
                id: "total_expenditure",
                display: "Total Expenditure",
                aggregations : [
                    es.newAggregation({
                        name : "total_expenditure_term",
                        type: "terms",
                        body: {field: "monitor.dcterms:publisher.name.exact"},
                        size : 10,
                        aggregations : [
                            es.newAggregation({
                                name : "total_expenditure_stats",
                                type : "stats",
                                body: {field: "monitor.jm:apc.amount_gbp"}
                            })
                        ]
                    })
                ],
                seriesKeys : {
                    "total_expenditure_stats" : "Total Expenditure"
                },
                category : "tab"
            }),
            edges.newHorizontalMultibar({
                id: "min_max_mean",
                display: "Min, Max, Mean",
                aggregations : [
                    es.newAggregation({
                        name : "min_max_mean_term",
                        type: "terms",
                        body: {field: "monitor.dcterms:publisher.name.exact"},
                        size : 10,
                        aggregations : [
                            es.newAggregation({
                                name : "min_max_mean_stats",
                                type : "stats",
                                body: {field: "monitor.jm:apc.amount_gbp"}
                            })
                        ]
                    })
                ],
                seriesKeys : {
                    "total_expenditure_stats" : "Min, Max, Mean"
                },
                category : "tab"
            })
        ]
    });
});