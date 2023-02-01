// requires: $
// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("renderers")) { edges.renderers = {}}
if (!edges.renderers.hasOwnProperty("bs3")) { edges.renderers.bs3 = {}}

edges.renderers.bs3.MultiFieldRangeSelectorFacet = class extends edges.Renderer {
    constructor(params) {
        super(params);

        this.title = edges.util.getParam(params, "title", false);

        this.namespace = "edges-bs3-multifieldrangeselectorfacet";
    }

    draw() {
        // header
        let header = "";
        if (this.title) {
            header = this.title;
        }

        // render existing selections
        let existing = this.component.normalisedRanges();
        let existingFrag = "";
        for (let field in existing) {
            let constraints = existing[field];
            for (let constraint in constraints) {
                let number = constraints[constraint];
                if (number === false) {
                    continue;
                }
                existingFrag += this._renderSelector(field, constraint, number)
            }
        }

        // render a new range setter
        let newSelector = this._renderSelector();

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

        let fieldSelector = `<select name="" id="" class="${inputClass} ${fieldClass}" ${fieldDataWas}>
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
        let constraintSelector = `<select name="" id="" class="${inputClass} ${constraintClass}" ${constraintDataWas}>
            <option value="gte" ${gteSelected}>greater than</option>
            <option value="lte" ${lteSelected}>less than</option>
        </select>`;

        let numberValue = "";
        let numberDataWas = "";
        if (existingNumber !== undefined) {
            numberValue = `value="${existingNumber}"`;
            numberDataWas = `data-was="${existingNumber}"`
        }
        let numberEntry = `<input type="number" class="${inputClass} ${numberClass}" ${numberValue} ${numberDataWas}>`;

        let removeFrag = "";
        if (existingField) {
            let removeClass = edges.util.allClasses(this.namespace, "remove", this);
            removeFrag = `<button class="${removeClass}">X</button>`;
        }

        let selectorClass = edges.util.allClasses(this.namespace, "selector", this);
        let frag = `<div class="${selectorClass}">${fieldSelector}${constraintSelector}${numberEntry}${removeFrag}</div>`;

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