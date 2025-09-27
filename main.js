const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

let boxes = [
    {
        x: 100, y: 100, w: 160, h: 120,
        className: "Person",
        attributes: ["- name: String", "- age: Int"],
        methods: ["+ getName(): String", "+ getAge(): Int"]
    },
    {
        x: 300, y: 250, w: 160, h: 120,
        className: "Student",
        attributes: ["- studentId: String"],
        methods: ["+ getStudentId(): String"]
    }
];
let lines = []; // Each line: { from, to, fromMultiplicity, toMultiplicity }
let draggingBox = null;
let offsetX = 0, offsetY = 0;
let connecting = false;
let connectStartBox = null;

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw lines
    lines.forEach((line, li) => {
        const a = boxes[line.from];
        const b = boxes[line.to];

        // Center points
        const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
        const bx = b.x + b.w / 2, by = b.y + b.h / 2;

        // Line color depending on validation
        const lineOk = line.validation ? line.validation.ok : null;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = lineOk === true ? 'green' : lineOk === false ? 'red' : 'black';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Calculate direction and perpendicular
        const dx = bx - ax, dy = by - ay;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return; // avoid division by zero

        // Use negative perpOffset to move labels above the line
        const perpOffset = -18; // pixels above the line

        // Perpendicular vector (normalized)
        const perpX = -dy / len;
        const perpY = dx / len;

        ctx.font = "12px Arial";

        // Start label position: at edge of start box, pushed ~10px further away
        const startEdgeX = a.x + (dx >= 0 ? a.w + 20 : -20);
        const startEdgeY = ay;
        const startLabelX = startEdgeX + perpX * perpOffset;
        const startLabelY = startEdgeY + perpY * perpOffset;
        // start multiplicity color
        const startOk = line.validation ? line.validation.fromOk : null;
        ctx.fillStyle = startOk === true ? 'green' : startOk === false ? 'red' : 'black';
        ctx.fillText(line.fromMultiplicity || "", startLabelX - 10, startLabelY - 5);

        // End label position: at edge of end box, mirrored logic
        const endEdgeX = b.x + (dx >= 0 ? -20 : b.w + 20);
        const endEdgeY = by;
        const endLabelX = endEdgeX + perpX * perpOffset;
        const endLabelY = endEdgeY + perpY * perpOffset;
        const endOk = line.validation ? line.validation.toOk : null;
        ctx.fillStyle = endOk === true ? 'green' : endOk === false ? 'red' : 'black';
        ctx.fillText(line.toMultiplicity || "", endLabelX - 10, endLabelY - 5);
    });
    // Draw UML class boxes
    boxes.forEach((box, i) => {
        // box validation status
        const v = box.validation || {};
        const nameOk = v.name === true;
        const attrsOk = v.attributes === true;
        const methodsOk = v.methods === true;
        // overall border color (if any section invalid -> red, if all valid -> green)
        const allOk = nameOk && attrsOk && methodsOk;
        let borderColor = 'black';
        if (v.checked) borderColor = allOk ? 'green' : 'red';

        ctx.fillStyle = 'white';
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.w, box.h);

        // Section heights
        const sectionHeight = box.h / 3;

        // Draw horizontal lines
        ctx.beginPath();
        ctx.moveTo(box.x, box.y + sectionHeight);
        ctx.lineTo(box.x + box.w, box.y + sectionHeight);
        ctx.moveTo(box.x, box.y + 2 * sectionHeight);
        ctx.lineTo(box.x + box.w, box.y + 2 * sectionHeight);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw class name (bold) with validation color indicator
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = nameOk ? 'green' : (v.checked ? 'red' : 'black');
        ctx.fillText(box.className, box.x + 10, box.y + 25);

        // Draw attributes
        ctx.font = "14px Arial";
        box.attributes.forEach((attr, idx) => {
            ctx.fillStyle = attrsOk ? 'green' : (v.checked ? 'red' : 'black');
            ctx.fillText(attr, box.x + 10, box.y + sectionHeight + 20 + idx * 18);
        });

        // Draw methods
        box.methods.forEach((meth, idx) => {
            ctx.fillStyle = methodsOk ? 'green' : (v.checked ? 'red' : 'black');
            ctx.fillText(meth, box.x + 10, box.y + 2 * sectionHeight + 20 + idx * 18);
        });

        // reset lineWidth
        ctx.lineWidth = 1;
    });
}

function getBoxAt(x, y) {
    return boxes.findIndex(box =>
        x >= box.x && x <= box.x + box.w &&
        y >= box.y && y <= box.y + box.h
    );
}

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const idx = getBoxAt(mx, my);
    if (e.shiftKey && idx !== -1) {
        // Start connecting
        connecting = true;
        connectStartBox = idx;
    } else if (idx !== -1) {
        // Start dragging
        draggingBox = idx;
        offsetX = mx - boxes[idx].x;
        offsetY = my - boxes[idx].y;
    }
});

canvas.addEventListener('mousemove', e => {
    if (draggingBox !== null) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        boxes[draggingBox].x = mx - offsetX;
        boxes[draggingBox].y = my - offsetY;
        draw();
    }
});

canvas.addEventListener('mouseup', e => {
    if (draggingBox !== null) {
        draggingBox = null;
    }
    if (connecting) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const idx = getBoxAt(mx, my);
        if (idx !== -1 && idx !== connectStartBox) {
            // Prompt for multiplicity
            const fromMult = prompt("Multiplicity at start (e.g. 1, 0..*, *):", "1");
            const toMult = prompt("Multiplicity at end (e.g. 1, 0..*, *):", "1");
            lines.push({
                from: connectStartBox,
                to: idx,
                fromMultiplicity: fromMult || "",
                toMultiplicity: toMult || ""
            });
        }
        connecting = false;
        connectStartBox = null;
        draw();
    }
});

canvas.addEventListener('dblclick', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const idx = getBoxAt(mx, my);
    if (idx !== -1) {
        const box = boxes[idx];
        const sectionHeight = box.h / 3;
        const relativeY = my - box.y;

        if (relativeY < sectionHeight) {
            // Edit class name
            const newName = prompt("Edit class name:", box.className);
            if (newName !== null && newName.trim() !== "") {
                box.className = newName.trim();
            }
        } else if (relativeY < 2 * sectionHeight) {
            // Edit attributes (newline separated)
            const current = box.attributes.join('\n');
            const newAttrs = prompt("Edit attributes (one per line):", current);
            if (newAttrs !== null) {
                box.attributes = newAttrs.split('\n').map(s => s.trim()).filter(Boolean);
            }
        } else {
            // Edit methods (newline separated)
            const current = box.methods.join('\n');
            const newMethods = prompt("Edit methods (one per line):", current);
            if (newMethods !== null) {
                box.methods = newMethods.split('\n').map(s => s.trim()).filter(Boolean);
            }
        }
        draw();
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'n') {
        // Add new UML class box at random position
        boxes.push({
            x: Math.random() * (canvas.width - 180) + 20,
            y: Math.random() * (canvas.height - 140) + 20,
            w: 160,
            h: 120,
            className: `Class${boxes.length + 1}`,
            attributes: ["- attr1: Type"],
            methods: ["+ method1(): void"]
        });
        draw();
    }
});

draw();

// Validation utilities and UI overlay
const resultOverlay = document.createElement('div');
resultOverlay.style.position = 'fixed';
resultOverlay.style.right = '10px';
resultOverlay.style.top = '10px';
resultOverlay.style.maxWidth = '320px';
resultOverlay.style.padding = '10px';
resultOverlay.style.background = 'rgba(255,255,255,0.95)';
resultOverlay.style.border = '1px solid #ccc';
resultOverlay.style.fontFamily = 'Arial, sans-serif';
resultOverlay.style.fontSize = '13px';
resultOverlay.style.zIndex = 9999;
resultOverlay.style.display = 'none';
document.body.appendChild(resultOverlay);

function normalizeList(list) {
    return list.map(s => s.trim()).filter(Boolean);
}
function listsEqualIgnoringOrder(a, b) {
    const A = normalizeList(a).slice().map(s => s.toLowerCase());
    const B = normalizeList(b).slice().map(s => s.toLowerCase());
    if (A.length !== B.length) return false;
    A.sort(); B.sort();
    for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return false;
    return true;
}


//Solution format example:
const solution = {
  classes: [
    { className: "Person", attributes: ["- name: String","- age: Int"], methods: ["+ getName(): String"] },
    { className: "Student", attributes: ["- studentId: String"], methods: ["+ getStudentId(): String"] }
  ],
  relationships: [
    { from: "Person", to: "Student", fromMultiplicity: "1", toMultiplicity: "0..*" },    
  ]
};

function validateAgainstSolution(solution) {
    // clear previous validation
    boxes.forEach(b => { b.validation = { checked: false, name: false, attributes: false, methods: false }; });
    lines.forEach(l => { l.validation = { ok: null, fromOk: null, toOk: null }; });

    const report = { ok: [], missing: [], mismatches: [], extra: [] };

    // Map current boxes by name (case-insensitive)
    const nameToIndex = {};
    boxes.forEach((b, i) => nameToIndex[b.className.toLowerCase()] = i);

    // Validate classes
    const expectedNames = solution.classes.map(c => c.className);
    solution.classes.forEach(expected => {
        const key = expected.className.toLowerCase();
        if (!(key in nameToIndex)) {
            report.missing.push(`Missing class: ${expected.className}`);
            return;
        }
        const bi = nameToIndex[key];
        const box = boxes[bi];
        const v = box.validation;
        v.checked = true;

        // name match (case-insensitive)
        v.name = box.className.toLowerCase() === expected.className.toLowerCase();

        // attributes and methods (order-insensitive)
        v.attributes = listsEqualIgnoringOrder(expected.attributes || [], box.attributes || []);
        v.methods = listsEqualIgnoringOrder(expected.methods || [], box.methods || []);

        if (v.name && v.attributes && v.methods) {
            report.ok.push(`Class OK: ${expected.className}`);
        } else {
            const parts = [];
            if (!v.name) parts.push('title');
            if (!v.attributes) parts.push('attributes');
            if (!v.methods) parts.push('methods');
            report.mismatches.push(`Class ${expected.className} mismatch: ${parts.join(', ')}`);
        }
    });

    // Detect extra classes not in solution
    boxes.forEach(b => {
        if (!expectedNames.some(n => n.toLowerCase() === b.className.toLowerCase())) {
            report.extra.push(`Extra class: ${b.className}`);
        }
    });

    // Validate relationships
    const relsChecked = new Array(lines.length).fill(false);

    solution.relationships.forEach(rel => {
        const fromKey = rel.from.toLowerCase();
        const toKey = rel.to.toLowerCase();
        const fromIdx = nameToIndex[fromKey];
        const toIdx = nameToIndex[toKey];
        if (fromIdx === undefined || toIdx === undefined) {
            report.missing.push(`Relationship ${rel.from} -> ${rel.to} cannot be checked (class missing)`);
            return;
        }

        // find a matching line (either direction)
        let found = false;
        for (let li = 0; li < lines.length; li++) {
            const L = lines[li];
            if (relsChecked[li]) continue;
            if ((L.from === fromIdx && L.to === toIdx) || (L.from === toIdx && L.to === fromIdx)) {
                // mark checked
                relsChecked[li] = true;
                found = true;
                // determine direction mapping
                const mapping = (L.from === fromIdx && L.to === toIdx) ? 'same' : 'reversed';
                // compare multiplicities with mapping
                let fromOk, toOk;
                if (mapping === 'same') {
                    fromOk = (String(L.fromMultiplicity || '').trim() === String(rel.fromMultiplicity || '').trim());
                    toOk = (String(L.toMultiplicity || '').trim() === String(rel.toMultiplicity || '').trim());
                } else {
                    // reversed: solution.from corresponds to L.to
                    fromOk = (String(L.toMultiplicity || '').trim() === String(rel.fromMultiplicity || '').trim());
                    toOk = (String(L.fromMultiplicity || '').trim() === String(rel.toMultiplicity || '').trim());
                }
                L.validation = { ok: fromOk && toOk, fromOk, toOk };
                if (L.validation.ok) {
                    report.ok.push(`Relationship OK: ${rel.from} -> ${rel.to}`);
                } else {
                    const parts = [];
                    if (!fromOk) parts.push(`${rel.from} multiplicity`);
                    if (!toOk) parts.push(`${rel.to} multiplicity`);
                    report.mismatches.push(`Relationship ${rel.from} -> ${rel.to} mismatch: ${parts.join(', ')}`);
                }
                break;
            }
        }
        if (!found) {
            report.missing.push(`Missing relationship: ${rel.from} -> ${rel.to}`);
        }
    });

    // Any extra lines not matched
    lines.forEach((L, li) => {
        if (!relsChecked[li]) {
            L.validation = { ok: false, fromOk: null, toOk: null };
            const aName = boxes[L.from] ? boxes[L.from].className : `#${L.from}`;
            const bName = boxes[L.to] ? boxes[L.to].className : `#${L.to}`;
            report.extra.push(`Extra relationship: ${aName} -> ${bName}`);
        }
    });

    // Build overlay text
    const linesOut = [];
    if (report.ok.length) linesOut.push(`<div style="color:green"><strong>OK</strong><ul>${report.ok.map(s => `<li>${s}</li>`).join('')}</ul></div>`);
    if (report.mismatches.length) linesOut.push(`<div style="color:orange"><strong>Mismatches</strong><ul>${report.mismatches.map(s => `<li>${s}</li>`).join('')}</ul></div>`);
    if (report.missing.length) linesOut.push(`<div style="color:red"><strong>Missing</strong><ul>${report.missing.map(s => `<li>${s}</li>`).join('')}</ul></div>`);
    if (report.extra.length) linesOut.push(`<div style="color:purple"><strong>Extra</strong><ul>${report.extra.map(s => `<li>${s}</li>`).join('')}</ul></div>`);

    resultOverlay.innerHTML = linesOut.length ? linesOut.join('') : '<div>No checks performed</div>';
    resultOverlay.style.display = 'block';

    draw();
}

// keyboard shortcut: press 'v' to validate with example solution (replace with your own)
document.addEventListener('keydown', e => {
    if (e.key === 'v') {
        // Example solution - replace with your correct solution
        const solutionExample = {
            classes: [
                { className: "Person", attributes: ["- name: String", "- age: Int"], methods: ["+ getName(): String", "+ getAge(): Int"] },
                { className: "Student", attributes: ["- studentId: String"], methods: ["+ getStudentId(): String"] }
            ],
            relationships: [
                { from: "Person", to: "Student", fromMultiplicity: "1", toMultiplicity: "0..*" }
            ]
        };
        validateAgainstSolution(solutionExample);
    }
});