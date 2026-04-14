function stripStrings(text) {
  // Remove single-quoted and double-quoted strings
  return text.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
}

function looksLikeBraceLanguage(text) {
  // If we see a brace pair spanning lines, it's not Clarion
  if (/\{[\s\S]*?\n[\s\S]*?\}/.test(text)) {
    return true;
  }

  // If a line ends with {, that's block syntax
  if (/^\s*.*\{\s*$/m.test(text)) {
    return true;
  }

  return false;
}

function looksLikeSql(text) {
  // Strong T-SQL / SQL Server signals
  if (/@[A-Za-z_][A-Za-z0-9_]*/.test(text)) return true;                 // @vars
  if (/\bSET\s+NOCOUNT\s+ON\b/i.test(text)) return true;                // SET NOCOUNT ON
  if (/\b(CREATE|ALTER)\s+PROC(EDURE)?\b/i.test(text)) return true;      // CREATE/ALTER PROC/PROCEDURE
  if (/(\[[^\]\r\n]+\]\s*\.\s*)+\[[^\]\r\n]+\]/.test(text)) return true; // [dbo].[Table] style
  if (/^\s*GO\s*$/im.test(text)) return true;                           // GO on its own line
  if (/--|\/\*/.test(text)) return true;                                // SQL comment styles

  // High-confidence SQL statement shapes (require two to avoid random text)
  const sqlShapeHits = [
    /\bSELECT\b[\s\S]{0,200}\bFROM\b/i.test(text),
    /\bINSERT\s+INTO\b/i.test(text),
    /\bUPDATE\b[\s\S]{0,120}\bSET\b/i.test(text),
    /\bDELETE\s+FROM\b/i.test(text),
    /\bJOIN\b/i.test(text),
    /\bWHERE\b/i.test(text),
    /\bGROUP\s+BY\b/i.test(text),
    /\bORDER\s+BY\b/i.test(text),
  ].filter(Boolean).length;

  return sqlShapeHits >= 2;
}

function looksLikePython(text) {
  // Colon-terminated block headers (Python-only)
  if (/^\s*(if|elif|else|for|while|def|class|with|try|except|finally)\b[^\n]*:\s*$/im.test(text)) {
    return true;
  }

  // def / class at line start with colon
  if (/^\s*(def|class)\s+\w+\s*\(?.*\)?:\s*$/im.test(text)) {
    return true;
  }

  return false;
}

export function detectClarionCode(text) {
  const cleaned = stripStrings(text);

  // Veto checks — eliminate languages that share keywords with Clarion
  if (looksLikeBraceLanguage(cleaned)) return false;
  if (looksLikeSql(cleaned)) return false;
  if (looksLikePython(cleaned)) return false;

  // Clarion uses ! for line comments. A ! that isn't part of != or ![ (markdown image)
  // is a strong Clarion signal not present in other common non-vetoed languages.
  if (/!(?![=\[])/.test(text)) return true;

  // CODE on its own line — Clarion's unique data/executable section divider
  if (/^\s*CODE\s*$/im.test(cleaned)) return true;

  // Sized string type: STRING(n), CSTRING(n), PSTRING(n) — Clarion declaration syntax
  if (/\b(C?STRING|PSTRING|ASTRING)\s*\(\s*\d+\s*\)/i.test(cleaned)) return true;

  // Clarion field declaration: Identifier followed by a type keyword
  // Pascal uses "name: type" (colon), so "name TYPE" is distinctive to Clarion
  if (/^\s*\w+\s+(STRING|CSTRING|PSTRING|ASTRING|LONG|SHORT|BYTE|REAL|DATE|TIME|BOOL|ULONG|USHORT|SIGNED|UNSIGNED|DECIMAL|DOUBLE)\b/im.test(cleaned)) return true;

  // END on its own line with no trailing ; or . (which would indicate Pascal/Delphi)
  if (/^\s*END\s*$/im.test(cleaned)) return true;

  // LOOP at line start — Clarion loop construct; not used in vetoed languages
  if (/^\s*LOOP\b/im.test(cleaned)) return true;

  // Clarion template language: %Variable references inside calls — e.g. #For(%Symbol)
  // stripStrings removes quoted content so printf('%Foo') won't match
  if (/\(\s*%[A-Z]\w+/.test(cleaned)) return true;

  // Clarion template keywords that don't overlap with C preprocessor directives
  if (/^\s*#(For|Loop|Delete|Declare|Embed|EndFor|EndLoop)\b/im.test(text)) return true;

  return false;
}
