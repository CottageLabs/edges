$.extend(edges, {
    bs3 : {

        newTabbed : function(params) {
            edges.bs3.Tabbed.prototype = edges.newTemplate(params);
            return new edges.bs3.Tabbed(params);
        },
        Tabbed : function(params) {
            // later we'll store the edge instance here
            this.edge = false;

            // bits that are hidden off-screen
            this.hidden = {};

            this.hideOffScreen = function(selector) {
                var el = $(selector, this.edge.context);
                if (selector in this.hidden) { return }
                this.hidden[selector] = {"position" : el.css("position"), "margin" : el.css("margin-left")};
                $(selector, this.edge.context).css("position", "absolute").css("margin-left", -9999);
            };

            this.bringIn = function(selector) {
                var pos = this.hidden[selector].position;
                var mar = this.hidden[selector].margin;
                $(selector, this.edge.context).css("position", pos).css("margin-left", mar);
                delete this.hidden[selector];
            };

            this.activateTab = function(activate) {
                var tabs = this.edge.category("tab");
                for (var i = 0; i < tabs.length; i++) {
                    var tab = tabs[i];
                    if (tab.id === activate) {
                        this.bringIn("#edges-tabbed-container-" + tab.id);
                        $("#edges-tabbed-tab-" + tab.id, this.edge.context).parent().addClass("active");
                    } else {
                        this.hideOffScreen("#edges-tabbed-container-" + tab.id);
                        $("#edges-tabbed-tab-" + tab.id, this.edge.context).parent().removeClass("active");
                    }
                }
            };

            this.tabClicked = function(element) {
                var id = $(element).attr("data-id");
                this.activateTab(id);
            };

            this.draw = function(edge) {
                this.edge = edge;

                // a simple nav-down-the-left, with arbitrary tabs in the main panel
                var view = '<div id="edges-tabbed-view"><div class="row">';

                // the left-hand-side controls
                var lhs = edge.category("lhs");
                var controlContainers = "";

                if (lhs.length > 0) {
                    view += '<div class="col-md-3">\
                        <div id="edges-tabbed-controls" style="padding-top:45px;">{{CONTROLS}}</div>\
                    </div>';
                    view += '<div class="col-md-9" id="edges-tabbed-panel">';

                    for (var i = 0; i < lhs.length; i++) {
                        controlContainers += '<div id="' + lhs[i].id + '"></div>';
                    }
                } else {
                    view += '<div class="col-md-12" id="edges-tabbed-panel">';
                }

                // tabs required
                var tabs = edge.category("tab");

                view += '<div class="row">\
                        <div class="col-md-12">\
                            <ul class="nav nav-tabs">{{TABS}}</ul>\
                        </div>\
                    </div>';

                var tabLabels = "";
                var tabContents = "";
                var tabIds = [];
                for (var i = 0; i < tabs.length; i++) {
                    var tab = tabs[i];
                    var containerId = "edges-tabbed-container-" + tab.id;
                    tabIds.push(tab.id);
                    tabLabels += '<li><a href="#" id="edges-tabbed-tab-' + tab.id + '" data-id="' + tab.id + '"><strong>' + tab.display + '</strong></a></li>';
                    tabContents += '<div id="' + containerId + '">\
                            <div class="row">\
                                <div class="col-md-12"> \
                                    <div id="' + tab.id + '"></div>\
                                </div> \
                            </div>\
                        </div>';
                }

                view += "{{TAB_CONTENTS}}</div></div>";

                view = view.replace(/{{CONTROLS}}/g, controlContainers);
                view = view.replace(/{{TABS}}/g, tabLabels);
                view = view.replace(/{{TAB_CONTENTS}}/g, tabContents);

                edge.context.html(view);

                // hide the graphs while while they are rendered
                // (note we use this approach, as setting display:none produces weird effects
                // in space-conscious displays like graphs
                for (var i = 0; i < tabIds.length; i++) {
                    this.hideOffScreen("#edges-tabbed-container-" + tabIds[i]);
                }

                // set up the initial tab to view
                var startWith = tabIds[0];
                this.activateTab(startWith);

                // now bind the click handler to the tabs
                for (var i = 0; i < tabIds.length; i++) {
                    $("#edges-tabbed-tab-" + tabIds[i], this.edge.context).click(edges.eventClosure(this, "tabClicked"));
                }
            }
        },

        // main template function, producing something that looks like the
        // old facetview interface
        newFacetview : function(params) {
            edges.bs3.Facetview.prototype = edges.newTemplate(params);
            return new edges.bs3.Facetview(params);
        },
        Facetview : function(params) {
            this.draw = function(edge) {
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
            }
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

        renderBasicTermSelector : function(ts) {
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
        },

        renderMultiDateRangeEntry : function(dre) {

        }
    }
});
