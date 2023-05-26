// requires: $
// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("renderers")) { edges.renderers = {}}
if (!edges.renderers.hasOwnProperty("bs5")) { edges.renderers.bs5 = {}}

edges.renderers.bs5.Pager = class extends edges.Renderer {
    constructor (params) {
        super(params);

        this.scroll = edges.util.getParam(params, "scroll", true);

        this.scrollSelector = edges.util.getParam(params, "scrollSelector", "body");

        this.showSizeSelector = edges.util.getParam(params, "showSizeSelector", true);

        this.sizeOptions = edges.util.getParam(params, "sizeOptions", [10, 25, 50, 100]);

        this.sizePrefix = edges.util.getParam(params, "sizePrefix", "");

        this.sizeSuffix = edges.util.getParam(params, "sizeSuffix", " per page");

        this.showRecordCount = edges.util.getParam(params, "showRecordCount", true);

        this.showPageNavigation = edges.util.getParam(params, "showPageNavigation", true);

        this.numberFormat = edges.util.getParam(params, "numberFormat", false);

        this.showChevrons = edges.util.getParam(params,"showChevrons", false)

        this.namespace = "edges-bs5-pager";
    }
    
    draw() {
        if (this.component.total === false || this.component.total === 0) {
            this.component.context.html("");
            return;
        }

        // classes we'll need
        var containerClass = edges.util.allClasses(this.namespace, "container", this);
        var totalClass = edges.util.allClasses(this.namespace, "total", this);
        var navClass = edges.util.allClasses(this.namespace, "nav", this);
        var firstClass = edges.util.allClasses(this.namespace, "first", this);
        var prevClass = edges.util.allClasses(this.namespace, "prev", this);
        var pageClass = edges.util.allClasses(this.namespace, "page", this);
        var nextClass = edges.util.allClasses(this.namespace, "next", this);
        var sizeSelectClass = edges.util.allClasses(this.namespace, "size", this);

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

            var chevron_left = `<span class="material-symbols-outlined">chevron_left</span>`
            var chevron_right = `<span class="material-symbols-outlined">chevron_right</span>`
            var first_page_icon = `<span class="material-symbols-outlined">first_page</span>`

            var first = '<a href="#" class="' + firstClass;
            var prev = '<a href="#" class="' + prevClass;
            if (this.component.page === 1) {
                 first += " disabled";
                 prev += " disabled";
            }
            first += '">'
            prev += '">'

            if(this.showChevrons) {
                first += first_page_icon
                prev += chevron_left
            }

            first += 'First</a>';
            prev += 'Prev</a>';

            var next = '<a href="#" class="' + nextClass
            if (this.component.page === this.component.totalPages) {
                next += " disabled"
            }
            next += '">Next';
            if (this.showChevrons) {
                next += chevron_right;
            }
            next += `</a>`;

            var pageNum = this.component.page;
            var totalPages = this.component.totalPages;
            if (this.numberFormat) {
                pageNum = this.numberFormat(pageNum);
                totalPages = this.numberFormat(totalPages);
            }
            nav = '<div class="' + navClass + '">' + first + "<span>" + prev  +
                '<span class="' + pageClass + '">Page ' + pageNum + ' of ' + totalPages + '</span>' +
                next + "</span></div>";
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
            var firstSelector = edges.util.jsClassSelector(this.namespace, "first", this);
            var prevSelector = edges.util.jsClassSelector(this.namespace, "prev", this);
            var nextSelector = edges.util.jsClassSelector(this.namespace, "next", this);

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
            var sizeSelector = edges.util.jsClassSelector(this.namespace, "size", this);
            edges.on(sizeSelector, "change", this, "changeSize");
        }
    }

    doScroll() {
        $("html, body").animate({
            scrollTop: $(this.scrollSelector).offset().top
        }, 1);
    }

    goToFirst(element) {
        if (this.scroll) {
            this.doScroll();
        }
        this.component.setFrom(1);
    }

    goToPrev(element) {
        if (this.scroll) {
            this.doScroll();
        }
        this.component.decrementPage();
    }

    goToNext(element) {
        if (this.scroll) {
            this.doScroll();
        }
        this.component.incrementPage();
    }

    changeSize(element) {
        var size = $(element).val();
        this.component.setSize(size);
    }
}