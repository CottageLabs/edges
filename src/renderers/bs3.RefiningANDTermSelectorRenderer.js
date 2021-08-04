$.extend(true, edges, {
    bs3 : {
        newRefiningANDTermSelectorRenderer: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.RefiningANDTermSelectorRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.RefiningANDTermSelectorRenderer(params);
        },
        RefiningANDTermSelectorRenderer: function (params) {

            ///////////////////////////////////////
            // parameters that can be passed in

            // whether to hide or just disable the facet if not active
            this.hideInactive = edges.getParam(params.hideInactive, false);

            // should the facet sort/size controls be shown?
            this.controls = edges.getParam(params.controls, true);

            // whether the facet should be open or closed
            // can be initialised and is then used to track internal state
            this.open = edges.getParam(params.open, false);

            this.togglable = edges.getParam(params.togglable, true);

            // whether to display selected filters
            this.showSelected = edges.getParam(params.showSelected, true);

            // sort cycle to use
            this.sortCycle = edges.getParam(params.sortCycle, ["count desc", "count asc", "term desc", "term asc"]);

            // formatter for count display
            this.countFormat = edges.getParam(params.countFormat, false);

            // a short tooltip and a fuller explanation
            this.tooltipText = edges.getParam(params.tooltipText, false);
            this.tooltip = edges.getParam(params.tooltip, false);
            this.tooltipState = "closed";

            // namespace to use in the page
            this.namespace = "edges-bs3-refiningand-term-selector";

            this.draw = function () {
                // for convenient short references ...
                var ts = this.component;
                var namespace = this.namespace;

                if (!ts.active && this.hideInactive) {
                    ts.context.html("");
                    return;
                }

                // sort out all the classes that we're going to be using
                var resultsListClass = edges.css_classes(namespace, "results-list", this);
                var resultClass = edges.css_classes(namespace, "result", this);
                var valClass = edges.css_classes(namespace, "value", this);
                var controlClass = edges.css_classes(namespace, "controls", this);
                var filterRemoveClass = edges.css_classes(namespace, "filter-remove", this);
                var facetClass = edges.css_classes(namespace, "facet", this);
                var headerClass = edges.css_classes(namespace, "header", this);
                var selectedClass = edges.css_classes(namespace, "selected", this);

                var controlId = edges.css_id(namespace, "controls", this);
                var sizeId = edges.css_id(namespace, "size", this);
                var orderId = edges.css_id(namespace, "order", this);
                var toggleId = edges.css_id(namespace, "toggle", this);
                var resultsId = edges.css_id(namespace, "results", this);

                // this is what's displayed in the body if there are no results
                var results = "Loading...";
                if (ts.values !== false) {
                    results = "No data available";
                }

                // render a list of the values
                if (ts.values && ts.values.length > 0) {
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
                            var count = val.count;
                            if (this.countFormat) {
                                count = this.countFormat(count)
                            }
                            results += '<div class="' + resultClass + '"><a href="#" class="' + valClass + '" data-key="' + edges.escapeHtml(val.term) + '">' +
                                edges.escapeHtml(val.display) + "</a> (" + count + ")</div>";
                        }
                    }
                }

                // if there is a tooltip, make the frag
                var tooltipFrag = "";
                if (this.tooltipText) {
                    var tt = this._shortTooltip();
                    var tooltipClass = edges.css_classes(namespace, "tooltip", this);
                    var tooltipId = edges.css_id(namespace, "tooltip", this);
                    tooltipFrag = '<div id="' + tooltipId + '" class="' + tooltipClass + '" style="display:none"><div class="row"><div class="col-md-12">' + tt + '</div></div></div>';
                }

                // if we want to display the controls, render them
                var controlFrag = "";
                if (this.controls) {
                    var ordering = '<a href="#" title=""><i class="glyphicon glyphicon-arrow-up"></i></a>';
                    controlFrag = '<div class="' + controlClass + '" style="display:none" id="' + controlId + '"><div class="row"> \
                        <div class="col-md-12">\
                            <div class="btn-group">\
                                <button type="button" class="btn btn-default btn-sm" id="' + sizeId + '" title="List Size" href="#">0</button> \
                                <button type="button" class="btn btn-default btn-sm" id="' + orderId + '" title="List Order" href="#"></button> \
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

                // render the toggle capability
                var tog = ts.display;
                if (this.togglable) {
                    tog = '<a href="#" id="' + toggleId + '"><i class="glyphicon glyphicon-plus"></i>&nbsp;' + tog + "</a>";
                }

                // render the overall facet
                var frag = '<div class="' + facetClass + '">\
                        <div class="' + headerClass + '"><div class="row"> \
                            <div class="col-md-12">\
                                ' + tog + '\
                            </div>\
                        </div></div>\
                        ' + tooltipFrag + '\
                        {{CONTROLS}}\
                        <div class="row" style="display:none" id="' + resultsId + '">\
                            <div class="col-md-12">\
                                <div class="' + selectedClass + '">{{SELECTED}}</div>\
                                <div class="' + resultsListClass + '">{{RESULTS}}</div>\
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
                var tooltipSelector = edges.css_id_selector(namespace, "tooltip-toggle", this);

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
                // toggle the full tooltip
                edges.on(tooltipSelector, "click", this, "toggleTooltip");
            };

            /////////////////////////////////////////////////////
            // UI behaviour functions

            this.setUIOpen = function () {
                // the selectors that we're going to use
                var resultsSelector = edges.css_id_selector(this.namespace, "results", this);
                var controlsSelector = edges.css_id_selector(this.namespace, "controls", this);
                var tooltipSelector = edges.css_id_selector(this.namespace, "tooltip", this);
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);

                var results = this.component.jq(resultsSelector);
                var controls = this.component.jq(controlsSelector);
                var tooltip = this.component.jq(tooltipSelector);
                var toggle = this.component.jq(toggleSelector);

                if (this.open) {
                    toggle.find("i").removeClass("glyphicon-plus").addClass("glyphicon-minus");
                    controls.show();
                    results.show();
                    tooltip.show();
                } else {
                    toggle.find("i").removeClass("glyphicon-minus").addClass("glyphicon-plus");
                    controls.hide();
                    results.hide();
                    tooltip.hide();
                }
            };

            this.setUISize = function () {
                var sizeSelector = edges.css_id_selector(this.namespace, "size", this);
                this.component.jq(sizeSelector).html(this.component.size);
            };

            this.setUISort = function () {
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

            this.termSelected = function (element) {
                var term = this.component.jq(element).attr("data-key");
                this.component.selectTerm(term);
            };

            this.removeFilter = function (element) {
                var term = this.component.jq(element).attr("data-key");
                this.component.removeFilter(term);
            };

            this.toggleOpen = function (element) {
                this.open = !this.open;
                this.setUIOpen();
            };

            this.changeSize = function (element) {
                var newSize = prompt('Currently displaying ' + this.component.size +
                    ' results per page. How many would you like instead?');
                if (newSize) {
                    this.component.changeSize(parseInt(newSize));
                }
            };

            this.changeSort = function (element) {
                var current = this.component.orderBy + " " + this.component.orderDir;
                var idx = $.inArray(current, this.sortCycle);
                var next = this.sortCycle[(idx + 1) % 4];
                var bits = next.split(" ");
                this.component.changeSort(bits[0], bits[1]);
            };

            this.toggleTooltip = function(element) {
                var tooltipSpanSelector = edges.css_id_selector(this.namespace, "tooltip-span", this);
                var container = this.component.jq(tooltipSpanSelector).parent();
                var tt = "";
                if (this.tooltipState === "closed") {
                    tt = this._longTooltip();
                    this.tooltipState = "open";
                } else {
                    tt = this._shortTooltip();
                    this.tooltipState = "closed";
                }
                container.html(tt);
                var tooltipSelector = edges.css_id_selector(this.namespace, "tooltip-toggle", this);
                // refresh the event binding
                edges.on(tooltipSelector, "click", this, "toggleTooltip");
            };

            //////////////////////////////////////////////////////////
            // some useful reusable components

            this._shortTooltip = function() {
                var tt = this.tooltipText;
                var tooltipLinkId = edges.css_id(this.namespace, "tooltip-toggle", this);
                var tooltipSpan = edges.css_id(this.namespace, "tooltip-span", this);
                if (this.tooltip) {
                    var tooltipLinkClass = edges.css_classes(this.namespace, "tooltip-link", this);
                    tt = '<span id="' + tooltipSpan + '"><a id="' + tooltipLinkId + '" class="' + tooltipLinkClass + '" href="#">' + tt + '</a></span>'
                }
                return tt;
            };

            this._longTooltip = function() {
                var tt = this.tooltip;
                var tooltipLinkId = edges.css_id(this.namespace, "tooltip-toggle", this);
                var tooltipLinkClass = edges.css_classes(this.namespace, "tooltip-link", this);
                var tooltipSpan = edges.css_id(this.namespace, "tooltip-span", this);
                tt = '<span id="' + tooltipSpan + '">' + this.tooltip + ' <a id="' + tooltipLinkId + '" class="' + tooltipLinkClass + '" href="#">less</a></span>';
                return tt;
            };
        }
    }
});
