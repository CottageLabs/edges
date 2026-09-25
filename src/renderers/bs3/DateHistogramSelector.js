window.edges = window.edges || {};
var edges = window.edges;
if (!edges.hasOwnProperty("renderers")) { edges.renderers = {}}
if (!edges.renderers.hasOwnProperty("bs3")) { edges.renderers.bs3 = {}}

edges.renderers.bs3.DateHistogramSelector = class extends edges.Renderer {
    constructor(params) {
        super(params);

        // whether to hide or just disable the facet if not active
        this.hideInactive = edges.util.getParam(params, "hideInactive", false);

        // whether the facet should be open or closed
        // can be initialised and is then used to track internal state
        this.open = edges.util.getParam(params.open, false);

        this.togglable = edges.util.getParam(params.togglable, true);

        // whether to display selected filters
        this.showSelected = edges.util.getParam(params.showSelected, true);

        // formatter for count display
        this.countFormat = edges.util.getParam(params.countFormat, false);

        // a short tooltip and a fuller explanation
        this.tooltipText = edges.util.getParam(params.tooltipText, false);
        this.tooltip = edges.util.getParam(params.tooltip, false);

        this.tooltipState = "closed";

        // whether to suppress display of date range with no values
        this.hideEmptyDateBin = params.hideEmptyDateBin || true;

        // how many of the values to display initially, with a "show all" option for the rest
        this.shortDisplay = edges.getParam(params.shortDisplay, false);

        // namespace to use in the page
        this.namespace = "edges-bs3-datehistogram-selector";
    }
    
    draw() {
        // for convenient short references ...
        let ts = this.component;
        let namespace = this.namespace;

        if (!ts.active && this.hideInactive) {
            ts.context.html("");
            return;
        }

        // sort out all the classes that we're going to be using
        let resultsListClass = edges.util.allClasses(namespace, "results-list", this);
        let resultClass = edges.util.allClasses(namespace, "result", this);
        let valClass = edges.util.allClasses(namespace, "value", this);
        let filterRemoveClass = edges.util.allClasses(namespace, "filter-remove", this);
        let facetClass = edges.util.allClasses(namespace, "facet", this);
        let headerClass = edges.util.allClasses(namespace, "header", this);
        let selectedClass = edges.util.allClasses(namespace, "selected", this);

        let toggleId = edges.util.htmlID(namespace, "toggle", this);
        let resultsId = edges.util.htmlID(namespace, "results", this);

        // this is what's displayed in the body if there are no results
        let results = "Loading...";
        if (ts.values !== false) {
            results = "No data available";
        }

        // render a list of the values
        if (ts.values && ts.values.length > 0) {
            results = "";

            // get the terms of the filters that have already been set
            let filterTerms = [];
            for (let i = 0; i < ts.filters.length; i++) {
                filterTerms.push(ts.filters[i].display);
            }

            // render each value, if it is not also a filter that has been set
            let longClass = edges.util.allClasses(namespace, "long", this);
            let short = true;
            for (let i = 0; i < ts.values.length; i++) {
                let val = ts.values[i];
                if ($.inArray(val.display, filterTerms) === -1) {
                    let myLongClass = "";
                    let styles = "";
                    if (this.shortDisplay && this.shortDisplay <= i) {
                        myLongClass = longClass;
                        styles = 'style="display:none"';
                        short = false;
                    }

                    let count = val.count;
                    if (this.countFormat) {
                        count = this.countFormat(count)
                    }
                    let ltData = "";
                    if (val.lt) {
                        ltData = ' data-lt="' + edges.util.escapeHtml(val.lt) + '" ';
                    }
                    results += '<div class="' + resultClass + ' ' + myLongClass + '" '  + styles +  '><a href="#" class="' + valClass + '" data-gte="' + edges.util.escapeHtml(val.gte) + '"' + ltData + '>' +
                        edges.util.escapeHtml(val.display) + "</a> (" + count + ")</div>";

                }
            }
            if (!short) {
                let showClass = edges.util.allClasses(namespace, "show-link", this);
                let showId = edges.util.htmlID(namespace, "show-link", this);
                let slToggleId = edges.util.htmlID(namespace, "sl-toggle", this);
                results += '<div class="' + showClass + '" id="' + showId + '">\
                    <a href="#" id="' + slToggleId + '"><span class="all">show all</span><span class="less" style="display:none">show less</span></a> \
                </div>';
            }

        }

        // if there is a tooltip, make the frag
        let tooltipFrag = "";
        if (this.tooltipText) {
            let tt = this._shortTooltip();
            let tooltipClass = edges.util.allClasses(namespace, "tooltip", this);
            let tooltipId = edges.util.htmlID(namespace, "tooltip", this);
            tooltipFrag = '<div id="' + tooltipId + '" class="' + tooltipClass + '" style="display:none"><div class="row"><div class="col-md-12">' + tt + '</div></div></div>';
        }

        // if we want the active filters, render them
        let filterFrag = "";
        if (ts.filters.length > 0 && this.showSelected) {
            for (let i = 0; i < ts.filters.length; i++) {
                let filt = ts.filters[i];
                let ltData = "";
                if (filt.lt) {
                    ltData = ' data-lt="' + edges.util.escapeHtml(filt.lt) + '" ';
                }
                filterFrag += '<div class="' + resultClass + '"><strong>' + edges.util.escapeHtml(filt.display) + "&nbsp;";
                filterFrag += '<a href="#" class="' + filterRemoveClass + '" data-gte="' + edges.util.escapeHtml(filt.gte) + '"' + ltData + '>';
                filterFrag += '<i class="glyphicon glyphicon-black glyphicon-remove"></i></a>';
                filterFrag += "</strong></a></div>";
            }
        }

        // render the toggle capability
        let tog = ts.display;
        if (this.togglable) {
            tog = '<a href="#" id="' + toggleId + '"><i class="glyphicon glyphicon-plus"></i>&nbsp;' + tog + "</a>";
        }

        // render the overall facet
        let frag = '<div class="' + facetClass + '">\
                <div class="' + headerClass + '"><div class="row"> \
                    <div class="col-md-12">\
                        ' + tog + '\
                    </div>\
                </div></div>\
                ' + tooltipFrag + '\
                <div class="row" style="display:none" id="' + resultsId + '">\
                    <div class="col-md-12">\
                        <div class="' + selectedClass + '">{{SELECTED}}</div>\
                        <div class="' + resultsListClass + '">{{RESULTS}}</div>\
                    </div>\
                </div></div>';

        // substitute in the component parts
        frag = frag.replace(/{{RESULTS}}/g, results)
            .replace(/{{SELECTED}}/g, filterFrag);

        // now render it into the page
        ts.context.html(frag);

        // trigger all the post-render set-up functions
        this.setUIOpen();

        // sort out the selectors we're going to be needing
        let valueSelector = edges.util.jsClassSelector(namespace, "value", this);
        let filterRemoveSelector = edges.util.jsClassSelector(namespace, "filter-remove", this);
        let toggleSelector = edges.util.idSelector(namespace, "toggle", this);
        let tooltipSelector = edges.util.idSelector(namespace, "tooltip-toggle", this);
        let shortLongToggleSelector = edges.util.idSelector(namespace, "sl-toggle", this);

        // for when a value in the facet is selected
        edges.on(valueSelector, "click", this, "termSelected");
        // for when the open button is clicked
        edges.on(toggleSelector, "click", this, "toggleOpen");
        // for when a filter remove button is clicked
        edges.on(filterRemoveSelector, "click", this, "removeFilter");
        // toggle the full tooltip
        edges.on(tooltipSelector, "click", this, "toggleTooltip");
        // toggle show/hide full list
        edges.on(shortLongToggleSelector, "click", this, "toggleShortLong");
    }

    /////////////////////////////////////////////////////
    // UI behaviour functions
    
    setUIOpen() {
        // the selectors that we're going to use
        let resultsSelector = edges.util.idSelector(this.namespace, "results", this);
        let tooltipSelector = edges.util.idSelector(this.namespace, "tooltip", this);
        let toggleSelector = edges.util.idSelector(this.namespace, "toggle", this);

        let results = this.component.jq(resultsSelector);
        let tooltip = this.component.jq(tooltipSelector);
        let toggle = this.component.jq(toggleSelector);

        if (this.open) {
            toggle.find("i").removeClass("glyphicon-plus").addClass("glyphicon-minus");
            results.show();
            tooltip.show();
        } else {
            toggle.find("i").removeClass("glyphicon-minus").addClass("glyphicon-plus");
            results.hide();
            tooltip.hide();
        }
    }

    /////////////////////////////////////////////////////
    // event handlers

    termSelected(element) {
        let gte = this.component.jq(element).attr("data-gte");
        let lt = this.component.jq(element).attr("data-lt");
        this.component.selectRange({gte: gte, lt: lt});
    }

    removeFilter(element) {
        let gte = this.component.jq(element).attr("data-gte");
        let lt = this.component.jq(element).attr("data-lt");
        this.component.removeFilter({gte: gte, lt: lt});
    }

    toggleOpen(element) {
        this.open = !this.open;
        this.setUIOpen();
    }

    toggleTooltip(element) {
        let tooltipSpanSelector = edges.util.idSelector(this.namespace, "tooltip-span", this);
        let container = this.component.jq(tooltipSpanSelector).parent();
        let tt = "";
        if (this.tooltipState === "closed") {
            tt = this._longTooltip();
            this.tooltipState = "open";
        } else {
            tt = this._shortTooltip();
            this.tooltipState = "closed";
        }
        container.html(tt);
        let tooltipSelector = edges.util.idSelector(this.namespace, "tooltip-toggle", this);
        // refresh the event binding
        edges.on(tooltipSelector, "click", this, "toggleTooltip");
    }

    toggleShortLong(element) {
        let longSelector = edges.util.jsClassSelector(this.namespace, "long", this);
        let showSelector = edges.util.idSelector(this.namespace, "show-link", this);
        let container = this.component.jq(longSelector);
        let show = this.component.jq(showSelector);

        container.slideToggle(200);
        show.find(".all").toggle();
        show.find(".less").toggle();
    }

    //////////////////////////////////////////////////////////
    // some useful reusable components

    _shortTooltip() {
        let tt = this.tooltipText;
        let tooltipLinkId = edges.util.htmlID(this.namespace, "tooltip-toggle", this);
        let tooltipSpan = edges.util.htmlID(this.namespace, "tooltip-span", this);
        if (this.tooltip) {
            let tooltipLinkClass = edges.util.allClasses(this.namespace, "tooltip-link", this);
            tt = '<span id="' + tooltipSpan + '"><a id="' + tooltipLinkId + '" class="' + tooltipLinkClass + '" href="#">' + tt + '</a></span>'
        }
        return tt;
    }

    _longTooltip() {
        let tt = this.tooltip;
        let tooltipLinkId = edges.util.htmlID(this.namespace, "tooltip-toggle", this);
        let tooltipLinkClass = edges.util.allClasses(this.namespace, "tooltip-link", this);
        let tooltipSpan = edges.util.htmlID(this.namespace, "tooltip-span", this);
        tt = '<span id="' + tooltipSpan + '">' + this.tooltip + ' <a id="' + tooltipLinkId + '" class="' + tooltipLinkClass + '" href="#">less</a></span>';
        return tt;
    }
}
