// Visual wheel kinematics for a fictional six-wheel, four-wheel-steer rover.
// Body-local X is right and -Z is forward. The battery/driving model is separate.
export const WHEEL_RADIUS = 0.48;
export function steeringAngle(curvature, x, z) {
  if (Math.abs(z) < 0.01) return 0; // centre axle is not steered
  // Unit forward travel determines the steering axis, even when reversing.
  // Do not fold at 90 degrees: that would make a tight inner wheel snap by 180.
  return Math.atan2(-curvature * z, 1 - curvature * x);
}
export function wheelTravel(distance, headingDelta, x, z, steer) {
  // Displacement at this wheel, including its inside/outside turn radius.
  const right = -headingDelta * z;
  const forward = distance - headingDelta * x;
  return right * Math.sin(steer) + forward * Math.cos(steer);
}
export function smoothSteering(current, target, dt) {
  const delta = target - current;
  // About 0.2 s to settle, rather than snapping to a new orientation.
  return current + delta * (1 - Math.exp(-14 * Math.max(0, dt)));
}
