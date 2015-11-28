var election = {
    electionEdge : false,

    create : function() {
        var e = edges.newEdge({
            selector: "#election",
            template: election.newElectionTemplate(),
            search_url: search_base_url + "constituencies/_search",
            openingQuery : es.newQuery({
                size: 0
            }),
            components : [
                // The constituency selector facet
                election.newConstituencySelector({
                    id: "constituency",
                    field : "constituency.exact",
                    display: "Select one or more constituencies",
                    size: 700,
                    lifecycle: "static",
                    renderer : edges.bs3.newORTermSelectorRenderer({
                        showCount: false,
                        hideEmpty: false,
                        open: true
                    })
                }),
                // The vote-share pie chart
                edges.newPieChart({
                    id : "vote-share",
                    display: "Party vote share across selected constituencies",
                    dataFunction: edges.ChartDataFunctions.totalledList({
                        listPath: "result",
                        seriesKey : "Vote Share",
                        keyField : "party",
                        valueField : "votes"
                    }),
                    renderer : edges.nvd3.newPieChartRenderer({
                        noDataMessage : "Select one or more constituencies from the list to see the party vote share"
                    })
                })
            ]
        });

        election.electionEdge = e;
    },

    newConstituencySelector : function(params) {
        if (!params) { params = {} }
        election.ConstituencySelector.prototype = edges.newORTermSelector(params);
        return new election.ConstituencySelector(params);
    },
    ConstituencySelector : function(params) {
        this.selectTerm = function(term) {
            var nq = this.edge.cloneQuery();

            // first find out if there was a terms filter already in place
            var filters = nq.listMust(es.newTermsFilter({field: this.field}));
            var minSize = 1;

            // if there is, just add the term to it
            if (filters.length > 0) {
                var filter = filters[0];
                filter.add_term(term);
                minSize = filter.term_count();
            } else {
                // otherwise, set the Terms Filter
                nq.addMust(es.newTermsFilter({
                    field: this.field,
                    values: [term]
                }));
            }

            // they query size should be at least as large as the number of
            // selected constituencies
            if (nq.size < minSize) {
                nq.size = minSize;
            }

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };

        this.removeFilter = function(term) {
            var nq = this.edge.cloneQuery();

            // first find out if there was a terms filter already in place
            var filters = nq.listMust(es.newTermsFilter({field: this.field}));
            var maxSize = 0;

            if (filters.length > 0) {
                var filter = filters[0];
                if (filter.has_term(term)) {
                    filter.remove_term(term);
                }
                maxSize = filter.term_count();
                if (!filter.has_terms()) {
                    nq.removeMust(es.newTermsFilter({field: this.field}));
                }
            }

            // the size does not need to be any larger than the number of terms
            // selected
            if (nq.size > maxSize) {
                nq.size = maxSize;
            }

            // reset the search page to the start and then trigger the next query
            nq.from = 0;
            this.edge.pushQuery(nq);
            this.edge.doQuery();
        };
    },

    newElectionTemplate : function(params) {
        if (!params) { params = {} }
        election.ElectionTemplate.prototype = edges.newTemplate(params);
        return new election.ElectionTemplate(params);
    },
    ElectionTemplate : function(params) {
        this.namespace = "election-template";

        this.draw = function(edge) {
            this.edge = edge;

            var frag = '<div class="row">\
                <div class="col-md-4">\
                    <div id="constituency"></div>\
                </div>\
                <div class="col-md-7">\
                    <div id="vote-share"></div>\
                </div>\
            </div>';

            edge.context.html(frag);
        }
    }
};


jQuery(document).ready(function($) {
    election.create();
});