import { createContext } from 'react'
import type { PortalPlace } from './portal'

/**
 * The portal (slice 4, decision (j)): the place and its two actions, given by `DioramaExperience` while the portal is
 * on. The dock is its child, so it reads them here rather than through `App`. Its own file, so fast refresh keeps
 * working in the components on both sides.
 */
export type PortalControl = { place: PortalPlace; enter: () => void; leave: () => void; prefetch: () => void }
export const PortalContext = createContext<PortalControl | null>(null)
