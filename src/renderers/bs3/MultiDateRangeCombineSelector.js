import {Renderer} from "../../core";
import {getParam, htmlID, idSelector, objClosure, styleClasses, on} from "../../utils";

// FIXME: we'd like to retire moment, as the project has announced it has run its course, but that
// requires some work to unpick
import {moment} from "../../../dependencies/moment";

// FIXME: on a related note, we need to retire the jquery daterangepicker too as it depends on
// moment.  This looks like a viable alternative: https://litepicker.com/

export class MultiDateRangeCombineSelector extends Renderer {
    constructor(params) {
        super(params);

        ///////////////////////////////////////////////////
        // parameters that can be passed in
        this.dateFormat = getParam(params, "dateFormat", "MMMM D, YYYY");

        this.useSelect2 = getParam(params, "useSelect2", false);

        this.ranges = getParam(params, "ranges", false);

        ///////////////////////////////////////////////////
        // parameters for tracking internal state

        this.dre = false;

        this.selectId = false;
        this.rangeId = false;

        this.selectJq = false;
        this.rangeJq = false;

        this.drp = false;

        this.namespace = "edges-bs3-multidaterangecombineselector";
    }

    draw() {
        var dre = this.component;

        var selectClass = styleClasses(this.namespace, "select", this);
        var inputClass = styleClasses(this.namespace, "input", this);
        var prefixClass = styleClasses(this.namespace, "prefix", this);

        this.selectId = htmlID(this.namespace, dre.id + "_date-type", this);
        this.rangeId = htmlID(this.namespace, dre.id + "_range", this);
        var pluginId = htmlID(this.namespace, dre.id + "_plugin", this);

        var frag = '<div class="form-inline">';
        if (dre.fields.length > 1) {
            var options = "";
            for (var i = 0; i < dre.fields.length; i++) {
                var field = dre.fields[i];
                var selected = dre.currentField === field.field ? ' selected="selected" ' : "";
                options += '<option value="' + field.field + '"' + selected + '>' + field.display + '</option>';
            }
            frag += '<div class="form-group"><select class="' + selectClass + ' form-control" name="' + this.selectId + '" id="' + this.selectId + '">' + options + '</select></div>';
        }

        frag += '<div id="' + this.rangeId + '" class="' + inputClass + ' form-control">\
            <i class="glyphicon glyphicon-calendar"></i>&nbsp;\
            <span></span> <b class="caret"></b>\
        </div>';

        frag += "</div>";

        dre.context.html(frag);

        var selectIdSelector = idSelector(this.namespace, dre.id + "_date-type", this);
        var rangeIdSelector = idSelector(this.namespace, dre.id + "_range", this);

        this.selectJq = dre.jq(selectIdSelector);
        this.rangeJq = dre.jq(rangeIdSelector);

        var cb = objClosure(this, "updateDateRange", ["start", "end"]);
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
        var pluginSelector = idSelector(this.namespace, dre.id + "_plugin", this);
        $(pluginSelector).remove();

        this.rangeJq.daterangepicker(props, cb);
        this.drp = this.rangeJq.data("daterangepicker");
        this.drp.container.attr("id", pluginId).addClass("show-calendar");

        this.prepDates();

        if (this.useSelect2) {
            this.selectJq.select2();
        }
        on(selectIdSelector, "change", this, "typeChanged");
    }

    dateRangeDisplay(params) {
        var start = params.start;
        var end = params.end;
        this.rangeJq.find("span").html(start.utc().format(this.dateFormat) + ' - ' + end.utc().format(this.dateFormat));
    }

    updateDateRange(params) {
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

        if (date_type) {
            this.component.changeField(date_type);
        }

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
    }

    typeChanged(element) {
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
    }

    prepDates() {
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
    }
}
