#!/usr/bin/env node

/**
 * N8n Node Types Extraction Script
 *
 * Scalable script to extract node type information from n8n source code.
 * Clones/updates the n8n repository and processes node definition files.
 *
 * Usage:
 *   node scripts/extract-n8n-nodes.js
 *
 * Options:
 *   --branch <branch>  Git branch to checkout (default: master)
 *   --clean            Force clean clone (removes existing repo)
 *   --output <path>    Output file path (default: extension/src/n8n/hardcoded-node-types.ts)
 *
 * Future extensibility:
 *   This script can be adapted to extract other data from n8n source code
 *   by modifying the processNodeFiles() function and output generation.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// ==========================================
// Configuration
// ==========================================

const CONFIG = {
  repoUrl: 'https://github.com/n8n-io/n8n.git',
  repoDir: path.join(__dirname, '.cache', 'n8n-repo'),
  branch: 'master',
  nodesPath: 'packages/nodes-base/nodes',
  outputPath: path.join(__dirname, '..', 'extension', 'src', 'n8n', 'hardcoded-node-types.ts')
}

// ==========================================
// CLI Argument Parsing
// ==========================================

function parseArgs() {
  const args = process.argv.slice(2)
  const options = { ...CONFIG }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--branch' && args[i + 1]) {
      options.branch = args[i + 1]
      i++
    } else if (args[i] === '--clean') {
      options.clean = true
    } else if (args[i] === '--output' && args[i + 1]) {
      options.outputPath = path.resolve(args[i + 1])
      i++
    } else if (args[i] === '--help') {
      console.log(`
N8n Node Types Extraction Script

Usage: node scripts/extract-n8n-nodes.js [options]

Options:
  --branch <branch>  Git branch to checkout (default: master)
  --clean            Force clean clone (removes existing repo)
  --output <path>    Output file path
  --help             Show this help message
      `)
      process.exit(0)
    }
  }

  return options
}

// ==========================================
// Git Operations
// ==========================================

function cloneOrUpdateRepo(options) {
  console.log('📦 Setting up n8n repository...')

  // Create cache directory
  const cacheDir = path.dirname(options.repoDir)
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }

  // Handle clean clone
  if (options.clean && fs.existsSync(options.repoDir)) {
    console.log('🗑️  Removing existing repository...')
    fs.rmSync(options.repoDir, { recursive: true, force: true })
  }

  // Clone or update
  if (!fs.existsSync(options.repoDir)) {
    console.log(`🔽 Cloning n8n repository (branch: ${options.branch})...`)
    execSync(`git clone --depth 1 --branch ${options.branch} ${options.repoUrl} ${options.repoDir}`, {
      stdio: 'inherit'
    })
  } else {
    console.log('🔄 Updating existing repository...')
    try {
      execSync(`git -C ${options.repoDir} fetch origin ${options.branch}`, { stdio: 'inherit' })
      execSync(`git -C ${options.repoDir} checkout ${options.branch}`, { stdio: 'inherit' })
      execSync(`git -C ${options.repoDir} pull origin ${options.branch}`, { stdio: 'inherit' })
    } catch (error) {
      console.warn('⚠️  Git update failed, using existing local copy')
    }
  }

  console.log('✅ Repository ready\n')
}

// ==========================================
// Node File Processing
// ==========================================

function getNodeListFromPackageJson(repoDir) {
  const packageJsonPath = path.join(repoDir, 'packages', 'nodes-base', 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  if (!packageJson.n8n || !packageJson.n8n.nodes) {
    throw new Error('No nodes found in package.json')
  }

  return packageJson.n8n.nodes
}

function extractNodeMetadata(nodeFilePath, repoDir) {
  // Convert dist path to source path
  // dist/nodes/Slack/Slack.node.js -> nodes/Slack/Slack.node.ts
  const sourcePath = nodeFilePath
    .replace('dist/', '')
    .replace('.js', '.ts')

  const fullPath = path.join(repoDir, 'packages', 'nodes-base', sourcePath)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8')

    // Extract basic metadata using regex patterns
    const metadata = {
      name: extractPattern(content, /name:\s*['"]([^'"]+)['"]/),
      displayName: extractPattern(content, /displayName:\s*['"]([^'"]+)['"]/),
      description: extractPattern(content, /description:\s*['"]([^'"]+)['"]/),
      group: extractArrayPattern(content, /group:\s*\[([^\]]+)\]/),
      inputs: [],
      outputs: [],
      version: 1
    }

    // Skip if no name found
    if (!metadata.name) {
      return null
    }

    // Set defaults
    metadata.displayName = metadata.displayName || metadata.name
    metadata.description = metadata.description || ''

    return {
      name: `n8n-nodes-base.${metadata.name}`,
      displayName: metadata.displayName,
      description: metadata.description,
      version: metadata.version,
      defaults: { name: metadata.displayName },
      inputs: metadata.inputs,
      outputs: metadata.outputs,
      properties: [],
      credentials: [],
      group: metadata.group,
      codex: {}
    }
  } catch (error) {
    console.warn(`⚠️  Failed to process ${path.basename(fullPath)}: ${error.message}`)
    return null
  }
}

function extractPattern(content, pattern) {
  const match = content.match(pattern)
  return match ? match[1] : null
}

function extractArrayPattern(content, pattern) {
  const match = content.match(pattern)
  if (!match) return []

  const arrayContent = match[1]
  return arrayContent
    .split(',')
    .map(item => item.trim().replace(/['"]/g, ''))
    .filter(Boolean)
}

function processNodeFiles(repoDir) {
  console.log('🔍 Reading node list from package.json...')

  const nodeList = getNodeListFromPackageJson(repoDir)
  console.log(`📄 Found ${nodeList.length} nodes registered in package.json\n`)

  console.log('⚙️  Processing node files...')
  const nodes = []
  let processed = 0
  let skipped = 0

  for (const nodeFilePath of nodeList) {
    const nodeData = extractNodeMetadata(nodeFilePath, repoDir)

    if (nodeData) {
      nodes.push(nodeData)
      processed++

      if (processed % 50 === 0) {
        console.log(`   Processed ${processed}/${nodeList.length} nodes...`)
      }
    } else {
      skipped++
    }
  }

  console.log(`✅ Processed ${processed} nodes (${skipped} skipped)\n`)
  return nodes
}

// ==========================================
// Output Generation
// ==========================================

function generateTypeScriptOutput(nodes) {
  const sortedNodes = nodes.sort((a, b) => {
    const nameA = a.name || ''
    const nameB = b.name || ''
    return nameA.localeCompare(nameB)
  })

  // Generate the TypeScript file content
  let output = `/**
 * Hardcoded N8n Node Types
 *
 * This file is auto-generated by scripts/extract-n8n-nodes.js
 * Do not edit manually - regenerate by running the script.
 *
 * Generated: ${new Date().toISOString()}
 * Total nodes: ${nodes.length}
 */

import type { NodeTypesResponse } from './node-types'

/**
 * All available n8n node types extracted from source code
 *
 * This data is extracted from the official n8n repository:
 * https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes
 */
export const HARDCODED_NODE_TYPES: NodeTypesResponse = {
`

  // Generate node entries
  for (const node of sortedNodes) {
    output += `  '${node.name}': ${JSON.stringify(node, null, 2).split('\n').join('\n  ')},\n`
  }

  output += `} as const
`

  return output
}

function writeOutput(content, outputPath) {
  console.log(`📝 Writing output to ${path.relative(process.cwd(), outputPath)}...`)

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, content, 'utf-8')
  console.log('✅ Output file written successfully\n')
}

// ==========================================
// Statistics & Summary
// ==========================================

function printSummary(nodes) {
  console.log('📊 Extraction Summary')
  console.log('━'.repeat(50))

  // Count by category
  const categories = {}
  const triggers = []
  const actions = []

  for (const node of nodes) {
    // Categorize
    const nodeCategories = node.codex?.categories || node.group || ['Other']

    for (const category of nodeCategories) {
      categories[category] = (categories[category] || 0) + 1
    }

    // Trigger vs action
    if (node.inputs?.length === 0 || node.group?.includes('trigger')) {
      triggers.push(node.name)
    } else {
      actions.push(node.name)
    }
  }

  console.log(`Total nodes:     ${nodes.length}`)
  console.log(`Trigger nodes:   ${triggers.length}`)
  console.log(`Action nodes:    ${actions.length}`)
  console.log(`\nTop categories:`)

  const sortedCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  for (const [category, count] of sortedCategories) {
    console.log(`  ${category.padEnd(20)} ${count}`)
  }

  console.log('━'.repeat(50))
}

// ==========================================
// Main Execution
// ==========================================

async function main() {
  console.log('\n🚀 N8n Node Types Extraction Script\n')

  try {
    // Parse CLI arguments
    const options = parseArgs()

    // Step 1: Clone or update repository
    cloneOrUpdateRepo(options)

    // Step 2: Process node files
    const nodes = processNodeFiles(options.repoDir)

    if (nodes.length === 0) {
      throw new Error('No node files were successfully processed')
    }

    // Step 3: Generate TypeScript output
    const content = generateTypeScriptOutput(nodes)

    // Step 4: Write output file
    writeOutput(content, options.outputPath)

    // Step 5: Print summary
    printSummary(nodes)

    console.log('\n✨ Extraction complete!\n')
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

// Run the script
main()

