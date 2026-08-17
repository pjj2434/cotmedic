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
  {
    desc: "Inspect hoses and fittings for damage or wear; replace as necessary",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Verify the hydraulic velocity fuse operates correctly",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Verify the cot does not lower when the manual backup release handle is pulled with 100lbs on cot",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Extend cot to raised position, measure and check load height",
    reading: "",
    result: "Passed",
  },
  { desc: 'Verify "jog" function is operating', reading: "", result: "Passed" },
  { desc: "Verify high speed retract is working", reading: "", result: "Passed" },
  { desc: "Verify both switches operate correctly", reading: "", result: "Passed" },
  { desc: "Inspect the cot frame/litter", reading: "", result: "Passed" },
  {
    desc: "Verify there is no damage or pinching of wiring harness, cables or lines",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Verify that the manual back-up release handle functions properly",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Verify the manual back-up release handle returns to the stowed position",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Verify the base extends/retracts smoothly when the manual back-up release is engaged",
    reading: "",
    result: "Passed",
  },
  { desc: "All welds intact, not cracked or broken", reading: "", result: "Passed" },
  { desc: "Verify no bent, broken or damaged components", reading: "", result: "Passed" },
  { desc: "Verify no damage or tears on cot grips", reading: "", result: "Passed" },
  { desc: "Verify the siderails are operating properly", reading: "", result: "Passed" },
  { desc: "Verify the footrest operates properly", reading: "", result: "Passed" },
  {
    desc: "No tears, rips, holes, cracks, or other openings in the mattress cover",
    reading: "",
    result: "Passed",
  },
  { desc: "Inspect the cot frame/base", reading: "", result: "Passed" },
  {
    desc: "Lubricate the kickstand spring and internal spring housing (optional)",
    reading: "",
    result: "Passed",
  },
  { desc: "All wheels secure, rolling and swiveling properly", reading: "", result: "Passed" },
  { desc: "Check and adjust wheel locks as necessary", reading: "", result: "Passed" },
  { desc: "Verify smooth operation of X-frame", reading: "", result: "Passed" },
  {
    desc: "Verify the head section extends and locks properly",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Verify load wheels are secure and roll properly",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Inspect the straps and clips on the oxygen bottle holder (optional) for wear",
    reading: "",
    result: "Passed",
  },
  { desc: "IV pole intact and operating properly (optional)", reading: "", result: "Passed" },
  {
    desc: "Verify the head extension & pillow (optional) operates properly",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Verify the restraint extender (optional) operates properly",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Verify the kickstand (optional) retracts fully to the transport position",
    reading: "",
    result: "Passed",
  },
  {
    desc: "Verify that the kickstand (optional) bolts are tightened properly",
    reading: "",
    result: "Passed",
  },
];
