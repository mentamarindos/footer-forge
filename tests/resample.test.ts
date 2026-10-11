import { describe, expect, test } from "bun:test";
import { planSteps } from "@/lib/image/resample";

describe("planSteps (re-muestreo progresivo)", () => {
  test("1:1 devuelve un solo paso", () => {
    expect(planSteps(640, 360, 640, 360)).toEqual([{ w: 640, h: 360 }]);
  });

  test("upscale va en un solo paso (no tiene sentido intermedio)", () => {
    expect(planSteps(300, 200, 640, 427)).toEqual([{ w: 640, h: 427 }]);
  });

  test("ratio <2x va en un solo paso", () => {
    expect(planSteps(700, 394, 640, 360)).toEqual([{ w: 640, h: 360 }]);
  });

  test("4000→640 baja por mitades", () => {
    expect(planSteps(4000, 2250, 640, 360)).toEqual([
      { w: 2000, h: 1125 },
      { w: 1000, h: 563 },
      { w: 640, h: 360 },
    ]);
  });

  test("no duplica el paso final cuando cae exacto", () => {
    expect(planSteps(1600, 900, 400, 225)).toEqual([
      { w: 800, h: 450 },
      { w: 400, h: 225 },
    ]);
  });

  test("pasos monótonos que terminan en el destino", () => {
    for (const [fw, fh, tw, th] of [[3840, 2160, 480, 270], [1200, 675, 640, 360], [5000, 3000, 64, 38]] as Array<[number, number, number, number]>) {
      const steps = planSteps(fw, fh, tw, th);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[steps.length - 1]).toEqual({ w: tw, h: th });
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].w).toBeLessThanOrEqual(steps[i - 1].w);
        expect(steps[i].h).toBeLessThanOrEqual(steps[i - 1].h);
      }
    }
  });
});
