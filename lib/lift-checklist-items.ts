export type LiftChecklistStatus = "P" | "F" | "NA";

export type LiftChecklistItem = {
  id: string;
  desc: string;
};

export type LiftDispositionItem = {
  id: string;
  label: string;
};

export const LIFT_PM_CHECKLIST: LiftChecklistItem[] = [
  {
    id: "D03",
    desc: "Visually inspect platform, handrails, towers, parallel arms, fold arms, saddle, base plate, threshold plate, and mounting structure for damage, distortion, corrosion, cracked welds, or loose/missing hardware.",
  },
  {
    id: "D04",
    desc: "Inspect power cable, pendant/control, wiring visible without disassembly, platform lights, and pump-module cover for damage and securement.",
  },
  {
    id: "D05",
    desc: "Inspect hydraulic cylinders, hoses, fittings, reservoir/pump area, and ground beneath lift for leakage, abrasion, kinks, or damage.",
  },
  {
    id: "D06",
    desc: "Inspect inner roll stop, locks, torsion springs, lever brackets, and threshold interface for wear, damage, and securement.",
  },
  {
    id: "D07",
    desc: "Inspect outer barrier, latches, activation foot, gas springs, and related pivots for wear, damage, missing springs, and securement.",
  },
  {
    id: "D08",
    desc: "Check Lift-Tite latches, latch rollers, dampening springs, locknuts, and retaining rings for damage, alignment, and positive securement.",
  },
  {
    id: "D09",
    desc: "Operate a complete UNFOLD-DOWN-UP-FOLD cycle unloaded. Motion is smooth and controlled, with no binding, abnormal noise, excessive drift, or contact with vehicle.",
  },
  {
    id: "D10",
    desc: "Verify platform remains level through travel and rests squarely at floor and ground levels; check platform angle/threshold relationship.",
  },
  {
    id: "D11",
    desc: "Verify inner roll stop raises/locks as required and rests correctly on the threshold plate at vehicle floor level.",
  },
  {
    id: "D12",
    desc: "Verify outer barrier raises, latches, and remains positively retained; barrier does not raise when occupied where the model uses the occupied sensing function.",
  },
  {
    id: "D13",
    desc: "Verify stow interlock, bridging/threshold warning, inboard-occupied, outer-barrier occupied/raised, and related microswitch functions applicable to this lift.",
  },
  {
    id: "D14",
    desc: "Verify platform cannot fold when light downward pressure/load is applied at the outboard end, and stows snugly against the stow blocks when permitted.",
  },
  {
    id: "D15",
    desc: "Verify manual backup operation/release equipment is present and functional per the operator/service manual; restore all valves and equipment to normal.",
  },
  {
    id: "C750-02",
    desc: "Lubricate outer barrier pivot points/bearings, latch pivots, switch-lever pivots, latch-roller bearings, gas-spring pivots, and activation-foot bearings with specified light oil.",
  },
  {
    id: "C750-03",
    desc: "Lubricate outer barrier arm slots with specified light grease.",
  },
  {
    id: "C750-04",
    desc: "Lubricate Lift-Tite latch tower pivots and dampening-spring pivot points with specified light oil; use light grease at a latch tower pivot when replacing a latch.",
  },
  {
    id: "C750-05",
    desc: "Inspect Lift-Tite latches/dampening springs for bending, deformation, misalignment, wear, damaged retainers, and proper operation.",
  },
  {
    id: "C750-06",
    desc: "Inspect outer barrier and latch for proper operation, positive securement, and detached/missing springs; correct or replace as needed.",
  },
  {
    id: "C750-07",
    desc: "Measure/adjust platform fold pressure using the model-specific service procedure.",
  },
  {
    id: "C1500-02",
    desc: "Apply specified synthetic/light grease to contact areas between inner and outer fold arms.",
  },
  {
    id: "C1500-03",
    desc: "Lubricate platform pivot-pin bearings, inner-fold-arm bearings, inner-fold-arm roller-pin bearings, outer-fold-arm pivot-pin bearings and cam followers.",
  },
  {
    id: "C1500-04",
    desc: "Lubricate inner roll-stop pivot bearings, lever bearings, lever slots, and lock pivot points with specified light oil.",
  },
  {
    id: "C1500-05",
    desc: "Lubricate saddle-support bearings, parallel-arm pivot-pin bearings, handrail pivot pins, and hydraulic-cylinder pivot bushings.",
  },
  {
    id: "C1500-06",
    desc: "Inspect Lift-Tite latch rollers for wear/damage, positive securement, and proper operation.",
  },
  {
    id: "C1500-07",
    desc: "Inspect inner roll stop for wear/damage, operation, positive securement at both ends, and correct rest position on threshold plate.",
  },
  {
    id: "C1500-08",
    desc: "Inspect handrails and components for wear/damage, securement, and proper operation.",
  },
  {
    id: "C1500-09",
    desc: "Inspect all lift microswitches/sensors and actuators for securement and correct adjustment; test interlock logic after adjustment.",
  },
  {
    id: "C1500-10",
    desc: "Confirm smooth, square travel; realign towers/vertical arms and correct lubrication or mechanical faults as required.",
  },
  {
    id: "C1500-11",
    desc: "Inspect inner roll-stop locks and torsion springs for wear/damage and proper operation.",
  },
  {
    id: "C1500-12",
    desc: "Inspect all specified external snap rings/retainers, including fold arms, Lift-Tite components, outer-barrier components, cam followers, roller pins, lever brackets, and platform fold links.",
  },
  {
    id: "C1500-13",
    desc: "Inspect inner-fold-arm pins, axles, and bearings for wear/damage and positive securement.",
  },
  {
    id: "C1500-14",
    desc: "Remove pump-module cover. Inspect hydraulic hoses/fittings/connections for wear or leaks; inspect harnesses, wires, terminals, relays, fuses, power switch, and lights for damage and securement.",
  },
  {
    id: "C450-03",
    desc: "With platform fully lowered, check hydraulic-fluid level and condition. Use only the fluid specified in the exact manual; do not mix fluids or overfill.",
  },
  {
    id: "C450-04",
    desc: "If fluid is low or contaminated, inspect cylinders, seals, hoses, fittings, and connections; repair leakage and change contaminated fluid per manual.",
  },
  {
    id: "C450-06",
    desc: "Inspect platform pivot pins/bearings, vertical arms, fold arms, saddle/supports, and associated pins/bearings for wear, damage, and positive securement.",
  },
  {
    id: "C450-07",
    desc: "Inspect all specified gas springs/cylinders for wear/damage, operation, and positive securement.",
  },
  {
    id: "C450-08",
    desc: "Inspect UHMW saddle bearings; apply Door-Ease where specified or replace worn bearings.",
  },
];

export const LIFT_PM_DISPOSITION: LiftDispositionItem[] = [
  {
    id: "final-cycle",
    label:
      "Unloaded full cycle completed without binding, abnormal noise, leakage, drift, or contact",
  },
  {
    id: "final-interlocks",
    label: "All barriers/locators/roll stops and applicable interlocks function correctly",
  },
];

export const LIFT_STATUS_CONFIG = {
  P: { label: "P", full: "Pass", active: "bg-emerald-600 text-white border-emerald-600" },
  F: { label: "F", full: "Fail", active: "bg-red-600 text-white border-red-600" },
  NA: { label: "N/A", full: "N/A", active: "bg-neutral-500 text-white border-neutral-500" },
} as const;
