/**
 * Converts SQLite parameterized queries to PostgreSQL format:
 * - Replaces '?' placeholders with '$1, $2, ...' outside of string literals
 * - Converts 'INSERT OR IGNORE INTO' to 'INSERT INTO ... ON CONFLICT DO NOTHING'
 */
export function convertSqliteToPostgres(sql: string): string {
  let converted = sql;

  // 1. Handle INSERT OR IGNORE INTO
  converted = converted.replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, 'INSERT INTO');
  const hadInsertOrIgnore = converted !== sql;

  // 2. Replace ? with $1, $2, ... outside string literals
  let paramIndex = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let result = '';

  for (let i = 0; i < converted.length; i++) {
    const char = converted[i];

    if (char === "'" && !inDoubleQuote) {
      // Check for escaped single quote: ''
      if (inSingleQuote && i + 1 < converted.length && converted[i + 1] === "'") {
        result += "''";
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      result += char;
    } else if (char === '"' && !inSingleQuote) {
      if (inDoubleQuote && i + 1 < converted.length && converted[i + 1] === '"') {
        result += '""';
        i++;
        continue;
      }
      inDoubleQuote = !inDoubleQuote;
      result += char;
    } else if (char === '?' && !inSingleQuote && !inDoubleQuote) {
      result += `$${paramIndex++}`;
    } else {
      result += char;
    }
  }

  // 3. If it had INSERT OR IGNORE and doesn't already have ON CONFLICT, append ON CONFLICT DO NOTHING
  if (hadInsertOrIgnore && !/\bON\s+CONFLICT\b/i.test(result)) {
    result = result.trimEnd() + ' ON CONFLICT DO NOTHING';
  }

  return result;
}

