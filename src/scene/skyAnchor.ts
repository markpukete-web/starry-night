import { Quaternion, Vector3 } from 'three'

export type SkyAnchor = {
  follow: boolean
  worldFixed: boolean
}

/**
 * Pure transform for the sky dome / group in 3D:
 * - Without an anchor: camera × homeInverse and the origin (0, 0, 0), exactly today's behaviour.
 * - With follow: position is the camera's position.
 * - With worldFixed: quaternion is the identity (0, 0, 0, 1).
 */
export function skyTransform(
  cameraQuaternion: Quaternion,
  cameraPosition: Vector3,
  homeInverse: Quaternion,
  anchor?: SkyAnchor,
  /** written in place, so the frame loop allocates nothing (Fable R6): the sky's root itself */
  out: { quaternion: Quaternion; position: Vector3 } = { quaternion: new Quaternion(), position: new Vector3() },
): { quaternion: Quaternion; position: Vector3 } {
  if (anchor?.worldFixed) out.quaternion.identity()
  else out.quaternion.copy(cameraQuaternion).multiply(homeInverse)
  if (anchor?.follow) out.position.copy(cameraPosition)
  else out.position.set(0, 0, 0)
  return out
}
