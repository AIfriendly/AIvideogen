import { describe, it, expect } from "vitest";
import { validateScriptQuality, getWordCount, hasQualityMarkers } from "@/lib/llm/validate-script-quality";

describe("Script Quality Validation", () => {
  it("should fail with less than 3 scenes", () => {
    const scenes = [
      { sceneNumber: 1, text: "First scene text." },
      { sceneNumber: 2, text: "Second scene text." }
    ];
    const result = validateScriptQuality(scenes);
    expect(result.passed).toBe(false);
  });

  it("should pass with 3 good scenes", () => {
    const scenes = [
      { sceneNumber: 1, text: "Python reached 28% market share in 2023." },
      { sceneNumber: 2, text: "React was released in 2013 by Facebook." },
      { sceneNumber: 3, text: "Rust reduced memory usage by 40% in tests." }
    ];
    const result = validateScriptQuality(scenes);
    expect(result.passed).toBe(true);
  });

  it("should fail with markdown", () => {
    const scenes = [
      { sceneNumber: 1, text: "This is *bold* text." },
      { sceneNumber: 2, text: "This has _italics_." },
      { sceneNumber: 3, text: "This has normal text." }
    ];
    const result = validateScriptQuality(scenes);
    expect(result.passed).toBe(false);
  });

  it("should calculate word count", () => {
    const count = getWordCount("This is a test sentence.");
    expect(count).toBe(5);
  });
});
