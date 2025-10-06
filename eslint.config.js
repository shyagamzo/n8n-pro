/**
 * ESLint Configuration for n8n Pro Extension
 * Modern ESLint v9 flat config format
 */

import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    // Base JavaScript configuration
    js.configs.recommended,
    
    // Ignore patterns
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'temp-vite/**',
            '*.config.js',
            '*.config.ts'
        ]
    },
    
    // TypeScript files
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true
                }
            },
            globals: {
                chrome: 'readonly',
                browser: 'readonly',
                document: 'readonly',
                window: 'readonly',
                console: 'readonly',
                HTMLElement: 'readonly',
                React: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': typescript,
            'react': react,
            'react-hooks': reactHooks
        },
        rules: {
            // TypeScript specific rules
            ...typescript.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': ['error', { 
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-var-requires': 'error',
            
            // React specific rules
            ...react.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off', // Not needed with React 17+
            'react/prop-types': 'off', // Using TypeScript for prop validation
            'react/jsx-uses-react': 'off',
            'react/jsx-uses-vars': 'error',
            
            // React Hooks rules
            ...reactHooks.configs.recommended.rules,
            
            // General code quality rules
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'error',
            'no-duplicate-imports': 'error',
            'no-unused-expressions': 'error',
            'prefer-const': 'error',
            'no-var': 'error',
            
            // Code style rules (following our coding standards)
            'indent': ['error', 4, { 
                SwitchCase: 1,
                ignoredNodes: ['JSXElement', 'JSXElement > *', 'JSXAttribute', 'JSXIdentifier', 'JSXNamespacedName', 'JSXMemberExpression', 'JSXSpreadAttribute', 'JSXExpressionContainer', 'JSXOpeningElement', 'JSXClosingElement', 'JSXFragment', 'JSXOpeningFragment', 'JSXClosingFragment', 'JSXText', 'JSXEmptyExpression', 'JSXSpreadChild']
            }],
            'quotes': ['error', 'single', { avoidEscape: true }],
            'semi': ['error', 'always'],
            'comma-dangle': ['error', 'never'],
            'object-curly-spacing': ['error', 'always'],
            'array-bracket-spacing': ['error', 'never'],
            'space-before-function-paren': ['error', {
                anonymous: 'always',
                named: 'never',
                asyncArrow: 'always'
            }],
            
            // Import organization (following our coding standards)
            'import/order': 'off', // We'll handle this manually
            'sort-imports': 'off' // We'll handle this manually
        },
        settings: {
            react: {
                version: 'detect'
            }
        }
    },
    
    // JavaScript files
    {
        files: ['**/*.js', '**/*.jsx'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                chrome: 'readonly',
                browser: 'readonly',
                document: 'readonly',
                window: 'readonly',
                console: 'readonly',
                HTMLElement: 'readonly',
                React: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly'
            }
        },
        plugins: {
            'react': react,
            'react-hooks': reactHooks
        },
        rules: {
            ...react.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/jsx-uses-react': 'off',
            'react/jsx-uses-vars': 'error',
            ...reactHooks.configs.recommended.rules,
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'error',
            'prefer-const': 'error',
            'no-var': 'error'
        },
        settings: {
            react: {
                version: 'detect'
            }
        }
    },
    
    // Configuration files
    {
        files: ['*.config.js', '*.config.ts', 'vite.config.ts', 'eslint.config.js'],
        languageOptions: {
            globals: {
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly'
            }
        },
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-var-requires': 'off'
        }
    },
    
    // Test files
    {
        files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-explicit-any': 'off'
        }
    }
];
