// requires: $
// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("renderers")) { edges.renderers = {}}
if (!edges.renderers.hasOwnProperty("bs5")) { edges.renderers.bs5 = {}}

edges.renderers.bs5.MultiFieldRangeSelectorFacet = class extends edges.Renderer {
    constructor(params) {
        super(params);

        this.title = edges.util.getParam(params, "title", false);

        this.namespace = "edges-bs5-multifieldrangeselectorfacet";
        this.togglable = edges.util.getParam(params, "togglable", true);
    }

    draw() {
        var headerClass = edges.util.styleClasses(this.namespace, "header", this.component.id);
        var resultsListHeaderClass = edges.util.styleClasses(this.namespace, "results-list--header", this.component.id);
        var bodyExistingClass = edges.util.styleClasses(this.namespace, "body--existing", this.component.id);
        var bodyNewClass = edges.util.styleClasses(this.namespace, "body--new", this.component.id);
        var toggleId = edges.util.htmlID(this.namespace, "toggle", this.component.id);

        // header
        let title = this.title;
        if (this.togglable) {
            title = '<a href="#" id="' + toggleId + '"><i class="glyphicon glyphicon-plus"></i>&nbsp;' + this.title + "</a>";
        }

        let header = '<div class="' + headerClass + '">\
            <div class="row ' + resultsListHeaderClass + '">\
                ' + title + '\
            </div>';

        // render existing selections
        let f = "";
        let existing = this.component.normalisedRanges();
        for (let field in existing) {
            let constraints = existing[field];
            for (let constraint in constraints) {
                let number = constraints[constraint];
                if (number === false) {
                    continue;
                }
                f += this._renderSelector(field, constraint, number)
            }
        }
        let existingFrag = '';
        if (f !== '') {
            existingFrag = `<div class="${bodyExistingClass}">${f}</div>`;
        }


        // render a new range setter
        let newSelector = '<div class="' + bodyNewClass + '">' + this._renderSelector() + '</div>';

        let frag = header + existingFrag + newSelector;
        this.component.context.html(frag);

        let inputClassSelector = edges.util.jsClassSelector(this.namespace, "input", this);
        edges.on(inputClassSelector, "change", this, "inputChanged");

        let removeSelector = edges.util.jsClassSelector(this.namespace, "remove", this);
        edges.on(removeSelector, "click", this, "removeRange");
    }

    _renderSelector(existingField, existingConstraint, existingNumber) {

        let inputClass = edges.util.allClasses(this.namespace, "input", this);
        let fieldClass = edges.util.allClasses(this.namespace, "field", this);
        let constraintClass = edges.util.allClasses(this.namespace, "constraint", this);
        let numberClass = edges.util.allClasses(this.namespace, "number", this);

        let firstOption = ` selected="selected" `
        let fieldDataWas = "";
        if (existingField) {
            firstOption = "";
            fieldDataWas = `data-was="${existingField}"`
        }

        let fieldSelector = `<select name="" id="" class="${inputClass} ${fieldClass} form-select" ${fieldDataWas}>
            <option value="" ${firstOption} disabled>Choose property</option>`;
        for (let field of this.component.fields) {
            let selected = "";
            if (existingField && existingField === field.field) {
                selected = `selected="selected"`;
            }
            fieldSelector += `<option value="${field.field}" ${selected}>${field.display}</option>`
        }
        fieldSelector += `</select>`;

        let gteSelected = "";
        let lteSelected = "";
        let constraintDataWas = "";
        if (existingConstraint) {
            constraintDataWas = `data-was="${existingConstraint}"`
            if (existingConstraint === "gte") {
                gteSelected = `selected="selected"`;
            } else {
                lteSelected = `selected="selected"`;
            }
        }
        let constraintSelector = `<select name="" id="" class="${inputClass} ${constraintClass} form-select" ${constraintDataWas}>
            <option value="gte" ${gteSelected}>greater than</option>
            <option value="lte" ${lteSelected}>less than</option>
        </select>`;

        let numberValue = "";
        let numberDataWas = "";
        if (existingNumber !== undefined) {
            numberValue = `value="${existingNumber}"`;
            numberDataWas = `data-was="${existingNumber}"`
        }
        let numberEntry = `<input type="number" class="${inputClass} ${numberClass} form-control" ${numberValue} ${numberDataWas} placeholder="Value">`;

        let removeFrag = "";
        if (existingField) {
            let removeClass = edges.util.allClasses(this.namespace, "remove", this);
            removeFrag = `<button class="btn btn-info btn-secondary ${removeClass}">Remove filter X</button>`;
        }

        let selectorClass = edges.util.allClasses(this.namespace, "selector", this);
        let frag = `<div class="${selectorClass} input-group">
                        ${fieldSelector}</br>
                        ${constraintSelector}</br>
                        ${numberEntry}${removeFrag}
                    </div>`;

        return frag;
    }

    inputChanged(element) {
        let el = $(element);

        let selectorClassSelector = edges.util.jsClassSelector(this.namespace, "selector", this);
        let container = el.parents(selectorClassSelector);

        let fieldSelector = edges.util.jsClassSelector(this.namespace, "field", this);
        let constraintSelector = edges.util.jsClassSelector(this.namespace, "constraint", this);
        let numberSelector = edges.util.jsClassSelector(this.namespace, "number", this);

        let fieldEl = container.find(fieldSelector);
        let constraintEl = container.find(constraintSelector);
        let numberEl = container.find(numberSelector);

        let fieldWas = fieldEl.attr("data-was");
        let constraintWas = constraintEl.attr("data-was");
        let numberWas = numberEl.attr("data-was");

        let field = fieldEl.find(":selected").val();
        if (field === "") {
            return;
        }

        let constraint = constraintEl.find(":selected").val();
        if (constraint === "") {
            return;
        }

        let number = numberEl.val();
        if (number === "") {
            return;
        }
        number = parseFloat(number);

        if (fieldWas !== undefined && constraintWas !== undefined && numberWas !== undefined) {
            this.component.removeRangeOnField({
                field: fieldWas,
                constraint: constraintWas,
                number: numberWas,
                cycle: false
            })
        }

        this.component.setRangeOnField({
            field: field,
            constraint: constraint,
            number: number
        });
    }

    removeRange(element) {
        let el = $(element);

        let selectorClassSelector = edges.util.jsClassSelector(this.namespace, "selector", this);
        let container = el.parents(selectorClassSelector);

        let fieldSelector = edges.util.jsClassSelector(this.namespace, "field", this);
        let constraintSelector = edges.util.jsClassSelector(this.namespace, "constraint", this);
        let numberSelector = edges.util.jsClassSelector(this.namespace, "number", this);

        let fieldEl = container.find(fieldSelector);
        let constraintEl = container.find(constraintSelector);
        let numberEl = container.find(numberSelector);

        let fieldWas = fieldEl.attr("data-was");
        let constraintWas = constraintEl.attr("data-was");
        let numberWas = numberEl.attr("data-was");

        if (fieldWas !== undefined && constraintWas !== undefined && numberWas !== undefined) {
            this.component.removeRangeOnField({
                field: fieldWas,
                constraint: constraintWas,
                number: numberWas
            })
        }
    }
}