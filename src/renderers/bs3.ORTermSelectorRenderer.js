$.extend(true, edges, {
    bs3 : {
        newORTermSelectorRenderer: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.ORTermSelectorRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.ORTermSelectorRenderer(params);
        },
        ORTermSelectorRenderer: function (params) {
            // whether the facet should be open or closed
            // can be initialised and is then used to track internal state
            this.open = edges.getParam(params.open, false);

            this.togglable = edges.getParam(params.togglable, true);

            // whether the count should be displayed along with the term
            // defaults to false because count may be confusing to the user in an OR selector
            this.showCount = edges.getParam(params.showCount, false);

            // whether counts of 0 should prevent the value being rendered
            this.hideEmpty = edges.getParam(params.hideEmpty, false);

            this.openIcon = edges.getParam(params.openIcon, "glyphicon glyphicon-plus");

            this.closeIcon = edges.getParam(params.closeIcon, "glyphicon glyphicon-minus");

            this.layout = edges.getParam(params.layout, "left");

            // namespace to use in the page
            this.namespace = "edges-bs3-or-term-selector";

            this.draw = function () {
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
                var bodyClass = edges.css_classes(namespace, "body", this);
                var countClass = edges.css_classes(namespace, "count", this);

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
                        // should we ignore the empty counts
                        if (val.count === 0 && this.hideEmpty) {
                            continue
                        }
                        // otherwise, render any that aren't selected already
                        if ($.inArray(val.term.toString(), ts.selected) === -1) {   // the toString() helps us normalise other values, such as integers
                            results += '<div class="' + resultClass + '"><a href="#" class="' + valClass + '" data-key="' + edges.escapeHtml(val.term) + '">' +
                                edges.escapeHtml(val.display) + "</a>";
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
                            filterFrag += '<div class="' + resultClass + '"><strong>' + edges.escapeHtml(def.display);
                            if (this.showCount) {
                                filterFrag += " (" + def.count + ")";
                            }
                            filterFrag += '&nbsp;<a href="#" class="' + filterRemoveClass + '" data-key="' + edges.escapeHtml(def.term) + '">';
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

            this.headerLayout = function(params) {
                var toggleId = params.toggleId;
                var iconClass = edges.css_classes(this.namespace, "icon", this);

                if (this.layout === "left") {
                    var tog = this.component.display;
                    if (this.togglable) {
                        tog = '<a href="#" id="' + toggleId + '"><i class="' + this.openIcon + '"></i>&nbsp;' + tog + "</a>";
                    }
                    return tog;
                } else if (this.layout === "right") {
                    var tog = "";
                    if (this.togglable) {
                        tog = '<a href="#" id="' + toggleId + '">' + this.component.display + '&nbsp;<i class="' + this.openIcon + ' ' + iconClass + '"></i></a>';
                    } else {
                        tog = this.component.display;
                    }

                    return tog;
                }
            };

            this.setUIOpen = function () {
                // the selectors that we're going to use
                var resultsSelector = edges.css_id_selector(this.namespace, "results", this);
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);

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

            this._getFilterDef = function (term) {
                for (var i = 0; i < this.component.terms.length; i++) {
                    var t = this.component.terms[i];
                    if (term === t.term) {
                        return t;
                    }
                }
                return false;
            }
        }
    }
});
