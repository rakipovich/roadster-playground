import {physicalFrame} from './thrust-clock.js';

export const realTime = (seconds, source) => physicalFrame(seconds, source) / source.fps;
export function realtimeTiming(source) {
 const result = {...source, duration_s: source.physical_end_frame / source.fps};
 for (const key of ['takeoff_s','touchdown_s','rollout_end_s','landing_thrust_start_s','landing_thrust_end_s']) result[key]=realTime(source[key],source);
 result.clock_knots=[[0,0],[result.duration_s,source.physical_end_frame]];
 result.display_events={phone_dim_start:realTime(13.5,source),phone_dim_end:realTime(16,source),park:realTime(23.6,source),phone_off:realTime(23.1,source)};
 return result;
}
// Keep every authored pose; only remove the shared presentation-time stretch.
export function retimeClip(clip,source) {
 for (const track of clip.tracks) track.times=Float32Array.from(track.times,t=>realTime(t,source));
 clip.duration=source.physical_end_frame/source.fps;
 return clip;
}
