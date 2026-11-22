import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const source = fs.readFileSync(
  "components/alternating-care/source/api/db/import/useImportEvents.ts",
  "utf8",
);
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const module = { exports: {} };
new Function(
  "require",
  "module",
  "exports",
  output.replace(
    /require\("@tanstack\/react-query"\)/g,
    '({useMutation:()=>({})})',
  ).replace(
    /require\("\.\.\/events\/careEventsApi"\)/g,
    '({createCareEvents:async()=>[]})',
  ),
)(require, module, module.exports);
const { parseCareImport } = module.exports;

test("imports legacy day events", () => {
  const event = {
    id: "event-1",
    groupId: "group-1",
    date: "2026-11-22",
    type: "EVENT",
    issuer: "Admin",
    creationTime: 1,
  };
  assert.deepEqual(parseCareImport([event]), [event]);
});

test("expands exclusive range end into day events", () => {
  const events = parseCareImport({
    version: 2,
    ranges: [
      {
        groupId: "group-1",
        startDate: "2026-11-22",
        endDate: "2026-11-25",
        type: "EVENT",
        name: "Test",
      },
    ],
  });
  assert.deepEqual(
    events.map(({ date }) => date),
    ["2026-11-22", "2026-11-23", "2026-11-24"],
  );
});

test("rejects malformed ranges", () => {
  assert.throws(
    () =>
      parseCareImport({
        version: 2,
        ranges: [
          {
            groupId: "group-1",
            startDate: "2026-11-25",
            endDate: "2026-11-22",
            type: "EVENT",
          },
        ],
      }),
    /ranges/,
  );
});

test("keeps legacy ALTERNATING group ready for range consolidation", () => {
  const events = parseCareImport([
    {
      id: "1",
      groupId: "ALTERNATING",
      date: "2024-09-04",
      type: "ALTERNATING",
      issuer: "Admin",
      creationTime: 1,
      name: "Opieka",
      description: "",
      style: { background: "#2d5465", color: "#ffffff" },
    },
    {
      id: "2",
      groupId: "ALTERNATING",
      date: "2024-09-05",
      type: "ALTERNATING",
      issuer: "Admin",
      creationTime: 2,
      name: "Opieka",
      description: "",
      style: { background: "#2d5465", color: "#ffffff" },
    },
    {
      id: "3",
      groupId: "ALTERNATING",
      date: "2024-09-08",
      type: "ALTERNATING",
      issuer: "Admin",
      creationTime: 3,
      name: "Opieka",
      description: "",
      style: { background: "#2d5465", color: "#ffffff" },
    },
  ]);

  assert.equal(new Set(events.map(({ groupId }) => groupId)).size, 1);
  assert.deepEqual(
    events.map(({ date }) => date),
    ["2024-09-04", "2024-09-05", "2024-09-08"],
  );
});

test("imports one event containing several ranges and single days", () => {
  const events = parseCareImport({
    version: 2,
    events: [
      {
        groupId: "trip-1",
        type: "TRIP",
        name: "Chulilla",
        style: { background: "#ffe100", color: "#272727" },
        ranges: [
          { startDate: "2026-04-02", endDate: "2026-04-05" },
          { startDate: "2026-04-09", endDate: "2026-04-10" },
        ],
      },
    ],
  });

  assert.deepEqual(
    events.map(({ date }) => date),
    ["2026-04-02", "2026-04-03", "2026-04-04", "2026-04-09"],
  );
  assert.deepEqual(
    [...new Set(events.map(({ groupId }) => groupId))],
    ["trip-1"],
  );
});
