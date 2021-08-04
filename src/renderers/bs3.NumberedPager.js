$.extend(true, edges, {
    bs3 : {
        newNumberedPager: function (params) {
            if (!params) { params = {} }
            edges.bs3.NumberedPager.prototype = edges.newRenderer(params);
            return new edges.bs3.NumberedPager(params);
        },
        NumberedPager: function (params) {

            this.scroll = edges.getParam(params.scroll, true);

            this.scrollSelector = edges.getParam(params.scrollSelector, "body");

            this.namespace = "edges-bs3-numbered-pager";

            this.draw = function () {
                if (this.component.total === false || this.component.total === 0) {
                    this.component.context.html("");
                    return;
                }

                // classes we'll need
                var containerClass = edges.css_classes(this.namespace, "container", this);
                var navClass = edges.css_classes(this.namespace, "nav", this);
                var prevClass = edges.css_classes(this.namespace, "prev", this);
                var pageClass = edges.css_classes(this.namespace, "page", this);
                var nextClass = edges.css_classes(this.namespace, "next", this);
                var navListClass = edges.css_classes(this.namespace, "nav-list", this);

                var prev = '<a href="#" class="' + prevClass + '"><i class="glyphicon glyphicon-chevron-left"></i>&nbsp;Previous</a>';
                if (this.component.page === 1) {
                    prev = '<span class="' + prevClass + ' disabled"><i class="glyphicon glyphicon-chevron-left"></i>&nbsp;Previous</span>';
                }
                prev = '<li>' + prev + '</li>';

                var next = '<a href="#" class="' + nextClass + '">Next&nbsp;<i class="glyphicon glyphicon-chevron-right"></i></a>';
                if (this.component.page === this.component.totalPages) {
                    next = '<span class="' + nextClass + ' disabled">Next&nbsp;<i class="glyphicon glyphicon-chevron-right"></i></a>';
                }
                next = '<li>' + next + '</li>';

                var pageList = "";
                if (this.component.totalPages <= 9) {
                    for (var pageNum = 1; pageNum <= this.component.totalPages; pageNum++) {
                        pageList += '<li>' + pageNum + '</li>';
                    }
                } else {
                    // always print the first two in any case
                    for (var pageNum = 1; pageNum <= 2; pageNum++) {
                        pageList += this._pageLi({pageNum: pageNum});
                    }
                    if (this.component.page <= 5) {
                        for (var pageNum = 3; pageNum <= 7; pageNum++) {
                            pageList += this._pageLi({pageNum: pageNum});
                        }
                        pageList += '<li>...</li>';
                        for (var pageNum = this.component.totalPages - 1; pageNum <= this.component.totalPages; pageNum++) {
                            pageList += this._pageLi({pageNum: pageNum});
                        }
                    } else if (this.component.page >= this.component.totalPages - 5) {
                        pageList += '<li>...</li>';
                        for (var pageNum = this.component.totalPages - 6; pageNum <= this.component.totalPages; pageNum++) {
                            pageList += this._pageLi({pageNum: pageNum});
                        }
                    } else {
                        pageList += '<li>...</li>';
                        for (var pageNum = this.component.page - 2; pageNum <= this.component.page + 2; pageNum++) {
                            pageList += this._pageLi({pageNum: pageNum});
                        }
                        pageList += '<li>...</li>';
                        for (var pageNum = this.component.totalPages - 1; pageNum <= this.component.totalPages; pageNum++) {
                            pageList += this._pageLi({pageNum: pageNum});
                        }
                    }
                }

                var nav = '<div class="' + navClass + '"><ul class="' + navListClass + '">' + prev + pageList + next + '</ul>';
                var frag = '<div class="' + containerClass + '"><div class="row"><div class="col-md-12">{{NAV}}</div></div></div>';
                frag = frag.replace(/{{NAV}}/g, nav);

                this.component.context.html(frag);

                // now create the selectors for the functions
                var prevSelector = edges.css_class_selector(this.namespace, "prev", this);
                var nextSelector = edges.css_class_selector(this.namespace, "next", this);
                var pageSelector = edges.css_class_selector(this.namespace, "page", this);

                // bind the event handlers
                if (this.component.page !== 1) {
                    edges.on(prevSelector, "click", this, "goToPrev");
                }
                if (this.component.page !== this.component.totalPages) {
                    edges.on(nextSelector, "click", this, "goToNext");
                }

                edges.on(pageSelector, "click", this, "goToPage");
            };

            this._pageLi = function(params) {
                var pageNum = params.pageNum;
                var pageList = "";
                if (pageNum === this.component.page) {
                    var currentClass = edges.css_classes(this.namespace, "current", this);
                    pageList += '<li><span class="' + currentClass + '">' + pageNum + '</span></li>';
                } else {
                    var pageClass = edges.css_classes(this.namespace, "page", this);
                    pageList += '<li><a href="#" class="' + pageClass + '" data-page="' + pageNum + '">' + pageNum + '</a></li>';
                }
                return pageList;
            };

            this.doScroll = function () {
                $(this.scrollSelector).animate({    // note we do not use component.jq, because the scroll target could be outside it
                    scrollTop: $(this.scrollSelector).offset().top
                }, 1);
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

            this.goToPage = function (element) {
                if (this.scroll) {
                    this.doScroll();
                }
                var page = parseInt($(element).attr("data-page"));
                this.component.goToPage({page: page});
            };
        }
    }
});
