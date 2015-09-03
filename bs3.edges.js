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

            this.namespace = "edges-bs3-tabbed";

            this.draw = function(edge) {
                this.edge = edge;

                // a simple nav-down-the-left, with arbitrary tabs in the main panel
                var view = '<div id="edges-tabbed-view">{{TOPSTRAP}}<div class="row">';

                // the top strap controls
                var topstrap = edge.category("top");
                var topContainers = "";
                if (topstrap.length > 0) {
                    for (var i = 0; i < topstrap.length; i++) {
                        topContainers += '<div class="row"><div class="col-md-12"><div id="' + topstrap[i].id + '"></div></div></div>';
                    }
                }

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
                view = view.replace(/{{TOPSTRAP}}/g, topContainers);

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
            };

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
        },

        // main template function, producing something that looks like the
        // old facetview interface
        newFacetview : function(params) {
            if (!params) { params = {} }
            edges.bs3.Facetview.prototype = edges.newTemplate(params);
            return new edges.bs3.Facetview(params);
        },
        Facetview : function(params) {
            this.namespace = "edges-bs3-facetview";

            this.draw = function(edge) {
                this.edge = edge;

                // the classes we're going to need
                var containerClass = edges.css_classes(this.namespace, "container");
                var facetsClass = edges.css_classes(this.namespace, "facets");
                var facetClass = edges.css_classes(this.namespace, "facet");
                var panelClass = edges.css_classes(this.namespace, "panel");
                var controllerClass = edges.css_classes(this.namespace, "search-controller");
                var selectedFiltersClass = edges.css_classes(this.namespace, "selected-filters");
                var pagerClass = edges.css_classes(this.namespace, "pager");
                var searchingClass = edges.css_classes(this.namespace, "searching");
                var resultsClass = edges.css_classes(this.namespace, "results");

                // the facet view object to be appended to the page
                var thefacetview = '<div class="' + containerClass + '"><div class="row">';

                // if there are facets, give them span3 to exist, otherwise, take up all the space
                var facets = edge.category("facet");
                var facetContainers = "";

                if (facets.length > 0) {
                    thefacetview += '<div class="col-md-3">\
                        <div class="' + facetsClass + '">{{FACETS}}</div>\
                    </div>';
                    thefacetview += '<div class="col-md-9" class="' + panelClass + '">';

                    for (var i = 0; i < facets.length; i++) {
                        facetContainers += '<div class="' + facetClass + '"><div id="' + facets[i].id + '"></div></div>';
                    }
                } else {
                    thefacetview += '<div class="col-md-12" class="' + panelClass + '">';
                }

                // make space for the search options container at the top
                var controller = edge.category("controller");
                if (controller.length > 0) {
                    thefacetview += '<div class="row"><div class="col-md-12"><div class="' + controllerClass + '"><div id="' + controller[0].id + '"></div></div></div></div>';
                }

                // make space for the selected filters
                var selectedFilters = edge.category("selected-filters");
                if (selectedFilters.length > 0) {
                    thefacetview += '<div class="row">\
                                            <div class="col-md-12">\
                                                <div class="' + selectedFiltersClass + '"><div id="' + selectedFilters[0].id + '"></div></div>\
                                            </div>\
                                        </div>';
                }

                // make space at the top for the page
                var topPagers = edge.category("top-pager");
                if (topPagers.length > 0) {
                    thefacetview += '<div class="row"><div class="col-md-12"><div class="' + pagerClass + '"><div id="' + topPagers[0].id + '"></div></div></div></div>';
                }

                // loading notification (note that the notification implementation is responsible for its own visibility)
                var loading = edge.category("searching-notification");
                if (loading.length > 0) {
                    thefacetview += '<div class="row"><div class="col-md-12"><div class="' + searchingClass + '"><div id="' + loading[0].id + '"></div></div></div></div>'
                }

                // insert the frame within which the results actually will go
                var results = edge.category("results");
                if (results.length > 0) {
                    thefacetview += '<div class="row"><div class="col-md-12"><div class="' + resultsClass + '" dir="auto"><div id="' + results[0].id + '"></div></div></div></div>';
                }

                // make space at the bottom for the pager
                var bottomPagers = edge.category("bottom-pager");
                if (bottomPagers.length > 0) {
                    thefacetview += '<div class="row"><div class="col-md-12"><div class="' + pagerClass + '"><div id="' + bottomPagers[0].id + '"></div></div></div></div>';
                }

                // close off all the big containers and return
                thefacetview += '</div></div></div>';

                thefacetview = thefacetview.replace(/{{FACETS}}/g, facetContainers);

                edge.context.html(thefacetview);
            };
        },

        newResultsDisplayRenderer : function(params) {
            if (!params) { params = {} }
            edges.bs3.ResultsDisplayRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.ResultsDisplayRenderer(params);
        },
        ResultsDisplayRenderer : function(params) {

            //////////////////////////////////////////////
            // parameters that can be passed in

            // what to display when there are no results
            this.noResultsText = params.noResultsText || "No results to display";

            // ordered list of fields and display values
            // [{field: "field.name", display: "Display Name"}]
            this.fieldDisplayMap = params.fieldDisplayMap || [];

            // if a multi-value field is found that needs to be displayed, which character
            // to use to join
            this.arrayValueJoin = params.arrayValueJoin || ", ";

            //////////////////////////////////////////////
            // variables for internal state

            this.renderFields = [];

            this.displayMap = {};

            this.namespace = "edges-bs-results-display";

            this.init = function(component) {
                this.__proto__.init.call(this, component);

                // read the fieldDisplayMap out into more readily usable internal variables
                if (this.fieldDisplayMap.length > 0) {
                    for (var i = 0; i < this.fieldDisplayMap.length; i++) {
                        this.renderFields.push(this.fieldDisplayMap[i].field);
                        this.displayMap[this.fieldDisplayMap[i].field] = this.fieldDisplayMap[i].display;
                    }
                }
            };

            this.draw = function() {
                var frag = this.noResultsText;
                var results = this.component.results;

                if (results.length > 0) {
                    // list the css classes we'll require
                    var recordClasses = edges.css_classes(this.namespace, "record", this);

                    // now call the result renderer on each result to build the records
                    frag = "";
                    for (var i = 0; i < results.length; i++) {
                        var rec = this._renderResult(results[i]);
                        frag += '<div class="row"><div class="col-md-12"><div class="' + recordClasses + '">' + rec + '</div></div></div>';
                    }
                }

                // finally stick it all together into the container
                var containerClasses = edges.css_classes(this.namespace, "container", this);
                var container = '<div class="' + containerClasses + '">' + frag + '</div>';
                this.component.context.html(container);
            };

            this._renderResult = function(res) {
                // list the css classes we'll require
                var rowClasses = edges.css_classes(this.namespace, "row", this);
                var fieldClasses = edges.css_classes(this.namespace, "field", this);
                var valueClasses = edges.css_classes(this.namespace, "value", this);

                // get a list of the fields on the object to display
                var fields = this.renderFields;
                if (fields.length === 0) {
                    fields = Object.keys(res);
                }

                // for each field, render the line with the field and the value side by side
                var frag = "";
                for (var i = 0; i < fields.length; i++) {
                    var field = fields[i];
                    var val = this._getValue(field, res);
                    if (field in this.displayMap) {
                        field = this.displayMap[field];
                    }
                    if (val) {
                        frag += '<div class="' + rowClasses + '"> \
                                <span class="' + fieldClasses + '">' + edges.escapeHtml(field) + '</span> \
                                <span class="' + valueClasses + '">' + edges.escapeHtml(val) + '</span> \
                            </div>';
                    }
                }

                return frag;
            };

            this._getValue = function(path, rec) {
                var bits = path.split(".");
                var val = rec;
                for (var i = 0; i < bits.length; i++) {
                    var field = bits[i];
                    if (field in val) {
                        val = val[field];
                    } else {
                        return false;
                    }
                }
                if ($.isArray(val)) {
                    val = val.join(this.arrayValueJoin);
                } else if ($.isPlainObject(val)) {
                    val = false;
                }
                return val;
            };
        },

        newRefiningANDTermSelectorRenderer : function(params) {
            if (!params) { params = {} }
            edges.bs3.RefiningANDTermSelectorRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.RefiningANDTermSelectorRenderer(params);
        },
        RefiningANDTermSelectorRenderer : function(params) {

            ///////////////////////////////////////
            // parameters that can be passed in

            // whether to hide or just disable the facet if below deactivate threshold
            this.hideInactive = params.hideInactive || false;

            // should the facet sort/size controls be shown?
            this.controls = params.controls || true;

            // whether the facet should be open or closed
            // can be initialised and is then used to track internal state
            this.open = params.open || false;

            // whether to display selected filters
            this.showSelected = params.showSelected || true;

            // sort cycle to use
            this.sortCycle = params.sortCycle || ["count desc", "count asc", "term desc", "term asc"];

            // namespace to use in the page
            this.namespace = "edges-bs3-refiningand-term-selector";

            this.draw = function() {
                // for convenient short references ...
                var ts = this.component;
                var namespace = this.namespace;

                // sort out all the classes that we're going to be using
                var resultClass = edges.css_classes(namespace, "result", this);
                var valClass = edges.css_classes(namespace, "value", this);
                var controlClass = edges.css_classes(namespace, "controls", this);
                var filterRemoveClass = edges.css_classes(namespace, "filter-remove", this);
                var facetClass = edges.css_classes(namespace, "facet", this);
                var headerClass = edges.css_classes(namespace, "header", this);

                var controlId = edges.css_id(namespace, "controls", this);
                var sizeId = edges.css_id(namespace, "size", this);
                var orderId = edges.css_id(namespace, "order", this);
                var toggleId = edges.css_id(namespace, "toggle", this);
                var resultsId = edges.css_id(namespace, "results", this);

                // this is what's displayed in the body if there are no results
                var results = "Loading...";

                // render a list of the values
                if (ts.values.length > 0) {
                    results = "";

                    // get the terms of the filters that have already been set
                    var filterTerms = [];
                    for (var i = 0; i < ts.filters.length; i++) {
                        filterTerms.push(ts.filters[i].term.toString());
                    }

                    // render each value, if it is not also a filter that has been set
                    for (var i = 0; i < ts.values.length; i++) {
                        var val = ts.values[i];
                        if ($.inArray(val.term.toString(), filterTerms) === -1) {   // the toString() helps us normalise other values, such as integers
                            results += '<div class="' + resultClass + '"><a href="#" class="' + valClass + '" data-key="' + edges.escapeHtml(val.term) + '">' +
                                edges.escapeHtml(val.display) + "</a> (" + val.count + ")</div>";
                        }
                    }
                }

                // if we want to display the controls, render them
                var controlFrag = "";
                if (this.controls) {
                    var ordering = '<a href="#" title=""><i class="glyphicon glyphicon-arrow-up"></i></a>';
                    controlFrag = '<div class="' + controlClass + '" style="display:none" id="' + controlId + '"><div class="row"> \
                        <div class="col-md-12">\
                            <div class="btn-group">\
                                <button class="btn btn-default btn-sm" id="' + sizeId + '" title="List Size" href="#">0</button> \
                                <button class="btn btn-default btn-sm" id="' + orderId + '" title="List Order" href="#"></button> \
                            </div>\
                        </div>\
                    </div></div>';
                }

                // if we want the active filters, render them
                var filterFrag = "";
                if (ts.filters.length > 0 && this.showSelected) {
                    for (var i = 0; i < ts.filters.length; i++) {
                        var filt = ts.filters[i];
                        filterFrag += '<div class="' + resultClass + '"><strong>' + edges.escapeHtml(filt.display) + "&nbsp;";
                        filterFrag += '<a href="#" class="' + filterRemoveClass + '" data-key="' + edges.escapeHtml(filt.term) + '">';
                        filterFrag += '<i class="glyphicon glyphicon-black glyphicon-remove"></i></a>';
                        filterFrag += "</strong></a></div>";
                    }
                }

                // render the overall facet
                var frag = '<div class="' + facetClass + '">\
                        <div class="' + headerClass + '"><div class="row"> \
                            <div class="col-md-12">\
                                <a href="#" id="' + toggleId + '"><i class="glyphicon glyphicon-plus"></i>&nbsp;' + ts.display + '</a>\
                            </div>\
                        </div></div>\
                        {{CONTROLS}}\
                        <div class="row" style="display:none" id="' + resultsId + '">\
                            <div class="col-md-12">\
                                {{SELECTED}}\
                                {{RESULTS}}\
                            </div>\
                        </div></div>';

                // substitute in the component parts
                frag = frag.replace(/{{RESULTS}}/g, results)
                        .replace(/{{CONTROLS}}/g, controlFrag)
                        .replace(/{{SELECTED}}/g, filterFrag);

                // now render it into the page
                ts.context.html(frag);

                // trigger all the post-render set-up functions
                this.setUISize();
                this.setUISort();
                this.setUIOpen();

                // sort out the selectors we're going to be needing
                var valueSelector = edges.css_class_selector(namespace, "value", this);
                var filterRemoveSelector = edges.css_class_selector(namespace, "filter-remove", this);
                var toggleSelector = edges.css_id_selector(namespace, "toggle", this);
                var sizeSelector = edges.css_id_selector(namespace, "size", this);
                var orderSelector = edges.css_id_selector(namespace, "order", this);

                // for when a value in the facet is selected
                edges.on(valueSelector, "click", this, "termSelected");
                 // for when the open button is clicked
                edges.on(toggleSelector, "click", this, "toggleOpen");
                // for when a filter remove button is clicked
                edges.on(filterRemoveSelector, "click", this, "removeFilter");
                // for when a size change request is made
                edges.on(sizeSelector, "click", this, "changeSize");
                // when a sort order request is made
                edges.on(orderSelector, "click", this, "changeSort");
            };

            /////////////////////////////////////////////////////
            // UI behaviour functions

            this.setUIOpen = function() {
                // the selectors that we're going to use
                var resultsSelector = edges.css_id_selector(this.namespace, "results", this);
                var controlsSelector = edges.css_id_selector(this.namespace, "controls", this);
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);

                var results = this.component.jq(resultsSelector);
                var controls = this.component.jq(controlsSelector);
                var toggle = this.component.jq(toggleSelector);

                if (this.open) {
                    toggle.find("i").removeClass("glyphicon-plus").addClass("glyphicon-minus");
                    controls.show();
                    results.show();
                } else {
                    toggle.find("i").removeClass("glyphicon-minus").addClass("glyphicon-plus");
                    controls.hide();
                    results.hide();
                }
            };

            this.setUISize = function() {
                var sizeSelector = edges.css_id_selector(this.namespace, "size", this);
                this.component.jq(sizeSelector).html(this.component.size);
            };

            this.setUISort = function() {
                var orderSelector = edges.css_id_selector(this.namespace, "order", this);
                var el = this.component.jq(orderSelector);

                if (this.component.orderBy === "count") {
                    if (this.component.orderDir === "asc") {
                        el.html('count <i class="glyphicon glyphicon-arrow-down"></i>');
                    } else if (this.component.orderDir === "desc") {
                        el.html('count <i class="glyphicon glyphicon-arrow-up"></i>');
                    }
                } else if (this.component.orderBy === "term") {
                    if (this.component.orderDir === "asc") {
                        el.html('a-z <i class="glyphicon glyphicon-arrow-down"></i>');
                    } else if (this.component.orderDir === "desc") {
                        el.html('a-z <i class="glyphicon glyphicon-arrow-up"></i>');
                    }
                }
            };

            /////////////////////////////////////////////////////
            // event handlers

            this.termSelected = function(element) {
                var term = this.component.jq(element).attr("data-key");
                this.component.selectTerm(term);
            };

            this.removeFilter = function(element) {
                var term = this.component.jq(element).attr("data-key");
                this.component.removeFilter(term);
            };

            this.toggleOpen = function(element) {
                this.open = !this.open;
                this.setUIOpen();
            };

            this.changeSize = function(element) {
                var newSize = prompt('Currently displaying ' + this.component.size +
                    ' results per page. How many would you like instead?');
                if (newSize) {
                    this.component.changeSize(parseInt(newSize));
                }
            };

            this.changeSort = function(element) {
                var current = this.component.orderBy + " " + this.component.orderDir;
                var idx = $.inArray(current, this.sortCycle);
                var next = this.sortCycle[(idx + 1) % 4];
                var bits = next.split(" ");
                this.component.changeSort(bits[0], bits[1]);
            };
        },

        newORTermSelectorRenderer : function(params) {
            if (!params) { params = {} }
            edges.bs3.ORTermSelectorRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.ORTermSelectorRenderer(params);
        },
        ORTermSelectorRenderer : function(params) {
            // whether the facet should be open or closed
            // can be initialised and is then used to track internal state
            this.open = params.open || false;

            // whether the count should be displayed along with the term
            // defaults to false because count may be confusing to the user in an OR selector
            this.showCount = params.showCount || false;

            // namespace to use in the page
            this.namespace = "edges-bs3-or-term-selector";

            this.draw = function() {
                // for convenient short references ...
                var ts = this.component;
                var namespace = this.namespace;

                // sort out all the classes that we're going to be using
                var resultClass = edges.css_classes(namespace, "result", this);
                var valClass = edges.css_classes(namespace, "value", this);
                var filterRemoveClass = edges.css_classes(namespace, "filter-remove", this);
                var facetClass = edges.css_classes(namespace, "facet", this);
                var headerClass = edges.css_classes(namespace, "header", this);
                var selectionsClass = edges.css_classes(namespace, "selections", this);

                var toggleId = edges.css_id(namespace, "toggle", this);
                var resultsId = edges.css_id(namespace, "results", this);

                // this is what's displayed in the body if there are no results
                var results = "Loading...";

                // render a list of the values
                if (ts.terms.length > 0) {
                    results = "";

                    // render each value, if it is not also a filter that has been set
                    for (var i = 0; i < ts.terms.length; i++) {
                        var val = ts.terms[i];
                        if ($.inArray(val.term.toString(), ts.selected) === -1) {   // the toString() helps us normalise other values, such as integers
                            results += '<div class="' + resultClass + '"><a href="#" class="' + valClass + '" data-key="' + edges.escapeHtml(val.term) + '">' +
                                edges.escapeHtml(val.display) + "</a>";
                            if (this.showCount) {
                                results +=  " (" + val.count + ")";
                            }
                            results += "</div>";
                        }
                    }
                }

                // if we want the active filters, render them
                var filterFrag = "";
                if (ts.selected.length > 0) {
                    for (var i = 0; i < ts.selected.length; i++) {
                        var filt = ts.selected[i];
                        var def = this._getFilterDef(filt);
                        if (def) {
                            filterFrag += '<div class="' + resultClass + '"><strong>' + edges.escapeHtml(def.display);
                            if (this.showCount) {
                                filterFrag +=  " (" + def.count + ")";
                            }
                            filterFrag += '&nbsp;<a href="#" class="' + filterRemoveClass + '" data-key="' + edges.escapeHtml(def.term) + '">';
                            filterFrag += '<i class="glyphicon glyphicon-black glyphicon-remove"></i></a>';
                            filterFrag += "</strong></a></div>";
                        }
                    }
                }

                // render the overall facet
                var frag = '<div class="' + facetClass + '">\
                        <div class="' + headerClass + '"><div class="row"> \
                            <div class="col-md-12">\
                                <a href="#" id="' + toggleId + '"><i class="glyphicon glyphicon-plus"></i>&nbsp;' + ts.display + '</a>\
                            </div>\
                        </div></div>\
                        <div class="row" style="display:none" id="' + resultsId + '">\
                            <div class="col-md-12">\
                                {{SELECTED}}\
                            </div>\
                            <div class="col-md-12"><div class="' + selectionsClass + '">\
                                {{RESULTS}}\
                            </div></div>\
                        </div></div>';

                // substitute in the component parts
                frag = frag.replace(/{{RESULTS}}/g, results)
                        .replace(/{{SELECTED}}/g, filterFrag);

                // now render it into the page
                ts.context.html(frag);

                // trigger all the post-render set-up functions
                this.setUIOpen();

                // sort out the selectors we're going to be needing
                var valueSelector = edges.css_class_selector(namespace, "value", this);
                var filterRemoveSelector = edges.css_class_selector(namespace, "filter-remove", this);
                var toggleSelector = edges.css_id_selector(namespace, "toggle", this);

                // for when a value in the facet is selected
                edges.on(valueSelector, "click", this, "termSelected");
                 // for when the open button is clicked
                edges.on(toggleSelector, "click", this, "toggleOpen");
                // for when a filter remove button is clicked
                edges.on(filterRemoveSelector, "click", this, "removeFilter");
            };

            this.setUIOpen = function() {
                // the selectors that we're going to use
                var resultsSelector = edges.css_id_selector(this.namespace, "results", this);
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);

                var results = this.component.jq(resultsSelector);
                var toggle = this.component.jq(toggleSelector);

                if (this.open) {
                    toggle.find("i").removeClass("glyphicon-plus").addClass("glyphicon-minus");
                    results.show();
                } else {
                    toggle.find("i").removeClass("glyphicon-minus").addClass("glyphicon-plus");
                    results.hide();
                }
            };

            this.termSelected = function(element) {
                var term = this.component.jq(element).attr("data-key");
                this.component.selectTerm(term);
            };

            this.removeFilter = function(element) {
                var term = this.component.jq(element).attr("data-key");
                this.component.removeFilter(term);
            };

            this.toggleOpen = function(element) {
                this.open = !this.open;
                this.setUIOpen();
            };

            this._getFilterDef = function(term) {
                for (var i = 0; i < this.component.terms.length; i++) {
                    var t = this.component.terms[i];
                    if (term === t.term) {
                        return t;
                    }
                }
                return false;
            }
        },

        newBasicRangeSelectorRenderer : function(params) {
            if (!params) { params = {} }
            edges.bs3.BasicRangeSelectorRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.BasicRangeSelectorRenderer(params);
        },
        BasicRangeSelectorRenderer : function(params) {
            // if there are no results for a given range, should it be hidden
            this.hideEmptyRange = params.hideEmptyRange === undefined ?  true : params.hideEmptyRange;

            // whether the facet should be open or closed
            // can be initialised and is then used to track internal state
            this.open = params.open || false;

            // whether to display selected filters
            this.showSelected = params.showSelected || true;

            // namespace to use in the page
            this.namespace = "edges-bs3-basic-range-selector";

            this.draw = function() {
                var results = "Loading...";

                // sort out all the classes that we're going to be using
                var resultClass = edges.css_classes(this.namespace, "result", this);
                var valClass = edges.css_classes(this.namespace, "value", this);
                var filterRemoveClass = edges.css_classes(this.namespace, "filter-remove", this);
                var facetClass = edges.css_classes(this.namespace, "facet", this);
                var headerClass = edges.css_classes(this.namespace, "header", this);

                var toggleId = edges.css_id(this.namespace, "toggle", this);
                var resultsId = edges.css_id(this.namespace, "results", this);

                // render a list of the values
                if (this.component.values.length > 0) {
                    results = "";

                    // if no filters have been set, render the values
                    if (this.component.filters.length === 0) {
                        for (var i = 0; i < this.component.values.length; i++) {
                            var val = this.component.values[i];
                            if (val.count > 0 || !this.hideEmptyRange) {
                                results += '<div class="' + resultClass + '"><a href="#" class="' + valClass + '" data-from="' + val.from + '" data-to="' + val.to + '">' +
                                    edges.escapeHtml(val.display) + "</a> (" + val.count + ")</div>";
                            }
                        }
                    }
                }

                // if we want the active filters, render them
                var filterFrag = "";
                if (this.component.filters.length > 0 && this.showSelected) {
                    for (var i = 0; i < this.component.filters.length; i++) {
                        var filt = this.component.filters[i];
                        filterFrag += '<div class="' + resultClass + '"><strong>' + edges.escapeHtml(filt.display) + "&nbsp;";
                        filterFrag += '<a href="#" class="' + filterRemoveClass + '" data-from="' + filt.from + '" data-to="' + filt.to + '">';
                        filterFrag += '<i class="glyphicon glyphicon-black glyphicon-remove"></i></a>';
                        filterFrag += "</strong></a></div>";
                    }
                }

                // render the overall facet
                var frag = '<div class="' + facetClass + '">\
                        <div class="' + headerClass + '"><div class="row"> \
                            <div class="col-md-12">\
                                <a href="#" id="' + toggleId + '"><i class="glyphicon glyphicon-plus"></i>&nbsp;' + edges.escapeHtml(this.component.display) + '</a>\
                            </div>\
                        </div></div>\
                        <div class="row" style="display:none" id="' + resultsId + '">\
                            <div class="col-md-12">\
                                {{SELECTED}}\
                                {{RESULTS}}\
                            </div>\
                        </div></div>';

                // substitute in the component parts
                frag = frag.replace(/{{RESULTS}}/g, results)
                        .replace(/{{SELECTED}}/g, filterFrag);

                // now render it into the page
                this.component.context.html(frag);

                this.setUIOpen();

                // sort out the selectors we're going to be needing
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);
                var valueSelector = edges.css_class_selector(this.namespace, "value", this);
                var filterRemoveSelector = edges.css_class_selector(this.namespace, "filter-remove", this);

                // for when the open button is clicked
                edges.on(toggleSelector, "click", this, "toggleOpen");
                // for when a value in the facet is selected
                edges.on(valueSelector, "click", this, "rangeSelected");
                // for when a filter remove button is clicked
                edges.on(filterRemoveSelector, "click", this, "removeFilter");
            };

            /////////////////////////////////////////////////////
            // UI behaviour functions

            this.setUIOpen = function() {
                // the selectors that we're going to use
                var resultsSelector = edges.css_id_selector(this.namespace, "results", this);
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);

                var results = this.component.jq(resultsSelector);
                var toggle = this.component.jq(toggleSelector);

                if (this.open) {
                    toggle.find("i").removeClass("glyphicon-plus").addClass("glyphicon-minus");
                    results.show();
                } else {
                    toggle.find("i").removeClass("glyphicon-minus").addClass("glyphicon-plus");
                    results.hide();
                }
            };

            /////////////////////////////////////////////////////
            // event handlers

            this.toggleOpen = function(element) {
                this.open = !this.open;
                this.setUIOpen();
            };

            this.rangeSelected = function(element) {
                var from = this.component.jq(element).attr("data-from");
                var to = this.component.jq(element).attr("data-to");
                this.component.selectRange(parseFloat(from), parseFloat(to));
            };

            this.removeFilter = function(element) {
                var from = this.component.jq(element).attr("data-from");
                var to = this.component.jq(element).attr("data-to");
                this.component.removeFilter(parseFloat(from), parseFloat(to));
            };

        },

        newFullSearchControllerRenderer : function(params) {
            if (!params) { params = {} }
            edges.bs3.FullSearchControllerRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.FullSearchControllerRenderer(params);
        },
        FullSearchControllerRenderer : function(params) {
            // enable the search button
            this.searchButton = params.searchButton || false;

            // amount of time between finishing typing and when a query is executed from the search box
            this.freetextSubmitDelay = params.freetextSubmitDelay || 500;

            // after search, the results will fade in over this number of milliseconds
            this.fadeIn = params.fadeIn || 800;

            // enable the share/save link feature
            this.shareLink = params.shareLink || false;

            ////////////////////////////////////////
            // state variables

            this.showShortUrl = false;

            this.namespace = "edges-bs3-search-controller";

            this.draw = function() {
                var comp = this.component;

                // if sort options are provided render the orderer and the order by
                var sortOptions = "&nbsp;";
                if (comp.sortOptions && comp.sortOptions.length > 0) {
                    // classes that we'll use
                    var directionClass = edges.css_classes(this.namespace, "direction", this);
                    var sortFieldClass = edges.css_classes(this.namespace, "sortby", this);

                    sortOptions = '<form class="form-inline"> \
                            <div class="form-group"> \
                                <div class="input-group"> \
                                    <span class="input-group-btn"> \
                                        <button class="btn btn-default btn-sm ' + directionClass +'" title="" href="#"></button> \
                                    </span> \
                                    <select class="form-control input-sm ' + sortFieldClass + '"> \
                                        <option value="_score">Relevance</option>';

                    for (var i = 0; i < comp.sortOptions.length; i++) {
                        var field = comp.sortOptions[i].field;
                        var display = comp.sortOptions[i].display;
                        sortOptions += '<option value="' + field + '">' + edges.escapeHtml(display) + '</option>';
                    }

                    sortOptions += ' </select> \
                                </div> \
                            </div> \
                        </form>';
                }

                // select box for fields to search on
                var field_select = "";
                if (comp.fieldOptions && comp.fieldOptions.length > 0) {
                    // classes that we'll use
                    var searchFieldClass = edges.css_classes(this.namespace, "field", this);

                    field_select += '<select class="form-control input-sm ' + searchFieldClass + '" style="width: 120px">';
                    field_select += '<option value="">search all</option>';

                    for (var i = 0; i < comp.fieldOptions.length; i++) {
                        var obj = comp.fieldOptions[i];
                        field_select += '<option value="' + obj['field'] + '">' + edges.escapeHtml(obj['display']) + '</option>';
                    }
                    field_select += '</select>';
                }

                // more classes that we'll use
                var resetClass = edges.css_classes(this.namespace, "reset", this);
                var textClass = edges.css_classes(this.namespace, "text", this);
                var searchClass = edges.css_classes(this.namespace, "search", this);

                // text search box id
                var textId = edges.css_id(this.namespace, "text", this);

                var searchBox = '<form class="form-inline pull-right"> \
                        <div class="form-group"> \
                            <div class="input-group"> \
                                <span class="input-group-btn"> \
                                    <button class="btn btn-danger btn-sm ' + resetClass + '" title="Clear all search parameters and start again"> \
                                        <span class="glyphicon glyphicon-remove"></span> \
                                    </button> \
                                </span> ' + field_select + '\
                                <input type="text" id="' + textId + '" class="form-control input-sm ' + textClass + '" name="q" value="" placeholder="Search" style="width: 200px" /> \
                                <span class="input-group-btn"> \
                                    <button class="btn btn-info btn-sm ' + searchClass + '"> \
                                        <span class="glyphicon glyphicon-white glyphicon-search"></span> \
                                    </button> \
                                </span> \
                            </div> \
                        </div> \
                    </form>';

                // assemble the final fragment and render it into the component's context
                var frag = '<div class="row"><div class="col-md-5">{{SORT}}</div><div class="col-md-7">{{SEARCH}}</div></div>';
                frag = frag.replace(/{{SORT}}/g, sortOptions)
                    .replace(/{{SEARCH}}/g, searchBox);

                comp.context.html(frag);

                // now populate all the dynamic bits
                if (comp.sortOptions && comp.sortOptions.length > 0) {
                    this.setUISortDir();
                    this.setUISortField();
                }
                if (comp.fieldOptions && comp.fieldOptions.length > 0) {
                    this.setUISearchField();
                }
                this.setUISearchText();

                // attach all the bindings
                if (comp.sortOptions && comp.sortOptions.length > 0) {
                    var directionSelector = edges.css_class_selector(this.namespace, "direction", this);
                    var sortSelector = edges.css_class_selector(this.namespace, "sortby", this);
                    edges.on(directionSelector, "click", this, "changeSortDir");
                    edges.on(sortSelector, "change", this, "changeSortBy");
                }
                if (comp.fieldOptions && comp.fieldOptions.length > 0) {
                    var fieldSelector = edges.css_class_selector(this.namespace, "field", this);
                    edges.on(fieldSelector, "change", this, "changeSearchField");
                }
                var textSelector = edges.css_class_selector(this.namespace, "text", this);
                if (this.freetextSubmitDelay > 0) {
                    edges.on(textSelector, "keyup", this, "setSearchText", this.freetextSubmitDelay);
                } else {
                    edges.on(textSelector, "keyup", this, "setSearchText");
                }

                var resetSelector = edges.css_class_selector(this.namespace, "reset", this);
                edges.on(resetSelector, "click", this, "clearSearch");

                var searchSelector = edges.css_class_selector(this.namespace, "search", this);
                edges.on(searchSelector, "click", this, "doSearch");
            };

            //////////////////////////////////////////////////////
            // functions for setting UI values

            this.setUISortDir = function() {
                // get the selector we need
                var directionSelector = edges.css_class_selector(this.namespace, "direction", this);
                var el = this.component.jq(directionSelector);
                if (this.component.sortDir === 'asc') {
                    el.html('sort <i class="glyphicon glyphicon-arrow-up"></i> by');
                    el.attr('title','Current order ascending. Click to change to descending');
                } else {
                    el.html('sort <i class="glyphicon glyphicon-arrow-down"></i> by');
                    el.attr('title','Current order descending. Click to change to ascending');
                }
            };

            this.setUISortField = function() {
                if (!this.component.sortBy) {
                    return;
                }
                // get the selector we need
                var sortSelector = edges.css_class_selector(this.namespace, "sortby", this);
                var el = this.component.jq(sortSelector);
                el.val(this.component.sortBy);
            };

            this.setUISearchField = function() {
                if (!this.component.searchField) {
                    return;
                }
                // get the selector we need
                var fieldSelector = edges.css_class_selector(this.namespace, "field", this);
                var el = this.component.jq(fieldSelector);
                el.val(this.component.searchField);
            };

            this.setUISearchText = function() {
                if (!this.component.searchString) {
                    return;
                }
                // get the selector we need
                var textSelector = edges.css_class_selector(this.namespace, "text", this);
                var el = this.component.jq(textSelector);
                el.val(this.component.searchString);
            };

            ////////////////////////////////////////
            // event handlers

            this.changeSortDir = function(element) {
                this.component.changeSortDir();
            };

            this.changeSortBy = function(element) {
                var val = this.component.jq(element).val();
                this.component.setSortBy(val);
            };

            this.changeSearchField = function(element) {
                var val = this.component.jq(element).val();
                this.component.setSearchField(val);
            };

            this.setSearchText = function(element) {
                var val = this.component.jq(element).val();
                this.component.setSearchText(val);
            };

            this.clearSearch = function(element) {
                this.component.clearSearch();
            };

            this.doSearch = function(element) {
                var textId = edges.css_id_selector(this.namespace, "text", this);
                var text = this.component.jq(textId).val();
                this.component.setSearchText(text);
            };
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

            this.draw = function() {
                var dre = this.component;

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

                dre.context.html(frag);

                this.selectJq = dre.jq("#" + this.selectId);
                this.fromJq = dre.jq("#" + this.fromId);
                this.toJq = dre.jq("#" + this.toId);

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
                this.component.changeField(date_type);

                var fr = this.fromJq.val();
                if (fr) {
                    fr = $.datepicker.parseDate("dd-mm-yy", fr);
                    fr = $.datepicker.formatDate("yy-mm-dd", fr);
                    this.component.setFrom(fr);
                } else {
                    this.component.setFrom(false);
                }

                var to = this.toJq.val();
                if (to) {
                    to = $.datepicker.parseDate("dd-mm-yy", to);
                    to = $.datepicker.formatDate("yy-mm-dd", to);
                    this.component.setTo(to);
                } else {
                    this.component.setTo(false);
                }

                // this action should trigger a search (the parent object will
                // decide if that's required)
                this.component.triggerSearch();
            };

            this.prepDates = function() {
                var min = this.component.currentEarliest();
                var max = this.component.currentLatest();
                var fr = this.component.fromDate;
                var to = this.component.toDate;

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
        },

        newSelectedFiltersRenderer : function(params) {
            if (!params) { params = {} }
            edges.bs3.SelectedFiltersRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.SelectedFiltersRenderer(params);
        },
        SelectedFiltersRenderer : function(params) {

            this.showFilterField = params.showFilterField || true;

            this.namespace = "edges-bs3-selected-filters";

            this.draw = function() {
                // for convenient short references
                var sf = this.component;
                var ns = this.namespace;

                // sort out the classes we are going to use
                var fieldClass = edges.css_classes(ns, "field", this);
                var fieldNameClass = edges.css_classes(ns, "fieldname", this);
                var valClass = edges.css_classes(ns, "value", this);
                var removeClass = edges.css_classes(ns, "remove", this);
                var relClass = edges.css_classes(ns, "rel", this);
                var containerClass = edges.css_classes(ns, "container", this);

                var filters = "";

                var fields = Object.keys(sf.mustFilters);
                for (var i = 0; i < fields.length; i++) {
                    var field = fields[i];
                    var def = sf.mustFilters[field];

                    filters += '<span class="' + fieldClass + '">';
                    if (this.showFilterField) {
                        filters += '<span class="' + fieldNameClass + '">' + def.display + ':</span>';
                    }

                    for (var j = 0; j < def.values.length; j++) {
                        var val = def.values[j];
                        filters += '<span class="' + valClass + '">' + val.display + '</span>';

                        // the remove block looks different, depending on the kind of filter to remove
                        if (def.filter == "term" || def.filter === "terms") {
                            filters += '<a class="' + removeClass + '" data-bool="must" data-filter="' + def.filter + '" data-field="' + field + '" data-value="' + val.val + '" alt="Remove" title="Remove" href="#">';
                            filters += '<i class="glyphicon glyphicon-black glyphicon-remove"></i>';
                            filters += "</a>";
                        } else if (def.filter === "range") {
                            var from = val.from ? ' data-from="' + val.from + '" ' : "";
                            var to = val.to ? ' data-to="' + val.to + '" ' : "";
                            filters += '<a class="' + removeClass + '" data-bool="must" data-filter="' + def.filter + '" data-field="' + field + '" ' + from + to + ' alt="Remove" title="Remove" href="#">';
                            filters += '<i class="glyphicon glyphicon-black glyphicon-remove"></i>';
                            filters += "</a>";
                        }

                        if (def.rel) {
                            if (j + 1 < def.values.length) {
                                filters += '<span class="' + relClass + '">' + def.rel + '</span>';
                            }
                        }
                    }
                    filters += "</span>";
                }

                if (filters !== "") {
                    var frag = '<div class="' + containerClass + '">{{FILTERS}}</div>';
                    frag = frag.replace(/{{FILTERS}}/g, filters);
                    sf.context.html(frag);

                    // click handler for when a filter remove button is clicked
                    var removeSelector = edges.css_class_selector(ns, "remove", this);
                    edges.on(removeSelector, "click", this, "removeFilter");
                } else {
                    sf.context.html("");
                }
            };

            /////////////////////////////////////////////////////
            // event handlers

            this.removeFilter = function(element) {
                var el = this.component.jq(element);
                var field = el.attr("data-field");
                var ft = el.attr("data-filter");
                var bool = el.attr("data-bool");

                var value = false;
                if (ft === "terms" || ft === "term") {
                    value = el.attr("data-value");
                } else if (ft === "range") {
                    value = {};
                    var from = el.attr("data-from");
                    var to = el.attr("data-to");
                    if (from) {
                        value["from"] = parseInt(from);
                    }
                    if (to) {
                        value["to"] = parseInt(to);
                    }
                }

                this.component.removeFilter(bool, ft, field, value);
            };
        },

        newSearchingNotificationRenderer : function(params) {
            if (!params) { params = {} }
            edges.bs3.SearchingNotificationRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.SearchingNotificationRenderer(params);
        },
        SearchingNotificationRenderer : function(params) {

            this.searchingMessage = params.searchingMessage || "Loading, please wait...";

            // namespace to use in the page
            this.namespace = "edges-bs3-searching-notification";

            this.draw = function() {
                var frag = "";
                if (this.component.searching) {
                    // classes that we need
                    var barClasses = edges.css_classes(this.namespace, "bar", this);
                    frag = '<div class="progress-bar progress-bar-info progress-bar-striped active ' + barClasses + '"> \
                            ' + this.searchingMessage + ' \
                        </div>'
                }
                this.component.context.html(frag);
            }
        },

        newPagerRenderer : function(params) {
            if (!params) { params = {} }
            edges.bs3.PagerRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.PagerRenderer(params);
        },
        PagerRenderer : function(params) {

            this.scroll = params.scroll || true;

            this.scrollSelector = params.scrollSelector || "body";

            this.sizeOptions = params.sizeOptions || [10, 25, 50, 100];

            this.namespace = "edges-bs3-pager";

            this.draw = function() {
                if (this.component.total === false || this.component.total === 0) {
                    this.component.context.html("");
                    return;
                }

                // classes we'll need
                var containerClass = edges.css_classes(this.namespace, "container", this);
                var totalClass = edges.css_classes(this.namespace, "total", this);
                var navClass = edges.css_classes(this.namespace, "nav", this);
                var firstClass = edges.css_classes(this.namespace, "first", this);
                var prevClass = edges.css_classes(this.namespace, "prev", this);
                var pageClass = edges.css_classes(this.namespace, "page", this);
                var nextClass = edges.css_classes(this.namespace, "next", this);
                var sizeSelectClass = edges.css_classes(this.namespace, "size", this);

                // the total number of records found
                var recordCount = '<span class="' + totalClass + '">' + this.component.total + '</span> results found';

                // the number of records per page
                var sizer = '<form class="form-inline">' + recordCount + '<select class="form-control input-sm ' + sizeSelectClass + '" name="' + this.component.id + '-page-size">{{SIZES}}</select> per page</form>';
                var sizeopts = "";
                var optarr = this.sizeOptions.slice(0);
                if ($.inArray(this.component.pageSize, optarr) === -1) {
                    optarr.push(this.component.pageSize)
                }
                optarr.sort(function(a,b) { return a - b});  // sort numerically
                for (var i = 0; i < optarr.length; i++) {
                    var so = optarr[i];
                    var selected = "";
                    if (so === this.component.pageSize) {
                        selected = "selected='selected'";
                    }
                    sizeopts += '<option name="' + so + '" ' + selected + '>' + so + '</option>';
                }
                sizer = sizer.replace(/{{SIZES}}/g, sizeopts);

                var first = '<a href="#" class="' + firstClass + '">First</a>';
                var prev = '<a href="#" class="' + prevClass + '">Prev</a>';
                if (this.component.page === 1) {
                    first = '<span class="' + firstClass + ' disabled">First</span>';
                    prev = '<span class="' + prevClass + ' disabled">Prev</span>';
                }

                var next = '<a href="#" class="' + nextClass + '">Next</a>';
                if (this.component.page === this.component.totalPages) {
                    next = '<span class="' + nextClass + ' disabled">Next</a>';
                }

                var nav = '<div class="' + navClass + '">' + first + prev +
                    '<span class="' + pageClass + '">Page ' + this.component.page + ' of ' + this.component.totalPages + '</span>' +
                    next + "</div>";

                var frag = '<div class="' + containerClass + '"><div class="row"><div class="col-md-6">{{COUNT}}</div><div class="col-md-6">{{NAV}}</div></div></div>';
                frag = frag.replace(/{{COUNT}}/g, sizer).replace(/{{NAV}}/g, nav);

                this.component.context.html(frag);

                // now create the selectors for the functions
                var firstSelector = edges.css_class_selector(this.namespace, "first", this);
                var prevSelector = edges.css_class_selector(this.namespace, "prev", this);
                var nextSelector = edges.css_class_selector(this.namespace, "next", this);
                var sizeSelector = edges.css_class_selector(this.namespace, "size", this);

                // bind the event handlers
                if (this.component.page !== 1) {
                    edges.on(firstSelector, "click", this, "goToFirst");
                    edges.on(prevSelector, "click", this, "goToPrev");
                }
                if (this.component.page !== this.component.totalPages) {
                    edges.on(nextSelector, "click", this, "goToNext");
                }
                edges.on(sizeSelector, "change", this, "changeSize");
            };

            this.doScroll = function() {
                $(this.scrollSelector).animate({    // note we do not use component.jq, because the scroll target could be outside it
                    scrollTop: $(this.scrollSelector).offset().top
                }, 1);
            };

            this.goToFirst = function(element) {
                if (this.scroll) {
                    this.doScroll();
                }
                this.component.setFrom(1);
            };

            this.goToPrev = function(element) {
                if (this.scroll) {
                    this.doScroll();
                }
                this.component.decrementPage();
            };

            this.goToNext = function(element) {
                if (this.scroll) {
                    this.doScroll();
                }
                this.component.incrementPage();
            };

            this.changeSize = function(element) {
                var size = $(element).val();
                this.component.setSize(size);
            };
        }
    }
});
