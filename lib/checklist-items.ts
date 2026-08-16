export type ChecklistResult = "Passed" | "Failed";

export type ChecklistItem = {
  desc: string;
  reading: string;
  result: ChecklistResult;
};

export const INITIAL_CHECKLIST: ChecklistItem[] = [
  { desc: "Verify the in-fastener shut-off is configured properly", reading: "", result: "Passed" },
  { desc: "Verify the cot fastener fit and function properly", reading: "", result: "Passed" },
  {
    desc: "Verify warning labels present, legible (reference assembly drawings)",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Verify the safety bar engages the vehicle safety hook properly",
    reading: "",
    result: "Passed",
  },
  { desc: "All fasteners secure", reading: "", result: "Passed" },
  {
    desc: "Adjust pneumatic cylinder for full range of motion, if required",
    reading: "",
    result: "Passed",
  },
  { desc: "Verify that there are no hydraulic fluid leaks", reading: "", result: "Passed" },
  {
    desc: "Extend cylinder rod completely and wipe down rod with soft cloth and household cleaner",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Inspect motor mount and verify that all fasteners are secure",
    reading: "",
    result: "Passed",
  },
  { desc: "Inspect the reservoir and verify that there are no leaks", reading: "", result: "Passed" },
  { desc: "Body restraints intact and working properly", reading: "", result: "Passed" },
];
