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
                this.edge = edge;

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

                // loading notification (note that the notification implementation is responsible for its own visibility)
                var loading = edge.category("searching-notification");
                if (loading.length > 0) {
                    thefacetview += '<div class="edges-facetview-searching"><div id="' + loading[0].id + '"></div></div>'
                }

                // insert the frame within which the results actually will go
                var results = edge.category("results");
                if (results.length > 0) {
                    thefacetview += '<div id="edges-facetivew-results" dir="auto"><div id="' + results[0].id + '"></div></div>';
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

                //////////////////////////////////////////////
                // now set up the various event bindings

                // before executing a query, show the loading function
                //edge.context.bind("edges:pre-query", edges.eventClosure(this, "showSearching"));
                //edge.context.bind("edges:pre-render", edges.eventClosure(this, "hideSearching"));
            };

            this.showSearching = function() {
                this.edge.jq(".edges-facetview-searching").show();
            };

            this.hideSearching = function() {
                this.edge.jq(".edges-facetview-searching").hide();
            }
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
                        frag += '<div class="row ' + recordClasses + '"><div class="col-md-12">' + rec + '</div></div>';
                    }
                }

                // finally stick it all together into the container
                var containerClasses = edges.css_classes(this.namespace, "container", this);
                var container = '<div class="' + containerClasses + '">' + frag + '</div>';
                this.component.jq("#" + this.component.id).html(container);
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

        newBasicTermSelectorRenderer : function(params) {
            if (!params) { params = {} }
            edges.bs3.BasicTermSelectorRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.BasicTermSelectorRenderer(params);
        },
        BasicTermSelectorRenderer : function(params) {

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
            this.namespace = "edges-bs3-basic-term-selector";

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
                ts.jq("#" + ts.id).html(frag);

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

                dre.jq("#" + dre.id).html(frag);

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

                        filters += '<a class="' + removeClass + '" data-bool="must" data-filter="' + def.filter + '" data-field="' + field + '" data-value="' + val.val + '" alt="Remove" title="Remove" href="#">';
                        filters += '<i class="glyphicon glyphicon-black glyphicon-remove"></i>';
                        filters += "</a>";

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
                    sf.jq("#" + sf.id).html(frag);

                    // click handler for when a filter remove button is clicked
                    var removeSelector = edges.css_class_selector(ns, "remove", this);
                    edges.on(removeSelector, "click", this, "removeFilter");
                } else {
                    sf.jq("#" + sf.id).html("");
                }
            };

            /////////////////////////////////////////////////////
            // event handlers

            this.removeFilter = function(element) {
                var el = this.component.jq(element);
                var field = el.attr("data-field");
                var value = el.attr("data-value");
                var bool = el.attr("data-bool");
                var ft = el.attr("data-filter");
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
                    frag = '<div class="progress progress-bar-info progress-bar-striped active ' + barClasses + '"> \
                            ' + this.searchingMessage + ' \
                        </div>'
                }
                this.component.jq("#" + this.component.id).html(frag);
            }
        }
    }
});
