$.extend(true, edges, {
    bs3: {
        newNavigationTermListRenderer: function (params) {
            return edges.instantiate(edges.bs3.NavigationTermListRenderer, params, edges.newRenderer);
        },
        NavigationTermListRenderer: function (params) {

            this.firstOption = edges.getParam(params.firstOption, "select");
            this.buttonText = edges.getParam(params.buttonText, "go");

            this.namespace = "edges-navigation-term-list";

            this.draw = function () {
                var containerClasses = edges.css_classes(this.namespace, "container", this);
                var buttonClass = edges.css_classes(this.namespace, "go", this);
                var buttonId = edges.css_id(this.namespace, "button", this);
                var selectId = edges.css_id(this.namespace, "term", this);

                var options = "";
                for (var i = 0; i < this.component.terms.length; i++) {
                    var term = this.component.terms[i];
                    options += '<option value="' + term + '">' + term + '</option>';
                }

                var frag = '<div class=' + containerClasses + '>\
                    <div class="form-inline">\
                        <div class="form-group">\
                            <div class="input-group">\
                                <select class="form-control input-sm" id="' + selectId + '" name="' + selectId + '"><option value="">' + this.firstOption + '</option>{OPTIONS}</select>\
                                <span class="input-group-btn">\
                                    <button id="' + buttonId + '" type="button" class="btn btn-info btn-sm ' + buttonClass + '">' + this.buttonText + '</button>\
                                </span>\
                            </div>\
                        </div>\
                    </div>\
                </div>';
                frag = frag.replace("{OPTIONS}", options);

                this.component.context.html(frag);

                var buttonSelector = edges.css_id_selector(this.namespace, "button", this);
                edges.on(buttonSelector, "click", this, "buttonClicked");
            };

            this.buttonClicked = function () {
                var selector = edges.css_id_selector(this.namespace, "term", this);
                var sel = this.component.jq(selector);
                var val = sel.val();
                if (val !== "") {
                    this.component.navigate({term: val});
                }
            }
        }
    }
});