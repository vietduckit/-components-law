const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-25: row dropdowns near the last task rows hung below the table and
// stretched it. They open upward when the room below is too small and there
// is more room above.
const file = path.resolve(__dirname, "../../All Module/Task/TaskManagement.js");
const { shouldOpenUp } = extractMarkedBlock(
  file,
  "// ---- dropdown placement helpers (pure; tested by scripts/tests/task-dropdown-placement.test.js) ----",
  "// ---- end dropdown placement helpers ----",
  ["shouldOpenUp"],
);

const box = { limitTop: 0, limitBottom: 800 };
assert.equal(shouldOpenUp({ ...box, anchorTop: 100, anchorBottom: 124, height: 200 }), false, "room below: opens down");
assert.equal(shouldOpenUp({ ...box, anchorTop: 700, anchorBottom: 724, height: 200 }), true, "last rows: opens up");
assert.equal(shouldOpenUp({ ...box, anchorTop: 590, anchorBottom: 600, height: 200 }), false, "exactly fits below");
assert.equal(
  shouldOpenUp({ limitTop: 500, limitBottom: 800, anchorTop: 520, anchorBottom: 544, height: 400 }),
  false,
  "neither side fits: keep the side with more room (below)",
);

const src = fs.readFileSync(file, "utf8");
const slice = (start, len) => src.slice(src.indexOf(start), src.indexOf(start) + len);
assert.ok(/useDropdownFlip\(open, statusAnchorRef, statusMenuRef\)/.test(slice("const StatusBtn = (", 4000)), "status menu flips");
assert.ok(/useDropdownFlip\(showMenu, rowMenuAnchorRef, rowMenuRef\)/.test(src), "task row ⋮ menu flips");
assert.ok(/useDropdownFlip\(actionMenuOpen, serviceMenuAnchorRef, serviceMenuRef\)/.test(src), "service action menu flips");
assert.ok(/useDropdownFlip\(open, wrapperRef, pickerMenuRef\)/.test(slice("const TaskPicker = (", 16000)), "task picker flips");
assert.ok(!/rect\.top > 400/.test(slice("const PortalDropdown = (", 2500)), "portal dropdown: no fixed 400px threshold");
assert.ok(/shouldOpenUp\(/.test(slice("const PortalDropdown = (", 2500)), "portal dropdown uses the same rule");

console.log("task-dropdown-placement: all tests passed");
