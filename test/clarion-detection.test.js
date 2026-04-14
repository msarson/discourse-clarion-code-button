import { describe, it, expect } from "vitest";
import { detectClarionCode } from "../javascripts/discourse/lib/clarion-detection.js";

// ---------------------------------------------------------------------------
// TRUE POSITIVES — should be detected as Clarion
// ---------------------------------------------------------------------------

describe("detects Clarion via ! comments", () => {
  it("detects an inline ! comment", () => {
    expect(detectClarionCode("x = 5  ! set initial value")).toBe(true);
  });

  it("detects a standalone ! comment line", () => {
    expect(detectClarionCode("! This is a Clarion comment\nx = 1")).toBe(true);
  });

  it("does not treat != as a comment", () => {
    // != alone should NOT trigger — no other Clarion signal present
    expect(detectClarionCode("if x != y then stop")).toBe(false);
  });

  it("does not treat ![ as a comment (markdown image)", () => {
    expect(detectClarionCode("![alt text](image.png)")).toBe(false);
  });
});

describe("detects Clarion via CODE keyword", () => {
  it("detects CODE on its own line", () => {
    expect(detectClarionCode("MyProc  PROCEDURE\n  CODE\n  x = 1\n")).toBe(true);
  });

  it("does not trigger on CODE inside other text", () => {
    // CODE embedded in a word or identifier should not match
    expect(detectClarionCode("DECODE(x, 1, 'yes')")).toBe(false);
  });
});

describe("detects Clarion via sized string types", () => {
  it("detects STRING(n)", () => {
    expect(detectClarionCode("Name  STRING(30)")).toBe(true);
  });

  it("detects CSTRING(n)", () => {
    expect(detectClarionCode("Buffer  CSTRING(256)")).toBe(true);
  });

  it("detects PSTRING(n)", () => {
    expect(detectClarionCode("Title  PSTRING(50)")).toBe(true);
  });

  it("detects lowercase cstring(n) — Clarion is case insensitive", () => {
    expect(detectClarionCode("name  cstring(30)")).toBe(true);
  });
});

describe("detects Clarion via field declarations", () => {
  it("detects identifier followed by LONG", () => {
    expect(detectClarionCode("Counter  LONG")).toBe(true);
  });

  it("detects identifier followed by BOOL", () => {
    expect(detectClarionCode("Active  BOOL")).toBe(true);
  });

  it("detects identifier followed by DATE", () => {
    expect(detectClarionCode("Created  DATE")).toBe(true);
  });

  it("detects a QUEUE block", () => {
    const code = `
PeopleQueue  QUEUE
Name           STRING(30)
Age            SHORT
               END`;
    expect(detectClarionCode(code)).toBe(true);
  });
});

describe("detects Clarion via END on its own line", () => {
  it("detects END alone", () => {
    expect(detectClarionCode("  LOOP\n    x += 1\n  END")).toBe(true);
  });

  it("does not trigger on end; (Pascal style)", () => {
    expect(detectClarionCode("begin\n  x := 1;\nend;")).toBe(false);
  });

  it("does not trigger on end. (Pascal program terminator)", () => {
    expect(detectClarionCode("begin\n  writeln('hi');\nend.")).toBe(false);
  });
});

describe("detects realistic Clarion snippets", () => {
  it("detects a typical procedure with CODE", () => {
    const code = `
MyWindow  PROCEDURE
  MAP END
  CODE
  OPEN(MainWindow)
  ACCEPT
  END`;
    expect(detectClarionCode(code)).toBe(true);
  });

  it("detects a FILE definition", () => {
    const code = `
People  FILE,DRIVER('TOPSPEED'),PRE(Peo)
Record    RECORD
Name        STRING(30)
Age         SHORT
          END
        END`;
    expect(detectClarionCode(code)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TRUE NEGATIVES — should NOT be detected as Clarion
// ---------------------------------------------------------------------------

describe("rejects JavaScript", () => {
  it("rejects a JS function with braces", () => {
    const code = `function greet(name) {\n  return 'Hello ' + name;\n}`;
    expect(detectClarionCode(code)).toBe(false);
  });

  it("rejects an arrow function", () => {
    expect(detectClarionCode("const add = (a, b) => a + b;")).toBe(false);
  });
});

describe("rejects Python", () => {
  it("rejects a Python function", () => {
    const code = `def greet(name):\n    return f'Hello {name}'`;
    expect(detectClarionCode(code)).toBe(false);
  });

  it("rejects a Python class", () => {
    const code = `class Animal:\n    def __init__(self):\n        pass`;
    expect(detectClarionCode(code)).toBe(false);
  });
});

describe("rejects SQL", () => {
  it("rejects a SELECT statement", () => {
    const code = `SELECT name, age FROM people WHERE age > 18`;
    expect(detectClarionCode(code)).toBe(false);
  });

  it("rejects T-SQL with @variables", () => {
    const code = `DECLARE @name VARCHAR(50)\nSET @name = 'test'`;
    expect(detectClarionCode(code)).toBe(false);
  });
});

describe("rejects Pascal/Delphi", () => {
  it("rejects a Pascal procedure", () => {
    const code = `procedure Greet(name: string);\nbegin\n  writeln('Hello ' + name);\nend;`;
    expect(detectClarionCode(code)).toBe(false);
  });

  it("rejects Pascal variable declarations (colon style)", () => {
    const code = `var\n  name: string;\n  age: integer;`;
    expect(detectClarionCode(code)).toBe(false);
  });
});

describe("rejects non-code content", () => {
  it("rejects plain text with no Clarion signals", () => {
    expect(detectClarionCode("Here is my question about the application.")).toBe(false);
  });

  it("rejects a markdown image (contains ![ )", () => {
    expect(detectClarionCode("![screenshot](https://example.com/img.png)")).toBe(false);
  });
});

describe("edge cases", () => {
  it("returns false for empty string", () => {
    expect(detectClarionCode("")).toBe(false);
  });

  it("does not match STRING inside a quoted string literal", () => {
    // 'STRING(30)' is inside quotes — stripped before detection
    expect(detectClarionCode("x = 'STRING(30) is a type'")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// REAL-WORLD TESTS — based on actual ClarionHub.com post content
// ---------------------------------------------------------------------------

describe("real-world: ClarionHub true positives", () => {
  it("detects VitRegex example (has ! comment)", () => {
    // From https://clarionhub.com/t/vitregex/8982
    const code = [
      "text.setValue('Error: 404 at line 123')",
      "if regex.Match(text, 'ERROR:(\\d+)')",
      "  errorCode = regex.GetGroup(1)  ! Returns '404'",
      "end",
    ].join("\n");
    expect(detectClarionCode(code)).toBe(true);
  });

  it("detects single LOOP line (LOOP at line start)", () => {
    // Short loop snippet without other structural signals
    expect(detectClarionCode("  loop x = 1 to size(myString)")).toBe(true);
  });

  it("detects Clarion template code with #For/#Delete", () => {
    // From https://clarionhub.com/t/bug-in-for-symbol-when-using-delete-symbol/9035
    const code = "#For(%MultiSymbol)\n#Delete(%MultiSymbol)\n#EndFor";
    expect(detectClarionCode(code)).toBe(true);
  });

  it("detects complex Clarion template with #Loop/#IF and %Variables", () => {
    // From https://clarionhub.com/t/bug-in-for-symbol-when-using-delete-symbol/9035
    const code = [
      "#Declare( %Found, Long )",
      "#Loop",
      "#Set( %Found, 0 )",
      "#For( %MultiSymbol )",
      "#IF( %MultiSymbol )",
      "#Delete( %MultiSymbol )",
      "#Set( %Found, 1 )",
      "#EndIF",
      "#EndFor",
      "#IF( NOT %Found )",
      "#Break",
      "#EndIF",
      "#EndLoop",
    ].join("\n");
    expect(detectClarionCode(code)).toBe(true);
  });
});

describe("real-world: ClarionHub true negatives", () => {
  it("rejects plain discussion about TPS-to-MSSQL conversion", () => {
    // Typical forum question post — no code
    const text = "Getting ready to convert TPS to MSSQL. MSSQL has a record length of 8K chars. " +
      "I want to see the lengths of my records in my TPS files to see what length they are. " +
      "No blobs. So, question is what is the easiest way to get the length of the records in each of my 12 TPS files?";
    expect(detectClarionCode(text)).toBe(false);
  });

  it("rejects plain discussion about exporting reports to TXA", () => {
    // Advice post — natural language, no Clarion code
    const text = 'Just export the report to a TXA and create a separate "Report app" that generates a DLL. ' +
      'Each "Report app/dll" is unique to each customer with their own designs/layouts. ' +
      "That way you dont have to recompile the whole main app every time.";
    expect(detectClarionCode(text)).toBe(false);
  });
});
