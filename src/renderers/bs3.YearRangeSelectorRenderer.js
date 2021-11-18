$.extend(true, edges, {
    bs3 : {
        newYearRangeSelectorRenderer : function(params) {
            return edges.instantiate(edges.bs3.YearRangeSelectorRenderer, params, edges.newRenderer);
        },
        YearRangeSelectorRenderer : function(params) {

            ///////////////////////////////////////
            // parameters that can be passed in

            // whether to hide or just disable the facet if not active
            this.hideInactive = edges.getParam(params.hideInactive, false);

            // whether the facet should be open or closed
            // can be initialised and is then used to track internal state
            this.open = edges.getParam(params.open, false);

            this.togglable = edges.getParam(params.togglable, true);

            this.fromText = edges.getParam(params.fromText, "From");
            this.toText = edges.getParam(params.toText, "To");

            // whether to display selected filters
            this.showSelected = edges.getParam(params.showSelected, true);

            this.showCount = edges.getParam(params.showCount, true);

            // formatter for count display
            this.countFormat = edges.getParam(params.countFormat, false);

            // namespace to use in the page
            this.namespace = "edges-bs3-yearrangeselector";

            this.draw = function () {
                // for convenient short references ...
                var ts = this.component;
                var namespace = this.namespace;

                if (!ts.active && this.hideInactive) {
                    ts.context.html("");
                    return;
                }

                // sort out all the classes that we're going to be using
                var resultsListClass = edges.css_classes(this.namespace, "results-list", this);
                var headerClass = edges.css_classes(this.namespace, "header", this);
                var facetClass = edges.css_classes(this.namespace, "facet", this);
                var labelClass = edges.css_classes(this.namespace, "label", this);
                var selectClass = edges.css_classes(this.namespace, "select", this);
                var dropdownClass = edges.css_classes(this.namespace, "dropdown", this);

                var toggleId = edges.css_id(namespace, "toggle", this);
                var resultsId = edges.css_id(namespace, "results", this);
                var fromName = edges.css_id(this.namespace, "from", this);
                var toName = edges.css_id(this.namespace, "to", this);

                // this is what's displayed in the body if there are no results
                var results = "Loading...";
                if (ts.values !== false) {
                    results = "No data available";
                }

                // render a list of the values
                let theform = "";
                if (this.component.values && this.component.values.length > 0) {
                    let options = "";
                    for (var i = 0; i < this.component.values.length; i++) {
                        var val = this.component.values[i];

                        var count = "";
                        if (this.showCount) {
                            count = val.count;
                            if (this.countFormat) {
                                count = this.countFormat(count)
                            }
                            count = ' (' + count + ')';
                        }

                        var ltData = "";
                        if (val.lt) {
                            ltData = ' data-lt="' + edges.escapeHtml(val.lt) + '" ';
                        }
                        options += '<option value="' + val.gte.toString() + '" data-gte="' + edges.escapeHtml(val.gte) + '"' + ltData + '>' + val.display.toString() + count + '</option>';
                    }

                    theform += '<form><div class="row"><div class="col-md-4"><span class="' + labelClass + '">' + this.fromText + '</span></div>';
                    theform += '<div class="col-md-8 ' + dropdownClass + '"><select name="' + fromName + '" id="' + fromName + '" class="form-control ' + selectClass + '">' + options + '</select></div>';
                    theform += '</div>';

                    theform += '<div class="row"><div class="col-md-4"><span class="' + labelClass + '">' + this.toText + '</span></div>';
                    theform += '<div class="col-md-8 ' + dropdownClass + '"><select name="' + toName + '" id="' + toName + '" class="form-control ' + selectClass + '">' + options + '</select></div>';
                    theform += '</div></div></form>';
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
                        <div class="row" style="display:none" id="' + resultsId + '">\
                            <div class="col-md-12">\
                                <div class="' + resultsListClass + '">{{RESULTS}}</div>\
                            </div>\
                        </div></div>';

                // substitute in the component parts
                frag = frag.replace(/{{RESULTS}}/g, theform);

                // now render it into the page
                ts.context.html(frag);

                // trigger all the post-render set-up functions
                this.setUIFrom();
                this.setUITo();
                this.setUIOpen();

                // sort out the selectors we're going to be needing
                var fromSelector = edges.css_id_selector(this.namespace, "from", this);
                var toSelector = edges.css_id_selector(this.namespace, "to", this);
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);

                // for when the from value is changed
                edges.on(fromSelector, "change", this, "fromChanged");
                // for when the to value is changed
                edges.on(toSelector, "change", this, "toChanged");
                // for when the open button is clicked
                edges.on(toggleSelector, "click", this, "toggleOpen");
            };

            /////////////////////////////////////////////////////
            // UI behaviour functions

            this.setUIOpen = function () {
                // the selectors that we're going to use
                var resultsSelector = edges.css_id_selector(this.namespace, "results", this);
                var tooltipSelector = edges.css_id_selector(this.namespace, "tooltip", this);
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);

                var results = this.component.jq(resultsSelector);
                var tooltip = this.component.jq(tooltipSelector);
                var toggle = this.component.jq(toggleSelector);

                if (this.open) {
                    toggle.find("i").removeClass("glyphicon-plus").addClass("glyphicon-minus");
                    results.show();
                    tooltip.show();
                } else {
                    toggle.find("i").removeClass("glyphicon-minus").addClass("glyphicon-plus");
                    results.hide();
                    tooltip.hide();
                }
            };

            this.setUIFrom = function () {
                var fromName = edges.css_id_selector(this.namespace, "from", this);
                var fromSel = this.component.jq(fromName);

                if (this.component.filters.length !== 0) {
                    fromSel.val(this.component.filters[0].gte);
                } else {
                    if (this.component.values.length > 0) {
                        fromSel.val(this.component.values[this.component.values.length - 1].gte);
                    }
                }
            };

            this._getFrom = function() {
                var fromName = edges.css_id_selector(this.namespace, "from", this);
                var fromSel = this.component.jq(fromName);
                return fromSel.val();
            }

            this.setUITo = function () {
                var toName = edges.css_id_selector(this.namespace, "to", this);
                var toSel = this.component.jq(toName);
                if (this.component.filters.length !== 0) {
                    toSel.val(this.component.filters[0].lt-1);
                    var opts = $(toName + ' option');
                    var options = $.map(opts, function(option){
                        return option;
                    });
                    var from = parseInt(this._getFrom());
                    for (let i = 0; i < options.length; i++){
                        if (parseInt(options[i].value) < from){
                            options[i].hidden = "true";
                        }
                    }
                } else {
                    if (this.component.values.length > 0) {
                        toSel.val(this.component.values[0].gte);
                    }
                }
            };

            /////////////////////////////////////////////////////
            // event handlers

            this.fromChanged = function (element) {
                // get the value we've been asked for
                var from = parseInt($(element).val());

                // get what the current to value is
                var toSelector = edges.css_id_selector(this.namespace, "to", this);
                var toSel = this.component.jq(toSelector);
                var to = parseInt(toSel.val());

                // if the from is greater than the to, update it
                // if (from > to) {
                //     to = from;
                //     toSel.val(from);
                // }

                // now kick it up to the component
                this.component.selectRange({gte: from, lt: to});
            };

            this.toChanged = function (element) {
                // get the value we've been asked for
                var to = parseInt($(element).val());

                // get what the current to value is
                var fromSelector = edges.css_id_selector(this.namespace, "from", this);
                var fromSel = this.component.jq(fromSelector);
                var from = parseInt(fromSel.val());

                // if the from is greater than the to, update it
                // if (to < from) {
                //     from = to;
                //     fromSel.val(to);
                // }

                // now kick it up to the component
                this.component.selectRange({gte: from, lt: to});
            };

            this.toggleOpen = function (element) {
                this.open = !this.open;
                this.setUIOpen();
            };
        }
    }
});
