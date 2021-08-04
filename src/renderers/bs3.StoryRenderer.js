$.extend(true, edges, {
    bs3: {
        newStoryRenderer: function (params) {
            return edges.instantiate(edges.bs3.StoryRenderer, params, edges.newRenderer);
        },
        StoryRenderer: function (params) {

            this.title = edges.getParam(params.title, false);

            //////////////////////////////////////////////
            // variables for internal state
            this.namespace = "edges-bs3-story";

            this.draw = function () {

                var containerClass = edges.css_classes(this.namespace, "container", this);
                var storyClass = edges.css_classes(this.namespace, "story", this);

                var titleFrag = "";
                if (this.title !== false) {
                    var titleClass = edges.css_classes(this.namespace, "title", this);
                    titleFrag = '<div class="' + titleClass + '">' + this.title + '</div>';
                }

                var template = this.component.template;
                if (!edges.isEmptyObject(this.component.values)) {
                    for (var key in this.component.values) {
                        var val = this.component.values[key];
                        template = template.replace("{" + key + "}", val);
                    }
                    var storyFrag = '<div class="' + storyClass + '">' + template + '</div>';

                    var frag = '<div class="' + containerClass + '">' + titleFrag + storyFrag + '</div>';

                    // and render into the page
                    this.component.context.html(frag);
                }
            }
        }
    }
});