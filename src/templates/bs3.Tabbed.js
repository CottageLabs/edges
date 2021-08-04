$.extend(true, edges, {
    bs3 : {
        newTabbed: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.Tabbed.prototype = edges.newTemplate(params);
            return new edges.bs3.Tabbed(params);
        },
        Tabbed: function (params) {
            // later we'll store the edge instance here
            this.edge = false;

            // bits that are hidden off-screen
            this.hidden = {};

            this.namespace = "edges-bs3-tabbed";

            this.draw = function (edge) {
                this.edge = edge;

                // a simple nav-down-the-left, with arbitrary tabs in the main panel
                var view = '<div id="edges-tabbed-view">{{TOPSTRAP}}<div class="row">';

                // the top strap controls
                var topstrap = edge.category("top");
                var topContainers = "";
                if (topstrap.length > 0) {
                    for (var i = 0; i < topstrap.length; i++) {
                        topContainers += '<div class="row"><div class="col-md-12"><div id="' + topstrap[i].id + '"></div></div></div>';
                    }
                }

                // the left-hand-side controls
                var lhs = edge.category("lhs");
                var controlContainers = "";

                if (lhs.length > 0) {
                    view += '<div class="col-md-3">\
                        <div id="edges-tabbed-controls" style="padding-top:45px;">{{CONTROLS}}</div>\
                    </div>';
                    view += '<div class="col-md-9" id="edges-tabbed-panel">';

                    for (var i = 0; i < lhs.length; i++) {
                        controlContainers += '<div id="' + lhs[i].id + '"></div>';
                    }
                } else {
                    view += '<div class="col-md-12" id="edges-tabbed-panel">';
                }

                // tabs required
                var tabs = edge.category("tab");

                view += '<div class="row">\
                        <div class="col-md-12">\
                            <ul class="nav nav-tabs">{{TABS}}</ul>\
                        </div>\
                    </div>';

                var tabLabels = "";
                var tabContents = "";
                var tabIds = [];
                for (var i = 0; i < tabs.length; i++) {
                    var tab = tabs[i];
                    var containerId = "edges-tabbed-container-" + tab.id;
                    tabIds.push(tab.id);
                    tabLabels += '<li><a href="#" id="edges-tabbed-tab-' + tab.id + '" data-id="' + tab.id + '"><strong>' + tab.display + '</strong></a></li>';
                    tabContents += '<div class="edges-tabbed-container" id="' + containerId + '">\
                            <div class="row">\
                                <div class="col-md-12"> \
                                    <div class="tab" id="' + tab.id + '"></div>\
                                </div> \
                            </div>\
                        </div>';
                }

                view += "{{TAB_CONTENTS}}</div></div>";

                view = view.replace(/{{CONTROLS}}/g, controlContainers);
                view = view.replace(/{{TABS}}/g, tabLabels);
                view = view.replace(/{{TAB_CONTENTS}}/g, tabContents);
                view = view.replace(/{{TOPSTRAP}}/g, topContainers);

                edge.context.html(view);

                // hide the graphs while while they are rendered
                // (note we use this approach, as setting display:none produces weird effects
                // in space-conscious displays like graphs
                for (var i = 0; i < tabIds.length; i++) {
                    this.hideOffScreen("#edges-tabbed-container-" + tabIds[i]);
                }

                // set up the initial tab to view
                var startWith = tabIds[0];
                this.activateTab(startWith);

                // now bind the click handler to the tabs
                for (var i = 0; i < tabIds.length; i++) {
                    $("#edges-tabbed-tab-" + tabIds[i], this.edge.context).click(edges.eventClosure(this, "tabClicked"));
                }
            };

            this.hideOffScreen = function (selector) {
                var el = $(selector, this.edge.context);
                if (selector in this.hidden) {
                    return
                }
                this.hidden[selector] = {"position": el.css("position"), "margin": el.css("margin-left")};
                $(selector, this.edge.context).css("position", "absolute").css("margin-left", -9999);
            };

            this.bringIn = function (selector) {
                var pos = this.hidden[selector].position;
                var mar = this.hidden[selector].margin;
                $(selector, this.edge.context).css("position", pos).css("margin-left", mar);
                delete this.hidden[selector];
            };

            this.activateTab = function (activate) {
                var tabs = this.edge.category("tab");
                for (var i = 0; i < tabs.length; i++) {
                    var tab = tabs[i];
                    if (tab.id === activate) {
                        this.bringIn("#edges-tabbed-container-" + tab.id);
                        $("#edges-tabbed-tab-" + tab.id, this.edge.context).parent().addClass("active");
                    } else {
                        this.hideOffScreen("#edges-tabbed-container-" + tab.id);
                        $("#edges-tabbed-tab-" + tab.id, this.edge.context).parent().removeClass("active");
                    }
                }
            };

            this.tabClicked = function (element) {
                var id = $(element).attr("data-id");
                this.activateTab(id);
            };
        }
    }
});
