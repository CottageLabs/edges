import {Renderer} from "../../core";
import {allClasses, escapeHtml, getParam, htmlID, idSelector, jsClassSelector, styleClasses} from "../../utils";

export class ORTermSelectorRenderer extends Renderer {
    constructor(params) {
        super(params);

        this.title = getParam(params, "title", "Select");

        // whether the facet should be open or closed
        // can be initialised and is then used to track internal state
        this.open = getParam(params, "open", false);

        this.togglable = getParam(params, "togglable", true);

        // whether the count should be displayed along with the term
        // defaults to false because count may be confusing to the user in an OR selector
        this.showCount = getParam(params, "showCount", false);

        // whether counts of 0 should prevent the value being rendered
        this.hideEmpty = getParam(params, "hideEmpty", false);

        this.openIcon = getParam(params, "openIcon", "glyphicon glyphicon-plus");

        this.closeIcon = getParam(params, "closeIcon", "glyphicon glyphicon-minus");

        this.layout = getParam(params, "layout", "left");

        // namespace to use in the page
        this.namespace = "edges-bs3-or-term-selector";
    }

    draw() {
        // for convenient short references ...
        var ts = this.component;
        var namespace = this.namespace;

        // sort out all the classes that we're going to be using
        var resultClass = styleClasses(namespace, "result", this);
        var valClass = allClasses(namespace, "value", this);
        var filterRemoveClass = allClasses(namespace, "filter-remove", this);
        var facetClass = styleClasses(namespace, "facet", this);
        var headerClass = styleClasses(namespace, "header", this);
        var selectionsClass = styleClasses(namespace, "selections", this);
        var bodyClass = styleClasses(namespace, "body", this);
        var countClass = styleClasses(namespace, "count", this);

        var toggleId = htmlID(namespace, "toggle", this);
        var resultsId = htmlID(namespace, "results", this);

        // this is what's displayed in the body if there are no results
        var results = "Loading...";

        // render a list of the values
        if (ts.terms.length > 0) {
            results = "";

            // render each value, if it is not also a filter that has been set
            for (var i = 0; i < ts.terms.length; i++) {
                var val = ts.terms[i];
                // should we ignore the empty counts
                if (val.count === 0 && this.hideEmpty) {
                    continue
                }
                // otherwise, render any that aren't selected already
                if ($.inArray(val.term.toString(), ts.selected) === -1) {   // the toString() helps us normalise other values, such as integers
                    results += '<div class="' + resultClass + '"><a href="#" class="' + valClass + '" data-key="' + escapeHtml(val.term) + '">' +
                        escapeHtml(val.display) + "</a>";
                    if (this.showCount) {
                        results += ' <span class="' + countClass + '">(' + val.count + ')</span>';
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
                    filterFrag += '<div class="' + resultClass + '"><strong>' + escapeHtml(def.display);
                    if (this.showCount) {
                        filterFrag += " (" + def.count + ")";
                    }
                    filterFrag += '&nbsp;<a href="#" class="' + filterRemoveClass + '" data-key="' + escapeHtml(def.term) + '">';
                    filterFrag += '<i class="glyphicon glyphicon-black glyphicon-remove"></i></a>';
                    filterFrag += "</strong></a></div>";
                }
            }
        }

        var header = this.headerLayout({toggleId: toggleId});

        // render the overall facet
        var frag = '<div class="' + facetClass + '">\
                <div class="' + headerClass + '"><div class="row"> \
                    <div class="col-md-12">\
                        ' + header + '\
                    </div>\
                </div></div>\
                <div class="' + bodyClass + '">\
                    <div class="row" style="display:none" id="' + resultsId + '">\
                        <div class="col-md-12">\
                            {{SELECTED}}\
                        </div>\
                        <div class="col-md-12"><div class="' + selectionsClass + '">\
                            {{RESULTS}}\
                        </div>\
                    </div>\
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
        var valueSelector = jsClassSelector(namespace, "value", this);
        var filterRemoveSelector = jsClassSelector(namespace, "filter-remove", this);
        var toggleSelector = idSelector(namespace, "toggle", this);

        // for when a value in the facet is selected
        edges.on(valueSelector, "click", this, "termSelected");
        // for when the open button is clicked
        edges.on(toggleSelector, "click", this, "toggleOpen");
        // for when a filter remove button is clicked
        edges.on(filterRemoveSelector, "click", this, "removeFilter");
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
                tog = this.component.title;
            }

            return tog;
        }
    };

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
    };

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

    _getFilterDef(term) {
        for (var i = 0; i < this.component.terms.length; i++) {
            var t = this.component.terms[i];
            if (term === t.term) {
                return t;
            }
        }
        return false;
    }
}