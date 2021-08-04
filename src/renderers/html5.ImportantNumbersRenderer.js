$.extend(true, edges, {
    bs3: {
        newImportantNumbersRenderer: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.ImportantNumbersRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.ImportantNumbersRenderer(params);
        },
        ImportantNumbersRenderer: function (params) {

            this.title = edges.getParam(params.title, false);
            this.backgroundImg = edges.getParam(params.backgroundImg, false);
            this.mainNumberFormat = edges.getParam(params.mainNumberFormat, false);
            this.secondNumberFormat = edges.getParam(params.secondNumberFormat, false);

            this.resizeHandler = edges.getParam(params.resizeHandler, false);

            //////////////////////////////////////////////
            // variables for internal state
            this.namespace = "edges-html5-important-numbers";

            this.draw = function () {

                var containerClass = edges.css_classes(this.namespace, "container", this);
                var graphicClass = edges.css_classes(this.namespace, "graphic", this);

                var titleFrag = "";
                if (this.title !== false) {
                    var titleClass = edges.css_classes(this.namespace, "title", this);
                    titleFrag = '<div class="' + titleClass + '">' + this.title + '</div>';
                }

                var backgroundFrag = "";
                if (this.backgroundImg !== false) {
                    var backgroundClass = edges.css_classes(this.namespace, "img", this);
                    backgroundFrag += '<div class="' + backgroundClass + '"><img src="' + this.backgroundImg + '"></div>';
                }

                var mainFrag = "";
                if (this.component.main !== false) {
                    var val = this.component.main;
                    if (this.mainNumberFormat !== false) {
                        val = this.mainNumberFormat(val);
                    }
                    var mainClass = edges.css_classes(this.namespace, "main", this);
                    mainFrag = '<div class="' + mainClass + '">' + val + '</div>'
                }

                var secondFrag = "";
                if (this.component.second !== false) {
                    var val = this.component.second;
                    if (this.secondNumberFormat !== false) {
                        val = this.secondNumberFormat(val);
                    }
                    var secondClass = edges.css_classes(this.namespace, "second", this);
                    secondFrag = '<div class="' + secondClass + '">' + val + '</div>'
                }

                var frag = '<div class="' + containerClass + '">' + titleFrag + '<div class="' + graphicClass + '">' + backgroundFrag + mainFrag + '</div>' + secondFrag + '</div>';

                // and render into the page
                this.component.context.html(frag);

                // if there's a resize handler, call it and bind it
                if (this.resizeHandler) {
                    this.resizeHandler(this);
                    edges.on(window, "resize", this, "draw");
                }
            };
        }
    }
});