import { test, expect, describe } from "vitest";
import { lerp } from "../release/lerp";

describe("lerp", () => {
  describe("number lerp", () => {
    test("should interpolate between two numbers at t=0", () => {
      expect(lerp(0, 10, 0)).toBe(0);
    });

    test("should interpolate between two numbers at t=1", () => {
      expect(lerp(0, 10, 1)).toBe(10);
    });

    test("should interpolate between two numbers at t=0.5", () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
    });

    test("should handle negative numbers", () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
      expect(lerp(-5, -2, 0.5)).toBe(-3.5);
    });

    test("should handle values outside [0,1] range", () => {
      expect(lerp(0, 10, 2)).toBe(20);
      expect(lerp(0, 10, -1)).toBe(-10);
    });

    test("should handle decimal start and end values", () => {
      expect(lerp(1.5, 3.5, 0.25)).toBe(2);
    });
  });

  describe("array lerp", () => {
    test("should interpolate between two arrays at t=0", () => {
      expect(lerp([0, 10, 20], [10, 20, 30], 0)).toEqual([0, 10, 20]);
    });

    test("should interpolate between two arrays at t=1", () => {
      expect(lerp([0, 10, 20], [10, 20, 30], 1)).toEqual([10, 20, 30]);
    });

    test("should interpolate between two arrays at t=0.5", () => {
      expect(lerp([0, 10, 20], [10, 20, 30], 0.5)).toEqual([5, 15, 25]);
    });

    test("should handle arrays with negative numbers", () => {
      expect(lerp([-10, 0, 10], [10, 20, 30], 0.5)).toEqual([0, 10, 20]);
    });

    test("should handle single-element arrays", () => {
      expect(lerp([5], [15], 0.5)).toEqual([10]);
    });

    test("should handle empty arrays", () => {
      expect(lerp([], [], 0.5)).toEqual([]);
    });
  });

  describe("object lerp", () => {
    test("should interpolate between two objects at t=0", () => {
      const start = { x: 0, y: 10 };
      const end = { x: 10, y: 20 };
      expect(lerp(start, end, 0)).toEqual({ x: 0, y: 10 });
    });

    test("should interpolate between two objects at t=1", () => {
      const start = { x: 0, y: 10 };
      const end = { x: 10, y: 20 };
      expect(lerp(start, end, 1)).toEqual({ x: 10, y: 20 });
    });

    test("should interpolate between two objects at t=0.5", () => {
      const start = { x: 0, y: 10 };
      const end = { x: 10, y: 20 };
      expect(lerp(start, end, 0.5)).toEqual({ x: 5, y: 15 });
    });

    test("should handle nested objects with arrays", () => {
      const start = { position: [0, 0], scale: 1 };
      const end = { position: [10, 20], scale: 2 };
      expect(lerp(start, end, 0.5)).toEqual({ position: [5, 10], scale: 1.5 });
    });

    test("should handle deeply nested objects", () => {
      const start = { transform: { position: { x: 0, y: 0 } } };
      const end = { transform: { position: { x: 10, y: 20 } } };
      expect(lerp(start, end, 0.5)).toEqual({
        transform: { position: { x: 5, y: 10 } },
      });
    });

    test("should handle objects with multiple properties", () => {
      const start = { x: 0, y: 10, z: 20, w: 30 };
      const end = { x: 100, y: 110, z: 120, w: 130 };
      expect(lerp(start, end, 0.1)).toEqual({ x: 10, y: 20, z: 30, w: 40 });
    });
  });

  describe("edge cases", () => {
    test("should handle same start and end values", () => {
      expect(lerp(5, 5, 0.5)).toBe(5);
      expect(lerp([5, 10], [5, 10], 0.5)).toEqual([5, 10]);
      expect(lerp({ x: 5 }, { x: 5 }, 0.5)).toEqual({ x: 5 });
    });

    test("should handle zero as amount", () => {
      expect(lerp(10, 20, 0)).toBe(10);
      expect(lerp([10, 20], [30, 40], 0)).toEqual([10, 20]);
    });

    test("should handle very small amounts", () => {
      expect(lerp(0, 100, 0.001)).toBe(0.1);
    });

    test("should handle very large amounts", () => {
      expect(lerp(0, 10, 100)).toBe(1000);
    });
  });

  describe("error cases", () => {
    test("should throw error for mismatched types", () => {
      // @ts-expect-error Testing invalid input
      expect(() => lerp(5, "10", 0.5)).toThrow("Cannot lerp");
    });

    test("should throw error for invalid types", () => {
      // @ts-expect-error Testing invalid input
      expect(() => lerp("hello", "world", 0.5)).toThrow("Cannot lerp");
    });
  });

  describe("easing parameter", () => {
    describe("linear easing (default)", () => {
      test("should use linear easing by default", () => {
        expect(lerp(0, 10, 0.5)).toBe(5);
      });

      test("should use linear easing when explicitly specified", () => {
        expect(lerp(0, 10, 0.5, "linear")).toBe(5);
      });
    });

    describe("quad easings", () => {
      test("should apply easeInQuad correctly", () => {
        // easeInQuad(0.5) = 0.5^2 = 0.25
        expect(lerp(0, 10, 0.5, "easeInQuad")).toBe(2.5);
      });

      test("should apply easeOutQuad correctly", () => {
        // easeOutQuad(0.5) = 1 - (1-0.5)^2 = 0.75
        expect(lerp(0, 10, 0.5, "easeOutQuad")).toBe(7.5);
      });

      test("should apply easeInOutQuad correctly", () => {
        // easeInOutQuad(0.5) = 0.5
        expect(lerp(0, 10, 0.5, "easeInOutQuad")).toBe(5);
        // easeInOutQuad(0.25) = 2 * 0.25^2 = 0.125
        expect(lerp(0, 10, 0.25, "easeInOutQuad")).toBe(1.25);
      });
    });

    describe("cubic easings", () => {
      test("should apply easeInCubic correctly", () => {
        // easeInCubic(0.5) = 0.5^3 = 0.125
        expect(lerp(0, 10, 0.5, "easeInCubic")).toBe(1.25);
      });

      test("should apply easeOutCubic correctly", () => {
        // easeOutCubic(0.5) = 1 - (1-0.5)^3 = 0.875
        expect(lerp(0, 10, 0.5, "easeOutCubic")).toBe(8.75);
      });
    });

    describe("easing with arrays", () => {
      test("should apply easing to all array elements", () => {
        // easeInQuad(0.5) = 0.25
        expect(lerp([0, 10, 20], [10, 20, 30], 0.5, "easeInQuad")).toEqual([
          2.5, 12.5, 22.5,
        ]);
      });

      test("should apply easing consistently across array", () => {
        const result = lerp([0, 0, 0], [100, 200, 300], 0.5, "easeOutQuad");
        expect(result).toEqual([75, 150, 225]);
      });
    });

    describe("easing with objects", () => {
      test("should apply easing to all object properties", () => {
        const start = { x: 0, y: 0 };
        const end = { x: 10, y: 20 };
        // easeInQuad(0.5) = 0.25
        expect(lerp(start, end, 0.5, "easeInQuad")).toEqual({ x: 2.5, y: 5 });
      });

      test("should apply easing to nested objects with arrays", () => {
        const start = { position: [0, 0], scale: 0 };
        const end = { position: [10, 20], scale: 10 };
        // easeOutQuad(0.5) = 0.75
        expect(lerp(start, end, 0.5, "easeOutQuad")).toEqual({
          position: [7.5, 15],
          scale: 7.5,
        });
      });

      test("should apply easing to deeply nested structures", () => {
        const start = { transform: { position: { x: 0, y: 0 } } };
        const end = { transform: { position: { x: 100, y: 100 } } };
        // easeInCubic(0.5) = 0.125
        expect(lerp(start, end, 0.5, "easeInCubic")).toEqual({
          transform: { position: { x: 12.5, y: 12.5 } },
        });
      });
    });

    describe("easing boundary values", () => {
      test("should handle t=0 with any easing", () => {
        expect(lerp(0, 10, 0, "easeInQuad")).toBe(0);
        expect(lerp(0, 10, 0, "easeOutQuad")).toBe(0);
        expect(lerp(0, 10, 0, "easeInCubic")).toBe(0);
      });

      test("should handle t=1 with any easing", () => {
        expect(lerp(0, 10, 1, "easeInQuad")).toBe(10);
        expect(lerp(0, 10, 1, "easeOutQuad")).toBe(10);
        expect(lerp(0, 10, 1, "easeInCubic")).toBe(10);
      });
    });

    describe("easing with negative ranges", () => {
      test("should apply easing correctly with negative ranges", () => {
        // easeInQuad(0.5) = 0.25
        expect(lerp(-10, 10, 0.5, "easeInQuad")).toBe(-5);
        expect(lerp(-20, -10, 0.5, "easeInQuad")).toBe(-17.5);
      });
    });
  });
});
