import {Component} from "../core";
import {getParam} from "../utils";

import {es} from '../../dependencies/es'

export class SelectedFilters extends Component {
    constructor(params) {
        super(params);

        //////////////////////////////////////////
        // configuration options to be passed in

        // mapping from fields to names to display them as
        // if these come from a facet/selector, they should probably line up
        this.fieldDisplays = getParam(params, "fieldDisplays", {});

        // constraints that consist of multiple filters that we want to treat as a single
        // one {"filters" : [<es filter templates>], "display" : "...." }
        this.compoundDisplays = getParam(params, "compoundDisplays", []);

        // value maps on a per-field basis for Term(s) filters, to apply to values before display.
        // if these come from a facet/selector, they should probably be the same maps
        // {"<field>" : {"<value>" : "<display>"}}
        this.valueMaps = getParam(params, "valueMaps", {});

        // value functions on a per-field basis for Term(s) filters, to apply to values before display.
        // if these come from a facet/selector, they should probably be the same functions
        // {"<field>" : <function>}
        this.valueFunctions = getParam(params, "valueFunctions", {});

        // range display maps on a per-field basis for Range filters
        // if these come from a facet/selector, they should probably be the same maps
        // {"<field>" : [{"from" : "<from>", "to" : "<to>", "display" : "<display>"}]}
        this.rangeMaps = getParam(params, "rangeMaps", {});

        // range display functions on a per-field basis for Range filters
        // useful if you have a range selector which allows arbitrary ranges
        // {"<field>" : <function (receives field name, from and to as params dict)>}
        // must return {to: to, from: from, display: display}
        this.rangeFunctions = getParam(params, "rangeFunctions", {});

        // function to use to format any range that does not appear in the range maps
        this.formatUnknownRange = getParam(params, "formatUnknownRange", false);

        // if we get a filter for a field we have no config for, should we ignore it?
        this.ignoreUnknownFilters = getParam(params, "ignoreUnknownFilters", false);

        //////////////////////////////////////////
        // properties used to store internal state

        // active filters to be rendered out
        // each of the form:
        /*
         {
         filter : "<type name of filter used>"
         display: "<field display name>",
         rel: "<relationship between values (e.g. AND, OR)>",
         values: [
         {display: "<display value>", val: "<actual value>"}
         ]
         }
         */
        this.mustFilters = {};

        this.searchString = false;
        this.searchField = false;
    }

    synchronise() {
        // reset the state of the internal variables
        this.mustFilters = {};
        this.searchString = false;
        this.searchField = false;

        if (!this.edge.currentQuery) {
            return;
        }

        // first see if we can detect all the compound filters and record them
        var inCompound = [];
        for (var i = 0; i < this.compoundDisplays.length; i++) {
            var cd = this.compoundDisplays[i];
            var count = 0;
            var fieldNames = [];
            for (var j = 0; j < cd.filters.length; j++) {
                var filt = cd.filters[j];
                var existing = this.edge.currentQuery.listMust(filt);
                if (existing.length > 0) {
                    count++;
                    fieldNames.push(filt.field);
                }
            }
            if (count === cd.filters.length) {
                inCompound.concat(fieldNames);
                this.mustFilters["compound_" + i] = {
                    filter: "compound",
                    display: cd.display,
                    query_filters: cd.filters
                };
            }
        }

        // now pull out all the single type queries
        var musts = this.edge.currentQuery.listMust();
        for (var i = 0; i < musts.length; i++) {
            var f = musts[i];
            if (this.ignoreUnknownFilters && !(f.field in this.fieldDisplays) && $.inArray(f.field, inCompound) === -1) {
                continue;
            }
            if (f.constructor.type === "term") {
                this._synchronise_term(f);
            } else if (f.constructor.type === "terms") {
                this._synchronise_terms(f);
            } else if (f.constructor.type === "range") {
                this._synchronise_range(f);
            } else if (f.constructor.type === "geo_distance_range") {

            }
        }

        var qs = this.edge.currentQuery.getQueryString();
        if (qs) {
            this.searchString = qs.queryString;
            this.searchField = qs.defaultField;
        }
    }

    removeCompoundFilter(params) {
        var compound_id = params.compound_id;
        var filts = this.mustFilters[compound_id].query_filters;

        var nq = this.edge.cloneQuery();

        for (var i = 0; i < filts.length; i++) {
            var filt = filts[i];
            nq.removeMust(filt);
        }

        // reset the page to zero and reissue the query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    }

    removeFilter(boolType, filterType, field, value) {
        var nq = this.edge.cloneQuery();

        if (filterType === "term") {
            var template = new es.TermFilter({field: field, value: value});

            if (boolType === "must") {
                nq.removeMust(template);
            }

        } else if (filterType === "terms") {
            var template = new es.TermsFilter({field: field});

            if (boolType === "must") {
                var filters = nq.listMust(template);
                for (var i = 0; i < filters.length; i++) {
                    if (filters[i].has_term(value)) {
                        filters[i].remove_term(value);
                    }

                    // if this means the filter no longer has values, remove the filter
                    if (!filters[i].has_terms()) {
                        nq.removeMust(filters[i]);
                    }
                }
            }

        } else if (filterType === "range") {
            var params = {field: field};
            if (value.to) {
                params[value.toType] = value.to;
            }
            if (value.from) {
                params[value.fromType] = value.from;
            }
            var template = new es.RangeFilter(params);

            if (boolType === "must") {
                nq.removeMust(template);
            }

        } else if (filterType === "geo_distance_range") {

        }

        // reset the page to zero and reissue the query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    }

    clearQueryString() {
        var nq = this.edge.cloneQuery();
        nq.removeQueryString();

        // reset the search page to the start and then trigger the next query
        nq.from = 0;
        this.edge.pushQuery(nq);
        this.edge.cycle();
    }

    clearSearch() {
        this.edge.reset();
    }

    _synchronise_term(filter) {
        var display = this.fieldDisplays[filter.field] || filter.field;

        // multiple term filters mean AND, so group them together here
        if (filter.field in this.mustFilters) {
            this.mustFilters[filter.field].values.push({
                val: filter.value,
                display: this._translate(filter.field, filter.value)
            })
        } else {
            this.mustFilters[filter.field] = {
                filter: filter.constructor.type,
                display: display,
                values: [{val: filter.value, display: this._translate(filter.field, filter.value)}],
                rel: "AND"
            }
        }
    }

    _synchronise_terms(filter) {
        var display = this.fieldDisplays[filter.field] || filter.field;
        var values = [];
        for (var i = 0; i < filter.values.length; i++) {
            var v = filter.values[i];
            var d = this._translate(filter.field, v);
            values.push({val: v, display: d});
        }
        this.mustFilters[filter.field] = {
            filter: filter.constructor.type,
            display: display,
            values: values,
            rel: "OR"
        }
    }

    _synchronise_range(filter) {
        var display = this.fieldDisplays[filter.field] || filter.field;

        var to = filter.lt;
        var toType = "lt";
        if (to === false) {
            to = filter.lte;
            toType = "lte";
        }

        var from = filter.gte;
        var fromType = "gte";
        if (from === false) {
            from = filter.gt;
            fromType = "gt";
        }

        var r = this._getRangeDef(filter.field, from, to);
        var values = [];
        if (!r) {
            values.push({to: to, toType: toType, from: from, fromType: fromType, display: this._formatUnknown(from, to)});
        } else {
            values.push(r);
        }

        this.mustFilters[filter.field] = {
            filter: filter.constructor.type,
            display: display,
            values: values
        }
    }

    _translate(field, value) {
        if (field in this.valueMaps) {
            if (value in this.valueMaps[field]) {
                return this.valueMaps[field][value];
            }
        } else if (field in this.valueFunctions) {
            return this.valueFunctions[field](value);
        }
        return value;
    }

    _getRangeDef(field, from, to) {
        if (!this.rangeMaps[field] && !this.rangeFunctions[field]) {
            return false;
        }
        if (this.rangeMaps[field]) {
            for (var i = 0; i < this.rangeMaps[field].length; i++) {
                var r = this.rangeMaps[field][i];
                var frMatch = true;
                var toMatch = true;
                // if one is set and the other not, no match
                if ((from && !r.from) || (!from && r.from)) {
                    frMatch = false;
                }
                if ((to && !r.to) || (!to && r.to)) {
                    toMatch = false;
                }

                // if both set, and they don't match, no match
                if (from && r.from && from !== r.from) {
                    frMatch = false;
                }
                if (to && r.to && to !== r.to) {
                    toMatch = false;
                }

                // both have to match for a match
                if (frMatch && toMatch) {
                    return r
                }
            }
        } else if (this.rangeFunctions[field]) {
            var fn = this.rangeFunctions[field];
            return fn({field: field, from: from, to: to});
        }

        return false;
    }

    _formatUnknown(from, to) {
        if (this.formatUnknownRange) {
            return this.formatUnknownRange(from, to)
        } else {
            // if they're the same just return one of them
            if (from !== false || to !== false) {
                if (from === to) {
                    return from;
                }
            }

            // otherwise calculate the display for the range
            var frag = "";
            if (from !== false) {
                frag += from;
            } else {
                frag += "< ";
            }
            if (to !== false) {
                if (from !== false) {
                    frag += " - " + to;
                } else {
                    frag += to;
                }
            } else {
                if (from !== false) {
                    frag += "+";
                } else {
                    frag = "unknown";
                }
            }
            return frag;
        }
    }
}