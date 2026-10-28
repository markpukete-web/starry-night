# Vincent's wander, a throwaway spike: the design draft, 2026-10-28

Mark, 12:07: "I don't know if the free wondered would actually provide a better experience visually and not 100% sure
how the control would work because Vincent would not be limited in the pathway". He chose a spike before any slice.
This is that spike. Branch `spike/vincent-wander` off V1 (`feat/vincent-form` at `b93e0f0`), behind `?wander=1` in the
street. It is never merged. Mark decides from its preview whether it becomes a slice.

## The locked criterion, and how this spike reads it

CLAUDE.md, the acceptance criteria: inside a portal scene "an authored camera path may leave [the orbit limits]: the
portal's flight, and the walk along the scene's path. The visitor moves the camera only along that path, never off
it."

The spike reads it this way. **The camera's position stays on the walk's rail**, `walkPose(t).position`, for every
frame. Vincent may leave the lane. The camera's **aim** may turn toward him, bounded by a knob. If Mark reads the
criterion as fixing the aim too, the "hold" variant below with the aim knob at 0 is the version that keeps it.

## What the visitor does

- **A tap on the verge** (the grass's footprint: 0.06 to 0.6 from the lane's centre, clear of the houses, the walls,
  the paths, the bench, the pot, the pail, the cypress and the square) sends Vincent there. He turns, walks a straight
  line at the walk's own speed (the automatic walk's 0.08 of `t` a second, about 0.19 world units a second), and stops.
  The stride, the arms and the lantern's swing are the walk's (`gait`, `lag`).
- **A tap anywhere else** does nothing. A tap whose straight line crosses a house, a wall or an object does nothing.
  There is no path finding.
- **A tap on the lane**, a scroll or an arrow key sends him back to his lane slot (`vincentPlace(t)`). Once he is on
  it, the walk takes him again. The automatic walk waits while he is off the lane.
- **A tap on Vincent** still starts and stops the automatic walk. **A press and a drag** is still the hand in the
  grass. Only a tap (300 ms and 8 px, the walk's own rule) sends him.
- **A small mark** on the ground where he is going: a soft warm dot, the lantern's colour, gone when he arrives.

## Two variants, for Mark to compare (`?wanderCam=follow` or `hold`)

- **follow** (the default): the camera glides along its rail to keep its usual distance behind him, measured along
  the lane: `t` follows his lane coordinate less the rig's 0.4. Its aim turns toward him by up to the knob.
- **hold**: the camera stays where it was. Only its aim turns, by up to the knob.

**The knob** `?wanderAim=` in degrees, 0 to 40, default 20: the most the aim turns from the walk's authored aim toward
him. At each stop the authored aim is a composition (stop 0 aims 9° left of the church, stop 4 at the church's door),
so the knob is what Mark judges: how far the frame may leave the composition to keep him in it.

## What the spike does not do

No path finding, no collision with the grass or the frogs (he walks through the blades, and the trail bends them), no
stops or dwell off the lane, no change to the lane walk with `wander` off. No tests beyond one for the walkable test
and one for the straight-line rejection. No gate loop, no mutations: a spike.

## What Mark sees

The preview with `?street=1&wander=1`, then `&wanderCam=hold`, and `&wanderAim=0` or `40`. Two captures a variant at
stop 0 and stop 2, on the phone and desktop: before the tap, and with him on the verge. He decides: a slice, a change,
or no.
