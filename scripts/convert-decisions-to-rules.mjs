#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

const repoRoot = '/workspaces/n8n-pro';
const decisionsDir = path.join(repoRoot, 'decisions');
const outputRoot = path.join(repoRoot, '.cursor/rules/decisions/n8n-extension');

/**
 * Map each decision filename to a category directory under n8n-extension
 */
const categoryByFile = new Map([
  ['0001-project-scope-and-goals.md', 'governance'],
  ['0002-target-users-and-use-cases.md', 'use-cases'],
  ['0003-agent-and-ux-principles.md', 'governance'],
  ['0004-use-case-initial-workflow.md', 'use-cases'],
  ['0005-use-case-no-native-support.md', 'use-cases'],
  ['0006-use-case-creativity-suggestions.md', 'use-cases'],
  ['0007-technical-architecture.md', 'architecture'],
  ['0008-extension-scaffold.md', 'browser-extension'],
  ['0009-n8n-design-integration.md', 'ux'],
  ['0010-styling-and-design-tokens.md', 'ux'],
  ['0011-n8n-api-integration.md', 'api'],
  ['0012-ai-agent-vs-simple-tools-logic.md', 'architecture'],
  ['0013-browser-extension-structure.md', 'browser-extension'],
  ['0014-user-interface-design.md', 'ux'],
  ['0015-development-environment-setup.md', 'dev-workflow'],
  ['0016-security-privacy-considerations.md', 'security'],
  ['0017-coding-standards-preferences.md', 'architecture'],
  ['0018-testing-strategy.md', 'testing'],
  ['0019-error-handling-logging.md', 'error-handling'],
  ['0020-state-management.md', 'state-management'],
  ['0021-api-data-layer.md', 'api'],
  ['0022-documentation-standards.md', 'governance'],
  ['0023-git-workflow.md', 'dev-workflow'],
  ['0024-react-patterns-and-vanilla-js-avoidance.md', 'ux'],
  ['0025-ai-integration-and-multi-agent-architecture.md', 'architecture'],
  ['0026-browser-extension-development-patterns.md', 'browser-extension'],
  ['0027-n8n-api-integration-and-workflow-assistance.md', 'api'],
  ['0028-n8n-extension-project-architecture.md', 'architecture'],
  ['0029-n8n-extension-react-component-standards.md', 'ux'],
  ['0030-n8n-extension-development-workflow.md', 'dev-workflow'],
  ['0031-n8n-extension-code-quality-standards.md', 'architecture'],
]);

/**
 * Categories for which the rule should always apply in Cursor contexts.
 * Other categories default to false to reduce noise and allow intelligent pickup per task.
 */
const alwaysApplyByCategory = new Map([
  ['governance', true],
  ['security', true],
  ['testing', true],
  ['error-handling', true],
  ['dev-workflow', true],
  // Contextual by default
  ['architecture', false],
  ['api', false],
  ['ux', false],
  ['browser-extension', false],
  ['state-management', false],
  ['use-cases', false],
]);

function toSlug(name) {
  return name
    .replace(/\.md$/i, '')
    .trim()
    .toLowerCase();
}

function extractTitle(markdown) {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)$/);
    if (m) return m[1].trim();
  }
  return '';
}

function deriveDescription(filename, markdown) {
  const title = extractTitle(markdown);
  const cleaned = title
    .replace(/^Decision Record:\s*/i, '')
    .replace(/^Decision:\s*/i, '')
    .trim();
  if (cleaned) return cleaned;
  // Fallback: first non-empty sentence or a generic description
  const firstPara = markdown.split(/\n\n+/).map(s => s.trim()).find(Boolean) || '';
  const sentence = firstPara.split(/\.(\s|$)/)[0];
  if (sentence && sentence.length > 10) return sentence;
  return `Guidelines from ${filename} for the n8n extension project`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  const files = (await fs.readdir(decisionsDir)).filter(f => f.endsWith('.md'));

  // Ensure category directories exist
  const categories = new Set(categoryByFile.values());
  for (const category of categories) {
    await ensureDir(path.join(outputRoot, category));
  }

  // Convert each decision file
  for (const file of files) {
    const category = categoryByFile.get(file);
    if (!category) {
      // Skip unknown mapping to avoid misplacement; log for follow-up
      console.warn(`[skip] No category mapping for`, file);
      continue;
    }
    const inputPath = path.join(decisionsDir, file);
    const markdown = await fs.readFile(inputPath, 'utf8');
    const description = deriveDescription(file, markdown);
    const alwaysApply = alwaysApplyByCategory.get(category) ?? false;

    const basename = toSlug(file);
    const outputPath = path.join(outputRoot, category, `${basename}.mdc`);

    const header = `---\nalwaysApply: ${alwaysApply}\ndescription: ${escapeYaml(description)}\n---\n\n`;
    const content = header + markdown + (markdown.endsWith('\n') ? '' : '\n');
    await fs.writeFile(outputPath, content, 'utf8');
    console.log(`[write] ${path.relative(repoRoot, outputPath)}`);
  }
}

function escapeYaml(s) {
  // Escape YAML special characters minimally; wrap in plain string if colon present
  if (/[#:>-]|^\s|\s$/.test(s)) {
    // Use double quotes and escape
    const escaped = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return s;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


