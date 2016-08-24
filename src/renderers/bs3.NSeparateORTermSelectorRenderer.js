$.extend(true, edges, {
    bs3 : {
        newNSeparateORTermSelectorRenderer: function (params) {
            if (!params) { params = {}}
            edges.bs3.NSeparateORTermSelectorRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.NSeparateORTermSelectorRenderer(params);
        },
        NSeparateORTermSelectorRenderer: function (params) {
            // number of pull down elements to be rendered
            this.n = edges.getParam(params.n, 1);

            this.colMdWidth = edges.getParam(params.colMdWidth, 3);

            // for each of the N elements, you can specify properties here
            // {
            //      "label" : "<label to appear with the selector>",
            //      "unselected" : "<text to show if a value is not selected>"
            // }
            this.properties = edges.getParam(params.properties, []);

            // whether the count should be displayed along with the term
            // defaults to false because count may be confusing to the user in an OR selector
            this.showCount = edges.getParam(params.showCount, false);

            // whether counts of 0 should prevent the value being rendered
            this.hideEmpty = edges.getParam(params.hideEmpty, false);

            // whether to apply select2 to the elements
            this.select2 = edges.getParam(params.select2, false);

            // namespace to use in the page
            this.namespace = "edges-bs3-n-separate-or-term-selector";

            this.draw = function () {
                // for convenient short references ...
                var ts = this.component;

                var selectClass = edges.css_classes(this.namespace, "select", this);
                var labelClass = edges.css_classes(this.namespace, "label", this);
                var containerClass = edges.css_classes(this.namespace, "container", this);

                var selectorFrag = '<div class="row">';
                for (var j = 0; j < this.n; j++) {
                    var label = false;
                    var unselected = "Select an option";
                    if (this.properties.length > j) {
                        var prop = this.properties[j];
                        if (prop.label) {
                            label = prop.label;
                        }
                        if (prop.unselected) {
                            unselected = prop.unselected;
                        }
                    }

                    var selectId = edges.css_id(this.namespace, "select-" + j, this);
                    var options = "";
                    if (ts.terms.length > 0) {
                        options += '<option value="">' + edges.escapeHtml(unselected) + '</option>';

                        // render each value, if it is not also a filter that has been set
                        for (var i = 0; i < ts.terms.length; i++) {
                            var val = ts.terms[i];
                            // should we ignore the empty counts
                            if (val.count === 0 && this.hideEmpty) {
                                continue
                            }
                            options += '<option value="' + edges.escapeHtml(val.term) + '">' + edges.escapeHtml(val.display);
                            if (this.showCount) {
                                options += " (" + val.count + ")";
                            }
                            options += "</option>";
                        }
                    } else {
                        options = '<option>Loading...</option>';
                    }

                    selectorFrag += '<div class="col-md-' + this.colMdWidth + '"><div class="form-group"> \
                        <label class="' + labelClass + '" for="' + selectId + '">' + edges.escapeHtml(label) + '</label><br>\
                        <select id="' + selectId + '" name="' + selectId + '" class="'+ selectClass +' form-control">' + options + '</select> \
                    </div></div>';
                }
                selectorFrag += "</div>";

                var frag = '<div class="' + containerClass + '"><div class="form-inline">' + selectorFrag + '</div></div>';

                // now render it into the page
                ts.context.html(frag);

                // sort out the selectors we're going to be needing
                var selectSelector = edges.css_class_selector(this.namespace, "select", this);

                // apply select2 where needed
                if (this.select2) {
                    var jq = this.component.jq(selectSelector);
                    jq.select2();
                }

                this._setSelectors();

                // for when a value in the facet is selected
                edges.on(selectSelector, "change", this, "selectorChanged");
            };

            this.selectorChanged = function(element) {
                // when a selector is changed we need to remove all selected filters and then
                // re-add them in the right order
                var vals = [];
                for (var i = 0; i < this.n; i++) {
                    var idSelector = edges.css_id_selector(this.namespace, "select-" + i, this);
                    var element = this.component.jq(idSelector);
                    var val = this._getVal({element: element});
                    // var val = this.component.jq(idSelector).val();
                    if (val && val != "") {
                        vals.push(val);
                    }
                }
                var triggered = this.component.selectTerms({terms: vals, clearOthers: true});
                if (!triggered) {
                    this._setSelectors();
                }
            };

            this._setSelectors = function() {
                var terms = this.component.selected;
                for (var i = 0; i < this.n; i++) {
                    var selected = false;
                    var idSelector = edges.css_id_selector(this.namespace, "select-" + i, this);
                    var element = this.component.jq(idSelector);

                    if (terms.length > i) {
                        selected = terms[i];
                        this._setVal({element: element, value: selected});
                        // element.val(selected);
                    }

                    for (var j = 0; j < terms.length; j++) {
                        if (terms[j] !== selected) {
                            element.find("option[value='" + terms[j] + "']").remove();
                        }
                    }
                }
            };

            this._setVal = function(params) {
                var el = params.element;
                var value = params.value;

                if (!this.select2) {
                    el.val(value);
                } else {
                    el.select2("val", value);
                }
            };

            this._getVal = function(params) {
                var el = params.element;

                if (!this.select2) {
                    return el.val();
                } else {
                    return el.select2("val");
                }
            };
        }
    }
});
