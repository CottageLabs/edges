$.extend(true, edges, {
    bs3 : {
        newNumericRangeEntryRenderer: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.NumericRangeEntryRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.NumericRangeEntryRenderer(params);
        },
        NumericRangeEntryRenderer: function (params) {

            this.fromText = "From";
            this.toText = "To";

            this.namespace = "edges-bs3-numeric-range-entry";

            this.draw = function () {
                // sort out all the classes that we're going to be using
                var facetClass = edges.css_classes(this.namespace, "facet", this);
                var headerClass = edges.css_classes(this.namespace, "header", this);
                var labelClass = edges.css_classes(this.namespace, "label", this);
                var selectClass = edges.css_classes(this.namespace, "select", this);

                var toggleId = edges.css_id(this.namespace, "toggle", this);
                var formId = edges.css_id(this.namespace, "form", this);
                var fromName = edges.css_id(this.namespace, "from", this);
                var toName = edges.css_id(this.namespace, "to", this);

                var theform = "";

                // list the numbers to display
                var numbers = [];
                var lower = this.component.lower === false ? 0 : this.component.lower;
                var upper = this.component.upper === false ? 0 : this.component.upper;
                for (var i = lower; i < upper; i += this.component.increment) {
                    numbers.push(i);
                }
                numbers.push(upper);

                // convert the numbers to a list of options
                var options = "";
                for (var i = 0; i < numbers.length; i++) {
                    options += '<option value="' + numbers[i] + '">' + numbers[i] + '</option>';
                }

                theform += '<div class="row"><div class="col-md-4"><span class="' + labelClass + '">' + this.fromText + '</span></div>';
                theform += '<div class="col-md-8"><select name="' + fromName + '" id="' + fromName + '" class="form-control ' + selectClass + '">' + options + '</select></div>';
                theform += '</div>';

                theform += '<div class="row"><div class="col-md-4"><span class="' + labelClass + '">' + this.toText + '</span></div>';
                theform += '<div class="col-md-8"><select name="' + toName + '" id="' + toName + '" class="form-control ' + selectClass + '">' + options + '</select></div>';
                theform += '</div></div>';

                // render the overall facet
                var frag = '<div class="' + facetClass + '">\
                        <div class="' + headerClass + '"><div class="row"> \
                            <div class="col-md-12">\
                                <a href="#" id="' + toggleId + '"><i class="glyphicon glyphicon-plus"></i>&nbsp;' + this.component.display + '</a>\
                            </div>\
                        </div></div>\
                        <div class="row" style="display:none" id="' + formId + '">\
                            <div class="col-md-12">\
                                <form>{{THEFORM}}</form>\
                            </div>\
                        </div></div>';

                // substitute in the component parts
                frag = frag.replace(/{{THEFORM}}/g, theform);

                // now render it into the page
                this.component.context.html(frag);

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

            this.setUIOpen = function () {
                // the selectors that we're going to use
                var formSelector = edges.css_id_selector(this.namespace, "form", this);
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);

                var form = this.component.jq(formSelector);
                var toggle = this.component.jq(toggleSelector);

                if (this.open) {
                    toggle.find("i").removeClass("glyphicon-plus").addClass("glyphicon-minus");
                    form.show();
                } else {
                    toggle.find("i").removeClass("glyphicon-minus").addClass("glyphicon-plus");
                    form.hide();
                }
            };

            this.setUIFrom = function () {
                if (this.component.from) {
                    var fromName = edges.css_id_selector(this.namespace, "from", this);
                    var fromSel = this.component.jq(fromName);
                    fromSel.val(this.component.from);
                }
            };

            this.setUITo = function () {
                if (this.component.to) {
                    var toName = edges.css_id_selector(this.namespace, "to", this);
                    var toSel = this.component.jq(toName);
                    toSel.val(this.component.to);
                }
            };

            //////////////////////////////////////////
            // behaviour functions

            this.toggleOpen = function (element) {
                this.open = !this.open;
                this.setUIOpen();
            };

            this.fromChanged = function (element) {
                // get the value we've been asked for
                var from = parseInt($(element).val());

                // get what the current to value is
                var toSelector = edges.css_id_selector(this.namespace, "to", this);
                var toSel = this.component.jq(toSelector);
                var to = parseInt(toSel.val());

                // if the from is greater than the to, update it
                if (from > to) {
                    to = from;
                    toSel.val(from);
                }

                // now kick it up to the component
                this.component.selectRange(from, to);
            };

            this.toChanged = function (element) {
                // get the value we've been asked for
                var to = parseInt($(element).val());

                // get what the current to value is
                var fromSelector = edges.css_id_selector(this.namespace, "from", this);
                var fromSel = this.component.jq(fromSelector);
                var from = parseInt(fromSel.val());

                // if the from is greater than the to, update it
                if (to < from) {
                    from = to;
                    fromSel.val(to);
                }

                // now kick it up to the component
                this.component.selectRange(from, to);
            };
        }
    }
});
