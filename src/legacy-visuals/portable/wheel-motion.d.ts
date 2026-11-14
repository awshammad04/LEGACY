export const WHEEL_RADIUS: number;
export function steeringAngle(curvature: number, x: number, z: number): number;
export function wheelTravel(distance: number, headingDelta: number, x: number, z: number, steer: number): number;
export function smoothSteering(current: number, target: number, dt: number): number;
