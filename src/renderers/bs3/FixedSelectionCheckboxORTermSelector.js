import {Renderer} from "../../core";
import {htmlID, styleClasses, safeId, escapeHtml, getParam, idSelector, jsClassSelector, on, allClasses} from "../../utils";

export class FixedSelectionCheckboxORTermSelector extends Renderer {
    constructor (params) {
        super();

        this.title = getParam(params, "title", "Select");

        // whether the facet should be open or closed
        // can be initialised and is then used to track internal state
        this.open = getParam(params, "open", false);

        this.togglable = getParam(params, "togglable", true);

        // whether the count should be displayed along with the term
        // defaults to false because count may be confusing to the user in an OR selector
        this.showCount = getParam(params, "showCount", false);

        this.countFormat = getParam(params, "countFormat", false);

        this.fixedTerms = getParam(params, "fixedTerms", []);

        this.valueToolTips = getParam(params, "valueToolTips", {});

        this.openIcon = getParam(params, "openIcon", "glyphicon glyphicon-plus");

        this.closeIcon = getParam(params, "closeIcon", "glyphicon glyphicon-minus");

        // don't display the facet at all if there is no data to display
        this.hideIfNoData = getParam(params, "hideIfNoData", true);

        this.layout = getParam(params, "layout", "left");

        // namespace to use in the page
        this.namespace = "edges-bs3-fixedselectioncheckboxortermselector";
    }

    draw() {
        // for convenient short references ...
        var ts = this.component;
        var namespace = this.namespace;

        if (this.hideIfNoData && ts.edge.result && ts.terms.length === 0) {
            this.component.context.html("");
            return;
        }

        // sort out all the classes that we're going to be using
        var countClass = styleClasses(namespace, "count", this);
        var checkboxClass = allClasses(namespace, "selector", this);
        var facetClass = styleClasses(namespace, "facet", this);
        var headerClass = styleClasses(namespace, "header", this);
        var bodyClass = styleClasses(namespace, "body", this);
        var listClass = styleClasses(namespace, "list", this);
        let labelClass = styleClasses(namespace, "label", this);

        var toggleId = htmlID(namespace, "toggle", this);
        var resultsId = htmlID(namespace, "results", this);

        let results = "";
        for (let i = 0; i < this.fixedTerms.length; i++) {
            let ft = this.fixedTerms[i];
            let found = false;
            for (let j = 0; j < ts.terms.length; j++) {
                let val = ts.terms[j];
                if (val.term === ft) {
                    found = true;
                    let active = $.inArray(val.term.toString(), ts.selected) > -1;
                    let checked = "";
                    if (active) {
                        checked = ` checked="checked" `;
                    }
                    let count = "";
                    if (this.showCount) {
                        count = ' <span class="' + countClass + '">(' + this._formatCount(val.count) + ')</span>';
                    }
                    var id = safeId(val.term);
                    let tooltip = "";
                    if (val.term in this.valueToolTips) {
                        tooltip = ` title="${this.valueToolTips[val.term]}" `;
                    }
                    results += '<li>\
                        <input class="' + checkboxClass + '" data-key="' + escapeHtml(val.term) + '" id="' + id + '" type="checkbox" name="' + id + '"' + checked + '>\
                        <label for="' + id + '" class="' + labelClass + '" id="' + id +'_label"' + tooltip + '>' + escapeHtml(val.display) + count + '</label>\
                    </li>';
                }
            }
            if (!found) {
                let display = this.component.translate(ft);
                let id = safeId(ft);
                let tooltip = "";
                    if (ft in this.valueToolTips) {
                        tooltip = ` title="${this.valueToolTips[ft]}" `;
                    }
                results += '<li>\
                    <input class="' + checkboxClass + '" data-key="' + escapeHtml(ft) + '" id="' + id + '" type="checkbox" name="' + id + '" disabled="disabled">\
                    <label for="' + id + '" class="' + labelClass + '"' + tooltip + '>' + escapeHtml(display) + '</label>\
                </li>';
            }
        }

        // this is what's displayed in the body if there are no results or the page is loading
        if (results === "") {
            if (ts.edge.result) {
                results = "<li>No data to show</li>";
            } else {
                results = "<li class='loading'>Loading choices...</li>";
            }
        }

        var header = this.headerLayout({toggleId: toggleId});

        // render the overall facet
        var frag = `<div class="${facetClass}">
                <div class="${headerClass}"><div class="row">
                    <div class="col-md-12">
                        ${header}
                    </div>
                </div></div>
                <div class="${bodyClass}">
                    <div class="row" style="display:none" id="${resultsId}">
                        <div class="col-md-12">
                            <ul class="${listClass}">{{FILTERS}}</ul>
                        </div>\
                    </div>\
                </div>\
                </div></div>`;

        // substitute in the component parts
        frag = frag.replace(/{{FILTERS}}/g, results);

        // now render it into the page
        ts.context.html(frag);

        // trigger all the post-render set-up functions
        this.setUIOpen();

        var checkboxSelector = jsClassSelector(namespace, "selector", this);
        on(checkboxSelector, "change", this, "filterToggle");

        var toggleSelector = idSelector(namespace, "toggle", this);
        on(toggleSelector, "click", this, "toggleOpen");

    }

    _formatCount(count) {
        if (this.countFormat) {
            return this.countFormat(count);
        }
        return count;
    }

    headerLayout(params) {
        var toggleId = params.toggleId;
        var iconClass = styleClasses(this.namespace, "icon", this);

        if (this.layout === "left") {
            var tog = this.title;
            if (this.togglable) {
                tog = '<a href="#" id="' + toggleId + '"><i class="' + this.openIcon + '"></i>&nbsp;' + tog + "</a>";
            }
            return tog;
        } else if (this.layout === "right") {
            var tog = "";
            if (this.togglable) {
                tog = '<a href="#" id="' + toggleId + '">' + this.title + '&nbsp;<i class="' + this.openIcon + ' ' + iconClass + '"></i></a>';
            } else {
                tog = this.title;
            }

            return tog;
        }
    }

    setUIOpen() {
        // the selectors that we're going to use
        var resultsSelector = idSelector(this.namespace, "results", this);
        var toggleSelector = idSelector(this.namespace, "toggle", this);

        var results = this.component.jq(resultsSelector);
        var toggle = this.component.jq(toggleSelector);

        var openBits = this.openIcon.split(" ");
        var closeBits = this.closeIcon.split(" ");

        if (this.open) {
            var i = toggle.find("i");
            for (var j = 0; j < openBits.length; j++) {
                i.removeClass(openBits[j]);
            }
            for (var j = 0; j < closeBits.length; j++) {
                i.addClass(closeBits[j]);
            }
            results.show();
        } else {
            var i = toggle.find("i");
            for (var j = 0; j < closeBits.length; j++) {
                i.removeClass(closeBits[j]);
            }
            for (var j = 0; j < openBits.length; j++) {
                i.addClass(openBits[j]);
            }
            results.hide();
        }
    }

    filterToggle(element) {
        var term = this.component.jq(element).attr("data-key");
        var checked = this.component.jq(element).is(":checked");
        if (checked) {
            this.component.selectTerm(term);
        } else {
            // if the last fixed term is removed, then all the fixed terms are re-selected
            if (this.component.selected.length === 1 && this.component.selected.includes(term)) {
                this.component.selectTerms({terms: this.fixedTerms});
            } else {
                this.component.removeFilter(term);
            }
        }
    }

    toggleOpen(element) {
        this.open = !this.open;
        this.setUIOpen();
    }
}