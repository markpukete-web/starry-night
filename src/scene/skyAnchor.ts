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
): { quaternion: Quaternion; position: Vector3 } {
  const quaternion = anchor?.worldFixed
    ? new Quaternion()
    : cameraQuaternion.clone().multiply(homeInverse)

  const position = anchor?.follow
    ? cameraPosition.clone()
    : new Vector3(0, 0, 0)

  return { quaternion, position }
}
