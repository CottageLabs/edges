import {Renderer} from "../../core";
import {getParam, styleClasses} from "../../utils";

export class ImportantNumbersRenderer extends Renderer {
    constructor(params) {
        super(params);

        this.title = getParam(params, "title", false);
        this.backgroundImg = getParam(params, "backgroundImg", false);
        this.mainNumberFormat = getParam(params, "mainNumberFormat", false);
        this.secondNumberFormat = getParam(params, "secondNumberFormat", false);

        this.resizeHandler = getParam(params, "resizeHandler", false);

        //////////////////////////////////////////////
        // variables for internal state
        this.namespace = "edges-html-important-numbers";
    }

    draw() {
        var containerClass = styleClasses(this.namespace, "container", this);
        var graphicClass = styleClasses(this.namespace, "graphic", this);

        var titleFrag = "";
        if (this.title !== false) {
            var titleClass = styleClasses(this.namespace, "title", this);
            titleFrag = '<div class="' + titleClass + '">' + this.title + '</div>';
        }

        var backgroundFrag = "";
        if (this.backgroundImg !== false) {
            var backgroundClass = styleClasses(this.namespace, "img", this);
            backgroundFrag += '<div class="' + backgroundClass + '"><img src="' + this.backgroundImg + '"></div>';
        }

        var mainFrag = "";
        if (this.component.main !== false) {
            var val = this.component.main;
            if (this.mainNumberFormat !== false) {
                val = this.mainNumberFormat(val);
            }
            var mainClass = styleClasses(this.namespace, "main", this);
            mainFrag = '<div class="' + mainClass + '">' + val + '</div>'
        }

        var secondFrag = "";
        if (this.component.second !== false) {
            var val = this.component.second;
            if (this.secondNumberFormat !== false) {
                val = this.secondNumberFormat(val);
            }
            var secondClass = styleClasses(this.namespace, "second", this);
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
    }
}