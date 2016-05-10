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
            this.dre = false;

            this.selectId = false;
            this.fromId = false;
            this.toId = false;

            this.selectJq = false;
            this.fromJq = false;
            this.toJq = false;

            this.draw = function () {
                var dre = this.component;

                this.selectId = dre.id + "_date-type";
                this.fromId = dre.id + "_date-from";
                this.toId = dre.id + "_date-to";

                var options = "";
                for (var i = 0; i < dre.fields.length; i++) {
                    var field = dre.fields[i];
                    var selected = dre.currentField == field.field ? ' selected="selected" ' : "";
                    options += '<option value="' + field.field + '"' + selected + '>' + field.display + '</option>';
                }

                var frag = '<select class="multi-date-range-select" name="' + this.selectId + '" id="' + this.selectId + '">' + options + '</select><br>';

                frag += '<label for="' + this.fromId + '">From</label>\
                    <input class="multi-date-range-input" type="text" name="' + this.fromId + '" id="' + this.fromId + '" placeholder="earliest date">\
                    <label for="' + this.toId + '">To</label>\
                    <input class="multi-date-range-input" type="text" name="' + this.toId + '" id="' + this.toId + '" placeholder="latest date">';

                dre.context.html(frag);

                this.selectJq = dre.jq("#" + this.selectId);
                this.fromJq = dre.jq("#" + this.fromId);
                this.toJq = dre.jq("#" + this.toId);

                // populate and set the bindings on the date selectors
                this.fromJq.datepicker({
                    dateFormat: "dd-mm-yy",
                    constrainInput: true,
                    changeYear: true,
                    maxDate: 0
                }).bind("change", edges.eventClosure(this, "dateChanged"));

                this.toJq.datepicker({
                    dateFormat: "dd-mm-yy",
                    constrainInput: true,
                    defaultDate: 0,
                    changeYear: true,
                    maxDate: 0
                }).bind("change", edges.eventClosure(this, "dateChanged"));

                this.selectJq.select2().bind("change", edges.eventClosure(this, "dateChanged"));

                this.prepDates();
            };

            this.dateChanged = function (element) {
                // a date or type has been changed, so set up the parent object

                // ensure that the correct field is set (it may initially be not set)
                var date_type = this.selectJq.select2("val");
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
                this.component.triggerSearch();
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
                }

                if (max) {
                    this.fromJq.datepicker("option", "maxDate", max);
                    this.toJq.datepicker("option", "maxDate", max);
                    this.toJq.datepicker("option", "defaultDate", max);
                }

                if (fr) {
                    fr = $.datepicker.parseDate("yy-mm-dd", fr);
                    fr = $.datepicker.formatDate("dd-mm-yy", fr);
                    this.fromJq.val(fr);
                }

                if (to) {
                    to = $.datepicker.parseDate("yy-mm-dd", to);
                    to = $.datepicker.formatDate("dd-mm-yy", to);
                    this.toJq.val(to);
                }
            };
        }
    }
});
