// requires: $
// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("renderers")) { edges.renderers = {}}
if (!edges.renderers.hasOwnProperty("bs3")) { edges.renderers.bs3 = {}}

edges.renderers.bs3.RefiningANDTermSelector = class extends edges.Renderer {
    constructor(params) {
        super();

        ///////////////////////////////////////
        // parameters that can be passed in

        this.title = edges.util.getParam(params, "title", "Select");

        // whether to hide or just disable the facet if not active
        this.hideInactive = edges.util.getParam(params, "hideInactive", false);

        // should the facet sort/size controls be shown?
        this.controls = edges.util.getParam(params, "controls", true);

        // whether the facet should be open or closed
        // can be initialised and is then used to track internal state
        this.open = edges.util.getParam(params, "open", false);

        this.togglable = edges.util.getParam(params, "togglable", true);

        // whether to display selected filters
        this.showSelected = edges.util.getParam(params, "showSelected", true);

        // sort cycle to use
        this.sortCycle = edges.util.getParam(params, "sortCycle", ["count desc", "count asc", "term desc", "term asc"]);

        // formatter for count display
        this.countFormat = edges.util.getParam(params, "countFormat", false);

        // a short tooltip and a fuller explanation
        this.tooltipText = edges.util.getParam(params, "tooltipText", false);
        this.tooltip = edges.util.getParam(params, "tooltip", false);
        this.tooltipState = "closed";

        // namespace to use in the page
        this.namespace = "edges-bs3-refining-and-term-selector";
    }

    draw() {
        // for convenient short references ...
        let ts = this.component;

        if (!ts.active && this.hideInactive) {
            ts.context.html("");
            return;
        }

        // classes where we need both styles and js
        var valClass = edges.util.allClasses(this.namespace, "value", this.component.id);
        var filterRemoveClass = edges.util.allClasses(this.namespace, "filter-remove", this.component.id);

        // sort out all the classes that we're going to be using
        var resultsListClass = edges.util.styleClasses(this.namespace, "results-list", this.component.id);
        var resultClass = edges.util.styleClasses(this.namespace, "result", this.component.id);
        var controlClass = edges.util.styleClasses(this.namespace, "controls", this.component.id);
        var facetClass = edges.util.styleClasses(this.namespace, "facet", this.component.id);
        var headerClass = edges.util.styleClasses(this.namespace, "header", this.component.id);
        var selectedClass = edges.util.styleClasses(this.namespace, "selected", this.component.id);

        var controlId = edges.util.htmlID(this.namespace, "controls", this.component.id);
        var sizeId = edges.util.htmlID(this.namespace, "size", this.component.id);
        var orderId = edges.util.htmlID(this.namespace, "order", this.component.id);
        var toggleId = edges.util.htmlID(this.namespace, "toggle", this.component.id);
        var resultsId = edges.util.htmlID(this.namespace, "results", this.component.id);

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
                    results += '<div class="' + resultClass + '"><a href="#" class="' + valClass + '" data-key="' + edges.util.escapeHtml(val.term) + '">' +
                        edges.util.escapeHtml(val.display) + "</a> (" + count + ")</div>";
                }
            }
        }

        // if there is a tooltip, make the frag
        var tooltipFrag = "";
        if (this.tooltipText) {
            var tt = this._shortTooltip();
            var tooltipClass = edges.util.styleClasses(this.namespace, "tooltip", this.component.id);
            var tooltipId = edges.util.htmlID(this.namespace, "tooltip", this.component.id);
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
                filterFrag += '<div class="' + resultClass + '"><strong>' + edges.util.escapeHtml(filt.display) + "&nbsp;";
                filterFrag += '<a href="#" class="' + filterRemoveClass + '" data-key="' + edges.util.escapeHtml(filt.term) + '">';
                filterFrag += '<i class="glyphicon glyphicon-black glyphicon-remove"></i></a>';
                filterFrag += "</strong></a></div>";
            }
        }

        // render the toggle capability
        var tog = this.title;
        if (this.togglable) {
            tog = '<a href="#" id="' + toggleId + '"><i class="glyphicon glyphicon-plus"></i>&nbsp;' + this.title + "</a>";
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
        var valueSelector = edges.util.jsClassSelector(this.namespace, "value", this.component.id);
        var filterRemoveSelector = edges.util.jsClassSelector(this.namespace, "filter-remove", this);
        var toggleSelector = edges.util.idSelector(this.namespace, "toggle", this);
        var sizeSelector = edges.util.idSelector(this.namespace, "size", this);
        var orderSelector = edges.util.idSelector(this.namespace, "order", this);
        var tooltipSelector = edges.util.idSelector(this.namespace, "tooltip-toggle", this);

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

    setUIOpen() {
        // the selectors that we're going to use
        var resultsSelector = edges.util.idSelector(this.namespace, "results", this.component.id);
        var controlsSelector = edges.util.idSelector(this.namespace, "controls", this.component.id);
        var tooltipSelector = edges.util.idSelector(this.namespace, "tooltip", this.component.id);
        var toggleSelector = edges.util.idSelector(this.namespace, "toggle", this.component.id);

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

    setUISize() {
        var sizeSelector = edges.util.idSelector(this.namespace, "size", this.component.id);
        this.component.jq(sizeSelector).html(this.component.size);
    };

    setUISort() {
        var orderSelector = edges.util.idSelector(this.namespace, "order", this.component.id);
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

    termSelected(element) {
        var term = this.component.jq(element).attr("data-key");
        this.component.selectTerm(term);
    };

    removeFilter(element) {
        var term = this.component.jq(element).attr("data-key");
        this.component.removeFilter(term);
    };

    toggleOpen(element) {
        this.open = !this.open;
        this.setUIOpen();
    };

    changeSize(element) {
        var newSize = prompt('Currently displaying ' + this.component.size +
            ' results per page. How many would you like instead?');
        if (newSize) {
            this.component.changeSize(parseInt(newSize));
        }
    };

    changeSort(element) {
        var current = this.component.orderBy + " " + this.component.orderDir;
        var idx = $.inArray(current, this.sortCycle);
        var next = this.sortCycle[(idx + 1) % 4];
        var bits = next.split(" ");
        this.component.changeSort(bits[0], bits[1]);
    };

    toggleTooltip(element) {
        var tooltipSpanSelector = edges.util.idSelector(this.namespace, "tooltip-span", this.component.id);
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
        var tooltipSelector = edges.util.idSelector(this.namespace, "tooltip-toggle", this.component.id);
        // refresh the event binding
        edges.on(tooltipSelector, "click", this, "toggleTooltip");
    };

    //////////////////////////////////////////////////////////
    // some useful reusable components

    _shortTooltip() {
        var tt = this.tooltipText;
        var tooltipLinkId = edges.util.htmlID(this.namespace, "tooltip-toggle", this.component.id);
        var tooltipSpan = edges.util.htmlID(this.namespace, "tooltip-span", this.component.id);
        if (this.tooltip) {
            var tooltipLinkClass = edges.util.styleClasses(this.namespace, "tooltip-link", this.component.id);
            tt = '<span id="' + tooltipSpan + '"><a id="' + tooltipLinkId + '" class="' + tooltipLinkClass + '" href="#">' + tt + '</a></span>'
        }
        return tt;
    };

    _longTooltip = function() {
        var tt = this.tooltip;
        var tooltipLinkId = edges.util.htmlID(this.namespace, "tooltip-toggle", this.component.id);
        var tooltipLinkClass = edges.util.styleClasses(this.namespace, "tooltip-link", this.component.id);
        var tooltipSpan = edges.util.htmlID(this.namespace, "tooltip-span", this.component.id);
        tt = '<span id="' + tooltipSpan + '">' + this.tooltip + ' <a id="' + tooltipLinkId + '" class="' + tooltipLinkClass + '" href="#">less</a></span>';
        return tt;
    };
}