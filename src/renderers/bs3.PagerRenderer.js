$.extend(true, edges, {
    bs3 : {
        newPagerRenderer: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.PagerRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.PagerRenderer(params);
        },
        PagerRenderer: function (params) {

            this.scroll = edges.getParam(params.scroll, true);

            this.scrollSelector = edges.getParam(params.scrollSelector, "body");

            this.showSizeSelector = edges.getParam(params.showSizeSelector, true);

            this.sizeOptions = edges.getParam(params.sizeOptions, [10, 25, 50, 100]);

            this.sizePrefix = edges.getParam(params.sizePrefix, "");

            this.sizeSuffix = edges.getParam(params.sizeSuffix, " per page");

            this.showRecordCount = edges.getParam(params.showRecordCount, true);

            this.showPageNavigation = edges.getParam(params.showPageNavigation, true);

            this.numberFormat = edges.getParam(params.numberFormat, false);

            this.namespace = "edges-bs3-pager";

            this.draw = function () {
                if (this.component.total === false || this.component.total === 0) {
                    this.component.context.html("");
                    return;
                }

                // classes we'll need
                var containerClass = edges.css_classes(this.namespace, "container", this);
                var totalClass = edges.css_classes(this.namespace, "total", this);
                var navClass = edges.css_classes(this.namespace, "nav", this);
                var firstClass = edges.css_classes(this.namespace, "first", this);
                var prevClass = edges.css_classes(this.namespace, "prev", this);
                var pageClass = edges.css_classes(this.namespace, "page", this);
                var nextClass = edges.css_classes(this.namespace, "next", this);
                var sizeSelectClass = edges.css_classes(this.namespace, "size", this);

                // the total number of records found
                var recordCount = "";
                if (this.showRecordCount) {
                    var total = this.component.total;
                    if (this.numberFormat) {
                        total = this.numberFormat(total);
                    }
                    recordCount = '<span class="' + totalClass + '">' + total + '</span> results found';
                }

                // the number of records per page
                var sizer = "";
                if (this.showSizeSelector) {
                    var sizer = '<div class="form-inline">' + recordCount + this.sizePrefix + '<div class="form-group"><select class="form-control input-sm ' + sizeSelectClass + '" name="' + this.component.id + '-page-size">{{SIZES}}</select></div>' + this.sizeSuffix + '</div>';
                    var sizeopts = "";
                    var optarr = this.sizeOptions.slice(0);
                    if ($.inArray(this.component.pageSize, optarr) === -1) {
                        optarr.push(this.component.pageSize)
                    }
                    optarr.sort(function (a, b) {
                        return a - b
                    });  // sort numerically
                    for (var i = 0; i < optarr.length; i++) {
                        var so = optarr[i];
                        var selected = "";
                        if (so === this.component.pageSize) {
                            selected = "selected='selected'";
                        }
                        sizeopts += '<option name="' + so + '" ' + selected + '>' + so + '</option>';
                    }
                    sizer = sizer.replace(/{{SIZES}}/g, sizeopts);
                }

                var nav = "";
                if (this.showPageNavigation) {
                    var first = '<a href="#" class="' + firstClass + '">First</a>';
                    var prev = '<a href="#" class="' + prevClass + '">Prev</a>';
                    if (this.component.page === 1) {
                        first = '<span class="' + firstClass + ' disabled">First</span>';
                        prev = '<span class="' + prevClass + ' disabled">Prev</span>';
                    }

                    var next = '<a href="#" class="' + nextClass + '">Next</a>';
                    if (this.component.page === this.component.totalPages) {
                        next = '<span class="' + nextClass + ' disabled">Next</a>';
                    }

                    var pageNum = this.component.page;
                    var totalPages = this.component.totalPages;
                    if (this.numberFormat) {
                        pageNum = this.numberFormat(pageNum);
                        totalPages = this.numberFormat(totalPages);
                    }
                    nav = '<div class="' + navClass + '">' + first + prev +
                        '<span class="' + pageClass + '">Page ' + pageNum + ' of ' + totalPages + '</span>' +
                        next + "</div>";
                }

                var frag = "";
                if (this.showSizeSelector && !this.showPageNavigation) {
                    frag = '<div class="' + containerClass + '"><div class="row"><div class="col-md-12">{{COUNT}}</div></div></div>';
                } else if (!this.showSizeSelector && this.showPageNavigation) {
                    frag = '<div class="' + containerClass + '"><div class="row"><div class="col-md-12">{{NAV}}</div></div></div>';
                } else {
                    frag = '<div class="' + containerClass + '"><div class="row"><div class="col-md-6">{{COUNT}}</div><div class="col-md-6">{{NAV}}</div></div></div>';
                }
                frag = frag.replace(/{{COUNT}}/g, sizer).replace(/{{NAV}}/g, nav);

                this.component.context.html(frag);

                // now create the selectors for the functions
                if (this.showPageNavigation) {
                    var firstSelector = edges.css_class_selector(this.namespace, "first", this);
                    var prevSelector = edges.css_class_selector(this.namespace, "prev", this);
                    var nextSelector = edges.css_class_selector(this.namespace, "next", this);

                    // bind the event handlers
                    if (this.component.page !== 1) {
                        edges.on(firstSelector, "click", this, "goToFirst");
                        edges.on(prevSelector, "click", this, "goToPrev");
                    }
                    if (this.component.page !== this.component.totalPages) {
                        edges.on(nextSelector, "click", this, "goToNext");
                    }
                }

                if (this.showSizeSelector) {
                    var sizeSelector = edges.css_class_selector(this.namespace, "size", this);
                    edges.on(sizeSelector, "change", this, "changeSize");
                }
            };

            this.doScroll = function () {
                $("html, body").animate({
                    scrollTop: $(this.scrollSelector).offset().top
                }, 1);
            };

            this.goToFirst = function (element) {
                if (this.scroll) {
                    this.doScroll();
                }
                this.component.setFrom(1);
            };

            this.goToPrev = function (element) {
                if (this.scroll) {
                    this.doScroll();
                }
                this.component.decrementPage();
            };

            this.goToNext = function (element) {
                if (this.scroll) {
                    this.doScroll();
                }
                this.component.incrementPage();
            };

            this.changeSize = function (element) {
                var size = $(element).val();
                this.component.setSize(size);
            };
        }
    }
});
