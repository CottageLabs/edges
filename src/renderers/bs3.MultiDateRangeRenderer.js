$.extend(true, edges, {
    bs3 : {
        newMultiDateRangeRenderer: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.MultiDateRangeRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.MultiDateRangeRenderer(params);
        },
        MultiDateRangeRenderer: function (params) {
            ///////////////////////////////////////////////////
            // parameters that can be passed in
            this.dateFormat = edges.getParam(params.dateFormat, "dd-mm-yy");

            this.useSelect2 = edges.getParam(params.useSelect2, false);

            ///////////////////////////////////////////////////
            // parameters for tracking internal state

            this.dre = false;

            this.selectId = false;
            this.fromId = false;
            this.toId = false;

            this.selectJq = false;
            this.fromJq = false;
            this.toJq = false;

            this.namespace = "edges-bs3-multi-date-range";

            this.draw = function () {
                var dre = this.component;

                var selectClass = edges.css_classes(this.namespace, "select", this);
                var inputClass = edges.css_classes(this.namespace, "input", this);
                var prefixClass = edges.css_classes(this.namespace, "prefix", this);
                var labelClass = edges.css_classes(this.namespace, "label", this);

                this.selectId = edges.css_id(this.namespace, dre.id + "_date-type", this);
                this.fromId = edges.css_id(this.namespace, dre.id + "_date-from", this);
                this.toId = edges.css_id(this.namespace, dre.id + "_date-to", this);

                var options = "";
                for (var i = 0; i < dre.fields.length; i++) {
                    var field = dre.fields[i];
                    var selected = dre.currentField == field.field ? ' selected="selected" ' : "";
                    options += '<option value="' + field.field + '"' + selected + '>' + field.display + '</option>';
                }

                var frag = '<div class="form-inline">';

                if (dre.display) {
                    frag += '<span class="' + prefixClass + '">' + dre.display + '</span>';
                }

                frag += '<div class="form-group"><select class="' + selectClass + ' form-control" name="' + this.selectId + '" id="' + this.selectId + '">' + options + '</select></div>';

                frag += '<div class="form-group"><label class="' + labelClass + '" for="' + this.fromId + '">From</label>\
                    <input class="' + inputClass + ' form-control" type="text" name="' + this.fromId + '" id="' + this.fromId + '" placeholder="earliest date"></div>\
                    <div class="form-group"><label class="' + labelClass + '" for="' + this.toId + '">To</label>\
                    <input class="' + inputClass + ' form-control" type="text" name="' + this.toId + '" id="' + this.toId + '" placeholder="latest date"></div>';

                frag += "</div>";

                dre.context.html(frag);

                var selectIdSelector = edges.css_id_selector(this.namespace, dre.id + "_date-type", this);
                var fromIdSelector = edges.css_id_selector(this.namespace, dre.id + "_date-from", this);
                var toIdSelector = edges.css_id_selector(this.namespace, dre.id + "_date-to", this);

                this.selectJq = dre.jq(selectIdSelector);
                this.fromJq = dre.jq(fromIdSelector);
                this.toJq = dre.jq(toIdSelector);

                // populate and set the bindings on the date selectors
                this.fromJq.datepicker({
                    dateFormat: this.dateFormat,
                    constrainInput: true,
                    changeYear: true,
                    maxDate: 0
                });
                edges.on(fromIdSelector, "change", this, "dateChanged");

                this.toJq.datepicker({
                    dateFormat: this.dateFormat,
                    constrainInput: true,
                    defaultDate: 0,
                    changeYear: true,
                    maxDate: 0
                });
                edges.on(toIdSelector, "change", this, "dateChanged");

                if (this.useSelect2) {
                    this.selectJq.select2();
                }
                edges.on(selectIdSelector, "change", this, "typeChanged");

                this.prepDates();
            };

            this.dateChanged = function (element) {
                // a date or type has been changed, so set up the parent object

                // ensure that the correct field is set (it may initially be not set)
                var date_type = null;
                if (this.useSelect2) {
                    date_type = this.selectJq.select2("val");
                } else {
                    date_type = this.selectJq.val();
                }

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
                var triggered = this.component.triggerSearch();

                // if a search didn't get triggered, we still may need to modify the min/max specified dates
                if (!triggered) {
                    this.prepDates();
                }
            };

            this.typeChanged = function(element) {
                // ensure that the correct field is set (it may initially be not set)
                var date_type = null;
                if (this.useSelect2) {
                    date_type = this.selectJq.select2("val");
                } else {
                    date_type = this.selectJq.val();
                }

                this.component.changeField(date_type);

                // unset the range, which is required in order to correctly learn the min/max dates for this type
                this.component.setFrom(false);
                this.component.setTo(false);

                // this action should trigger a search (the parent object will
                // decide if that's required)
                var triggered = this.component.triggerSearch();

                // if a search didn't get triggered, we still may need to modify the min/max specified dates
                if (!triggered) {
                    this.prepDates();
                }
            };

            this.prepDates = function () {
                var min = this.component.currentEarliest();
                var max = this.component.currentLatest();
                var fr = this.component.fromDate;
                var to = this.component.toDate;

                if (min) {
                    this.fromJq.datepicker("option", "minDate", min);
                    this.fromJq.datepicker("option", "defaultDate", min);
                    this.toJq.datepicker("option", "minDate", min);
                } else {
                    this.fromJq.datepicker("option", "minDate", this.component.defaultEarliest);
                    this.fromJq.datepicker("option", "defaultDate", this.component.defaultEarliest);
                    this.toJq.datepicker("option", "minDate", this.component.defaultEarliest);
                }

                if (max) {
                    this.fromJq.datepicker("option", "maxDate", max);
                    this.toJq.datepicker("option", "maxDate", max);
                    this.toJq.datepicker("option", "defaultDate", max);
                } else {
                    this.fromJq.datepicker("option", "maxDate", this.component.defaultLatest);
                    this.toJq.datepicker("option", "maxDate", this.component.defaultLatest);
                    this.toJq.datepicker("option", "defaultDate", this.component.defaultLatest);
                }

                if (fr) {
                    fr = $.datepicker.parseDate("yy-mm-dd", fr);
                    fr = $.datepicker.formatDate("dd-mm-yy", fr);
                    this.fromJq.val(fr);
                } else {
                    this.fromJq.val("");
                }

                if (to) {
                    to = $.datepicker.parseDate("yy-mm-dd", to);
                    to = $.datepicker.formatDate("dd-mm-yy", to);
                    this.toJq.val(to);
                } else {
                    this.toJq.val("");
                }
            };
        }
    }
});
