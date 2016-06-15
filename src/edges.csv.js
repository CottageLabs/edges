$.extend(edges, {
    csv : {
        serialise : function(params) {
            var json = params.data;
            return Papa.unparse(json, {newline: "\n"});
        },

        newObjectByRow : function(params) {
            if (!params) { params = {} }
            return new edges.csv.ObjectByRow(params);
        },
        ObjectByRow : function(params) {

            this.sheet = false;

            // list of filters that should be applied to the data to define the set of results
            // {field : "<field name>", value : "value to filter by", type : "<filter type>"}
            this.filters = [];

            // this is essentially the constructor
            this.parse = function(params) {
                var data = params.data.replace(/\r\n/g, "\n");
                this.sheet = Papa.parse(data, {
                    header: true,
                    newline: "\n",
                    skipEmptyLines: true
                });
            };

            /////////////////////////////////////////////////
            // methods for interacting with the contents of the sheet

            this.add_filter = function(params) {
                var filter = params.filter;
                this.filters.push(filter);
            };

            this.clear_filter = function(params) {
                var filter = params.filter;
                var remove = false;
                for (var i = 0; i < this.filters.length; i++) {
                    var filt = this.filters[i];

                    var field_match = filter.field === filt.field;
                    var type_match = filter.type === filt.type || filter.type === undefined;
                    var val_match = filter.value === undefined || filter.value.toString() === filt.value.toString();
                    if (field_match && type_match && val_match) {
                        remove = i;
                        break;
                    }
                }
                if (remove !== false) {
                    this.filters.splice(remove, 1)
                }
            };

            this.iterator = function(params) {
                if (!params) { params = {}}
                var filtered = edges.getParam(params.filtered, true);
                var count = 0;
                var that = this;
                return {
                    next : function() {
                        if (that.sheet.data.length <= count) {
                            return false;
                        }
                        for (var i = count; i < that.sheet.data.length; i++) {
                            var ret = that.sheet.data[i];
                            var match = false;
                            if (!filtered) {
                                match = true;
                            } else {
                                match = that._filterMatch({record: ret});
                            }
                            if (match) {
                                count = i + 1;
                                return ret;
                            }
                        }
                        return false;
                    }
                }
            };

            this.aggregation = function(params) {
                var agg = params.agg;
                var type = Object.keys(agg)[0];
                var field = agg[type];
                var filtered = edges.getParam(params.filtered, true);

                if (type === "terms") {
                    return this._termsAggregation({field : field, filtered: filtered});
                }
                return [];
            };

            this._termsAggregation = function(params) {
                var field = params.field;
                var filtered = edges.getParam(params.filtered, true);

                var agg = [];
                var aggMap = {};

                var iter = this.iterator({filtered: filtered});
                var res = iter.next();
                while (res) {
                    if (res.hasOwnProperty(field)) {
                        var val = res[field];
                        if (val in aggMap) {
                            agg[aggMap[val]].count++;
                        } else {
                            var i = agg.length;
                            agg.push({term: val, count: 1});
                            aggMap[val] = i;
                        }
                    }
                    res = iter.next();
                }

                return agg;
            };

            this._filterMatch = function(params) {
                var record = params.record;

                for (var i = 0; i < this.filters.length; i++) {
                    var filter = this.filters[i];
                    if (filter.type === "exact") {
                        if (!this._exactFilterMatch({filter: filter, record: record})) {
                            return false;
                        }
                    } else {
                        // Note, this means that if the filter is malformed you won't get any results, which is better than
                        // giving you some so you don't notice it's broken
                        return false;
                    }
                }

                return true;
            };

            this._exactFilterMatch = function(params) {
                var filter = params.filter;
                var record = params.record;

                var field = filter.field;
                var val = filter.value;
                if (record[field] !== val) {
                    return false;
                }

                return true;
            };

            ////////////////////////////////////////
            // call the constructor

            this.parse(params);
        }
    }
});
