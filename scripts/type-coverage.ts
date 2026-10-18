/**
 * Measures how much of the code the type checker actually knows the type of, and fails below a
 * floor.
 *
 *   node scripts/type-coverage.ts [--at-least 98] [--list]
 *
 * `tsc` passing is not the same as the code being typed. `strict` stops TypeScript *inferring*
 * `any` silently, but a value can still arrive as `any` from an untyped boundary — `JSON.parse`,
 * a library without types, a cast — and spread from there, taking every check with it. ESLint's
 * `no-explicit-any` catches the word; nothing catches the spread. This counts it.
 *
 * Every identifier in every project is asked what type it has, and the ones the checker answers
 * `any` for are counted. Written here rather than taken from a package because the exclusions
 * below are judgement calls, and they should be visible and arguable in review rather than
 * hidden in somebody else's heuristics.
 */
import { readFileSync } from 'node:fs';
import ts from 'typescript';

/**
 * The floor. The figure has been above 99.9% since this was written, so this is not a target to
 * creep down to — it is the point at which a slide stops being gradual and fails the build.
 */
const DEFAULT_MINIMUM = 98;

/** The projects `tsconfig.json` references: the app, the build scripts, the worker, the e2e suite. */
function projectPaths(): string[] {
  const root: unknown = JSON.parse(readFileSync('tsconfig.json', 'utf8'));
  const references =
    typeof root === 'object' && root !== null && 'references' in root ? root.references : [];
  if (!Array.isArray(references)) {
    throw new Error('tsconfig.json lists no project references.');
  }
  return references.map((reference: unknown) => {
    if (typeof reference !== 'object' || reference === null || !('path' in reference)) {
      throw new Error('A project reference has no path.');
    }
    return String(reference.path).replace(/^\.\//, '');
  });
}

/**
 * Whether an identifier is a *name* rather than a value.
 *
 * `getTypeAtLocation` answers `any` for anything that is not an expression, so counting these
 * would measure nothing: a JSX tag (`<span>`), the label in a tuple type (`[red: number]`), the
 * property being picked apart in `const { book: query } = …`, the name in `import type { X }`,
 * and every type reference. A component in JSX is a real value, so it stays counted.
 */
function isNamePosition(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent) || ts.isImportClause(parent)) {
    return true;
  }
  if (ts.isNamespaceImport(parent) || ts.isQualifiedName(parent)) {
    return true;
  }
  if (
    ts.isJsxOpeningElement(parent) ||
    ts.isJsxClosingElement(parent) ||
    ts.isJsxSelfClosingElement(parent)
  ) {
    return /^[a-z]/.test(node.text);
  }
  if (ts.isJsxAttribute(parent) && parent.name === node) {
    return true;
  }
  if ((ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) && parent.name === node) {
    return true;
  }
  if (ts.isTypeReferenceNode(parent) || ts.isTypeAliasDeclaration(parent)) {
    return true;
  }
  if (ts.isInterfaceDeclaration(parent) || ts.isTypeParameterDeclaration(parent)) {
    return true;
  }
  if (ts.isTypePredicateNode(parent) || ts.isNamedTupleMember(parent)) {
    return true;
  }
  return ts.isBindingElement(parent) && parent.propertyName === node;
}

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

function measure(configPath: string): { total: number; findings: Finding[] } {
  const config = ts.readConfigFile(configPath, (path) => ts.sys.readFile(path));
  if (config.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  }
  // `readConfigFile` types the parsed JSON as `any`; it is a tsconfig, so `unknown` is both
  // honest and all `parseJsonConfigFileContent` needs.
  const contents: unknown = config.config;
  const parsed = ts.parseJsonConfigFileContent(contents, ts.sys, '.');
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
  const checker = program.getTypeChecker();
  const owned = new Set(parsed.fileNames.map((name) => ts.sys.resolvePath(name)));

  let total = 0;
  const findings: Finding[] = [];
  for (const file of program.getSourceFiles()) {
    if (file.isDeclarationFile || !owned.has(ts.sys.resolvePath(file.fileName))) {
      continue;
    }
    const relative = file.fileName.replace(`${ts.sys.getCurrentDirectory()}/`, '');
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && !isNamePosition(node)) {
        total += 1;
        if ((checker.getTypeAtLocation(node).flags & ts.TypeFlags.Any) !== 0) {
          const { line } = file.getLineAndCharacterOfPosition(node.getStart());
          findings.push({ file: relative, line: line + 1, text: node.text });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return { total, findings };
}

const argv = process.argv.slice(2);
const atLeastIndex = argv.indexOf('--at-least');
const minimum = atLeastIndex === -1 ? DEFAULT_MINIMUM : Number(argv[atLeastIndex + 1]);
if (!Number.isFinite(minimum) || minimum < 0 || minimum > 100) {
  throw new Error('--at-least takes a percentage between 0 and 100.');
}
const list = argv.includes('--list');

let identifiers = 0;
const untyped: Finding[] = [];
// One project at a time: a file can belong to only one, and each has its own libs and options.
for (const path of projectPaths()) {
  const { total, findings } = measure(path);
  identifiers += total;
  untyped.push(...findings);
}

const covered = identifiers - untyped.length;
const percentage = (covered / identifiers) * 100;
console.log(`type coverage: ${percentage.toFixed(4)}% (${covered}/${identifiers} identifiers)`);

if (list && untyped.length > 0) {
  for (const finding of untyped) {
    console.log(`  ${finding.file}:${finding.line}  ${finding.text}`);
  }
}

if (percentage < minimum) {
  const byFile = new Map<string, number>();
  for (const finding of untyped) {
    byFile.set(finding.file, (byFile.get(finding.file) ?? 0) + 1);
  }
  console.error(
    `\nType coverage ${percentage.toFixed(4)}% is below the ${String(minimum)}% floor.`,
  );
  console.error('Values the checker could not type, by file:');
  for (const [file, count] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.error(`  ${String(count).padStart(4)}  ${file}`);
  }
  console.error('\nRun with --list to see each one. Give the value a type rather than raising');
  console.error('the floor: an `any` here spreads to everything it touches.');
  process.exit(1);
}
