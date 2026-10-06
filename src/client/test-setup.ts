import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Guard: node-environment tests have no DOM to clean up.
if (typeof document !== 'undefined') afterEach(() => cleanup())
