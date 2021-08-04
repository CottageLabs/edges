$.extend(true, edges, {
    bs3 : {
        newBSMultiDateRange: function (params) {
            if (!params) {params = {}}
            edges.bs3.BSMultiDateRange.prototype = edges.newRenderer(params);
            return new edges.bs3.BSMultiDateRange(params);
        },
        BSMultiDateRange: function (params) {
            ///////////////////////////////////////////////////
            // parameters that can be passed in
            this.dateFormat = edges.getParam(params.dateFormat, "MMMM D, YYYY");

            this.useSelect2 = edges.getParam(params.useSelect2, false);

            this.ranges = edges.getParam(params.ranges, false);

            ///////////////////////////////////////////////////
            // parameters for tracking internal state

            this.dre = false;

            this.selectId = false;
            this.rangeId = false;
            // this.toId = false;

            this.selectJq = false;
            this.rangeJq = false;
            // this.toJq = false;

            this.drp = false;

            this.namespace = "edges-bs3-bs-multi-date-range";

            this.draw = function () {
                var dre = this.component;

                var selectClass = edges.css_classes(this.namespace, "select", this);
                var inputClass = edges.css_classes(this.namespace, "input", this);
                var prefixClass = edges.css_classes(this.namespace, "prefix", this);

                this.selectId = edges.css_id(this.namespace, dre.id + "_date-type", this);
                this.rangeId = edges.css_id(this.namespace, dre.id + "_range", this);
                var pluginId = edges.css_id(this.namespace, dre.id + "_plugin", this);

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

                frag += '<div id="' + this.rangeId + '" class="' + inputClass + ' form-control">\
                    <i class="glyphicon glyphicon-calendar"></i>&nbsp;\
                    <span></span> <b class="caret"></b>\
                </div>';

                frag += "</div>";

                dre.context.html(frag);

                var selectIdSelector = edges.css_id_selector(this.namespace, dre.id + "_date-type", this);
                var rangeIdSelector = edges.css_id_selector(this.namespace, dre.id + "_range", this);

                this.selectJq = dre.jq(selectIdSelector);
                this.rangeJq = dre.jq(rangeIdSelector);

                var cb = edges.objClosure(this, "updateDateRange", ["start", "end"]);
                var props = {
                    locale: {
                        format: "DD/MM/YYYY"
                    },
                    opens: "left"
                };
                if (this.ranges) {
                    props["ranges"] = this.ranges;
                }

                // clear out any old version of the plugin, as these are appended to the document
                // and not kept within the div controlled by this renderer
                var pluginSelector = edges.css_id_selector(this.namespace, dre.id + "_plugin", this);
                $(pluginSelector).remove();

                this.rangeJq.daterangepicker(props, cb);
                this.drp = this.rangeJq.data("daterangepicker");
                this.drp.container.attr("id", pluginId).addClass("show-calendar");

                this.prepDates();

                if (this.useSelect2) {
                    this.selectJq.select2();
                }
                edges.on(selectIdSelector, "change", this, "typeChanged");
            };

            this.dateRangeDisplay = function(params) {
                var start = params.start;
                var end = params.end;
                this.rangeJq.find("span").html(start.utc().format(this.dateFormat) + ' - ' + end.utc().format(this.dateFormat));
            };

            this.updateDateRange = function (params) {
                var start = params.start;
                var end = params.end;

                // a date or type has been changed, so set up the parent object

                // ensure that the correct field is set (it may initially be not set)
                var date_type = null;
                if (this.useSelect2) {
                    date_type = this.selectJq.select2("val");
                } else {
                    date_type = this.selectJq.val();
                }

                this.component.changeField(date_type);

                this.component.setFrom(start.toDate());
                this.component.setTo(end.toDate());
                this.dateRangeDisplay(params);

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

                // unset the range
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
                    this.drp.minDate = moment(min);
                    this.drp.setStartDate(moment(min));
                } else {
                    this.drp.minDate = moment(this.component.defaultEarliest);
                    this.drp.setStartDate(moment(this.component.defaultEarliest));
                }

                if (max) {
                    this.drp.maxDate = moment(max);
                    this.drp.setEndDate(moment(max));
                } else {
                    this.drp.maxDate = moment(this.component.defaultLatest);
                    this.drp.setEndDate(moment(this.component.defaultLatest));
                }

                if (fr) {
                    // if from lies before the min date, extend the min range
                    if (fr < this.drp.minDate) {
                        this.drp.minDate = moment(fr);
                    }
                    // if from lies after the max date, extend the max range
                    if (fr > this.drp.maxDate) {
                        this.drp.maxDate = moment(fr);
                    }
                    this.drp.setStartDate(moment(fr));
                }
                if (to) {
                    // if to lies before the min date, extend the min range
                    if (to < this.drp.minDate) {
                        this.drp.minDate = moment(to);
                    }
                    // if to lies after the max date, extend the max range
                    if (to > this.drp.maxDate) {
                        this.drp.maxDate = moment(to);
                    }
                    this.drp.setEndDate(moment(to));
                }

                this.dateRangeDisplay({start: this.drp.startDate, end: this.drp.endDate});
            };
        }
    }
});
