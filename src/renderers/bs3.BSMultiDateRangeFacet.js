$.extend(true, edges, {
    bs3 : {
        newBSMultiDateRangeFacet: function (params) {
            if (!params) {params = {}}
            edges.bs3.BSMultiDateRangeFacet.prototype = edges.newRenderer(params);
            return new edges.bs3.BSMultiDateRangeFacet(params);
        },
        BSMultiDateRangeFacet: function (params) {
            ///////////////////////////////////////////////////
            // parameters that can be passed in

            // whether the facet should be open or closed
            // can be initialised and is then used to track internal state
            this.open = edges.getParam(params.open, false);

            this.togglable = edges.getParam(params.togglable, true);

            this.openIcon = edges.getParam(params.openIcon, "glyphicon glyphicon-plus");

            this.closeIcon = edges.getParam(params.closeIcon, "glyphicon glyphicon-minus");

            this.layout = edges.getParam(params.layout, "left");

            this.dateFormat = edges.getParam(params.dateFormat, "MMMM D, YYYY");

            this.useSelect2 = edges.getParam(params.useSelect2, false);

            this.ranges = edges.getParam(params.ranges, false);

            this.prefix = edges.getParam(params.prefix, "");

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

            this.namespace = "edges-bs3-bs-multi-date-range-facet";

            this.draw = function () {
                var dre = this.component;

                var selectClass = edges.css_classes(this.namespace, "select", this);
                var inputClass = edges.css_classes(this.namespace, "input", this);
                var prefixClass = edges.css_classes(this.namespace, "prefix", this);
                var facetClass = edges.css_classes(this.namespace, "facet", this);
                var headerClass = edges.css_classes(this.namespace, "header", this);
                var bodyClass = edges.css_classes(this.namespace, "body", this);

                var toggleId = edges.css_id(this.namespace, "toggle", this);
                var formId = edges.css_id(this.namespace, "form", this);
                var rangeDisplayId = edges.css_id(this.namespace, "range", this);
                var pluginId = edges.css_id(this.namespace, dre.id + "_plugin", this);

                this.selectId = edges.css_id(this.namespace, dre.id + "_date-type", this);
                this.rangeId = edges.css_id(this.namespace, dre.id + "_range", this);

                var options = "";
                for (var i = 0; i < dre.fields.length; i++) {
                    var field = dre.fields[i];
                    var selected = dre.currentField == field.field ? ' selected="selected" ' : "";
                    options += '<option value="' + field.field + '"' + selected + '>' + field.display + '</option>';
                }

                var frag = '<div class="form-inline">';

                if (dre.display) {
                    frag += '<span class="' + prefixClass + '">' + this.prefix + '</span>';
                }

                frag += '<div class="form-group"><select class="' + selectClass + ' form-control input-sm" name="' + this.selectId + '" id="' + this.selectId + '">' + options + '</select></div>';

                frag += '<div id="' + this.rangeId + '" class="' + inputClass + '">\
                    <div class="row"><div class="col-md-1"><i class="glyphicon glyphicon-calendar"></i></div>\
                    <div class="col-md-9"><div id="' + rangeDisplayId + '"></div></div>\
                    <div class="col-md-1"><b class="caret"></b></div></div>\
                </div>';

                frag += "</div>";

                var header = this.headerLayout({toggleId: toggleId});

                // render the overall facet
                var facet = '<div class="' + facetClass + '">\
                    <div class="' + headerClass + '"><div class="row"> \
                        <div class="col-md-12">\
                            ' + header + '\
                        </div>\
                    </div></div>\
                    <div class="' + bodyClass + '">\
                        <div class="row" style="display:none" id="' + formId + '">\
                            <div class="col-md-12">\
                                {{FORM}}\
                            </div>\
                        </div>\
                    </div>\
                    </div></div>';
                facet = facet.replace(/{{FORM}}/g, frag);

                dre.context.html(facet);

                // trigger all the post-render set-up functions
                this.setUIOpen();

                // sort out the selectors we're going to be needing
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);

                // for when the open button is clicked
                edges.on(toggleSelector, "click", this, "toggleOpen");

                // date range picker features
                var selectIdSelector = edges.css_id_selector(this.namespace, dre.id + "_date-type", this);
                var rangeIdSelector = edges.css_id_selector(this.namespace, dre.id + "_range", this);

                this.selectJq = dre.jq(selectIdSelector);
                this.rangeJq = dre.jq(rangeIdSelector);

                var cb = edges.objClosure(this, "updateDateRange", ["start", "end"]);
                var props = {
                    locale: {
                        format: "DD/MM/YYYY"
                    },
                    opens: "right"
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
                var formSelector = edges.css_id_selector(this.namespace, "form", this);
                var toggleSelector = edges.css_id_selector(this.namespace, "toggle", this);

                var form = this.component.jq(formSelector);
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
                    form.show();
                } else {
                    var i = toggle.find("i");
                    for (var j = 0; j < closeBits.length; j++) {
                        i.removeClass(closeBits[j]);
                    }
                    for (var j = 0; j < openBits.length; j++) {
                        i.addClass(openBits[j]);
                    }
                    form.hide();
                }
            };

            this.toggleOpen = function (element) {
                this.open = !this.open;
                this.setUIOpen();
            };

            this.dateRangeDisplay = function(params) {
                var start = params.start;
                var end = params.end;
                var rangeDisplaySelector = edges.css_id_selector(this.namespace, "range", this);
                this.rangeJq.find(rangeDisplaySelector).html("<strong>From</strong>: " + start.utc().format(this.dateFormat) + '<br><strong>To</strong>: ' + end.utc().format(this.dateFormat));
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
