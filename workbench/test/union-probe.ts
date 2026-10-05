// Read a string-literal union off its own declaration, so a gate holding a table TOTAL over a
// vocabulary reads the vocabulary rather than restating it.
//
// ## Why this is shared and the 261004 assessment is not reversed
//
// `test/expectation-standing.test.ts` declined a shared source-probe helper on 261004, and the
// reasoning was right for the files it compared: `test/component-model.ts` enumerates imports in
// text it is HANDED, and `test/import-graph.test.ts` reads `tsconfig.json` through the compiler's
// JSON reader. Neither asks this question, so there was one `createSourceFile` call of overlap and
// nothing worth a module.
//
// What changed is that a SECOND file now asks exactly this question, of three different aliases --
// `EvaluationStatus`, `VerificationStatus` and `InconclusiveCause`'s arms in
// `test/verification.test.ts`. One subject with three aliases already forces the parameter, and a
// second copy of the parse is where two gates come to disagree about what "the vocabulary" means.
// So the extraction lands on the second site rather than the third, and the probe's own negative
// control -- the part that is easy to omit and the part that makes the gate non-vacuous -- is
// written once and exercised from both.
//
// ## The probe's failure mode, stated because it is the reason the asserts are here
//
// Reading a declaration out of source has one quiet way to be wrong: the path moves, or the alias
// is renamed, the parse finds nothing, and a table asserted TOTAL over an empty set passes
// vacuously. Green would then mean "we looked in the wrong place." Both steps therefore fail
// CLOSED -- the file must exist and the alias must be found -- and a caller is expected to drive
// every way of finding nothing and catch the throw.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";

/**
 * The members of `export type <alias> = …`, parsed out of the text this is given.
 *
 * A real parse rather than a pattern over text: these unions are one-line aliases today and a regex
 * would read them, but it would also read a comment mentioning the words, and it would stop reading
 * the day somebody wraps an alias across lines.
 *
 * It takes the TEXT so a control can drive it with source declaring no such alias and with source
 * declaring a non-literal one. An assertion whose subject is always present is untested by its own
 * passing.
 */
export function unionMembersIn(
  alias: string, path: string, text: string,
): readonly string[] {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.ES2022, true);
  const found: string[] = [];
  for (const statement of source.statements) {
    if (!ts.isTypeAliasDeclaration(statement) || statement.name.text !== alias) continue;
    const union = statement.type;
    const members = ts.isUnionTypeNode(union) ? union.types : [union];
    for (const member of members) {
      assert.ok(ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal),
        `${alias} gained a non-literal member at ${path}; this parse reads string literals only`);
      if (ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal)) {
        found.push(member.literal.text);
      }
    }
  }
  assert.ok(found.length > 0, `no '${alias}' type alias found in ${path} — the parse is wrong`);
  return found;
}

/** The vocabulary as the shipped source declares it. The path is asserted, not trusted. */
export function declaredUnion(alias: string, path: string): readonly string[] {
  assert.ok(existsSync(path),
    `${path} does not exist, so the ${alias} vocabulary would be read from nothing. A gate holding `
    + `a table TOTAL over that declaration makes a vacuous claim when the parse has no subject. If `
    + `the declaration moved, point the probe at the file that declares \`${alias}\` now.`);
  return unionMembersIn(alias, path, readFileSync(path, "utf8"));
}
