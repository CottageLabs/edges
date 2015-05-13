$.extend(edges, {
    bs3 : {

        // main template function, producing something that looks like the
        // old facetview interface
        facetview : function(edge) {
            // the facet view object to be appended to the page
            var thefacetview = '<div id="facetview"><div class="row">';

            // if there are facets, give them span3 to exist, otherwise, take up all the space
            var facets = edge.category("selector");
            var facetContainers = "";

            if (facets.length > 0) {
                thefacetview += '<div class="col-md-3">\
                    <div id="facetview_filters" style="padding-top:45px;">{{FACETS}}</div>\
                </div>';
                thefacetview += '<div class="col-md-9" id="facetview_rightcol">';

                for (var i = 0; i < facets.length; i++) {
                    facetContainers += '<div id="' + facets[i].id + '"></div>';
                }
            } else {
                thefacetview += '<div class="col-md-12" id="facetview_rightcol">';
            }

            // for the moment, a place to stick the test chart
            thefacetview += '<div class="col-md-12"><div id="license"></div></div>';

            // insert the div within which the results actually will go
            thefacetview += '<div class="table table-striped table-bordered" id="results" dir="auto"></div>';

            /*
            // make space for the search options container at the top
            thefacetview += '<div class="facetview_search_options_container"></div>';

            // make space for the selected filters
            thefacetview += '<div style="margin-top: 20px"><div class="row"><div class="col-md-12"><div class="btn-toolbar" id="facetview_selectedfilters"></div></div></div></div>';

            // make space at the top for the pager
            thefacetview += '<div class="facetview_metadata" style="margin-top:20px;"></div>';

            // insert loading notification
            thefacetview += '<div class="facetview_searching" style="display:none"></div>'

            // insert the table within which the results actually will go
            thefacetview += '<div class="table table-striped table-bordered" id="facetview_results" dir="auto"></div>';

            // make space at the bottom for the pager
            thefacetview += '<div class="facetview_metadata"></div>';

            // debug window near the bottom
            if (edge.debug) {
                thefacetview += '<div class="facetview_debug" style="display:none"><textarea style="width: 95%; height: 300px"></textarea></div>'
            }
            */

            // close off all the big containers and return
            thefacetview += '</div></div></div>';

            thefacetview = thefacetview.replace(/{{FACETS}}/g, facetContainers);

            edge.context.html(thefacetview);
        },

        renderResultsDisplay : function(rd) {
            var edge = rd.edge;

            var results = "";
            if (edge.hasHits()) {
                for (var i = 0; i < edge.state.raw.hits.hits.length; i++) {
                    var hit = edge.state.raw.hits.hits[i];
                    results += '<div class="row"><div class="col-md-12">' + hit._id + '</div></div>';
                }
            }

            $("#" + rd.id, edge.context).html(results);
        },

        renderTermSelector : function(ts) {
            var edge = ts.edge;
            var results = "Loading...";
            if (edge.state.raw) {
                results = "";
                var buckets = edge.state.raw.aggregations[ts.id].buckets;
                for (var i = 0; i < buckets.length; i++) {
                    var bucket = buckets[i];
                    results += '<a href="#" class="edges_bs3_term_selector_term" data-key="' + edges.escapeHtml(bucket.key) + '">' +
                        edges.escapeHtml(bucket.key) + "</a> (" + bucket.doc_count + ")<br>";
                }
            }

            var frag = '<div class="row"> \
                        <div class="col-md-12">\
                            <strong>{{display}}</strong>\
                        </div>\
                    </div>\
                    <div class="row">\
                        <div class="col-md-12">\
                            {{results}}\
                        </div>\
                    </div>';

            frag = frag.replace(/{{display}}/g, ts.display)
                        .replace(/{{results}}/g, results);

            // now render it into the page
            $("#" + ts.id, edge.context).html(frag);

            // and set up the click bindings
            $(".edges_bs3_term_selector_term", edge.context).bind("click.edges_bs3_term_selector_term", edges.eventClosure(ts, "selectTerm"))
        }
    }
});
