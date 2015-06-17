$.extend(edges, {
    bs3 : {

        newTabbed : function(params) {
            if (!params) { params = {} }
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
                    tabContents += '<div class="edges-tabbed-container" id="' + containerId + '">\
                            <div class="row">\
                                <div class="col-md-12"> \
                                    <div class="tab" id="' + tab.id + '"></div>\
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
            if (!params) { params = {} }
            edges.bs3.Facetview.prototype = edges.newTemplate(params);
            return new edges.bs3.Facetview(params);
        },
        Facetview : function(params) {
            // after search, the results will fade in over this number of milliseconds
            this.fadeIn = params.fadeIn || 800;

            this.draw = function(edge) {
                // the facet view object to be appended to the page
                var thefacetview = '<div id="edges-facetview"><div class="row">';

                // if there are facets, give them span3 to exist, otherwise, take up all the space
                var facets = edge.category("facet");
                var facetContainers = "";

                if (facets.length > 0) {
                    thefacetview += '<div class="col-md-3">\
                        <div id="edges-facetivew-filters" style="padding-top:45px;">{{FACETS}}</div>\
                    </div>';
                    thefacetview += '<div class="col-md-9" id="edges-facetview-panel">';

                    for (var i = 0; i < facets.length; i++) {
                        facetContainers += '<div id="' + facets[i].id + '"></div>';
                    }
                } else {
                    thefacetview += '<div class="col-md-12" id="edges-facetview-panel">';
                }

                // make space for the search options container at the top
                var controller = edge.category("controller");
                if (controller.length > 0) {
                    thefacetview += '<div id="edges-faceview-search-controller"><div id="' + controller[0].id + '"></div></div>';
                }

                // make space for the selected filters
                var selectedFilters = edge.category("selected-filters");
                if (selectedFilters.length > 0) {
                    thefacetview += '<div style="margin-top: 20px"> \
                                        <div class="row">\
                                            <div class="col-md-12">\
                                                <div class="btn-toolbar" id="edges-facetview-selected-filters"><div id="' + selectedFilters[0].id + '"></div></div>\
                                            </div>\
                                        </div>\
                                    </div>';
                }

                // make space at the top for the page
                var topPagers = edge.category("top-pager");
                if (topPagers.length > 0) {
                    thefacetview += '<div class="edges-facetview-pager" style="margin-top:20px;"><div id="' + topPagers[0].id + '"></div></div>';
                }

                // loading notification
                var loading = edge.category("searching-notification");
                if (loading.length > 0) {
                    thefacetview += '<div class="edges-facetview-searching" style="display:none"><div id="' + loading[0].id + '"></div></div>'
                }

                // insert the frame within which the results actually will go
                var results = edge.category("results");
                if (results.length > 0) {
                    thefacetview += '<div class="table table-striped table-bordered" id="edges-facetivew-results" dir="auto"><div id="' + results[0].id + '"></div></div>';
                }

                // make space at the bottom for the pager
                var bottomPagers = edge.category("bottom-pager");
                if (bottomPagers.length > 0) {
                    thefacetview += '<div class="edges-facetview-pager" style="margin-top:20px;"><div id="' + bottomPagers[0].id + '"></div></div>';
                }

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
                for (var i = 0; i < edge.state.result.data.hits.hits.length; i++) {
                    var hit = edge.state.result.data.hits.hits[i];
                    results += '<div class="row"><div class="col-md-12">' + hit._id + '</div></div>';
                }
            }

            $("#" + rd.id, edge.context).html(results);
        },

        newBasicTermSelectorRenderer : function(params) {
            if (!params) { params = {} }
            edges.bs3.BasicTermSelectorRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.BasicTermSelectorRenderer(params);
        },
        BasicTermSelectorRenderer : function(params) {
            this.ts = false;

            this.draw = function(ts) {
                this.ts = ts;

                var edge = ts.edge;
                var results = "Loading...";
                if (edge.state.result) {
                    results = "";
                    var buckets = edge.state.result.data.aggregations[ts.id].buckets;
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
                $(".edges_bs3_term_selector_term", edge.context).bind("click.edges_bs3_term_selector_term", edges.eventClosure(this, "termSelected"))
            };

            this.termSelected = function(element) {
                var term = $(element).attr("data-key");
                this.ts.selectTerm(term);
            };
        },

        newSearchControllerRenderer : function(params) {
            if (!params) { params = {} }
            edges.bs3.SearchControllerRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.SearchControllerRenderer(params);
        },
        SearchControllerRenderer : function(params) {
            // enable the search button
            this.searchButton = params.searchButton || false;

            // amount of time between finishing typing and when a query is executed from the search box
            this.freetextSubmitDelay = params.freetextSubmitDelay || 500;

            ////////////////////////////////////////
            // state variables

            this.showShortUrl = false;
        },

        newMultiDateRangeRenderer : function(params) {
            if (!params) { params = {} }
            edges.bs3.MultiDateRangeRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.MultiDateRangeRenderer(params);
        },
        MultiDateRangeRenderer : function(params) {
            this.dre = false;

            this.selectId = false;
            this.fromId = false;
            this.toId = false;

            this.selectJq = false;
            this.fromJq = false;
            this.toJq = false;

            this.draw = function(dre) {
                this.dre = dre;

                this.selectId = dre.id + "_date-type";
                this.fromId = dre.id + "_date-from";
                this.toId = dre.id + "_date-to";

                var options = "";
                for (var i = 0; i < dre.fields.length; i++) {
                    var field = dre.fields[i];
                    var selected = dre.currentField == field.field ? ' selected="selected" ' : "";
                    options += '<option value="' + field.field + '"' + selected + '>' + field.display + '</option>';
                }

                var frag = '<select class="multi-date-range-select" name="' + this.selectId + '" id="' + this.selectId + '">' + options + '</select><br>';

                frag += '<label for="' + this.fromId + '">From</label>\
                    <input class="multi-date-range-input" type="text" name="' + this.fromId + '" id="' + this.fromId + '" placeholder="earliest date">\
                    <label for="' + this.toId + '">To</label>\
                    <input class="multi-date-range-input" type="text" name="' + this.toId + '" id="' + this.toId + '" placeholder="latest date">';

                this.dre.edge.jq("#" + dre.id).html(frag);

                this.selectJq = this.dre.edge.jq("#" + this.selectId);
                this.fromJq = this.dre.edge.jq("#" + this.fromId);
                this.toJq = this.dre.edge.jq("#" + this.toId);

                // populate and set the bindings on the date selectors
                this.fromJq.datepicker({
                    dateFormat: "dd-mm-yy",
                    constrainInput: true,
                    changeYear: true,
                    maxDate: 0
                }).bind("change", edges.eventClosure(this, "dateChanged"));

                this.toJq.datepicker({
                    dateFormat: "dd-mm-yy",
                    constrainInput: true,
                    defaultDate: 0,
                    changeYear: true,
                    maxDate: 0
                }).bind("change", edges.eventClosure(this, "dateChanged"));

                this.selectJq.select2().bind("change", edges.eventClosure(this, "dateChanged"));

                this.prepDates();
            };

            this.dateChanged = function(element) {
                // a date or type has been changed, so set up the parent object

                // ensure that the correct field is set (it may initially be not set)
                var date_type = this.selectJq.select2("val");
                this.dre.changeField(date_type);

                var fr = this.fromJq.val();
                if (fr) {
                    fr = $.datepicker.parseDate("dd-mm-yy", fr);
                    fr = $.datepicker.formatDate("yy-mm-dd", fr);
                    this.dre.setFrom(fr);
                } else {
                    this.dre.setFrom(false);
                }

                var to = this.toJq.val();
                if (to) {
                    to = $.datepicker.parseDate("dd-mm-yy", to);
                    to = $.datepicker.formatDate("yy-mm-dd", to);
                    this.dre.setTo(to);
                } else {
                    this.dre.setTo(false);
                }

                // this action should trigger a search (the parent object will
                // decide if that's required)
                this.dre.triggerSearch();
            };

            this.prepDates = function() {
                var min = this.dre.currentEarliest();
                var max = this.dre.currentLatest();
                var fr = this.dre.fromDate;
                var to = this.dre.toDate;

                if (min) {
                    this.fromJq.datepicker("option", "minDate", min);
                    this.fromJq.datepicker("option", "defaultDate", min);
                    this.toJq.datepicker("option", "minDate", min);
                }

                if (max) {
                    this.fromJq.datepicker("option", "maxDate", max);
                    this.toJq.datepicker("option", "maxDate", max);
                    this.toJq.datepicker("option", "defaultDate", max);
                }

                if (fr) {
                    fr = $.datepicker.parseDate("yy-mm-dd", fr);
                    fr = $.datepicker.formatDate("dd-mm-yy", fr);
                    this.fromJq.val(fr);
                }

                if (to) {
                    to = $.datepicker.parseDate("yy-mm-dd", to);
                    to = $.datepicker.formatDate("dd-mm-yy", to);
                    this.toJq.val(to);
                }
            };
        }
    }
});
